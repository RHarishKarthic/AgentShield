"""
Agents API Endpoints.

CRUD operations for AI agents with API key management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_auth
from app.schemas.agent import AgentCreate, AgentResponse, AgentUpdate
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_in: AgentCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """
    Register a new AI agent.
    Returns the agent details along with the generated raw API key (one-time view).
    """
    try:
        agent, raw_api_key = await AgentService.create_agent(db, agent_in)
        resp = AgentResponse.model_validate(agent)
        resp.raw_api_key = raw_api_key
        return resp
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all registered AI agents."""
    return await AgentService.list_agents(db, active_only=active_only)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of an agent."""
    agent = await AgentService.get_agent_by_id(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' not found",
        )
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """Update an agent profile or policy association."""
    agent = await AgentService.update_agent(db, agent_id, agent_in)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' not found",
        )
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_auth),
):
    """Delete a registered agent."""
    deleted = await AgentService.delete_agent(db, agent_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' not found",
        )
