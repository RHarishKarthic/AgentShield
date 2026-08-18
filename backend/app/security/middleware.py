"""
AgentShield Security Middleware.

Adds security headers, request ID tracking, and request logging
to every HTTP request.

WHY middleware:
- Security headers should be applied consistently to every response
- Request IDs enable correlation across logs, audit events, and errors
- Centralized request timing for performance monitoring
"""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store"

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assign a unique request ID to every request.

    The ID is:
    - Set in the request state (accessible in route handlers)
    - Returned in the X-Request-ID response header
    - Included in all log entries for this request
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Use client-provided ID if present, otherwise generate one
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
        request.state.request_id = request_id

        # Track timing
        start_time = time.time()

        response = await call_next(request)

        # Add request ID and timing to response
        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        # Log the request (skip health checks to reduce noise)
        if not request.url.path.startswith("/health"):
            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code}",
                extra={
                    "request_id": request_id,
                    "duration_ms": duration_ms,
                    "status_code": response.status_code,
                },
            )

        return response
