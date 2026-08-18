"""
Unit Tests for Parameter Validation Rule.
"""

import pytest

from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.parameter_validation import ParameterValidationRule
from app.schemas.waf import ToolCallRequest


@pytest.mark.asyncio
async def test_parameter_validation_catches_sql_injection():
    """
    Verify parameter validation detects SQL injection patterns.
    (Success Criterion: Injection Attack Detection)
    """
    agent = Agent(agent_id="support-agent", name="Support Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-param-policy",
        name="Test Param Policy",
        policy_config={
            "parameter_validation": {
                "max_parameter_size": 2048,
                "max_total_size": 65536,
                "blocked_patterns": ["DROP TABLE", "--", "<script>", "UNION SELECT"],
            }
        },
    )
    rule = ParameterValidationRule()

    # 1. Safe request -> ALLOW
    safe_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="get_customer",
        parameters={"customer_id": 101, "notes": "Regular safe customer inquiry"},
    )
    allowed, reason = await rule.evaluate(safe_req, agent, policy, None, None)
    assert allowed is True
    assert reason is None

    # 2. Simulated SQL Injection -> BLOCK
    injection_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="update_customer",
        parameters={"customer_id": 101, "notes": "'; DROP TABLE customers;--"},
    )
    allowed, reason = await rule.evaluate(injection_req, agent, policy, None, None)
    assert allowed is False
    assert "DROP TABLE" in reason

    # 3. Nested dictionary injection -> BLOCK
    nested_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="update_customer",
        parameters={"query": {"filter": {"raw_sql": "1=1 UNION SELECT * FROM passwords"}}},
    )
    allowed, reason = await rule.evaluate(nested_req, agent, policy, None, None)
    assert allowed is False
    assert "UNION SELECT" in reason


@pytest.mark.asyncio
async def test_parameter_validation_catches_oversized_payload():
    """Oversized parameter exceeding max size is blocked."""
    agent = Agent(agent_id="support-agent", name="Support Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-size-policy",
        name="Test Size Policy",
        policy_config={"parameter_validation": {"max_parameter_size": 100, "max_total_size": 1000}},
    )
    rule = ParameterValidationRule()

    oversized_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="update_customer",
        parameters={"customer_id": 101, "notes": "A" * 500},
    )
    allowed, reason = await rule.evaluate(oversized_req, agent, policy, None, None)
    assert allowed is False
    assert "exceeds maximum allowed size" in reason
