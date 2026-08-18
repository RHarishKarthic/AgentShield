"""
Shared API dependencies.

Provides reusable FastAPI dependency functions for
database sessions, authentication, and request context.
"""

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.security.authentication import require_waf_api_key


async def get_db(session: AsyncSession = Depends(get_db_session)) -> AsyncSession:
    """Dependency that provides a database session."""
    return session


async def get_request_id(request: Request) -> str:
    """Extract the request ID from the request state."""
    return getattr(request.state, "request_id", "unknown")


async def require_auth(api_key: str = Depends(require_waf_api_key)) -> str:
    """Dependency that requires WAF admin authentication."""
    return api_key
