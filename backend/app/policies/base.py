"""
Base Rule Interface for WAF Security Rules.

Every WAF policy rule implements this common evaluation contract.
"""

from abc import ABC, abstractmethod

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.policy import Policy
from app.schemas.waf import ToolCallRequest


class BaseRule(ABC):
    """
    Abstract contract for a WAF security rule evaluator.
    """

    @property
    @abstractmethod
    def rule_name(self) -> str:
        """Identifier of this rule (e.g. 'rate_limit', 'parameter_validation')."""

    @abstractmethod
    async def evaluate(
        self,
        request: ToolCallRequest,
        agent: Agent,
        policy: Policy,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> tuple[bool, str | None]:
        """
        Evaluate the rule against the incoming tool call request.

        Returns:
            tuple[bool, str | None]: (is_allowed, block_reason_if_not_allowed)
        """
