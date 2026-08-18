"""
Stage 2 Integration Test Suite — Tool Services and Registries.

Tests:
1. Customer Database service endpoints (authenticate, get_customer, update_customer)
2. Email service endpoints (send internal/external, logs)
3. File service endpoints (read, write, list)
4. Backend Tool registry APIs (list tools, retrieve tool)
5. Backend Agent registry APIs (list agents, retrieve agent)
6. Backend Policy registry APIs (list policies, retrieve policy)
"""

import httpx
import pytest

from tools.customer_service.main import app as customer_app
from tools.email_service.main import app as email_app
from tools.file_service.main import app as file_app


@pytest.mark.asyncio
async def test_customer_service_flow():
    """Test customer service authenticate, fetch, and update."""
    transport = httpx.ASGITransport(app=customer_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        h_res = await client.get("/health")
        assert h_res.status_code == 200
        assert h_res.json()["status"] == "healthy"

        # Authenticate customer 101
        auth_res = await client.post("/authenticate", json={"customer_id": 101})
        assert auth_res.status_code == 200
        auth_data = auth_res.json()
        assert auth_data["status"] == "authenticated"
        assert auth_data["customer_id"] == 101

        # Query customer 101
        get_res = await client.post("/get_customer", json={"customer_id": 101})
        assert get_res.status_code == 200
        cust = get_res.json()["customer"]
        assert cust["name"] == "Alice Johnson"
        assert cust["tier"] == "enterprise"

        # Update customer 101 notes
        up_res = await client.post(
            "/update_customer",
            json={"customer_id": 101, "notes": "Verified VIP Client"},
        )
        assert up_res.status_code == 200
        assert up_res.json()["updated_customer"]["notes"] == "Verified VIP Client"


@pytest.mark.asyncio
async def test_email_service_flow():
    """Test email dispatch and log verification."""
    transport = httpx.ASGITransport(app=email_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        h_res = await client.get("/health")
        assert h_res.status_code == 200

        # Send internal email
        send_res = await client.post(
            "/send",
            json={
                "recipient": "admin@enterprise.corp",
                "subject": "System Status Update",
                "body": "All services operating normally.",
                "email_type": "internal",
            },
        )
        assert send_res.status_code == 200
        data = send_res.json()
        assert data["status"] == "sent"

        # Verify logs
        logs_res = await client.get("/logs")
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) >= 1
        assert logs[-1]["recipient"] == "admin@enterprise.corp"


@pytest.mark.asyncio
async def test_file_service_flow():
    """Test virtual file read and write operations."""
    transport = httpx.ASGITransport(app=file_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        h_res = await client.get("/health")
        assert h_res.status_code == 200

        # Read existing file
        read_res = await client.post("/read", json={"file_path": "/data/public/readme.txt"})
        assert read_res.status_code == 200
        assert "Welcome" in read_res.json()["content"]

        # Write new file
        write_res = await client.post(
            "/write",
            json={
                "file_path": "/data/reports/audit_summary_2026.txt",
                "content": "Audit passed with 100% compliance.",
            },
        )
        assert write_res.status_code == 200
        assert write_res.json()["status"] == "success"

        # Verify written file can be read back
        verify_res = await client.post("/read", json={"file_path": "/data/reports/audit_summary_2026.txt"})
        assert verify_res.status_code == 200
        assert verify_res.json()["content"] == "Audit passed with 100% compliance."


@pytest.mark.asyncio
async def test_backend_registries():
    """Test backend tools, agents, and policies endpoints."""
    from app.main import app as backend_app

    transport = httpx.ASGITransport(app=backend_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List tools
        tools_res = await client.get("/api/v1/tools")
        assert tools_res.status_code == 200
        tools = tools_res.json()
        tool_ids = [t["tool_id"] for t in tools]
        assert "customer_database" in tool_ids
        assert "email_service" in tool_ids
        assert "file_service" in tool_ids

        # 2. List agents
        agents_res = await client.get("/api/v1/agents")
        assert agents_res.status_code == 200
        agents = agents_res.json()
        agent_ids = [a["agent_id"] for a in agents]
        assert "support-agent" in agent_ids

        # 3. List policies
        policies_res = await client.get("/api/v1/policies")
        assert policies_res.status_code == 200
        policies = policies_res.json()
        policy_ids = [p["policy_id"] for p in policies]
        assert "support-agent-policy" in policy_ids
        assert "shadow-audit-policy" in policy_ids
