"""
WAF Intercept API Endpoint.

Transparent gateway endpoint where AI agents submit tool invocation requests
and test prompt-to-tool-call autonomous ReAct loops.
"""

import uuid

import redis.asyncio as redis
from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_request_id
from app.redis_client import get_redis
from app.schemas.waf import ToolCallRequest, ToolCallResponse
from app.security.authentication import require_waf_api_key
from app.waf.llm import AVAILABLE_TOOLS, get_llm_provider
from app.waf.proxy import WAFProxy

router = APIRouter(prefix="/waf", tags=["WAF Gateway"])


class AgentPromptRequest(BaseModel):
    prompt: str = Field(..., description="Natural language prompt for the AI agent")
    agent_id: str = Field(default="support-agent", description="Agent ID to run the prompt as")
    provider: str = Field(default="auto", description="LLM provider: groq, openai, ollama, or auto")
    api_key: str | None = Field(default=None, description="Optional API key for Groq or OpenAI")
    model: str | None = Field(default=None, description="Optional LLM model override")
    session_id: str | None = Field(default=None, description="Optional conversation session ID")


@router.post(
    "/intercept",
    response_model=ToolCallResponse,
    summary="Intercept and evaluate tool call",
    description="Transparent proxy endpoint that inspects, validates, filters, and executes AI agent tool invocations.",
)
async def intercept_tool_call(
    request_data: ToolCallRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_agent_api_key: str | None = Header(default=None, alias="X-Agent-API-Key"),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    request_id: str = Depends(get_request_id),
):
    """
    Main WAF interception entrypoint.
    """
    effective_api_key = x_agent_api_key or x_api_key

    # Retrieve redis client safely
    redis_client: redis.Redis | None = None
    try:
        redis_client = get_redis()
    except Exception:
        redis_client = None

    response: ToolCallResponse = await WAFProxy.intercept_and_execute(
        request=request_data,
        api_key=effective_api_key,
        db=db,
        redis_client=redis_client,
        request_id=request_id,
    )

    if response.status == "BLOCK":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=response.model_dump(),
        )

    return response


@router.post(
    "/prompt",
    summary="Execute Agentic Prompt through Live LLM and WAF",
    description="Accepts a natural language instruction, generates tool calling reasoning via Cloud/Local LLM, and passes the resulting invocation through AgentShield WAF. Requires X-API-Key authentication.",
)
async def process_agent_prompt(
    payload: AgentPromptRequest,
    db: AsyncSession = Depends(get_db),
    request_id: str = Depends(get_request_id),
    _: str = Depends(require_waf_api_key),  # Enforce WAF API key auth
):
    """
    Live Agentic Reasoning & WAF Interception Pipeline:
    1. Sends user instruction + tool schemas to the selected LLM (Groq / OpenAI / Ollama / Mock).
    2. LLM reasons and produces a structured tool call.
    3. Tool call is automatically dispatched into the AgentShield WAF evaluation engine.
    4. Returns the LLM Thought, Tool Invocation, and WAF Security Disposition.
    """
    sess_id = payload.session_id or f"session-{uuid.uuid4().hex[:8]}"

    # Step 1: LLM Reasoning
    llm = get_llm_provider(
        provider_name=payload.provider,
        api_key=payload.api_key,
        model=payload.model,
    )

    llm_decision = await llm.generate_tool_call(
        user_prompt=payload.prompt,
        available_tools=AVAILABLE_TOOLS,
    )

    thought = llm_decision.get("thought", "")

    # If LLM didn't request a tool
    if "tool" not in llm_decision:
        return {
            "prompt": payload.prompt,
            "session_id": sess_id,
            "provider_used": llm.__class__.__name__,
            "thought": thought,
            "tool_call": None,
            "waf_evaluation": {
                "decision": "ALLOW",
                "policy_id": "support-agent-policy",
                "reason": "Direct text response - No tool call requested.",
            },
            "status": "ALLOW",
            "result": llm_decision.get("final_answer", "Completed without tool execution."),
            "final_answer": llm_decision.get("final_answer", "Task completed."),
        }

    # Step 2: Intercept through WAF Proxy using the agent_id from the request payload
    tool_req = ToolCallRequest(
        agent_id=payload.agent_id,
        tool=llm_decision["tool"],
        operation=llm_decision.get("operation", "default"),
        parameters=llm_decision.get("parameters", {}),
        session_id=sess_id,
    )

    redis_client: redis.Redis | None = None
    try:
        redis_client = get_redis()
    except Exception:
        redis_client = None

    waf_response: ToolCallResponse = await WAFProxy.intercept_and_execute(
        request=tool_req,
        api_key=None,
        db=db,
        redis_client=redis_client,
        request_id=request_id,
    )

    return {
        "prompt": payload.prompt,
        "session_id": sess_id,
        "provider_used": llm.__class__.__name__,
        "thought": thought,
        "tool_call": {
            "tool": tool_req.tool,
            "operation": tool_req.operation,
            "parameters": tool_req.parameters,
        },
        "waf_evaluation": waf_response.waf_evaluation,
        "status": waf_response.status,
        "result": waf_response.result,
        "error": waf_response.error,
        "final_answer": (
            f"Action BLOCKED by AgentShield WAF: {waf_response.error}"
            if waf_response.status == "BLOCK"
            else f"Tool '{tool_req.tool}' executed successfully via WAF."
        ),
    }
