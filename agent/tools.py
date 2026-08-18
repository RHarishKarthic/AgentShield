"""
Agent Tool Declarations and WAF Client.

ARCHITECTURAL GUARANTEE:
The AI Agent NEVER connects directly to tool services.
All tool invocations are dispatched exclusively through AgentShield WAF.
"""

from typing import Any

import httpx

from agent.config import config

AVAILABLE_TOOLS = [
    {
        "name": "customer_database",
        "description": "Customer database for authentication, profile queries, and record updates.",
        "operations": ["authenticate", "get_customer", "update_customer"],
        "parameters": {
            "authenticate": {"customer_id": "integer"},
            "get_customer": {"customer_id": "integer"},
            "update_customer": {"customer_id": "integer", "notes": "string", "name": "string"},
        },
    },
    {
        "name": "email_service",
        "description": "Dispatches internal notifications and external emails.",
        "operations": ["send"],
        "parameters": {
            "send": {"recipient": "string", "subject": "string", "body": "string", "email_type": "string"},
        },
    },
    {
        "name": "file_service",
        "description": "Virtual file storage service for reading and writing documents.",
        "operations": ["read", "write"],
        "parameters": {
            "read": {"file_path": "string"},
            "write": {"file_path": "string", "content": "string"},
        },
    },
]


class WAFGatewayClient:
    """
    HTTP client for dispatching agent tool calls through the AgentShield WAF Proxy.
    """

    def __init__(
        self,
        gateway_url: str = config.waf_gateway_url,
        agent_id: str = config.agent_id,
        api_key: str = config.agent_api_key,
    ):
        self.gateway_url = gateway_url
        self.agent_id = agent_id
        self.api_key = api_key

    async def invoke_tool_via_waf(
        self,
        tool: str,
        operation: str,
        parameters: dict[str, Any],
        session_id: str | None = None,
        timeout_seconds: float = 15.0,
    ) -> dict[str, Any]:
        """
        Send tool invocation through AgentShield WAF.

        Returns:
            Dict containing WAF response payload (ALLOW, BLOCK, or SHADOW_WOULD_BLOCK).
        """
        payload = {
            "agent_id": self.agent_id,
            "tool": tool,
            "operation": operation,
            "parameters": parameters,
            "session_id": session_id,
        }

        headers = {
            "X-Agent-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(
                self.gateway_url,
                json=payload,
                headers=headers,
            )

            try:
                return resp.json()
            except Exception:
                return {
                    "status": "BLOCK" if resp.status_code >= 400 else "ALLOW",
                    "error": f"HTTP {resp.status_code}: {resp.text}",
                    "result": None,
                }
