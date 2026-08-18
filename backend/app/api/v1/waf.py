"""
WAF Intercept API Endpoint.

Transparent gateway endpoint where AI agents submit tool invocation requests.
"""

import redis.asyncio as redis
from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_request_id
from app.redis_client import get_redis
from app.schemas.waf import ToolCallRequest, ToolCallResponse
from app.waf.proxy import WAFProxy

router = APIRouter(prefix="/waf", tags=["WAF Gateway"])


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

    - Authenticates the Agent via header API key
    - Validates target tool registration
    - Evaluates all configured security policy rules
    - Blocks unauthorized/violating requests with structured explanations
    - Forwards authorized requests to real downstream tool microservices
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
        # Return 403 Forbidden with detailed evaluation payload
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=response.model_dump(),
        )

    return response
