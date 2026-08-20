"""
Parameter Validation Policy Rule.

Inspects tool parameters for:
1. Max payload and individual parameter size limits
2. Injection blocklist patterns (SQLi, command injection, XSS, path traversal)
3. Type validation and structural integrity
"""

import json
from typing import Any

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.base import BaseRule
from app.schemas.waf import ToolCallRequest

logger = get_logger(__name__)


class ParameterValidationRule(BaseRule):
    """
    Validates parameter sizes and scans values recursively against blocklisted patterns.
    """

    @property
    def rule_name(self) -> str:
        return "parameter_validation"

    def _find_blocked_pattern(self, value: Any, blocked_patterns: list[str]) -> str | None:
        """
        Recursively traverse dictionaries, lists, and strings to check for prohibited patterns.
        """
        if isinstance(value, str):
            val_upper = value.upper()
            for pattern in blocked_patterns:
                pat_upper = pattern.upper()
                if pat_upper in val_upper:
                    return pattern
        elif isinstance(value, dict):
            for k, v in value.items():
                res = self._find_blocked_pattern(k, blocked_patterns)
                if res:
                    return res
                res = self._find_blocked_pattern(v, blocked_patterns)
                if res:
                    return res
        elif isinstance(value, (list, tuple, set)):
            for item in value:
                res = self._find_blocked_pattern(item, blocked_patterns)
                if res:
                    return res
        return None

    def _check_max_parameter_size(self, value: Any, max_size: int) -> tuple[bool, str | None]:
        """
        Recursively check that no individual string parameter exceeds max_size bytes.
        """
        if isinstance(value, str):
            if len(value.encode("utf-8")) > max_size:
                return (
                    False,
                    f"Parameter exceeds maximum allowed size of {max_size} bytes (got {len(value)} chars)",
                )
        elif isinstance(value, dict):
            for k, v in value.items():
                ok, err = self._check_max_parameter_size(v, max_size)
                if not ok:
                    return False, f"Parameter '{k}' {err}"
        elif isinstance(value, (list, tuple)):
            for idx, item in enumerate(value):
                ok, err = self._check_max_parameter_size(item, max_size)
                if not ok:
                    return False, f"Item at index {idx} {err}"
        return True, None

    async def evaluate(
        self,
        request: ToolCallRequest,
        agent: Agent,
        policy: Policy,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> tuple[bool, str | None]:
        """
        Evaluate parameter validation rules.
        """
        config = policy.policy_config or {}
        val_cfg = config.get("parameter_validation", {})
        max_param_size = val_cfg.get("max_parameter_size", 2048)
        max_total_size = val_cfg.get("max_total_size", 65536)
        blocked_patterns = val_cfg.get(
            "blocked_patterns",
            [
                "DROP TABLE",
                "--",
                "<script>",
                "UNION SELECT",
                "/etc/shadow",
                "../",
                ";--",
                "eval(",
                "exec(",
            ],
        )

        params = request.parameters or {}

        # 1. Total payload size check
        try:
            payload_str = json.dumps(params)
            payload_bytes = len(payload_str.encode("utf-8"))
            if payload_bytes > max_total_size:
                msg = f"Total parameters payload size ({payload_bytes} bytes) exceeds limit of {max_total_size} bytes"
                logger.warning(msg, extra={"agent_id": agent.agent_id, "size": payload_bytes})
                return False, msg
        except (TypeError, ValueError) as e:
            # Fail-closed: if parameters cannot be serialized, block the request.
            # This prevents non-serializable payloads from bypassing the size check.
            msg = f"Parameter payload is not JSON-serializable — request blocked: {type(e).__name__}"
            logger.warning(msg, extra={"agent_id": agent.agent_id, "error": str(e)})
            return False, msg

        # 2. Individual parameter size check
        ok, err = self._check_max_parameter_size(params, max_param_size)
        if not ok:
            logger.warning(f"Parameter size violation: {err}", extra={"agent_id": agent.agent_id})
            return False, err

        # 3. Prohibited pattern scan
        detected_pattern = self._find_blocked_pattern(params, blocked_patterns)
        if detected_pattern:
            msg = f"Parameter validation blocked simulated injection/forbidden pattern: '{detected_pattern}'"
            logger.warning(
                msg,
                extra={
                    "agent_id": agent.agent_id,
                    "tool": request.tool,
                    "pattern": detected_pattern,
                },
            )
            return False, msg

        return True, None
