"""
Tool Model.

Represents a tool/API endpoint registered with AgentShield.
Tools are the downstream services that agents want to invoke.
The WAF intercepts calls before they reach these tools.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Tool(Base):
    """
    A tool/API that agents can invoke through the WAF.

    Attributes:
        id: Unique identifier (UUID).
        tool_id: Human-readable tool identifier (e.g., "customer_database").
        name: Display name.
        description: Tool purpose description.
        endpoint_url: The actual URL to forward allowed requests to.
        method: HTTP method (GET, POST, PUT, DELETE).
        is_active: Whether the tool is currently available.
        parameters_schema: JSON schema describing expected parameters.
        metadata_: Additional tool metadata.
        created_at: Registration timestamp.
        updated_at: Last modification timestamp.
    """

    __tablename__ = "tools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    endpoint_url: Mapped[str] = mapped_column(String(512), nullable=False)
    method: Mapped[str] = mapped_column(String(10), default="POST", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    parameters_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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
        return f"<Tool(tool_id='{self.tool_id}', name='{self.name}')>"
