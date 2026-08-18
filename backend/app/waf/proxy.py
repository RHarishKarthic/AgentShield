"""
WAF Transparent Proxy Gateway.

Acts as the security gatekeeper sitting directly between AI Agents and Tools.
Intercepts tool requests, enforces policies, and prevents unauthorized execution.
"""

import redis.asyncio as redis
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.logging_config import get_logger
from app.schemas.waf import PolicyEvaluationResult, ToolCallRequest, ToolCallResponse
from app.security.authentication import verify_api_key
from app.services.agent_service import AgentService
from app.services.tool_service import ToolService
from app.waf.engine import waf_policy_engine
from app.waf.forwarder import ToolForwarder

logger = get_logger(__name__)


class WAFProxy:
    """
    Transparent security proxy for agent tool invocations.
    """

    @staticmethod
    async def intercept_and_execute(
        request: ToolCallRequest,
        api_key: str | None,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
        request_id: str | None = None,
    ) -> ToolCallResponse:
        """
        Main WAF interception pipeline.

        1. Authenticate Agent
        2. Validate Tool Existence
        3. Evaluate Security Policies
        4. ALLOW / SHADOW_WOULD_BLOCK -> Forward to Downstream Tool
        5. BLOCK -> Halt and reject immediately without tool execution
        """
        # Step 1: Agent Lookup & Auth
        agent = await AgentService.get_agent_by_id(db, request.agent_id)
        if not agent:
            logger.warning(f"Intercept rejected: Unknown agent '{request.agent_id}'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Agent '{request.agent_id}' is not registered with AgentShield",
            )

        if api_key:
            # If agent provided an API key, verify it
            if not verify_api_key(api_key, agent.api_key_hash):
                logger.warning(f"Intercept rejected: Invalid API key for agent '{request.agent_id}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid API key credentials for agent '{request.agent_id}'",
                )

        if not agent.is_active:
            logger.warning(f"Intercept rejected: Inactive agent '{request.agent_id}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Agent '{request.agent_id}' is inactive/deauthorized",
            )

        # Step 2: Tool Lookup & Validation
        tool = await ToolService.get_tool_by_id(db, request.tool)
        if not tool:
            logger.warning(f"Intercept rejected: Unknown tool '{request.tool}'")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tool '{request.tool}' is not registered with AgentShield",
            )

        if not tool.is_active:
            logger.warning(f"Intercept rejected: Inactive tool '{request.tool}'")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Target tool '{request.tool}' is currently deactivated",
            )

        # Step 3: Policy Engine Evaluation
        eval_result: PolicyEvaluationResult = await waf_policy_engine.evaluate_request(
            request=request,
            agent=agent,
            db=db,
            redis_client=redis_client,
        )

        # Step 4: Dispatch Decision Enforcement & Audit Logging
        if eval_result.decision == "BLOCK":
            logger.warning(
                f"WAF ENFORCEMENT: Blocked tool call from '{agent.agent_id}' to '{tool.tool_id}'",
                extra={
                    "agent_id": agent.agent_id,
                    "tool": tool.tool_id,
                    "reason": eval_result.reason,
                    "blocked_rule": eval_result.blocked_by_rule,
                },
            )
            # Record audit event for the blocked request
            await AuditService.record_event(
                db=db,
                request=request,
                eval_result=eval_result,
                request_id=request_id or "unknown",
                tool_response_status=None,
            )

            # CRITICAL SECURITY GUARANTEE: Downstream tool is NEVER invoked
            return ToolCallResponse(
                status="BLOCK",
                tool=request.tool,
                operation=request.operation,
                result=None,
                error=eval_result.reason,
                waf_evaluation=eval_result,
                request_id=request_id,
            )

        # Step 5: ALLOW or SHADOW_WOULD_BLOCK -> Forward to Downstream Tool
        status_code, tool_result = await ToolForwarder.forward_tool_call(
            tool=tool,
            operation=request.operation,
            parameters=request.parameters,
        )

        # Record audit event for the executed request (ALLOW or SHADOW_WOULD_BLOCK)
        await AuditService.record_event(
            db=db,
            request=request,
            eval_result=eval_result,
            request_id=request_id or "unknown",
            tool_response_status=status_code,
        )

        return ToolCallResponse(
            status=eval_result.decision,
            tool=request.tool,
            operation=request.operation,
            result=tool_result,
            error=None if status_code < 400 else str(tool_result),
            waf_evaluation=eval_result,
            request_id=request_id,
        )
