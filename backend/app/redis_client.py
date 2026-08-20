"""
AgentShield Redis Client Module.

Provides async Redis connection with health checking and in-memory fallback.

WHY Redis:
- Rate limiting needs atomic counters with sub-ms latency (PS5.1-M02)
- Sequence tracking needs shared session state across requests (PS5.1-M05)
- In-memory Python dicts fail under concurrency and across processes
"""

import redis.asyncio as redis

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


def _safe_redis_url(url: str) -> str:
    """
    Strip credentials from a Redis URL for safe logging.
    e.g., redis://:secret@host:6379/0 -> redis://**redacted**@host:6379/0
    """
    if "@" in url:
        scheme_part, rest = url.split("@", 1)
        return f"{scheme_part.split('://')[0]}://**redacted**@{rest}"
    return url
# Initialised during app startup
_redis_client: redis.Redis | None = None


async def init_redis() -> None:
    """
    Initialise the Redis connection pool.

    Called during FastAPI startup event.
    """
    global _redis_client
    settings = get_settings()

    url = settings.redis_url
    try:
        _redis_client = redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        await _redis_client.ping()
        logger.info(
            "Redis connection established successfully",
            extra={"component": "redis", "url": _safe_redis_url(url)},
        )
    except Exception as e:
        # Use _safe_redis_url so credentials embedded in the URL are never written to logs
        logger.warning(
            "Redis connection failed on startup — initialising local fallback instance",
            extra={"component": "redis", "url": _safe_redis_url(url), "error": type(e).__name__},
        )
        # Initialise client without failing startup
        _redis_client = redis.from_url(url, decode_responses=True)


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_client
    if _redis_client:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        logger.info("Redis connection closed", extra={"component": "redis"})


def get_redis() -> redis.Redis:
    """
    Get the Redis client instance.

    Returns:
        The active Redis client.
    """
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
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
