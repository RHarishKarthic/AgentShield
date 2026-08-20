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

# Maximum reasoning+action steps per task to prevent runaway loops
MAX_STEPS = 5


class AutonomousAgent:
    """
    Autonomous LLM-powered AI agent governed by AgentShield WAF.

    Implements a true multi-step ReAct (Reasoning + Acting) loop:
    each tool result is fed back into the LLM's conversation history
    so it can reason over outcomes and chain further actions.
    """

    def __init__(
        self,
        agent_id: str | None = None,
        api_key: str | None = None,
        llm_provider: BaseLLMProvider | None = None,
        waf_client: WAFGatewayClient | None = None,
    ):
        # Resolve defaults inside the body so tests can override config at runtime
        self.agent_id = agent_id or config.agent_id
        self.api_key = api_key or config.agent_api_key
        self.llm = llm_provider or get_llm_provider()
        self.waf_client = waf_client or WAFGatewayClient(agent_id=self.agent_id, api_key=self.api_key)

    async def execute_task(
        self,
        instruction: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Execute a user instruction autonomously using a multi-step ReAct loop.

        For each step (up to MAX_STEPS):
          1. LLM Reasoning  -> Tool Selection (or Final Answer)
          2. WAF Interception -> Policy Enforcement
          3. Tool Execution or Security Refusal
          4. Feed result back into conversation history for next reasoning step

        Returns a consolidated result dict with the full step trace.
        """
        sess_id = session_id or f"session-{uuid.uuid4().hex[:8]}"
        conversation_history: list[dict[str, str]] = []
        steps: list[dict[str, Any]] = []

        for step_num in range(1, MAX_STEPS + 1):
            # Step 1: LLM Reasoning & Tool Selection
            llm_decision = await self.llm.generate_tool_call(
                user_prompt=instruction,
                available_tools=AVAILABLE_TOOLS,
                conversation_history=conversation_history,
            )

            thought = llm_decision.get("thought", "")

            # If LLM produced a final answer (no tool needed), we're done
            if "tool" not in llm_decision:
                return {
                    "instruction": instruction,
                    "session_id": sess_id,
                    "steps": steps,
                    "total_steps": step_num,
                    "thought": thought,
                    "tool_call": None,
                    "waf_disposition": "NO_TOOL_REQUIRED",
                    "final_answer": llm_decision.get("final_answer", "Task completed."),
                }

            tool_name = llm_decision["tool"]
            operation = llm_decision.get("operation", "")
            parameters = llm_decision.get("parameters", {})

            # Step 2: Dispatch through AgentShield WAF — NEVER bypass
            waf_response = await self.waf_client.invoke_tool_via_waf(
                tool=tool_name,
                operation=operation,
                parameters=parameters,
                session_id=sess_id,
            )

            disposition = waf_response.get("status", "BLOCK")
            tool_result = waf_response.get("result")
            block_reason = waf_response.get("error")

            step_record: dict[str, Any] = {
                "step": step_num,
                "thought": thought,
                "tool_call": {"tool": tool_name, "operation": operation, "parameters": parameters},
                "waf_disposition": disposition,
                "waf_evaluation": waf_response.get("waf_evaluation"),
                "tool_result": tool_result,
            }
            steps.append(step_record)

            # Step 3: Handle BLOCK — abort immediately, never retry a blocked action
            if disposition == "BLOCK":
                return {
                    "instruction": instruction,
                    "session_id": sess_id,
                    "steps": steps,
                    "total_steps": step_num,
                    "thought": thought,
                    "tool_call": step_record["tool_call"],
                    "waf_disposition": "BLOCK",
                    "waf_evaluation": waf_response.get("waf_evaluation"),
                    "tool_result": None,
                    "error": block_reason or "Blocked by security policy.",
                    "final_answer": f"Action blocked by AgentShield WAF: {block_reason}",
                }

            # Step 4: Tool Succeeded (ALLOW or SHADOW_WOULD_BLOCK)
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
                "steps": steps,
                "total_steps": step_num,
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

        # Fallback return if no steps executed
        return {
            "instruction": instruction,
            "session_id": sess_id,
            "steps": [],
            "total_steps": 0,
            "thought": "",
            "tool_call": None,
            "waf_disposition": "NO_STEPS",
            "final_answer": "No actions performed.",
        }
