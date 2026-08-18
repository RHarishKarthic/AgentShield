"""
Policy Pydantic Schemas.

Validation models for WAF security policies.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RateLimitRule(BaseModel):
    requests: int = Field(default=5, description="Max allowed requests in window")
    window_seconds: int = Field(default=60, description="Rate limit window in seconds")


class ParameterValidationRule(BaseModel):
    max_parameter_size: int = Field(default=2048, description="Max allowed size for any single parameter value")
    max_total_size: int = Field(default=65536, description="Max allowed size for entire payload in bytes")
    blocked_patterns: list[str] = Field(
        default_factory=lambda: [
            "DROP TABLE",
            "--",
            "<script>",
            "UNION SELECT",
            "/etc/shadow",
            "../",
            ";--",
            "eval(",
            "exec(",
        ],
        description="List of regex/substring patterns to block in parameters",
    )


class DataScopeRule(BaseModel):
    customer_ids: list[int] = Field(default_factory=lambda: [101, 102, 103])
    allowed_file_paths: list[str] = Field(default_factory=lambda: ["/data/public/", "/data/reports/"])
    allowed_email_domains: list[str] = Field(default_factory=lambda: ["@example.com", "@enterprise.corp"])
    departments: list[str] = Field(default_factory=lambda: ["Engineering", "Marketing", "Finance"])


class SequenceRuleItem(BaseModel):
    action: str = Field(..., description="Action/tool that has prerequisites (e.g. 'get_customer_data')")
    requires: list[str] = Field(
        ...,
        description="Prerequisite actions required before this action in the same session",
    )


class PolicyConfig(BaseModel):
    rate_limit: RateLimitRule = Field(default_factory=RateLimitRule)
    parameter_validation: ParameterValidationRule = Field(default_factory=ParameterValidationRule)
    data_scope: DataScopeRule = Field(default_factory=DataScopeRule)
    sequence_rules: list[SequenceRuleItem] = Field(
        default_factory=lambda: [
            SequenceRuleItem(
                action="get_customer_data",
                requires=["authenticate_customer"],
            ),
            SequenceRuleItem(
                action="update_customer",
                requires=["authenticate_customer", "get_customer_data"],
            ),
        ]
    )


class PolicyBase(BaseModel):
    policy_id: str = Field(..., description="Unique policy identifier (e.g. 'support-agent-policy')")
    name: str = Field(..., description="Human-readable policy name")
    description: str | None = Field(default=None, description="Policy description")
    mode: Literal["enforcement", "shadow"] = Field(
        default="enforcement",
        description="Policy mode: 'enforcement' (blocks violations) or 'shadow' (logs violations but allows request)",
    )
    policy_config: PolicyConfig = Field(default_factory=PolicyConfig, description="Policy rules configuration")


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    mode: Literal["enforcement", "shadow"] | None = None
    policy_config: PolicyConfig | None = None


class PolicyResponse(PolicyBase):
    id: uuid.UUID
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
