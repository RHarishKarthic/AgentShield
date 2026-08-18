"""
AgentShield Redis Client Module.

Provides async Redis connection with health checking and fail-safe behavior.

WHY Redis:
- Rate limiting needs atomic counters with sub-ms latency (PS5.1-M02)
- Sequence tracking needs shared session state across requests (PS5.1-M05)
- In-memory Python dicts fail under concurrency and across processes

FAIL-SAFE BEHAVIOR:
If Redis is unavailable, the WAF defaults to BLOCK (deny-by-default).
This prevents a Redis outage from silently disabling rate limits or
sequence rules — a security product must fail closed, not open.
"""

import redis.asyncio as redis

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)

# Initialised during app startup
_redis_client: redis.Redis | None = None


async def init_redis() -> None:
    """
    Initialise the Redis connection pool.

    Called during FastAPI startup event.
    """
    global _redis_client
    settings = get_settings()

    _redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password or None,
        db=settings.redis_db,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )

    # Verify connection
    try:
        await _redis_client.ping()
        logger.info(
            "Redis connection established",
            extra={"component": "redis", "host": settings.redis_host},
        )
    except redis.ConnectionError as e:
        logger.error(
            "Redis connection failed on startup — WAF will fail-closed",
            extra={"component": "redis", "error": str(e)},
        )


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        logger.info("Redis connection closed", extra={"component": "redis"})


def get_redis() -> redis.Redis:
    """
    Get the Redis client instance.

    Returns:
        The active Redis client.

    Raises:
        RuntimeError: If Redis has not been initialised.
    """
    if _redis_client is None:
        raise RuntimeError("Redis not initialised. Call init_redis() first.")
    return _redis_client


async def check_redis_health() -> bool:
    """
    Check Redis connectivity for health endpoint.

    Returns True if PING succeeds, False otherwise.
    """
    if _redis_client is None:
        return False
    try:
        return await _redis_client.ping()
    except Exception as e:
        logger.error(
            "Redis health check failed",
            extra={"component": "redis", "error": str(e)},
        )
        return False


async def safe_redis_operation(operation, default_on_failure=None):
    """
    Execute a Redis operation with fail-safe handling.

    If Redis is unavailable, returns default_on_failure.
    Callers should interpret None as "Redis unavailable" and
    apply fail-closed security behavior.

    Args:
        operation: Async callable that performs the Redis operation.
        default_on_failure: Value to return if Redis is unavailable.

    Returns:
        The operation result, or default_on_failure on error.
    """
    try:
        return await operation()
    except (redis.ConnectionError, redis.TimeoutError, redis.RedisError) as e:
        logger.error(
            "Redis operation failed — returning fail-safe default",
            extra={"component": "redis", "error": str(e)},
        )
        return default_on_failure
