"""
Agent Session Model.

Tracks active agent sessions for sequence rule enforcement.
Sessions are primarily tracked in Redis for speed, but
persisted in PostgreSQL for durability and audit purposes.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AgentSession(Base):
    """
    An agent's active session for sequence tracking.

    Attributes:
        id: Unique identifier (UUID).
        session_id: Human-readable session identifier.
        agent_id: Which agent owns this session.
        actions_performed: Ordered list of tools/actions performed in this session.
        is_active: Whether the session is currently active.
        created_at: Session start time.
        updated_at: Last activity time.
        expires_at: Session expiry time.
    """

    __tablename__ = "agent_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    agent_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    actions_performed: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<AgentSession(session_id='{self.session_id}', agent_id='{self.agent_id}', active={self.is_active})>"
