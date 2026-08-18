"""
Concurrency Test Suite — High-Throughput Parallel WAF Interception.

Validates:
1. Exact rate-limit enforcement under high concurrency (no race-condition bypasses)
2. Multi-agent concurrent session isolation without cross-talk
3. Database connection pool and Redis pipeline stability under parallel bursts
"""

import asyncio

import httpx
import pytest

from app.main import app
from app.redis_client import get_redis
from tools.customer_service.main import app as customer_app


@pytest.fixture(autouse=True)
def mock_forwarder(monkeypatch):
    """Route tool calls in-process."""

    async def mock_forward(tool, operation, parameters, timeout_seconds=10.0):
        transport = httpx.ASGITransport(app=customer_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(f"/{operation}", json=parameters)
            return resp.status_code, resp.json()

    from app.waf.forwarder import ToolForwarder

    monkeypatch.setattr(ToolForwarder, "forward_tool_call", mock_forward)


@pytest.mark.asyncio
async def test_concurrent_rate_limiting_exactness():
    """
    Fire 20 simultaneous concurrent requests against a policy configured for 5 req/min.
    Verifies that EXACTLY 5 requests succeed (ALLOW) and EXACTLY 15 are blocked (BLOCK).
    Proves atomic Redis sliding-window prevents race conditions under high concurrency.
    """
    redis_client = get_redis()
    agent_id = "support-agent"
    tool_id = "customer_database"
    await redis_client.delete(f"ratelimit:{agent_id}:{tool_id}")

    session_id = "sess-concurrent-burst-01"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:

        async def make_request(idx: int):
            return await client.post(
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

        # Launch 20 parallel requests simultaneously
        responses = await asyncio.gather(*[make_request(i) for i in range(20)])

        status_codes = [r.status_code for r in responses]
        allowed_count = status_codes.count(200)
        blocked_count = status_codes.count(403)

        assert allowed_count == 5, f"Expected exactly 5 allowed requests, got {allowed_count}"
        assert blocked_count == 15, f"Expected exactly 15 blocked requests, got {blocked_count}"


@pytest.mark.asyncio
async def test_concurrent_multi_session_isolation():
    """
    Simultaneously execute 4 independent agent sessions in parallel.
    Half are properly authenticated, half are unauthenticated.
    Verifies no cross-session state contamination occurs under concurrency.
    """
    redis_client = get_redis()
    transport = httpx.ASGITransport(app=app)
    agent_id = "support-agent"
    tool_id = "customer_database"
    await redis_client.delete(f"ratelimit:{agent_id}:{tool_id}")

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Pre-authenticate only even numbered sessions
        for i in range(4):
            sess_id = f"concurrent-sess-{i}"
            await redis_client.delete(f"session:sequence:{sess_id}")
            if i % 2 == 0:
                await redis_client.rpush(f"session:sequence:{sess_id}", "authenticate_customer")

        # Now fire 4 concurrent get_customer calls
        async def make_call(sess_idx: int):
            return await client.post(
                "/api/v1/waf/intercept",
                json={
                    "agent_id": agent_id,
                    "tool": tool_id,
                    "operation": "get_customer",
                    "parameters": {"customer_id": 101},
                    "session_id": f"concurrent-sess-{sess_idx}",
                },
                headers={"X-Agent-API-Key": "agent-key-support-001"},
            )

        responses = await asyncio.gather(*[make_call(i) for i in range(4)])

        for idx, res in enumerate(responses):
            if idx % 2 == 0:
                assert res.status_code == 200, f"Session {idx} was authenticated and should be allowed"
                assert res.json()["status"] == "ALLOW"
            else:
                assert res.status_code == 403, f"Session {idx} was unauthenticated and should be blocked"
                assert res.json()["waf_evaluation"]["blocked_by_rule"] == "sequence"
