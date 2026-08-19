"""
AgentShield — Main Application Entry Point.

This is the FastAPI application factory that wires together:
- Database and Redis connections (startup/shutdown lifecycle)
- Security middleware (headers, request IDs)
- API routes (health, agents, tools, policies, WAF, audit)
- WebSocket endpoint for real-time dashboard events
- CORS configuration
- Global exception handling

The app is designed to be started with:
    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.agents import router as agents_router
from app.api.v1.audit import router as audit_router

# API route imports
from app.api.v1.health import router as health_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.policies import router as policies_router
from app.api.v1.tools import router as tools_router
from app.api.v1.waf import router as waf_router
from app.config import get_settings
from app.database import close_db, init_db
from app.logging_config import get_logger, setup_logging
from app.redis_client import close_redis, init_redis
from app.security.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.websocket.manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup (init DB, Redis, logging) and shutdown (cleanup).
    This replaces the deprecated @app.on_event("startup/shutdown") pattern.
    """
    settings = get_settings()

    # --- STARTUP ---
    setup_logging(settings.log_level)
    logger = get_logger(__name__)
    logger.info(
        f"Starting {settings.app_name} v1.0.0",
        extra={"component": "startup", "environment": settings.app_env},
    )

    try:
        await init_db()
    except Exception as e:
        logger.error(f"Database initialisation warning: {e}", extra={"error": str(e)})

    try:
        await init_redis()
    except Exception as e:
        logger.error(f"Redis initialisation warning: {e}", extra={"error": str(e)})

    logger.info("All services initialised — application ready")

    yield  # Application runs here

    # --- SHUTDOWN ---
    logger.info("Shutting down...")
    try:
        await close_redis()
    except Exception:
        pass
    try:
        await close_db()
    except Exception:
        pass
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    """
    Application factory — creates and configures the FastAPI app.

    Returns:
        Configured FastAPI application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title="AgentShield — Agent WAF",
        description=(
            "A production-ready Agent Web Application Firewall that sits as a "
            "transparent security proxy between AI agents and their tools, "
            "enforcing rate limits, parameter validation, data-scope rules, "
            "and sequence policies in real time."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # --- Middleware (order matters: outermost first) ---
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Global Exception Handler ---
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """
        Catch-all exception handler.

        Logs the full error internally but returns a safe message to the client.
        Never exposes stack traces to users.
        """
        logger = get_logger("exception_handler")
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            f"Unhandled exception: {type(exc).__name__}",
            extra={"request_id": request_id, "error": str(exc)},
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again later.",
                "request_id": request_id,
            },
        )

    # --- Routes ---
    app.include_router(health_router)
    app.include_router(agents_router, prefix="/api/v1")
    app.include_router(tools_router, prefix="/api/v1")
    app.include_router(policies_router, prefix="/api/v1")
    app.include_router(waf_router, prefix="/api/v1")
    app.include_router(audit_router, prefix="/api/v1")
    app.include_router(metrics_router, prefix="/api/v1")

    # --- WebSocket ---
    @app.websocket("/ws/events")
    async def websocket_events(websocket: WebSocket):
        """
        WebSocket endpoint for real-time dashboard events.

        The dashboard connects here to receive live audit events
        as they are created by the WAF.
        """
        await ws_manager.connect(websocket)
        try:
            while True:
                # Keep connection alive; client can send pings
                await websocket.receive_text()
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)

    return app


# Create the application instance
app = create_app()
