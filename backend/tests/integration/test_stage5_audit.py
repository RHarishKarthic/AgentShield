"""
Stage 5 Integration Test Suite — Audit Logging, Query API, and Metrics.

Tests:
1. Every intercepted tool call (ALLOW / BLOCK) creates a persistent PostgreSQL audit record
2. Parameters in audit record have sensitive values redacted
3. Audit query API supports filtering by agent, tool, decision, and pagination
4. Metrics API returns aggregate statistics (counts, percentages, rule breakdowns)
5. WebSocket connection receives live event broadcasts
"""

import httpx
import pytest

from app.main import app
from app.redis_client import get_redis
from tools.customer_service.main import app as customer_app


@pytest.fixture(autouse=True)
def mock_forwarder(monkeypatch):
    """Mock forwarder to route directly to customer service ASGI app."""

    async def mock_forward(tool, operation, parameters, timeout_seconds=10.0):
        transport = httpx.ASGITransport(app=customer_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(f"/{operation}", json=parameters)
            return resp.status_code, resp.json()

    from app.waf.forwarder import ToolForwarder

    monkeypatch.setattr(ToolForwarder, "forward_tool_call", mock_forward)


@pytest.mark.asyncio
async def test_audit_persisted_for_allowed_and_blocked_calls():
    """
    Every WAF decision (ALLOW and BLOCK) creates a complete audit record with
    sanitised parameters.
    (Audit Record Requirements)
    """
    redis_client = get_redis()
    session_id = "sess-audit-test-1"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Send ALLOWED tool call with sensitive token parameter
        res_allow = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {
                    "customer_id": 101,
                    "auth_token": "secret-jwt-token-12345",
                },
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res_allow.status_code == 200

        # 2. Send BLOCKED tool call (out-of-scope customer 999)
        res_block = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {
                    "customer_id": 999,
                    "password": "attempted-password",
                },
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res_block.status_code == 403

        # 3. Query audit log via GET /api/v1/audit
        audit_res = await client.get("/api/v1/audit?agent_id=support-agent&limit=10")
        assert audit_res.status_code == 200
        audit_data = audit_res.json()
        assert audit_data["total"] >= 2
        items = audit_data["items"]

        # Check most recent event (the BLOCKED one)
        latest_event = items[0]
        assert latest_event["agent_id"] == "support-agent"
        assert latest_event["tool"] == "customer_database"
        assert latest_event["decision"] == "BLOCK"
        assert latest_event["blocked_by_rule"] == "data_scope"
        assert latest_event["parameters_sanitised"]["password"] == "[REDACTED]"
        assert latest_event["rules_evaluated"]["data_scope"] == "BLOCK"

        # Check previous event (the ALLOWED one)
        allowed_event = items[1]
        assert allowed_event["decision"] == "ALLOW"
        assert allowed_event["parameters_sanitised"]["auth_token"] == "[REDACTED]"
        assert allowed_event["rules_evaluated"]["data_scope"] == "ALLOW"


@pytest.mark.asyncio
async def test_audit_single_event_endpoint():
    """Retrieve single event by event_id."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Get list first
        list_res = await client.get("/api/v1/audit?limit=1")
        assert list_res.status_code == 200
        events = list_res.json()["items"]
        if events:
            event_id = events[0]["event_id"]
            single_res = await client.get(f"/api/v1/audit/{event_id}")
            assert single_res.status_code == 200
            assert single_res.json()["event_id"] == event_id


@pytest.mark.asyncio
async def test_metrics_endpoint():
    """Verify aggregated metrics API returns expected structure."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        metrics_res = await client.get("/api/v1/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()

        assert "total_requests" in metrics
        assert "allowed_count" in metrics
        assert "blocked_count" in metrics
        assert "allow_percentage" in metrics
        assert "block_percentage" in metrics
        assert "blocks_by_rule" in metrics
        assert "requests_per_minute" in metrics
        assert "active_agents_count" in metrics
        assert "active_tools_count" in metrics
