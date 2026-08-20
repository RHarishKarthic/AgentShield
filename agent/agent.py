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

            # Step 4: Feed tool result back into history for the next reasoning step
            warning = None
            if disposition == "SHADOW_WOULD_BLOCK":
                warning = "[SHADOW MODE] Policy violation recorded in audit log, but action was allowed."

            result_summary = str(tool_result) if tool_result else "No result returned."
            conversation_history.append({"role": "user", "content": instruction})
            conversation_history.append({
                "role": "assistant",
                "content": (
                    f"I called {tool_name}/{operation} and received: {result_summary}."
                    + (f" Note: {warning}" if warning else "")
                ),
            })


        # MAX_STEPS exhausted — return the last step's result
        last = steps[-1] if steps else {}
        return {
            "instruction": instruction,
            "session_id": sess_id,
            "steps": steps,
            "total_steps": MAX_STEPS,
            "thought": last.get("thought", ""),
            "tool_call": last.get("tool_call"),
            "waf_disposition": last.get("waf_disposition", "UNKNOWN"),
            "waf_evaluation": last.get("waf_evaluation"),
            "tool_result": last.get("tool_result"),
            "final_answer": (
                f"Reached maximum reasoning steps ({MAX_STEPS}). "
                f"Last result: {last.get('tool_result')}"
            ),
        }
