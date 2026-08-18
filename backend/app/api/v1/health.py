"""
Health Check Endpoints.

Provides /health and /ready endpoints for monitoring.

/health — Liveness probe: is the process alive?
/ready  — Readiness probe: are all dependencies (DB, Redis) connected?

WHY both:
- Kubernetes/ECS use liveness to restart crashed containers
- /health: Liveness probe (process is running)
- /ready: Readiness probe (DB and Redis are reachable)
"""

from fastapi import APIRouter

from app.database import check_db_health
from app.logging_config import get_logger
from app.redis_client import check_redis_health

logger = get_logger(__name__)

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    summary="Liveness check",
    description="Returns 200 if the application process is running.",
    response_model=dict,
)
async def health_check() -> dict:
    """
    Basic liveness check.

    Returns 200 as long as the FastAPI process is running.
    Does NOT check dependencies — that's what /ready is for.
    """
    return {"status": "healthy", "service": "AgentShield"}


@router.get(
    "/ready",
    summary="Readiness check",
    description="Returns 200 if all dependencies (PostgreSQL, Redis) are reachable.",
    response_model=dict,
)
async def readiness_check() -> dict:
    """
    Readiness check — verifies all critical dependencies.

    Checks:
    - PostgreSQL connectivity
    - Redis connectivity

    Returns 503 if any dependency is unreachable.
    """
    db_healthy = await check_db_health()
    redis_healthy = await check_redis_health()

    dependencies = {
        "postgresql": "connected" if db_healthy else "unavailable",
        "redis": "connected" if redis_healthy else "unavailable",
    }

    all_healthy = db_healthy and redis_healthy

    if not all_healthy:
        logger.warning(
            "Readiness check failed",
            extra={"component": "health", "dependencies": dependencies},
        )
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "service": "AgentShield",
                "dependencies": dependencies,
            },
        )

    return {
        "status": "ready",
        "service": "AgentShield",
        "dependencies": dependencies,
    }
