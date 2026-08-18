"""
Tool Service - Business logic for Tool registry.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.tool import Tool
from app.schemas.tool import ToolCreate, ToolUpdate

logger = get_logger(__name__)


class ToolService:
    @staticmethod
    async def create_tool(db: AsyncSession, tool_in: ToolCreate) -> Tool:
        """Register a new downstream tool."""
        existing = await ToolService.get_tool_by_id(db, tool_in.tool_id)
        if existing:
            raise ValueError(f"Tool with tool_id '{tool_in.tool_id}' already exists")

        tool = Tool(
            tool_id=tool_in.tool_id,
            name=tool_in.name,
            description=tool_in.description,
            endpoint_url=tool_in.endpoint_url,
            method=tool_in.method,
            is_active=tool_in.is_active,
            parameters_schema=tool_in.parameters_schema,
            custom_metadata=tool_in.custom_metadata or {},
        )
        db.add(tool)
        await db.commit()
        await db.refresh(tool)
        logger.info(f"Registered tool: {tool.tool_id}", extra={"tool": tool.tool_id})
        return tool

    @staticmethod
    async def get_tool_by_id(db: AsyncSession, tool_id: str) -> Tool | None:
        """Fetch tool by human-readable tool_id."""
        stmt = select(Tool).where(Tool.tool_id == tool_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_tools(db: AsyncSession, active_only: bool = False) -> Sequence[Tool]:
        """List all registered tools."""
        stmt = select(Tool)
        if active_only:
            stmt = stmt.where(Tool.is_active.is_(True))
        stmt = stmt.order_by(Tool.created_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def update_tool(db: AsyncSession, tool_id: str, tool_in: ToolUpdate) -> Tool | None:
        """Update an existing tool."""
        tool = await ToolService.get_tool_by_id(db, tool_id)
        if not tool:
            return None

        update_data = tool_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tool, key, value)

        await db.commit()
        await db.refresh(tool)
        logger.info(f"Updated tool: {tool.tool_id}", extra={"tool": tool.tool_id})
        return tool

    @staticmethod
    async def delete_tool(db: AsyncSession, tool_id: str) -> bool:
        """Delete tool by tool_id."""
        tool = await ToolService.get_tool_by_id(db, tool_id)
        if not tool:
            return False
        await db.delete(tool)
        await db.commit()
        logger.info(f"Deleted tool: {tool_id}", extra={"tool": tool_id})
        return True
