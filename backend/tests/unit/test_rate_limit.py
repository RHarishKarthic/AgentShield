"""
Unit Tests for Rate Limit Rule.
"""

import pytest

from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.rate_limit import RateLimitRule
from app.redis_client import get_redis
from app.schemas.waf import ToolCallRequest


@pytest.mark.asyncio
async def test_rate_limit_enforces_max_calls():
    """
    Verify rate limit fires after N requests within window.
    (Success Criterion: Rate Limit Enforcement)
    """
    redis_client = get_redis()
    agent = Agent(agent_id="test-rate-agent", name="Test Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-rate-policy",
        name="Test Rate Policy",
        policy_config={"rate_limit": {"requests": 3, "window_seconds": 10}},
    )
    rule = RateLimitRule()

    # Clear any previous test keys
    redis_key = f"ratelimit:{agent.agent_id}:customer_database"
    await redis_client.delete(redis_key)

    req = ToolCallRequest(
        agent_id=agent.agent_id,
        tool="customer_database",
        operation="get_customer",
        parameters={"customer_id": 101},
    )

    # Calls 1, 2, 3 must be ALLOWED
    for i in range(1, 4):
        allowed, reason = await rule.evaluate(req, agent, policy, None, redis_client)
        assert allowed is True, f"Call {i} should be allowed"
        assert reason is None

    # Call 4 must be BLOCKED
    allowed, reason = await rule.evaluate(req, agent, policy, None, redis_client)
    assert allowed is False, "Call 4 must exceed rate limit"
    assert "Rate limit exceeded" in reason
    assert "limit: 3 calls" in reason


@pytest.mark.asyncio
async def test_rate_limit_fail_closed_without_redis():
    """If Redis is unavailable, rate limiter must fail closed."""
    agent = Agent(agent_id="test-failclosed-agent", name="Test Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-rate-policy",
        name="Test Rate Policy",
        policy_config={"rate_limit": {"requests": 5, "window_seconds": 60}},
    )
    rule = RateLimitRule()
    req = ToolCallRequest(agent_id=agent.agent_id, tool="customer_database")

    allowed, reason = await rule.evaluate(req, agent, policy, None, redis_client=None)
    assert allowed is False
    assert "fail-closed" in reason.lower()
