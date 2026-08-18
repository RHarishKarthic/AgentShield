"""
Stage 3 Integration Test Suite — WAF Core and Policy Engine Proxy.

Tests:
1. Transparent interception and forwarding of allowed tool calls to real tool services
2. Authentication and authorization enforcement for agents
3. Target tool registry lookup and validation
4. Structured WAF evaluation metadata and timings
"""

import httpx
import pytest

from app.main import app
from tools.customer_service.main import app as customer_app


@pytest.mark.asyncio
async def test_waf_intercept_allowed_flow(monkeypatch):
    """
    Test end-to-end WAF interception of a valid tool call.
    Verifies transparent proxy forwarding and structured policy evaluation.
    """

    # Route tool requests to the in-process customer_app
    async def mock_forward(tool, operation, parameters, timeout_seconds=10.0):
        transport = httpx.ASGITransport(app=customer_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(f"/{operation}", json=parameters)
            return resp.status_code, resp.json()

    from app.redis_client import get_redis
    from app.waf.forwarder import ToolForwarder

    monkeypatch.setattr(ToolForwarder, "forward_tool_call", mock_forward)

    # Pre-seed session history so sequence rule passes
    redis_client = get_redis()
    await redis_client.rpush("session:sequence:sess-test-001", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "agent_id": "support-agent",
            "tool": "customer_database",
            "operation": "get_customer",
            "parameters": {"customer_id": 101},
            "session_id": "sess-test-001",
        }
        res = await client.post(
            "/api/v1/waf/intercept",
            json=payload,
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ALLOW"
        assert data["tool"] == "customer_database"
        assert data["operation"] == "get_customer"
        assert data["result"]["status"] == "success"
        assert data["result"]["customer"]["customer_id"] == 101

        # Check WAF evaluation metadata
        waf_eval = data["waf_evaluation"]
        assert waf_eval["decision"] == "ALLOW"
        assert waf_eval["mode"] == "enforcement"
        assert waf_eval["policy_id"] == "support-agent-policy"
        assert waf_eval["rules"]["authentication"] == "ALLOW"
        assert waf_eval["execution_time_ms"] >= 0.0


@pytest.mark.asyncio
async def test_waf_rejects_unknown_agent():
    """WAF rejects unregistered agent with 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "agent_id": "rogue-unregistered-agent",
            "tool": "customer_database",
            "operation": "get_customer",
            "parameters": {"customer_id": 101},
        }
        res = await client.post("/api/v1/waf/intercept", json=payload)
        assert res.status_code == 401
        assert "not registered" in res.json()["detail"]


@pytest.mark.asyncio
async def test_waf_rejects_invalid_api_key():
    """WAF rejects registered agent presenting incorrect API key with 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "agent_id": "support-agent",
            "tool": "customer_database",
            "operation": "get_customer",
            "parameters": {"customer_id": 101},
        }
        res = await client.post(
            "/api/v1/waf/intercept",
            json=payload,
            headers={"X-Agent-API-Key": "invalid-tampered-key-999"},
        )
        assert res.status_code == 401
        assert "Invalid API key" in res.json()["detail"]


@pytest.mark.asyncio
async def test_waf_rejects_unknown_tool():
    """WAF rejects requests targeting unregistered tool with 404."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "agent_id": "support-agent",
            "tool": "unregistered_crypto_miner",
            "operation": "mine",
            "parameters": {},
        }
        res = await client.post(
            "/api/v1/waf/intercept",
            json=payload,
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res.status_code == 404
        assert "not registered" in res.json()["detail"]
