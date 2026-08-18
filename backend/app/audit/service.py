"""
Audit Service.

Manages persistent storage of all intercepted tool calls in PostgreSQL,
executes parameterized queries, and broadcasts live events over WebSockets.
"""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.sanitizer import sanitize_parameters
from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.audit_event import AuditEvent
from app.models.tool import Tool
from app.schemas.audit import (
    AuditEventResponse,
    AuditListResponse,
    MetricRuleBreakdown,
    MetricsResponse,
)
from app.schemas.waf import PolicyEvaluationResult, ToolCallRequest
from app.websocket.manager import ws_manager

logger = get_logger(__name__)


class AuditService:
    @staticmethod
    async def record_event(
        db: AsyncSession,
        request: ToolCallRequest,
        eval_result: PolicyEvaluationResult,
        request_id: str,
        tool_response_status: int | None = None,
        source_ip: str | None = None,
    ) -> AuditEvent:
        """
        Create, persist, and broadcast an audit event for an intercepted tool call.
        """
        event_id = f"evt_{secrets.token_hex(8)}"
        sanitized_params = sanitize_parameters(request.parameters)

        event = AuditEvent(
            event_id=event_id,
            request_id=request_id,
            session_id=request.session_id,
            agent_id=request.agent_id,
            tool=request.tool,
            operation=request.operation,
            parameters_sanitised=sanitized_params,
            rules_evaluated=eval_result.rules,
            decision=eval_result.decision,
            reason=eval_result.reason,
            blocked_by_rule=eval_result.blocked_by_rule,
            policy_id=eval_result.policy_id,
            policy_version=eval_result.policy_version,
            mode=eval_result.mode,
            execution_time_ms=eval_result.execution_time_ms,
            tool_response_status=tool_response_status,
            source_ip=source_ip,
            created_at=datetime.now(timezone.utc),
        )

        db.add(event)
        await db.commit()
        await db.refresh(event)

        logger.info(
            f"Audit event recorded: {event.event_id} ({event.decision})",
            extra={
                "event_id": event.event_id,
                "agent_id": event.agent_id,
                "tool": event.tool,
                "decision": event.decision,
            },
        )

        # Broadcast live audit event over WebSockets to connected dashboards
        event_payload = {
            "type": "AUDIT_EVENT",
            "event": {
                "id": str(event.id),
                "event_id": event.event_id,
                "request_id": event.request_id,
                "session_id": event.session_id,
                "agent_id": event.agent_id,
                "tool": event.tool,
                "operation": event.operation,
                "parameters_sanitised": event.parameters_sanitised,
                "rules_evaluated": event.rules_evaluated,
                "decision": event.decision,
                "reason": event.reason,
                "blocked_by_rule": event.blocked_by_rule,
                "policy_id": event.policy_id,
                "policy_version": event.policy_version,
                "mode": event.mode,
                "execution_time_ms": event.execution_time_ms,
                "tool_response_status": event.tool_response_status,
                "created_at": event.created_at.isoformat(),
            },
        }
        await ws_manager.broadcast(event_payload)

        return event

    @staticmethod
    async def query_events(
        db: AsyncSession,
        agent_id: str | None = None,
        tool: str | None = None,
        decision: str | None = None,
        blocked_by_rule: str | None = None,
        session_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AuditListResponse:
        """
        Query audit events with filtering and pagination.
        """
        stmt = select(AuditEvent)

        if agent_id:
            stmt = stmt.where(AuditEvent.agent_id == agent_id)
        if tool:
            stmt = stmt.where(AuditEvent.tool == tool)
        if decision:
            stmt = stmt.where(AuditEvent.decision == decision)
        if blocked_by_rule:
            stmt = stmt.where(AuditEvent.blocked_by_rule == blocked_by_rule)
        if session_id:
            stmt = stmt.where(AuditEvent.session_id == session_id)
        if start_date:
            stmt = stmt.where(AuditEvent.created_at >= start_date)
        if end_date:
            stmt = stmt.where(AuditEvent.created_at <= end_date)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        # Paginate
        stmt = stmt.order_by(desc(AuditEvent.created_at)).limit(limit).offset(offset)
        res = await db.execute(stmt)
        items = res.scalars().all()

        return AuditListResponse(
            total=total,
            items=[AuditEventResponse.model_validate(item) for item in items],
            limit=limit,
            offset=offset,
        )

    @staticmethod
    async def get_event_by_id(db: AsyncSession, event_id: str) -> AuditEvent | None:
        """Retrieve single audit record by event_id or UUID string."""
        import uuid as py_uuid

        # Try parsing as UUID first
        try:
            val_uuid = py_uuid.UUID(event_id)
            stmt = select(AuditEvent).where((AuditEvent.event_id == event_id) | (AuditEvent.id == val_uuid))
        except ValueError:
            stmt = select(AuditEvent).where(AuditEvent.event_id == event_id)

        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_metrics(db: AsyncSession) -> MetricsResponse:
        """
        Compute real-time aggregated metrics for the security dashboard.
        """
        # Total counts by decision
        stmt_total = select(func.count()).select_from(AuditEvent)
        total_res = await db.execute(stmt_total)
        total = total_res.scalar_one()

        stmt_allow = select(func.count()).select_from(AuditEvent).where(AuditEvent.decision == "ALLOW")
        allow_res = await db.execute(stmt_allow)
        allowed = allow_res.scalar_one()

        stmt_block = select(func.count()).select_from(AuditEvent).where(AuditEvent.decision == "BLOCK")
        block_res = await db.execute(stmt_block)
        blocked = block_res.scalar_one()

        stmt_shadow = select(func.count()).select_from(AuditEvent).where(AuditEvent.decision == "SHADOW_WOULD_BLOCK")
        shadow_res = await db.execute(stmt_shadow)
        shadow = shadow_res.scalar_one()

        # Blocks by rule breakdown
        rule_breakdown = MetricRuleBreakdown()
        stmt_rule_counts = (
            select(AuditEvent.blocked_by_rule, func.count())
            .where(AuditEvent.blocked_by_rule.isnot(None))
            .group_by(AuditEvent.blocked_by_rule)
        )
        rule_res = await db.execute(stmt_rule_counts)
        for rule_name, count in rule_res.all():
            if hasattr(rule_breakdown, rule_name):
                setattr(rule_breakdown, rule_name, count)

        # Requests in last minute (throughput)
        one_min_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
        stmt_rpm = select(func.count()).select_from(AuditEvent).where(AuditEvent.created_at >= one_min_ago)
        rpm_res = await db.execute(stmt_rpm)
        rpm = float(rpm_res.scalar_one())

        # Active agents and tools count
        agent_cnt_res = await db.execute(select(func.count()).select_from(Agent).where(Agent.is_active.is_(True)))
        active_agents = agent_cnt_res.scalar_one()

        tool_cnt_res = await db.execute(select(func.count()).select_from(Tool).where(Tool.is_active.is_(True)))
        active_tools = tool_cnt_res.scalar_one()

        allow_pct = round((allowed / total) * 100, 1) if total > 0 else 100.0
        block_pct = round((blocked / total) * 100, 1) if total > 0 else 0.0

        return MetricsResponse(
            total_requests=total,
            allowed_count=allowed,
            blocked_count=blocked,
            shadow_count=shadow,
            allow_percentage=allow_pct,
            block_percentage=block_pct,
            blocks_by_rule=rule_breakdown,
            requests_per_minute=rpm,
            active_agents_count=active_agents,
            active_tools_count=active_tools,
        )
