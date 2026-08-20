"""
AgentShield Central Policy Engine.

Evaluates all incoming tool requests against active agent policies.
Calculates deterministic ALLOW / BLOCK / SHADOW_WOULD_BLOCK dispositions.
"""

import time
from collections.abc import Sequence

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.policies.base import BaseRule
from app.schemas.waf import PolicyEvaluationResult, ToolCallRequest
from app.services.policy_service import PolicyService

logger = get_logger(__name__)


class PolicyEngine:
    """
    Core policy evaluation engine for AgentShield WAF.
    """

    def __init__(self, rules: Sequence[BaseRule] | None = None) -> None:
        self.rules: list[BaseRule] = list(rules) if rules else []

    def register_rule(self, rule: BaseRule) -> None:
        """Register a new policy rule validator."""
        self.rules.append(rule)

    async def evaluate_request(
        self,
        request: ToolCallRequest,
        agent: Agent,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> PolicyEvaluationResult:
        """
        Evaluate an intercepted tool call against the agent's policy.
        """
        start_time = time.perf_counter()

        # 1. Retrieve Policy
        policy = None
        if agent.policy_id:
            policy = await PolicyService.get_policy_by_id(db, agent.policy_id)

        if not policy:
            # Fallback to default policy
            policy = await PolicyService.get_policy_by_id(db, "support-agent-policy")

        policy_id = policy.policy_id if policy else "no-policy"
        policy_version = policy.version if policy else 0
        policy_mode = policy.mode if policy else "enforcement"

        rule_results: dict[str, str] = {}
        blocked_reason: str | None = None
        blocked_rule_name: str | None = None

        # 2a. Fail-closed: If no policy is found, block immediately.
        #     An agent with no policy should never be permitted to call tools.
        if not policy:
            rule_results["policy_lookup"] = "BLOCK"
            blocked_reason = f"No security policy assigned or resolvable for agent '{agent.agent_id}'"
            blocked_rule_name = "policy_lookup"

        # 2b. Agent Active Check (Mandatory base authentication/authorization)
        if not agent.is_active:
            rule_results["authentication"] = "BLOCK"
            if not blocked_rule_name:
                blocked_reason = f"Agent '{agent.agent_id}' is deactivated"
                blocked_rule_name = "authentication"
        else:
            rule_results["authentication"] = "ALLOW"

        # 3. Evaluate Registered Policy Rules
        if not blocked_rule_name and policy:
            for rule in self.rules:
                try:
                    is_allowed, reason = await rule.evaluate(
                        request=request,
                        agent=agent,
                        policy=policy,
                        db=db,
                        redis_client=redis_client,
                    )
                    if is_allowed:
                        rule_results[rule.rule_name] = "ALLOW"
                    else:
                        rule_results[rule.rule_name] = "BLOCK"
                        if not blocked_rule_name:
                            blocked_rule_name = rule.rule_name
                            blocked_reason = reason or f"Violation of {rule.rule_name} policy"
                except Exception as e:
                    logger.error(
                        f"Error evaluating rule {rule.rule_name}: {e!s}",
                        extra={
                            "agent_id": agent.agent_id,
                            "rule": rule.rule_name,
                            "error": str(e),
                        },
                    )
                    # Fail-closed on rule failure for security
                    rule_results[rule.rule_name] = "BLOCK"
                    if not blocked_rule_name:
                        blocked_rule_name = rule.rule_name
                        blocked_reason = f"Rule evaluation error in {rule.rule_name}: {e!s}"

        # 4. Determine Final Disposition
        execution_time_ms = round((time.perf_counter() - start_time) * 1000, 3)

        if blocked_rule_name:
            if policy_mode == "shadow":
                decision = "SHADOW_WOULD_BLOCK"
                final_reason = f"[SHADOW MODE] Rule '{blocked_rule_name}' violation logged: {blocked_reason}"
            else:
                decision = "BLOCK"
                final_reason = f"Request blocked by policy rule '{blocked_rule_name}': {blocked_reason}"
        else:
            decision = "ALLOW"
            final_reason = "All security policy checks passed successfully"

        logger.info(
            f"Policy evaluation completed: {decision} for agent '{agent.agent_id}' on tool '{request.tool}'",
            extra={
                "agent_id": agent.agent_id,
                "tool": request.tool,
                "decision": decision,
                "mode": policy_mode,
                "duration_ms": execution_time_ms,
            },
        )

        return PolicyEvaluationResult(
            decision=decision,
            mode=policy_mode,
            policy_id=policy_id,
            policy_version=policy_version,
            rules=rule_results,
            reason=final_reason,
            blocked_by_rule=blocked_rule_name,
            execution_time_ms=execution_time_ms,
        )


# Instantiate and wire all policy rules
from app.policies.data_scope import DataScopeRule
from app.policies.parameter_validation import ParameterValidationRule
from app.policies.rate_limit import RateLimitRule
from app.policies.sequence import SequenceRule

waf_policy_engine = PolicyEngine(
    rules=[
        RateLimitRule(),
        ParameterValidationRule(),
        DataScopeRule(),
        SequenceRule(),
    ]
)
