"""
Stage 4 Integration Test Suite — Policy Rules & Criteria Verification.

Directly verifies Security Policy Success Criteria 1-4 via POST /api/v1/waf/intercept:
1. Rate limiting enforcement under rapid tool calls
2. Parameter injection blocking (SQL injection keywords)
3. Out-of-scope customer data access blocking
4. Sequence rule enforcement (prerequisites must be met)
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
async def test_criterion_1_rate_limiting():
    """
    SUCCESS CRITERION 1: Rate limit fires correctly after N calls within window.
    """
    redis_client = get_redis()
    agent_id = "support-agent"
    tool_id = "customer_database"
    await redis_client.delete(f"ratelimit:{agent_id}:{tool_id}")

    # Set up session history so sequence check doesn't interfere
    session_id = "sess-ratelimit-test"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Default policy allows 5 requests per 60 seconds
        for i in range(1, 6):
            res = await client.post(
                "/api/v1/waf/intercept",
                json={
                    "agent_id": agent_id,
                    "tool": tool_id,
                    "operation": "get_customer",
                    "parameters": {"customer_id": 101},
                    "session_id": session_id,
                },
                headers={"X-Agent-API-Key": "agent-key-support-001"},
            )
            assert res.status_code == 200, f"Request {i} should be allowed"
            assert res.json()["status"] == "ALLOW"

        # 6th request MUST be BLOCKED with 403 Forbidden
        res_blocked = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": agent_id,
                "tool": tool_id,
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res_blocked.status_code == 403
        data = res_blocked.json()
        assert data["status"] == "BLOCK"
        assert data["waf_evaluation"]["blocked_by_rule"] == "rate_limit"
        assert data["waf_evaluation"]["rules"]["rate_limit"] == "BLOCK"
        assert "Rate limit exceeded" in data["error"]


@pytest.mark.asyncio
async def test_criterion_2_parameter_injection_block():
    """
    SUCCESS CRITERION 2: Parameter blocklist catches simulated injection attempt.
    """
    redis_client = get_redis()
    session_id = "sess-injection-test"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "update_customer",
                "parameters": {
                    "customer_id": 101,
                    "name": "Alice'; DROP TABLE customers;--",
                },
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res.status_code == 403
        data = res.json()
        assert data["status"] == "BLOCK"
        assert data["waf_evaluation"]["blocked_by_rule"] == "parameter_validation"
        assert data["waf_evaluation"]["rules"]["parameter_validation"] == "BLOCK"
        assert "DROP TABLE" in data["error"]


@pytest.mark.asyncio
async def test_criterion_3_out_of_scope_data_block():
    """
    SUCCESS CRITERION 3: Out-of-scope data access is blocked.
    """
    redis_client = get_redis()
    session_id = "sess-scope-test"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Requesting restricted customer_id = 999
        res = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 999},
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res.status_code == 403
        data = res.json()
        assert data["status"] == "BLOCK"
        assert data["waf_evaluation"]["blocked_by_rule"] == "data_scope"
        assert data["waf_evaluation"]["rules"]["data_scope"] == "BLOCK"
        assert "Customer ID 999 is not in agent 'support-agent' authorized customer scope" in data["error"]


@pytest.mark.asyncio
async def test_criterion_4_sequence_rule_enforcement():
    """
    SUCCESS CRITERION 4: Sequence rule enforcement correctly blocks out-of-order call.
    """
    redis_client = get_redis()
    session_id = "sess-seq-e2e-99"
    await redis_client.delete(f"session:sequence:{session_id}")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt get_customer without authenticate first -> MUST BLOCK
        res_unauth = await client.post(
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
        assert res_unauth.status_code == 403
        data = res_unauth.json()
        assert data["status"] == "BLOCK"
        assert data["waf_evaluation"]["blocked_by_rule"] == "sequence"
        assert data["waf_evaluation"]["rules"]["sequence"] == "BLOCK"

        # 2. Step 1: Authenticate customer -> MUST ALLOW
        res_auth = await client.post(
            "/api/v1/waf/intercept",
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "authenticate",
                "parameters": {"customer_id": 101},
                "session_id": session_id,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        assert res_auth.status_code == 200
        assert res_auth.json()["status"] == "ALLOW"

        # 3. Step 2: Now retry get_customer -> MUST ALLOW
        res_allowed = await client.post(
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
        assert res_allowed.status_code == 200
        assert res_allowed.json()["status"] == "ALLOW"
        assert res_allowed.json()["result"]["customer"]["name"] == "Alice Johnson"
