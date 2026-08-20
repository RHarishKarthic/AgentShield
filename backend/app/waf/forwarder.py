"""
WAF Downstream Tool Forwarder.

Responsible for safely dispatching ALLOWED requests to target tool APIs.
"""

import os
from typing import Any

import httpx

from app.logging_config import get_logger
from app.models.tool import Tool

logger = get_logger(__name__)


class ToolForwarder:
    """
    Handles HTTP dispatch of intercepted tool calls to registered downstream services.
    """

    @staticmethod
    def _build_target_url(tool: Tool, operation: str | None) -> str:
        # Convention-based env var override: TOOL_{TOOL_ID_UPPER}_URL
        # e.g., customer_database -> TOOL_CUSTOMER_DATABASE_URL
        # This allows adding new tools without modifying forwarder code.
        env_var_name = f"TOOL_{tool.tool_id.upper()}_URL"
        env_override = os.getenv(env_var_name)

        # Legacy single-prefix fallbacks kept for backwards compatibility
        if env_override is None:
            _legacy = {
                "customer_database": os.getenv("TOOL_CUSTOMER_URL"),
                "email_service": os.getenv("TOOL_EMAIL_URL"),
                "file_service": os.getenv("TOOL_FILE_URL"),
            }
            env_override = _legacy.get(tool.tool_id)

        base = (env_override or tool.endpoint_url).rstrip("/")
        if operation:
            op_clean = operation.strip().lstrip("/")
            return f"{base}/{op_clean}"
        return base

    @staticmethod
    async def forward_tool_call(
        tool: Tool,
        operation: str | None,
        parameters: dict[str, Any],
        timeout_seconds: float = 10.0,
    ) -> tuple[int, Any]:
        """
        Forward an authorized tool call to the downstream tool service.

        Returns:
            tuple[int, Any]: (status_code, response_data)
        """
        target_url = ToolForwarder._build_target_url(tool, operation)
        method = (tool.method or "POST").upper()

        logger.info(
            f"Forwarding tool call to downstream service: {method} {target_url}",
            extra={"tool": tool.tool_id, "endpoint": target_url},
        )

        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                if method == "GET":
                    resp = await client.get(target_url, params=parameters)
                elif method == "POST":
                    resp = await client.post(target_url, json=parameters)
                elif method == "PUT":
                    resp = await client.put(target_url, json=parameters)
                elif method == "DELETE":
                    resp = await client.delete(target_url, params=parameters)
                else:
                    resp = await client.post(target_url, json=parameters)

                try:
                    data = resp.json()
                except Exception:
                    data = {"raw_response": resp.text}

                return resp.status_code, data

        except httpx.TimeoutException:
            logger.error(f"Downstream tool timed out: {target_url}", extra={"tool": tool.tool_id})
            return 504, {"error": "Downstream tool timeout", "endpoint": target_url}
        except httpx.ConnectError:
            logger.error(
                f"Cannot connect to downstream tool: {target_url}",
                extra={"tool": tool.tool_id},
            )
            return 502, {
                "error": "Downstream tool connection failed",
                "endpoint": target_url,
            }
        except Exception as e:
            logger.error(
                f"Downstream forwarding error: {e!s}",
                extra={"tool": tool.tool_id, "error": str(e)},
            )
            return 500, {
                "error": f"Downstream service error: {e!s}",
                "endpoint": target_url,
            }
