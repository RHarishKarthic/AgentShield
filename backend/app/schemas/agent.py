"""
Agent Pydantic Schemas.

Validation models for AI agent registration, query, and updates.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AgentBase(BaseModel):
    agent_id: str = Field(..., description="Unique agent identifier (e.g. 'support-agent')")
    name: str = Field(..., description="Display name of the agent")
    description: str | None = Field(default=None, description="Agent description")
    policy_id: str | None = Field(default=None, description="Associated policy identifier")
    is_active: bool = Field(default=True, description="Whether the agent is active")
    custom_metadata: dict[str, Any] | None = Field(default_factory=dict)


class AgentCreate(AgentBase):
    api_key: str | None = Field(
        default=None,
        description="Optional custom API key. If omitted, a secure key is auto-generated.",
    )


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    policy_id: str | None = None
    is_active: bool | None = None
    custom_metadata: dict[str, Any] | None = None


class AgentResponse(AgentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    # Raw API key returned ONLY on creation if generated
    raw_api_key: str | None = Field(default=None, description="Raw API key (only provided once on creation)")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
