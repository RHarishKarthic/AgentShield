"""
Sequence Policy Rule.

Implements session-aware multi-step sequence validation backed by Redis with in-memory fallback.
Rejects out-of-order tool actions (e.g. attempting to read or update customer data
without prior customer authentication).
"""

import time
from collections import defaultdict
from typing import Any

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import get_logger
from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.base import BaseRule
from app.schemas.waf import ToolCallRequest

logger = get_logger(__name__)

# --- In-memory session fallback (Redis offline/disconnected environments) ---
# Bounded by MAX_SESSIONS entries; entries expire after SESSION_TTL_SECONDS.
# This prevents unbounded memory growth in long-running processes.
SESSION_TTL_SECONDS: int = 3600   # 1 hour — matches Redis key TTL
MAX_SESSIONS: int = 10_000        # Hard cap on in-memory session count

# Structure: { session_id: {"actions": [...], "expires_at": float} }
_IN_MEMORY_SESSIONS: dict[str, dict] = {}


def _prune_expired_sessions() -> None:
    """Remove sessions that have expired. Called on every write to keep the store bounded."""
    now = time.monotonic()
    expired = [sid for sid, data in _IN_MEMORY_SESSIONS.items() if data["expires_at"] < now]
    for sid in expired:
        del _IN_MEMORY_SESSIONS[sid]
    # If still over limit after pruning, evict the oldest entries
    if len(_IN_MEMORY_SESSIONS) > MAX_SESSIONS:
        oldest = sorted(_IN_MEMORY_SESSIONS, key=lambda sid: _IN_MEMORY_SESSIONS[sid]["expires_at"])
        for sid in oldest[: len(_IN_MEMORY_SESSIONS) - MAX_SESSIONS]:
            del _IN_MEMORY_SESSIONS[sid]


class SequenceRule(BaseRule):
    """
    Validates that dependent tool invocations follow mandated predecessor sequences.
    """

    @property
    def rule_name(self) -> str:
        return "sequence"

    def _normalize_action_name(self, request: ToolCallRequest) -> str:
        """
        Derive canonical action name from request.
        Maps operation or tool name to standard rule identifiers.
        """
        op = (request.operation or "").strip().lower()
        tool = (request.tool or "").strip().lower()

        # Check operation first
        if op:
            if "auth" in op:
                return "authenticate_customer"
            if "get" in op or "read" in op or "query" in op:
                if "customer" in tool or "customer" in op:
                    return "get_customer_data"
            if "update" in op or "write" in op or "modify" in op:
                if "customer" in tool or "customer" in op:
                    return "update_customer"
            return op

        return tool

    async def evaluate(
        self,
        request: ToolCallRequest,
        agent: Agent,
        policy: Policy,
        db: AsyncSession,
        redis_client: redis.Redis | None = None,
    ) -> tuple[bool, str | None]:
        """
        Evaluate session sequence constraints.
        """
        config = policy.policy_config or {}
        sequence_rules: list[dict[str, Any]] = config.get("sequence_rules", [])

        if not sequence_rules:
            return True, None

        current_action = self._normalize_action_name(request)
        session_id = request.session_id or f"default-{agent.agent_id}"

        # Find if there are prerequisites configured for the current action
        matching_rule = None
        for rule in sequence_rules:
            rule_action = rule.get("action", "")
            if rule_action.lower() == current_action.lower() or rule_action.lower() in [
                request.operation.lower(),
                request.tool.lower(),
            ]:
                matching_rule = rule
                break

        if not matching_rule:
            await self._record_action(redis_client, session_id, current_action)
            return True, None

        prerequisites: list[str] = matching_rule.get("requires", [])
        if not prerequisites:
            await self._record_action(redis_client, session_id, current_action)
            return True, None

        # Check session action history from Redis or in-memory fallback
        history_set: set[str] = set()
        if redis_client is not None:
            try:
                redis_key = f"session:sequence:{session_id}"
                history = await redis_client.lrange(redis_key, 0, -1)
                history_set = set(history)
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Redis sequence history fallback to in-memory: {e!s}")
                history_set = set(_IN_MEMORY_SESSIONS.get(session_id, {}).get("actions", []))
        else:
            history_set = set(_IN_MEMORY_SESSIONS.get(session_id, {}).get("actions", []))

        missing_prereqs = [req for req in prerequisites if req not in history_set]

        if missing_prereqs:
            msg = (
                f"Sequence rule violation: Action '{current_action}' (or '{request.operation or request.tool}') "
                f"requires prerequisite action(s) {missing_prereqs} to be executed first in session '{session_id}'"
            )
            logger.warning(
                msg,
                extra={
                    "agent_id": agent.agent_id,
                    "session_id": session_id,
                    "action": current_action,
                    "missing": missing_prereqs,
                },
            )
            return False, msg

        # All prerequisites satisfied — record current action in session history
        await self._record_action(redis_client, session_id, current_action)
        return True, None

    async def _record_action(self, redis_client: redis.Redis | None, session_id: str, action: str) -> None:
        """Record completed action into Redis session history with TTL-bounded in-memory fallback."""
        if redis_client is not None:
            try:
                redis_key = f"session:sequence:{session_id}"
                await redis_client.rpush(redis_key, action)
                await redis_client.expire(redis_key, SESSION_TTL_SECONDS)
                return
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Failed to record action in Redis sequence: {e!s}")
        # In-memory fallback: prune expired sessions, then upsert this session
        _prune_expired_sessions()
        if session_id not in _IN_MEMORY_SESSIONS:
            _IN_MEMORY_SESSIONS[session_id] = {
                "actions": [],
                "expires_at": time.monotonic() + SESSION_TTL_SECONDS,
            }
        else:
            # Refresh TTL on activity
            _IN_MEMORY_SESSIONS[session_id]["expires_at"] = time.monotonic() + SESSION_TTL_SECONDS
        _IN_MEMORY_SESSIONS[session_id]["actions"].append(action)
