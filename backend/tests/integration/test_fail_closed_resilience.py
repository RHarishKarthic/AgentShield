"""
Fail-Closed Resilience & Fault Tolerance Test Suite.

Validates that AgentShield maintains a secure, fail-closed posture during downstream failures,
deactivations, and malformed inputs.
"""

import httpx
import pytest

from app import database
from app.main import app
from app.schemas.agent import AgentUpdate
from app.schemas.tool import ToolUpdate
from app.services.agent_service import AgentService
from app.services.tool_service import ToolService


@pytest.mark.asyncio
async def test_deactivated_agent_rejection():
    """Deactivated agent is blocked immediately with 403."""
    async with database._session_factory() as db:
        await AgentService.update_agent(db, "support-agent", AgentUpdate(is_active=False))

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/v1/waf/intercept",
                json={
                    "agent_id": "support-agent",
                    "tool": "customer_database",
                    "operation": "get_customer",
                    "parameters": {"customer_id": 101},
                },
                headers={"X-Agent-API-Key": "agent-key-support-001"},
            )
            assert res.status_code == 403
            assert "inactive" in res.json()["detail"]
    finally:
        # Restore agent
        async with database._session_factory() as db:
            await AgentService.update_agent(db, "support-agent", AgentUpdate(is_active=True))


@pytest.mark.asyncio
async def test_deactivated_tool_rejection():
    """Calls targeting a deactivated tool are rejected with 503."""
    async with database._session_factory() as db:
        await ToolService.update_tool(db, "email_service", ToolUpdate(is_active=False))

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/v1/waf/intercept",
                json={
                    "agent_id": "support-agent",
                    "tool": "email_service",
                    "operation": "send",
                    "parameters": {
                        "recipient": "admin@example.com",
                        "subject": "Hi",
                        "body": "Msg",
                    },
                },
                headers={"X-Agent-API-Key": "agent-key-support-001"},
            )
            assert res.status_code == 503
            assert "deactivated" in res.json()["detail"]
    finally:
        # Restore tool
        async with database._session_factory() as db:
            await ToolService.update_tool(db, "email_service", ToolUpdate(is_active=True))


@pytest.mark.asyncio
async def test_downstream_tool_connection_error_resilience(monkeypatch):
    """If downstream tool crashes or is unreachable, WAF handles error cleanly without 500 crash."""

    async def mock_crashing_forward(tool, operation, parameters, timeout_seconds=10.0):
        return 502, {"error": "Connection refused to upstream tool"}

    from app.redis_client import get_redis
    from app.waf.forwarder import ToolForwarder

    monkeypatch.setattr(ToolForwarder, "forward_tool_call", mock_crashing_forward)

    redis_client = get_redis()
    session_id = "sess-crash-test"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ALLOW"
        assert data["error"] is not None
        assert "Connection refused" in data["error"]
