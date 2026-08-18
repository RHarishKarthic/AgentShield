"""
Unit Tests for Sequence Rule.
"""

import pytest

from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.sequence import SequenceRule
from app.redis_client import get_redis
from app.schemas.waf import ToolCallRequest


@pytest.mark.asyncio
async def test_sequence_rule_enforcement():
    """
    Verify out-of-order tool call is blocked by sequence rule.
    (Success Criterion: Sequence Rule Enforcement)
    """
    redis_client = get_redis()
    agent = Agent(agent_id="support-agent", name="Support Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-seq-policy",
        name="Test Seq Policy",
        policy_config={
            "sequence_rules": [
                {
                    "action": "get_customer_data",
                    "requires": ["authenticate_customer"],
                },
                {
                    "action": "update_customer",
                    "requires": ["authenticate_customer", "get_customer_data"],
                },
            ]
        },
    )
    rule = SequenceRule()

    # Use a fresh test session
    session_id = "test-session-seq-001"
    await redis_client.delete(f"session:sequence:{session_id}")

    # SCENARIO A: Call get_customer WITHOUT authenticating first -> MUST BLOCK
    get_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="get_customer",
        parameters={"customer_id": 101},
        session_id=session_id,
    )
    allowed, reason = await rule.evaluate(get_req, agent, policy, None, redis_client)
    assert allowed is False
    assert "Sequence rule violation" in reason
    assert "authenticate_customer" in reason

    # SCENARIO B: Step 1: Authenticate customer -> MUST ALLOW
    auth_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="authenticate",
        parameters={"customer_id": 101},
        session_id=session_id,
    )
    allowed, reason = await rule.evaluate(auth_req, agent, policy, None, redis_client)
    assert allowed is True
    assert reason is None

    # Step 2: Now call get_customer -> MUST ALLOW
    allowed, reason = await rule.evaluate(get_req, agent, policy, None, redis_client)
    assert allowed is True
    assert reason is None

    # Step 3: Now update_customer (both auth and get completed) -> MUST ALLOW
    update_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="update_customer",
        parameters={"customer_id": 101, "notes": "VIP"},
        session_id=session_id,
    )
    allowed, reason = await rule.evaluate(update_req, agent, policy, None, redis_client)
    assert allowed is True
    assert reason is None


@pytest.mark.asyncio
async def test_sequence_isolation_between_sessions():
    """Sessions must be isolated: Session A auth does not unlock Session B."""
    redis_client = get_redis()
    agent = Agent(agent_id="support-agent", name="Support Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-seq-policy",
        name="Test Seq Policy",
        policy_config={"sequence_rules": [{"action": "get_customer_data", "requires": ["authenticate_customer"]}]},
    )
    rule = SequenceRule()

    session_a = "session-isolated-A"
    session_b = "session-isolated-B"
    await redis_client.delete(f"session:sequence:{session_a}")
    await redis_client.delete(f"session:sequence:{session_b}")

    # Authenticate only Session A
    auth_req_a = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="authenticate",
        session_id=session_a,
    )
    await rule.evaluate(auth_req_a, agent, policy, None, redis_client)

    # Session B calls get_customer -> MUST BLOCK
    get_req_b = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="get_customer",
        session_id=session_b,
    )
    allowed_b, reason_b = await rule.evaluate(get_req_b, agent, policy, None, redis_client)
    assert allowed_b is False
    assert "Sequence rule violation" in reason_b
