"""
Stage 7 Integration Test Suite — AI Agent and LLM Integration.

Tests:
1. Autonomous Agent receives natural language instruction, selects tool, invokes through WAF, and receives real data
2. Agent handles WAF BLOCK responses gracefully without bypassing security controls
3. Agent under Shadow Mode completes task while capturing shadow policy warning
4. Verifies WAF interception on all agent operations
"""

import httpx
import pytest

from agent.agent import AutonomousAgent
from agent.llm import RuleBasedMockProvider
from agent.tools import WAFGatewayClient
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


class InProcessWAFClient(WAFGatewayClient):
    """WAF client that connects directly to the in-process FastAPI app via ASGI."""

    async def invoke_tool_via_waf(self, tool, operation, parameters, session_id=None, timeout_seconds=15.0):
        payload = {
            "agent_id": self.agent_id,
            "tool": tool,
            "operation": operation,
            "parameters": parameters,
            "session_id": session_id,
        }
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/waf/intercept",
                json=payload,
                headers={"X-Agent-API-Key": self.api_key},
            )
            return resp.json()


@pytest.mark.asyncio
async def test_agent_autonomous_allowed_execution():
    """Agent receives query instruction, calls WAF, and delivers answer."""
    redis_client = get_redis()
    session_id = "sess-agent-test-01"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    waf_client = InProcessWAFClient(agent_id="support-agent", api_key="agent-key-support-001")
    agent = AutonomousAgent(
        agent_id="support-agent",
        api_key="agent-key-support-001",
        llm_provider=RuleBasedMockProvider(),
        waf_client=waf_client,
    )

    result = await agent.execute_task("Please fetch details for customer 101", session_id=session_id)

    assert result["waf_disposition"] == "ALLOW"
    assert result["tool_call"]["tool"] == "customer_database"
    assert result["tool_call"]["operation"] == "get_customer"
    assert result["tool_result"]["customer"]["name"] == "Alice Johnson"
    assert "Successfully executed" in result["final_answer"]


@pytest.mark.asyncio
async def test_agent_handles_waf_security_block():
    """Agent attempts prohibited injection operation, WAF blocks it, agent produces safe refusal."""
    redis_client = get_redis()
    session_id = "sess-agent-test-02"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    waf_client = InProcessWAFClient(agent_id="support-agent", api_key="agent-key-support-001")
    agent = AutonomousAgent(
        agent_id="support-agent",
        api_key="agent-key-support-001",
        llm_provider=RuleBasedMockProvider(),
        waf_client=waf_client,
    )

    result = await agent.execute_task("Update customer 101 with note: DROP TABLE customers", session_id=session_id)

    assert result["waf_disposition"] == "BLOCK"
    assert result["tool_result"] is None
    assert "blocked by AgentShield WAF" in result["final_answer"]
    assert "DROP TABLE" in result["error"]


@pytest.mark.asyncio
async def test_agent_under_shadow_mode():
    """Agent under shadow mode receives data with non-blocking warning."""
    redis_client = get_redis()
    session_id = "sess-agent-shadow-01"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    waf_client = InProcessWAFClient(agent_id="shadow-agent", api_key="agent-key-shadow-002")
    agent = AutonomousAgent(
        agent_id="shadow-agent",
        api_key="agent-key-shadow-002",
        llm_provider=RuleBasedMockProvider(),
        waf_client=waf_client,
    )

    # Calling customer 103 (out of scope for shadow-audit-policy, but allowed under shadow mode)
    result = await agent.execute_task("Fetch customer 103 balance", session_id=session_id)

    assert result["waf_disposition"] == "SHADOW_WOULD_BLOCK"
    assert result["tool_result"]["customer"]["customer_id"] == 103
    assert "[SHADOW MODE]" in result["final_answer"]
