"""
Audit API Endpoints.

Provides query and filtering capabilities over the persistent PostgreSQL audit logs.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.audit.service import AuditService
from app.schemas.audit import AuditEventResponse, AuditListResponse

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("", response_model=AuditListResponse)
async def query_audit_logs(
    agent_id: str | None = Query(default=None, description="Filter by agent identifier"),
    tool: str | None = Query(default=None, description="Filter by tool identifier"),
    decision: str | None = Query(default=None, description="Filter by decision: ALLOW, BLOCK, SHADOW_WOULD_BLOCK"),
    blocked_by_rule: str | None = Query(default=None, description="Filter by violated rule name"),
    session_id: str | None = Query(default=None, description="Filter by session identifier"),
    start_date: datetime | None = Query(default=None, description="Filter events after timestamp (ISO format)"),
    end_date: datetime | None = Query(default=None, description="Filter events before timestamp (ISO format)"),
    limit: int = Query(default=50, ge=1, le=500, description="Max results per page"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Query the persistent WAF audit log with multi-dimensional filtering and pagination.
    """
    return await AuditService.query_events(
        db=db,
        agent_id=agent_id,
        tool=tool,
        decision=decision,
        blocked_by_rule=blocked_by_rule,
        session_id=session_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/{event_id}", response_model=AuditEventResponse)
async def get_audit_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single audit event record by event_id or UUID."""
    event = await AuditService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit event '{event_id}' not found",
        )
    return event
