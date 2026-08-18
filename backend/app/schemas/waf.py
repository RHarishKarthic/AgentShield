"""
WAF Request & Response Pydantic Schemas.

Defines schemas for tool call interception, policy evaluation results,
and tool response wrappers.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ToolCallRequest(BaseModel):
    """
    Request sent by an AI Agent to invoke a tool through AgentShield WAF.
    """

    agent_id: str = Field(..., description="ID of the calling agent (e.g. 'support-agent')")
    tool: str = Field(..., description="Target tool ID (e.g. 'customer_database')")
    operation: str = Field(
        default="",
        description="Target operation or sub-endpoint on the tool (e.g. 'get_customer', 'send', 'read')",
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters payload for the tool invocation",
    )
    session_id: str | None = Field(
        default=None,
        description="Session identifier for multi-step sequence enforcement",
    )


class RuleEvaluationDetail(BaseModel):
    """Result of a single rule evaluation."""

    status: Literal["ALLOW", "BLOCK", "NOT_CONFIGURED", "ERROR"]
    reason: str | None = None


class PolicyEvaluationResult(BaseModel):
    """
    Structured outcome of the WAF Policy Engine evaluation.
    """

    decision: Literal["ALLOW", "BLOCK", "SHADOW_WOULD_BLOCK"]
    mode: Literal["enforcement", "shadow"]
    policy_id: str
    policy_version: int
    rules: dict[str, str] = Field(
        description="Outcome per rule: authentication, rate_limit, parameter_validation, data_scope, sequence",
    )
    reason: str
    blocked_by_rule: str | None = None
    execution_time_ms: float = 0.0


class ToolCallResponse(BaseModel):
    """
    Response returned to the AI Agent from the WAF.
    """

    status: Literal["ALLOW", "BLOCK", "SHADOW_WOULD_BLOCK"]
    tool: str
    operation: str | None = None
    result: Any | None = Field(default=None, description="Response payload from downstream tool if executed")
    error: str | None = Field(default=None, description="Error message if blocked or downstream error")
    waf_evaluation: PolicyEvaluationResult
    request_id: str | None = None
