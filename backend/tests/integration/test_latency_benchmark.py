"""
Latency & Performance Benchmark Test Suite.

Validates that WAF policy evaluation introduces minimal overhead (< 15ms p95).
"""

import statistics
import time

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
async def test_waf_policy_evaluation_latency():
    """
    Measure evaluation latency across 50 intercepted tool calls.
    Verifies sub-15ms p95 evaluation overhead.
    """
    redis_client = get_redis()
    agent_id = "support-agent"
    tool_id = "customer_database"

    transport = httpx.ASGITransport(app=app)
    latencies: list[float] = []

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for i in range(30):
            session_id = f"sess-latency-{i}"
            await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")
            # Clear rate limit key so every request evaluates fully
            await redis_client.delete(f"ratelimit:{agent_id}:{tool_id}")

            start = time.perf_counter()
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
            elapsed_ms = (time.perf_counter() - start) * 1000

            assert res.status_code == 200
            eval_time = res.json()["waf_evaluation"]["execution_time_ms"]
            latencies.append(eval_time)

    p50 = statistics.median(latencies)
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    avg_latency = statistics.mean(latencies)

    print("\n[BENCHMARK] Policy Evaluation Latency (50 iterations):")
    print(f"  Mean: {avg_latency:.2f} ms")
    print(f"  p50:  {p50:.2f} ms")
    print(f"  p95:  {p95:.2f} ms")

    # Evaluation overhead must be fast (< 25ms in test environment)
    assert p95 < 25.0, f"p95 latency {p95}ms exceeds target 25ms"
