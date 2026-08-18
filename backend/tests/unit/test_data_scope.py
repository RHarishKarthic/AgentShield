"""
Unit Tests for Data Scope Rule.
"""

import pytest

from app.models.agent import Agent
from app.models.policy import Policy
from app.policies.data_scope import DataScopeRule
from app.schemas.waf import ToolCallRequest


@pytest.mark.asyncio
async def test_data_scope_enforcement():
    """
    Verify out-of-scope customer data access is blocked.
    (Success Criterion: Data Scope Enforcement)
    """
    agent = Agent(agent_id="support-agent", name="Support Agent", api_key_hash="hash")
    policy = Policy(
        policy_id="test-scope-policy",
        name="Test Scope Policy",
        policy_config={
            "data_scope": {
                "customer_ids": [101, 102, 103],
                "allowed_file_paths": ["/data/public/", "/data/reports/"],
                "allowed_email_domains": ["@example.com"],
                "departments": ["Engineering", "Marketing"],
            }
        },
    )
    rule = DataScopeRule()

    # 1. In-scope customer ID 102 -> ALLOW
    in_scope_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="get_customer",
        parameters={"customer_id": 102},
    )
    allowed, reason = await rule.evaluate(in_scope_req, agent, policy, None, None)
    assert allowed is True
    assert reason is None

    # 2. Out-of-scope customer ID 999 -> BLOCK
    out_scope_req = ToolCallRequest(
        agent_id="support-agent",
        tool="customer_database",
        operation="get_customer",
        parameters={"customer_id": 999},
    )
    allowed, reason = await rule.evaluate(out_scope_req, agent, policy, None, None)
    assert allowed is False
    assert "Customer ID 999 is not in agent 'support-agent' authorized customer scope" in reason

    # 3. In-scope file path -> ALLOW
    file_ok_req = ToolCallRequest(
        agent_id="support-agent",
        tool="file_service",
        operation="read",
        parameters={"file_path": "/data/reports/q1_summary.txt"},
    )
    allowed, reason = await rule.evaluate(file_ok_req, agent, policy, None, None)
    assert allowed is True

    # 4. Out-of-scope system path -> BLOCK
    file_bad_req = ToolCallRequest(
        agent_id="support-agent",
        tool="file_service",
        operation="read",
        parameters={"file_path": "/etc/shadow"},
    )
    allowed, reason = await rule.evaluate(file_bad_req, agent, policy, None, None)
    assert allowed is False
    assert "Out-of-scope file access" in reason
