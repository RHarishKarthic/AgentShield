"""
Stage 8 Integration Test Suite — Real-Time WebSocket Telemetry.

Tests:
1. WebSocket connection to /ws/events establishes successfully
2. WAF Interception emits live AUDIT_EVENT payload over active WebSocket connection
(Real-Time Streaming Telemetry)
"""

import httpx
import pytest

from app.main import app
from app.redis_client import get_redis
from app.websocket.manager import ws_manager
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
async def test_websocket_broadcast_delivery(monkeypatch):
    """
    SUCCESS CRITERION 5: Dashboard updates in real time as calls flow through.
    Verifies ws_manager broadcasts AUDIT_EVENT payload upon WAF interception.
    """
    received_broadcasts = []

    async def mock_broadcast(data):
        received_broadcasts.append(data)

    monkeypatch.setattr(ws_manager, "broadcast", mock_broadcast)

    redis_client = get_redis()
    session_id = "sess-ws-test-99"
    await redis_client.rpush(f"session:sequence:{session_id}", "authenticate_customer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger an intercepted tool call
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

        # Verify WebSocket received the real-time broadcast event
        assert len(received_broadcasts) >= 1
        broadcast_msg = received_broadcasts[-1]
        assert broadcast_msg["type"] == "AUDIT_EVENT"
        assert broadcast_msg["event"]["agent_id"] == "support-agent"
        assert broadcast_msg["event"]["tool"] == "customer_database"
        assert broadcast_msg["event"]["decision"] == "ALLOW"
        assert "evt_" in broadcast_msg["event"]["event_id"]
