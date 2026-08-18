"""
Audit Pydantic Schemas.

Validation and response models for audit events and aggregated metrics.
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class AuditEventBase(BaseModel):
    event_id: str
    request_id: str
    session_id: str | None = None
    agent_id: str
    tool: str
    operation: str | None = None
    parameters_sanitised: dict[str, Any] | None = None
    rules_evaluated: dict[str, str]
    decision: Literal["ALLOW", "BLOCK", "SHADOW_WOULD_BLOCK"]
    reason: str
    blocked_by_rule: str | None = None
    policy_id: str | None = None
    policy_version: int | None = None
    mode: str
    execution_time_ms: float | None = None
    tool_response_status: int | None = None
    source_ip: str | None = None
    created_at: datetime


class AuditEventResponse(AuditEventBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class AuditListResponse(BaseModel):
    total: int
    items: list[AuditEventResponse]
    limit: int
    offset: int


class MetricRuleBreakdown(BaseModel):
    rate_limit: int = 0
    parameter_validation: int = 0
    data_scope: int = 0
    sequence: int = 0
    authentication: int = 0


class MetricsResponse(BaseModel):
    total_requests: int
    allowed_count: int
    blocked_count: int
    shadow_count: int
    allow_percentage: float
    block_percentage: float
    blocks_by_rule: MetricRuleBreakdown
    requests_per_minute: float
    active_agents_count: int
    active_tools_count: int
