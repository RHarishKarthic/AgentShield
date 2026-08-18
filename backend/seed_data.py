"""
Database Seeding Script for Container Runtime.
"""

import asyncio
import os

from app import database
from app.database import close_db, init_db
from app.logging_config import setup_logging
from app.schemas.agent import AgentCreate
from app.schemas.policy import (
    DataScopeRule,
    ParameterValidationRule,
    PolicyConfig,
    PolicyCreate,
    RateLimitRule,
    SequenceRuleItem,
)
from app.schemas.tool import ToolCreate
from app.services.agent_service import AgentService
from app.services.policy_service import PolicyService
from app.services.tool_service import ToolService

setup_logging("INFO")


async def seed():
    print("=" * 60)
    print("Seeding AgentShield Database...")
    print("=" * 60)

    await init_db()

    async with database._session_factory() as db:
        # 1. Seed Policies
        default_policy = await PolicyService.get_policy_by_id(db, "support-agent-policy")
        if not default_policy:
            await PolicyService.create_policy(
                db,
                PolicyCreate(
                    policy_id="support-agent-policy",
                    name="Support Agent Standard Policy",
                    description="Governs support-agent tool interactions with rate limits, parameter hygiene, data scope, and sequence enforcement.",
                    mode="enforcement",
                    policy_config=PolicyConfig(
                        rate_limit=RateLimitRule(requests=5, window_seconds=60),
                        parameter_validation=ParameterValidationRule(
                            max_parameter_size=2048,
                            max_total_size=65536,
                            blocked_patterns=[
                                "DROP TABLE",
                                "--",
                                "<script>",
                                "UNION SELECT",
                                "/etc/shadow",
                                "../",
                                ";--",
                                "eval(",
                                "exec(",
                            ],
                        ),
                        data_scope=DataScopeRule(
                            customer_ids=[101, 102, 103],
                            allowed_file_paths=["/data/public/", "/data/reports/"],
                            allowed_email_domains=["@example.com", "@enterprise.corp"],
                            departments=["Engineering", "Marketing", "Finance"],
                        ),
                        sequence_rules=[
                            SequenceRuleItem(
                                action="get_customer_data",
                                requires=["authenticate_customer"],
                            ),
                            SequenceRuleItem(
                                action="update_customer",
                                requires=["authenticate_customer", "get_customer_data"],
                            ),
                        ],
                    ),
                ),
            )
            print("    -> Created 'support-agent-policy' (enforcement)")

        shadow_policy = await PolicyService.get_policy_by_id(db, "shadow-audit-policy")
        if not shadow_policy:
            await PolicyService.create_policy(
                db,
                PolicyCreate(
                    policy_id="shadow-audit-policy",
                    name="Shadow Mode Calibration Policy",
                    description="Shadow mode policy for testing new rules without blocking live agent traffic.",
                    mode="shadow",
                    policy_config=PolicyConfig(
                        rate_limit=RateLimitRule(requests=3, window_seconds=60),
                        parameter_validation=ParameterValidationRule(
                            max_parameter_size=1024,
                            max_total_size=32768,
                            blocked_patterns=["DROP TABLE", "SELECT *"],
                        ),
                        data_scope=DataScopeRule(customer_ids=[101, 102]),
                        sequence_rules=[
                            SequenceRuleItem(
                                action="get_customer_data",
                                requires=["authenticate_customer"],
                            )
                        ],
                    ),
                ),
            )
            print("    -> Created 'shadow-audit-policy' (shadow)")

        # 2. Seed Tools
        tools_to_seed = [
            ToolCreate(
                tool_id="customer_database",
                name="Customer Database Service",
                description="Provides access to customer records and profile updates.",
                endpoint_url=os.getenv("TOOL_CUSTOMER_URL", "http://tools:8001"),
                method="POST",
                is_active=True,
                parameters_schema={"type": "object"},
            ),
            ToolCreate(
                tool_id="email_service",
                name="Email Dispatch Service",
                description="Dispatches internal notifications and external customer correspondence.",
                endpoint_url=os.getenv("TOOL_EMAIL_URL", "http://tools:8002"),
                method="POST",
                is_active=True,
                parameters_schema={"type": "object"},
            ),
            ToolCreate(
                tool_id="file_service",
                name="Secure File Storage Service",
                description="Virtual filesystem for reading and writing organizational documents.",
                endpoint_url=os.getenv("TOOL_FILE_URL", "http://tools:8003"),
                method="POST",
                is_active=True,
                parameters_schema={"type": "object"},
            ),
        ]

        for t in tools_to_seed:
            existing = await ToolService.get_tool_by_id(db, t.tool_id)
            if not existing:
                await ToolService.create_tool(db, t)
                print(f"    -> Created tool '{t.tool_id}' at {t.endpoint_url}")

        # 3. Seed Agents
        agents_to_seed = [
            AgentCreate(
                agent_id="support-agent",
                name="Customer Support Agent",
                description="Autonomous support agent handling customer inquiries, account verification, and record maintenance.",
                policy_id="support-agent-policy",
                api_key="agent-key-support-001",
                is_active=True,
            ),
            AgentCreate(
                agent_id="shadow-agent",
                name="Shadow Mode Calibration Agent",
                description="Test agent operating under shadow policy to demonstrate non-blocking rule calibration.",
                policy_id="shadow-audit-policy",
                api_key="agent-key-shadow-002",
                is_active=True,
            ),
        ]

        for a in agents_to_seed:
            existing = await AgentService.get_agent_by_id(db, a.agent_id)
            if not existing:
                _, key = await AgentService.create_agent(db, a)
                print(f"    -> Created agent '{a.agent_id}' with API Key: {key}")

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
