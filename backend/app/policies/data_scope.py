"""
Data Scope Policy Rule.

Enforces resource-level data authorization.
Rejects calls referencing data outside the agent's declared scope:
- Customer IDs
- File system paths
- Email domains
- Department partitions
"""

from typing import Any

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.base import BaseRule
from app.schemas.waf import ToolCallRequest

logger = get_logger(__name__)


class DataScopeRule(BaseRule):
    """
    Enforces that all data access targets fall strictly within the agent's authorized scope.
    """

    @property
    def rule_name(self) -> str:
        return "data_scope"

    def _extract_customer_id(self, params: dict[str, Any]) -> int | None:
        """Extract customer_id from parameters if present."""
        if "customer_id" in params:
            try:
                return int(params["customer_id"])
            except (ValueError, TypeError):
                pass
        return None

    def _extract_file_path(self, params: dict[str, Any]) -> str | None:
        """Extract file_path from parameters if present."""
        if "file_path" in params and isinstance(params["file_path"], str):
            return params["file_path"].strip()
        return None

    def _extract_email_recipient(self, params: dict[str, Any]) -> str | None:
        """Extract recipient from parameters if present."""
        if "recipient" in params and isinstance(params["recipient"], str):
            return params["recipient"].strip()
        return None

    def _extract_department(self, params: dict[str, Any]) -> str | None:
        """Extract department from parameters if present."""
        if "department" in params and isinstance(params["department"], str):
            return params["department"].strip()
        return None

    async def evaluate(
        self,
        request: ToolCallRequest,
        agent: Agent,
        policy: Policy,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> tuple[bool, str | None]:
        """
        Evaluate data scope policy rules.
        """
        config = policy.policy_config or {}
        scope_cfg = config.get("data_scope", {})

        allowed_cust_ids: list[int] = scope_cfg.get("customer_ids", [])
        allowed_paths: list[str] = scope_cfg.get("allowed_file_paths", [])
        allowed_domains: list[str] = scope_cfg.get("allowed_email_domains", [])
        allowed_depts: list[str] = scope_cfg.get("departments", [])

        params = request.parameters or {}

        # 1. Customer ID Scope Check
        target_cust_id = self._extract_customer_id(params)
        if target_cust_id is not None and allowed_cust_ids:
            if target_cust_id not in allowed_cust_ids:
                msg = (
                    f"Out-of-scope data access: Customer ID {target_cust_id} is not in agent "
                    f"'{agent.agent_id}' authorized customer scope: {allowed_cust_ids}"
                )
                logger.warning(
                    msg,
                    extra={"agent_id": agent.agent_id, "customer_id": target_cust_id},
                )
                return False, msg

        # 2. File Path Scope Check
        target_path = self._extract_file_path(params)
        if target_path and allowed_paths:
            is_path_allowed = any(target_path.startswith(prefix) for prefix in allowed_paths)
            if not is_path_allowed:
                msg = (
                    f"Out-of-scope file access: Path '{target_path}' is outside authorized directories: {allowed_paths}"
                )
                logger.warning(msg, extra={"agent_id": agent.agent_id, "file_path": target_path})
                return False, msg

        # 3. Email Domain Scope Check
        target_recipient = self._extract_email_recipient(params)
        if target_recipient and allowed_domains:
            domain_allowed = any(target_recipient.lower().endswith(dom.lower()) for dom in allowed_domains)
            if not domain_allowed:
                msg = f"Out-of-scope email recipient: '{target_recipient}' does not belong to authorized domains: {allowed_domains}"
                logger.warning(
                    msg,
                    extra={"agent_id": agent.agent_id, "recipient": target_recipient},
                )
                return False, msg

        # 4. Department Scope Check
        target_dept = self._extract_department(params)
        if target_dept and allowed_depts:
            if target_dept not in allowed_depts:
                msg = (
                    f"Out-of-scope department query: '{target_dept}' is not in authorized departments: {allowed_depts}"
                )
                logger.warning(msg, extra={"agent_id": agent.agent_id, "department": target_dept})
                return False, msg

        return True, None
