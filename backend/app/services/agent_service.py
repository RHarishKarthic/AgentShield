"""
Agent Service - Business logic for Agent management and credentials.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate
from app.security.authentication import generate_api_key, hash_api_key

logger = get_logger(__name__)


class AgentService:
    @staticmethod
    async def create_agent(db: AsyncSession, agent_in: AgentCreate) -> tuple[Agent, str]:
        """
        Register a new AI agent and generate/hash its API key.
        Returns tuple of (Agent, raw_api_key).
        """
        existing = await AgentService.get_agent_by_id(db, agent_in.agent_id)
        if existing:
            raise ValueError(f"Agent with agent_id '{agent_in.agent_id}' already exists")

        raw_api_key = agent_in.api_key or generate_api_key()
        api_key_hash = hash_api_key(raw_api_key)

        agent = Agent(
            agent_id=agent_in.agent_id,
            name=agent_in.name,
            description=agent_in.description,
            policy_id=agent_in.policy_id,
            is_active=agent_in.is_active,
            api_key_hash=api_key_hash,
            custom_metadata=agent_in.custom_metadata or {},
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        logger.info(f"Registered agent: {agent.agent_id}", extra={"agent_id": agent.agent_id})
        return agent, raw_api_key

    @staticmethod
    async def get_agent_by_id(db: AsyncSession, agent_id: str) -> Agent | None:
        """Fetch agent by agent_id."""
        stmt = select(Agent).where(Agent.agent_id == agent_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_agents(db: AsyncSession, active_only: bool = False) -> Sequence[Agent]:
        """List registered agents."""
        stmt = select(Agent)
        if active_only:
            stmt = stmt.where(Agent.is_active.is_(True))
        stmt = stmt.order_by(Agent.created_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def update_agent(db: AsyncSession, agent_id: str, agent_in: AgentUpdate) -> Agent | None:
        """Update agent attributes."""
        agent = await AgentService.get_agent_by_id(db, agent_id)
        if not agent:
            return None

        update_data = agent_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(agent, key, value)

        await db.commit()
        await db.refresh(agent)
        logger.info(f"Updated agent: {agent.agent_id}", extra={"agent_id": agent.agent_id})
        return agent

    @staticmethod
    async def delete_agent(db: AsyncSession, agent_id: str) -> bool:
        """Delete agent."""
        agent = await AgentService.get_agent_by_id(db, agent_id)
        if not agent:
            return False
        await db.delete(agent)
        await db.commit()
        logger.info(f"Deleted agent: {agent_id}", extra={"agent_id": agent_id})
        return True
