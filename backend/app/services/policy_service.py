"""
Policy Service - Business logic for WAF security policies.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.policy import Policy
from app.schemas.policy import PolicyCreate, PolicyUpdate

logger = get_logger(__name__)


class PolicyService:
    @staticmethod
    async def create_policy(db: AsyncSession, policy_in: PolicyCreate) -> Policy:
        """Create a new security policy."""
        existing = await PolicyService.get_policy_by_id(db, policy_in.policy_id)
        if existing:
            raise ValueError(f"Policy with policy_id '{policy_in.policy_id}' already exists")

        config_dict = policy_in.policy_config.model_dump()

        policy = Policy(
            policy_id=policy_in.policy_id,
            name=policy_in.name,
            description=policy_in.description,
            mode=policy_in.mode,
            policy_config=config_dict,
            version=1,
        )
        db.add(policy)
        await db.commit()
        await db.refresh(policy)
        logger.info(
            f"Created policy: {policy.policy_id} (mode={policy.mode})",
            extra={"policy_id": policy.policy_id},
        )
        return policy

    @staticmethod
    async def get_policy_by_id(db: AsyncSession, policy_id: str) -> Policy | None:
        """Fetch policy by policy_id."""
        stmt = select(Policy).where(Policy.policy_id == policy_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_policies(db: AsyncSession) -> Sequence[Policy]:
        """List all registered policies."""
        stmt = select(Policy).order_by(Policy.created_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def update_policy(db: AsyncSession, policy_id: str, policy_in: PolicyUpdate) -> Policy | None:
        """Update policy and bump version number."""
        policy = await PolicyService.get_policy_by_id(db, policy_id)
        if not policy:
            return None

        update_data = policy_in.model_dump(exclude_unset=True)
        if "policy_config" in update_data and update_data["policy_config"] is not None:
            policy.policy_config = update_data["policy_config"].model_dump()
            policy.version += 1

        if "name" in update_data and update_data["name"] is not None:
            policy.name = update_data["name"]
        if "description" in update_data and update_data["description"] is not None:
            policy.description = update_data["description"]
        if "mode" in update_data and update_data["mode"] is not None:
            policy.mode = update_data["mode"]

        await db.commit()
        await db.refresh(policy)
        logger.info(
            f"Updated policy: {policy.policy_id} to v{policy.version} (mode={policy.mode})",
            extra={"policy_id": policy.policy_id},
        )
        return policy

    @staticmethod
    async def delete_policy(db: AsyncSession, policy_id: str) -> bool:
        """Delete policy."""
        policy = await PolicyService.get_policy_by_id(db, policy_id)
        if not policy:
            return False
        await db.delete(policy)
        await db.commit()
        logger.info(f"Deleted policy: {policy_id}", extra={"policy_id": policy_id})
        return True
