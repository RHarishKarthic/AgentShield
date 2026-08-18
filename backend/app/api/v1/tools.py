"""
Tools API Endpoints.

CRUD operations for registered downstream tools.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_auth
from app.schemas.tool import ToolCreate, ToolResponse, ToolUpdate
from app.services.tool_service import ToolService

router = APIRouter(prefix="/tools", tags=["Tools"])


@router.post("", response_model=ToolResponse, status_code=status.HTTP_201_CREATED)
async def create_tool(
    tool_in: ToolCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """Register a new downstream tool for WAF interception."""
    try:
        tool = await ToolService.create_tool(db, tool_in)
        return tool
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[ToolResponse])
async def list_tools(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all registered tools."""
    return await ToolService.list_tools(db, active_only=active_only)


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a registered tool."""
    tool = await ToolService.get_tool_by_id(db, tool_id)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_id}' not found",
        )
    return tool


@router.patch("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: str,
    tool_in: ToolUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """Update a registered tool."""
    tool = await ToolService.update_tool(db, tool_id, tool_in)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_id}' not found",
        )
    return tool


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """Delete a registered tool."""
    deleted = await ToolService.delete_tool(db, tool_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_id}' not found",
        )
