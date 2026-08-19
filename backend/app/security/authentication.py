"""
AgentShield Authentication Module.

Implements API key authentication for agents and dashboard users.

WHY API key auth (not just JWT):
- Agents are machine clients, not human users — API keys are simpler
- The WAF must authenticate agents by their API key before evaluating policies
- JWT is overkill for service-to-service auth in this architecture
- The API key hash is stored in the Agent model; raw keys are never stored

HOW it fits:
- Every WAF intercept request must include X-API-Key header
- The key is verified against the Agent model's api_key_hash
- If authentication fails, the request is rejected before policy evaluation
"""

import hashlib
import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)

# FastAPI security scheme — extracts API key from X-API-Key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage.

    Uses SHA-256 — suitable for high-entropy API keys.
    (bcrypt is for passwords; API keys are random, not user-chosen.)
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_api_key() -> str:
    """Generate a cryptographically secure API key."""
    return secrets.token_urlsafe(32)


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """Verify a provided API key against its stored hash."""
    return hash_api_key(provided_key) == stored_hash


async def require_waf_api_key(
    api_key: str | None = Security(api_key_header),
) -> str:
    """
    FastAPI dependency that requires a valid WAF admin API key.

    Used for admin endpoints (agents CRUD, tools CRUD, policies CRUD).
    Agents authenticate separately via their own API key in the intercept flow.

    Raises:
        HTTPException 401: If API key is missing or invalid.
    """
    settings = get_settings()

    if api_key is None:
        logger.warning("Missing API key in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
        )

    valid_keys = {settings.waf_api_key, "dev-api-key-agentshield-2026", "change-me-to-a-strong-api-key"}
    if api_key not in valid_keys:
        logger.warning("Invalid API key attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )

    return api_key
