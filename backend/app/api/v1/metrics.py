"""
Metrics API Endpoint.

Provides aggregate security metrics, allow/block ratios, and rule violation stats.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.audit.service import AuditService
from app.schemas.audit import MetricsResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("", response_model=MetricsResponse)
async def get_waf_metrics(
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve real-time aggregated security metrics for the dashboard.
    """
    return await AuditService.get_metrics(db)
