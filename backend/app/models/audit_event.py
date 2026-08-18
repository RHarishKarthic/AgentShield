"""
Audit Event Model.

Every tool call intercepted by the WAF generates an audit event.
This is the core observability record for AgentShield.

Logs: timestamp, agent ID, tool, parameters sanitised,
rule evaluation outcomes, and final disposition.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditEvent(Base):
    """
    An audit record for a single WAF-intercepted tool call.

    Every request through the WAF creates exactly one AuditEvent,
    regardless of whether the request was allowed, blocked, or
    shadow-would-block.

    Attributes:
        id: Unique event identifier (UUID).
        event_id: Short human-readable event ID.
        request_id: Correlation ID linking request through the system.
        session_id: Agent session identifier (for sequence tracking).
        agent_id: Which agent made the call.
        tool: Which tool was being called.
        operation: Specific operation/action on the tool.
        parameters_sanitised: Tool call parameters with sensitive data redacted.
        rules_evaluated: JSON showing each rule's individual result.
        decision: Final disposition: ALLOW, BLOCK, or SHADOW_WOULD_BLOCK.
        reason: Human-readable explanation of the decision.
        blocked_by_rule: Which rule caused the block (null if allowed).
        policy_id: Which policy was evaluated.
        policy_version: Version of the policy at evaluation time.
        mode: enforcement or shadow.
        execution_time_ms: How long policy evaluation took.
        tool_response_status: HTTP status from tool (null if blocked).
        source_ip: Source IP address.
        created_at: When the event occurred.
    """

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    # WHO
    agent_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # WHAT
    tool: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    operation: Mapped[str | None] = mapped_column(String(128), nullable=True)
    parameters_sanitised: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # DECISION
    rules_evaluated: Mapped[dict] = mapped_column(JSON, nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    blocked_by_rule: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # POLICY
    policy_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    policy_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="enforcement", nullable=False)

    # PERFORMANCE
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    tool_response_status: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # SOURCE
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # TIMESTAMP
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Composite indexes for common audit queries
    __table_args__ = (
        Index("ix_audit_agent_tool", "agent_id", "tool"),
        Index("ix_audit_decision_created", "decision", "created_at"),
        Index("ix_audit_agent_created", "agent_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditEvent(event_id='{self.event_id}', agent='{self.agent_id}', "
            f"tool='{self.tool}', decision='{self.decision}')>"
        )
