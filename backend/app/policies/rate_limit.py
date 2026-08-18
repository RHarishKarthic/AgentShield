"""
Rate Limit Policy Rule.

Implements atomic sliding-window distributed rate limiting using Redis.
Guarantees strict concurrency isolation without race condition bypasses.
"""

import secrets
import time

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.base import BaseRule
from app.schemas.waf import ToolCallRequest

logger = get_logger(__name__)


class RateLimitRule(BaseRule):
    """
    Atomic sliding-window rate limiter backed by Redis sorted sets.
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
        Atomically evaluate rate limit for (agent_id, tool).
        """
        config = policy.policy_config or {}
        rate_cfg = config.get("rate_limit", {})
        max_requests = rate_cfg.get("requests", 5)
        window_seconds = rate_cfg.get("window_seconds", 60)

        # If rate limit is 0 or unconfigured, allow
        if max_requests <= 0:
            return True, None

        if redis_client is None:
            logger.error("Rate limit check failed: Redis client unavailable (fail-closed)")
            return (
                False,
                "Rate limiting service unavailable — access blocked by fail-closed policy",
            )

        now = time.time()
        window_start = now - window_seconds
        redis_key = f"ratelimit:{agent.agent_id}:{request.tool}"
        unique_req_id = f"{now}:{secrets.token_hex(4)}"

        try:
            # Atomic single pipeline: prune expired -> add current request -> check cardinality
            pipe = redis_client.pipeline()
            pipe.zremrangebyscore(redis_key, 0, window_start)
            pipe.zadd(redis_key, {unique_req_id: now})
            pipe.zcard(redis_key)
            pipe.expire(redis_key, window_seconds * 2)
            results = await pipe.execute()

            current_count = results[2]  # cardinality after atomic insert

            if current_count > max_requests:
                # Remove this over-limit entry to maintain accurate window state
                await redis_client.zrem(redis_key, unique_req_id)

                msg = (
                    f"Rate limit exceeded: Agent '{agent.agent_id}' called tool '{request.tool}' "
                    f"{current_count} times in the last {window_seconds}s (limit: {max_requests} calls/{window_seconds}s)"
                )
                logger.warning(
                    msg,
                    extra={
                        "agent_id": agent.agent_id,
                        "tool": request.tool,
                        "count": current_count,
                    },
                )
                return False, msg

            return True, None

        except redis.RedisError as e:
            logger.error(f"Redis rate limit error: {e!s}", extra={"error": str(e)})
            return False, f"Rate limit check encountered an error: {e!s}"
