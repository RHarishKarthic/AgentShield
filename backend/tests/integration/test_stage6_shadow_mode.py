"""
Stage 6 Integration Test Suite — Shadow Mode Calibration.

Tests:
1. Shadow mode evaluates policy rules, creates audit records with SHADOW_WOULD_BLOCK disposition, but permits downstream tool execution.
2. Direct comparison between enforcement mode (blocks with 403) and shadow mode (allows with 200 + warning).
"""

import httpx
import pytest

from app.main import app
from app.redis_client import get_redis
from tools.customer_service.main import app as customer_app


@pytest.fixture(autouse=True)
def mock_forwarder(monkeypatch):
    """Mock forwarder to route directly to customer service ASGI app and track invocations."""
    invocations = []

    async def mock_forward(tool, operation, parameters, timeout_seconds=10.0):
        invocations.append({"tool": tool.tool_id, "operation": operation, "params": parameters})
        transport = httpx.ASGITransport(app=customer_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(f"/{operation}", json=parameters)
            return resp.status_code, resp.json()

    from app.waf.forwarder import ToolForwarder

    monkeypatch.setattr(ToolForwarder, "forward_tool_call", mock_forward)
    return invocations


@pytest.mark.asyncio
async def test_shadow_mode_logs_violation_and_allows_tool_execution(mock_forwarder):
    """
    BONUS REQUIREMENT: Shadow mode logs what it would have blocked without actually blocking.
    """
    redis_client = get_redis()
    session_id = "sess-shadow-test-01"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # shadow-agent uses shadow-audit-policy (mode='shadow', customer_ids=[101, 102])
        # Calling with customer_id=103 is OUT OF SCOPE for shadow-audit-policy
        res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "shadow-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 103},
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-shadow-002"},
        )

        # In SHADOW mode, HTTP status is 200 (not 403)
        assert res.status_code == 200
        data = res.json()

        # Disposition is SHADOW_WOULD_BLOCK
        assert data["status"] == "SHADOW_WOULD_BLOCK"
        assert data["waf_evaluation"]["decision"] == "SHADOW_WOULD_BLOCK"
        assert data["waf_evaluation"]["mode"] == "shadow"
        assert data["waf_evaluation"]["blocked_by_rule"] == "data_scope"
        assert data["waf_evaluation"]["rules"]["data_scope"] == "BLOCK"
        assert "[SHADOW MODE]" in data["waf_evaluation"]["reason"]

        # Crucial: Downstream tool WAS executed and returned real customer data!
        assert data["result"] is not None
        assert data["result"]["status"] == "success"
        assert data["result"]["customer"]["customer_id"] == 103
        assert len(mock_forwarder) == 1, "Downstream tool must be called in shadow mode"

        # Verify audit log recorded SHADOW_WOULD_BLOCK
        audit_res = await client.get("/api/v1/audit?agent_id=shadow-agent&limit=1")
        assert audit_res.status_code == 200
        latest_audit = audit_res.json()["items"][0]
        assert latest_audit["decision"] == "SHADOW_WOULD_BLOCK"
        assert latest_audit["mode"] == "shadow"
        assert latest_audit["blocked_by_rule"] == "data_scope"


@pytest.mark.asyncio
async def test_enforcement_vs_shadow_mode_contrast(mock_forwarder):
    """
    Verify side-by-side behavioral contrast:
    - Enforcement policy blocks and HALTS tool execution.
    - Shadow policy records violation and PERMITS tool execution.
    """
    redis_client = get_redis()
    session_id = "sess-contrast-01"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Enforcement mode agent (support-agent) with injection attempt -> MUST BE BLOCKED
        enf_res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "update_customer",
                "parameters": {
                    "customer_id": 101,
                    "notes": "'; DROP TABLE customers;--",
                },
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert enf_res.status_code == 403
        assert enf_res.json()["status"] == "BLOCK"
        assert len(mock_forwarder) == 0, "Tool must NOT be called in enforcement mode block"

        # 2. Shadow mode agent (shadow-agent) with injection attempt -> MUST ALLOW WITH SHADOW WARNING
        shadow_res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "shadow-agent",
                "tool": "customer_database",
                "operation": "update_customer",
                "parameters": {
                    "customer_id": 101,
                    "notes": "'; DROP TABLE customers;--",
                },
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-shadow-002"},
        )
        assert shadow_res.status_code == 200
        assert shadow_res.json()["status"] == "SHADOW_WOULD_BLOCK"
        assert len(mock_forwarder) == 1, "Tool MUST be called in shadow mode"
