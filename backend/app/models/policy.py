"""
Policy Model.

Represents a security policy configuration stored in the database.
Policies define the rules that the WAF enforces for each agent.

Policies can also be loaded from YAML files (see policies/ directory),
but the database is the runtime source of truth.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Policy(Base):
    """
    A security policy defining WAF rules for an agent.

    The policy_config JSON contains the full rule configuration:
    - rate_limit: {requests, window_seconds}
    - parameter_validation: {max_parameter_size, blocked_patterns}
    - data_scope: {customer_ids, tenant_ids, ...}
    - sequence_rules: [{action, requires: [...]}]
    - mode: "enforcement" | "shadow"

    Attributes:
        id: Unique identifier (UUID).
        policy_id: Human-readable policy identifier (e.g., "support-agent-policy").
        name: Display name.
        description: Policy purpose description.
        policy_config: The full policy configuration as JSON.
        version: Policy version (for audit trail).
        mode: "enforcement" or "shadow".
        created_at: Creation timestamp.
        updated_at: Last modification timestamp.
    """

    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="enforcement", nullable=False)
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
        return f"<Policy(policy_id='{self.policy_id}', mode='{self.mode}', v{self.version})>"
