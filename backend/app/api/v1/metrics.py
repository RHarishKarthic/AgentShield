"""
Metrics API Endpoint.

Provides aggregate security metrics, allow/block ratios, and rule violation stats.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.audit.service import AuditService
from app.schemas.audit import MetricsResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("", response_model=MetricsResponse)
async def get_waf_metrics(
    time_range: str | None = Query(None, alias="time_range"),
    range: str | None = Query(None, alias="range"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve real-time aggregated security metrics for the dashboard.
    Accepts optional time_range query parameter ('1h', '24h', '7d', 'all').
    """
    active_range = time_range or range
    return await AuditService.get_metrics(db, time_range=active_range)
