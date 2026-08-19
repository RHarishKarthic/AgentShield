"""
Rate Limit Policy Rule.

Implements a sliding-window rate limiter backed by Redis with in-memory fallback.
Restricts the frequency of tool calls per agent/tool within a specified timeframe.
"""

import secrets
import time
from collections import defaultdict

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.base import BaseRule
from app.schemas.waf import ToolCallRequest

logger = get_logger(__name__)

# In-memory sliding window fallback for resilient local & cloud operation
_IN_MEMORY_WINDOWS: dict[str, list[float]] = defaultdict(list)


class RateLimitRule(BaseRule):
    """
    Validates that tool call frequency does not exceed policy thresholds.
    """

    @property
    def rule_name(self) -> str:
        return "rate_limit"

    async def evaluate(
        self,
        request: ToolCallRequest,
        agent: Agent,
        policy: Policy,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> tuple[bool, str | None]:
        """
        Evaluate rate limit for the given agent and tool using sliding window algorithm.
        """
        config = policy.policy_config or {}
        max_requests: int = config.get("rate_limit_max_requests", 5)
        window_seconds: int = config.get("rate_limit_window_seconds", 60)

        now = time.time()
        window_start = now - window_seconds
        redis_key = f"ratelimit:{agent.agent_id}:{request.tool}"
        unique_req_id = f"{now}:{secrets.token_hex(4)}"

        # Try Redis atomic sliding window
        if redis_client is not None:
            try:
                pipe = redis_client.pipeline()
                pipe.zremrangebyscore(redis_key, 0, window_start)
                pipe.zadd(redis_key, {unique_req_id: now})
                pipe.zcard(redis_key)
                pipe.expire(redis_key, window_seconds * 2)
                results = await pipe.execute()

                current_count = results[2]

                if current_count > max_requests:
                    await redis_client.zrem(redis_key, unique_req_id)
                    msg = (
                        f"Rate limit exceeded: Agent '{agent.agent_id}' called tool '{request.tool}' "
                        f"{current_count} times in the last {window_seconds}s (limit: {max_requests} calls/{window_seconds}s)"
                    )
                    logger.warning(msg, extra={"agent_id": agent.agent_id, "tool": request.tool, "count": current_count})
                    return False, msg

                return True, None

            except Exception as e:  # noqa: BLE001
                logger.warning(f"Redis rate limit fallback to in-memory store: {e!s}")

        # In-memory sliding window fallback
        timestamps = _IN_MEMORY_WINDOWS[redis_key]
        _IN_MEMORY_WINDOWS[redis_key] = [t for t in timestamps if t > window_start]
        _IN_MEMORY_WINDOWS[redis_key].append(now)

        current_count = len(_IN_MEMORY_WINDOWS[redis_key])
        if current_count > max_requests:
            _IN_MEMORY_WINDOWS[redis_key].pop()
            msg = (
                f"Rate limit exceeded: Agent '{agent.agent_id}' called tool '{request.tool}' "
                f"{current_count} times in the last {window_seconds}s (limit: {max_requests} calls/{window_seconds}s)"
            )
            return False, msg

        return True, None
