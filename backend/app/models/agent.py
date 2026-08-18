"""
Agent Model.

Represents an AI agent registered with AgentShield.
Each agent has an identity, API key, and associated policy configuration.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Agent(Base):
    """
    An AI agent that sends tool calls through the WAF.

    Attributes:
        id: Unique agent identifier (UUID).
        agent_id: Human-readable agent identifier (e.g., "support-agent").
        name: Display name.
        description: Agent purpose description.
        api_key_hash: Hashed API key for authentication.
        is_active: Whether the agent is currently allowed to make calls.
        policy_id: Associated policy configuration ID.
        metadata_: Additional agent metadata (JSON).
        created_at: When the agent was registered.
        updated_at: Last modification timestamp.
    """

    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_key_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    policy_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    custom_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Agent(agent_id='{self.agent_id}', name='{self.name}')>"
