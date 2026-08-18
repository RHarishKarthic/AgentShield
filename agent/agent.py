"""
Autonomous AI Agent Runtime.

Implements the ReAct-style reasoning and tool execution loop.
Channels every tool invocation through AgentShield WAF and respects policy decisions.
"""

import uuid
from typing import Any

from agent.config import config
from agent.llm import BaseLLMProvider, get_llm_provider
from agent.tools import AVAILABLE_TOOLS, WAFGatewayClient


class AutonomousAgent:
    """
    Autonomous LLM-powered AI agent governed by AgentShield WAF.
    """

    def __init__(
        self,
        agent_id: str = config.agent_id,
        api_key: str = config.agent_api_key,
        llm_provider: BaseLLMProvider | None = None,
        waf_client: WAFGatewayClient | None = None,
    ):
        self.agent_id = agent_id
        self.api_key = api_key
        self.llm = llm_provider or get_llm_provider()
        self.waf_client = waf_client or WAFGatewayClient(agent_id=agent_id, api_key=api_key)

    async def execute_task(
        self,
        instruction: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Execute a user instruction autonomously:
        1. LLM Reasoning -> Tool Selection
        2. WAF Interception -> Policy Enforcement
        3. Tool Execution or Security Refusal
        4. Final Answer Synthesis
        """
        sess_id = session_id or f"session-{uuid.uuid4().hex[:8]}"

        # Step 1: LLM Reasoning & Tool Selection
        llm_decision = await self.llm.generate_tool_call(
            user_prompt=instruction,
            available_tools=AVAILABLE_TOOLS,
        )

        thought = llm_decision.get("thought", "")

        # If LLM didn't request a tool, return direct answer
        if "tool" not in llm_decision:
            return {
                "instruction": instruction,
                "session_id": sess_id,
                "thought": thought,
                "tool_call": None,
                "waf_disposition": "NO_TOOL_REQUIRED",
                "final_answer": llm_decision.get("final_answer", "Task completed."),
            }

        tool_name = llm_decision["tool"]
        operation = llm_decision.get("operation", "")
        parameters = llm_decision.get("parameters", {})

        # Step 2: Dispatch through AgentShield WAF (NEVER bypass WAF)
        waf_response = await self.waf_client.invoke_tool_via_waf(
            tool=tool_name,
            operation=operation,
            parameters=parameters,
            session_id=sess_id,
        )

        disposition = waf_response.get("status", "BLOCK")

        # Step 3: Handle Policy Decision
        if disposition == "BLOCK":
            block_reason = waf_response.get("error") or "Blocked by security policy."
            return {
                "instruction": instruction,
                "session_id": sess_id,
                "thought": thought,
                "tool_call": {
                    "tool": tool_name,
                    "operation": operation,
                    "parameters": parameters,
                },
                "waf_disposition": "BLOCK",
                "waf_evaluation": waf_response.get("waf_evaluation"),
                "tool_result": None,
                "error": block_reason,
                "final_answer": f"Action blocked by AgentShield WAF security policy: {block_reason}",
            }

        # Step 4: Tool Succeeded (ALLOW or SHADOW_WOULD_BLOCK)
        tool_result = waf_response.get("result")
        warning = None
        if disposition == "SHADOW_WOULD_BLOCK":
            warning = "[SHADOW MODE] Policy violation was recorded in audit log, but action was allowed."

        # Synthesize final natural language summary
        final_answer = f"Successfully executed {tool_name}/{operation}. Result: {tool_result}"
        if warning:
            final_answer += f" ({warning})"

        return {
            "instruction": instruction,
            "session_id": sess_id,
            "thought": thought,
            "tool_call": {
                "tool": tool_name,
                "operation": operation,
                "parameters": parameters,
            },
            "waf_disposition": disposition,
            "waf_evaluation": waf_response.get("waf_evaluation"),
            "tool_result": tool_result,
            "warning": warning,
            "final_answer": final_answer,
        }
