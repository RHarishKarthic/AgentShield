"""
Tool Pydantic Schemas.

Validation models for tool registration, query, and updates.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ToolBase(BaseModel):
    tool_id: str = Field(..., description="Unique tool identifier (e.g. 'customer_database')")
    name: str = Field(..., description="Human-readable tool name")
    description: str | None = Field(default=None, description="Tool description")
    endpoint_url: str = Field(..., description="Target service URL for tool forwarding")
    method: str = Field(default="POST", description="HTTP method to use when forwarding")
    is_active: bool = Field(default=True, description="Whether tool is active")
    parameters_schema: dict[str, Any] | None = Field(default=None, description="JSON schema of expected params")
    custom_metadata: dict[str, Any] | None = Field(default_factory=dict)


class ToolCreate(ToolBase):
    pass


class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    endpoint_url: str | None = None
    method: str | None = None
    is_active: bool | None = None
    parameters_schema: dict[str, Any] | None = None
    custom_metadata: dict[str, Any] | None = None


class ToolResponse(ToolBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
