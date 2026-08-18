"""
AgentShield WAF — Interactive Demo Script.

Executes all 8 core security scenarios demonstrating real-time policy enforcement:
1. Scenario 1: Normal Authorized Tool Call (ALLOW)
2. Scenario 2: Rate Limit Burst (6 reqs -> BLOCKED at 6th)
3. Scenario 3: SQL Injection Detection (DROP TABLE -> BLOCKED)
4. Scenario 4: Out-of-Scope Customer ID (cust_id 999 -> BLOCKED)
5. Scenario 5: Path Traversal Attack (/etc/shadow -> BLOCKED)
6. Scenario 6: Out-of-Order Sequence Violation (No auth first -> BLOCKED)
7. Scenario 7: Legitimate Multi-Step Workflow (Auth -> Get -> Update -> ALLOW)
8. Scenario 8: Shadow Mode Calibration (Violation logged, Tool executes -> SHADOW_WOULD_BLOCK)
"""

import asyncio
import os
import time

import httpx

WAF_BASE = os.getenv("WAF_GATEWAY_URL", "http://localhost:8000")
INTERCEPT_URL = f"{WAF_BASE}/api/v1/waf/intercept"


def print_banner(title: str):
    print("\n" + "=" * 75)
    print(f"  {title}")
    print("=" * 75)


def print_result(step_num: int, name: str, expected: str, actual: str, detail: str, duration_ms: float):
    status_color = "\033[92mPASS\033[0m" if expected == actual else "\033[91mFAIL\033[0m"
    print(f"[{status_color}] Scenario {step_num}: {name}")
    print(f"       Expected: {expected} | Actual: {actual} ({duration_ms:.2f}ms)")
    print(f"       Detail:   {detail}\n")


async def run_demo():
    print_banner("AGENTSHIELD WAF — LIVE SECURITY POLICY EVALUATION DEMO")
    print(f"Target Gateway: {INTERCEPT_URL}\n")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Check backend health
        try:
            health = await client.get(f"{WAF_BASE}/health")
            if health.status_code != 200:
                print(f"[!] Warning: Gateway health check returned {health.status_code}")
        except Exception as e:
            print(f"[!] ERROR: Cannot reach AgentShield gateway at {WAF_BASE}. Make sure the backend is running.")
            print(f"    Exception: {e}")
            return

        # ---------------------------------------------------------------------
        # SCENARIO 1: Normal Authorized Call
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 1: Normal Authorized Tool Call")
        sess_1 = f"demo-sess-1-{int(time.time())}"
        # Pre-authenticate
        await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "authenticate",
                "parameters": {"customer_id": 101},
                "session_id": sess_1,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        t0 = time.perf_counter()
        r1 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "session_id": sess_1,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d1 = r1.json()
        print_result(
            1,
            "Authorized Customer Query",
            "ALLOW",
            d1.get("status"),
            str(d1.get("result", {}).get("customer", {}).get("name")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 2: Rate Limit Burst
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 2: Rate Limiting (5 requests / 60s window)")
        sess_2 = f"demo-sess-2-{int(time.time())}"
        await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "email_service",
                "operation": "send",
                "parameters": {"recipient": "user1@example.com", "subject": "S1", "body": "B1"},
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        # Send 5 more requests (total 6 to email_service)
        last_resp = None
        for i in range(2, 7):
            t0 = time.perf_counter()
            last_resp = await client.post(
                INTERCEPT_URL,
                json={
                    "agent_id": "support-agent",
                    "tool": "email_service",
                    "operation": "send",
                    "parameters": {"recipient": f"user{i}@example.com", "subject": f"S{i}", "body": f"B{i}"},
                },
                headers={"X-Agent-API-Key": "agent-key-support-001"},
            )
            ms = (time.perf_counter() - t0) * 1000
            st = "ALLOW" if last_resp.status_code == 200 else "BLOCK"
            print(f"       Burst Request #{i}: {st} (HTTP {last_resp.status_code})")

        d2 = last_resp.json()
        print_result(
            2,
            "Rate Limit Enforcement on 6th Request",
            "BLOCK",
            "BLOCK" if last_resp.status_code == 403 else "ALLOW",
            d2.get("detail", d2.get("error")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 3: SQL Injection Detection
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 3: Parameter Injection Detection (SQL Injection)")
        sess_3 = f"demo-sess-3-{int(time.time())}"
        t0 = time.perf_counter()
        r3 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "update_customer",
                "parameters": {"customer_id": 101, "name": "Eve'; DROP TABLE customers;--"},
                "session_id": sess_3,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d3 = r3.json()
        print_result(
            3,
            "SQL Injection Detection ('DROP TABLE')",
            "BLOCK",
            "BLOCK" if r3.status_code == 403 else "ALLOW",
            d3.get("detail", d3.get("error")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 4: Out-of-Scope Data Access
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 4: Data Scope Enforcement (Unauthorized Customer)")
        sess_4 = f"demo-sess-4-{int(time.time())}"
        t0 = time.perf_counter()
        r4 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 999},
                "session_id": sess_4,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d4 = r4.json()
        print_result(
            4,
            "Data Scope Check (Customer 999 is out of scope [101, 102, 103])",
            "BLOCK",
            "BLOCK" if r4.status_code == 403 else "ALLOW",
            d4.get("detail", d4.get("error")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 5: Path Traversal Detection
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 5: Path Traversal / Sensitive File Access")
        sess_5 = f"demo-sess-5-{int(time.time())}"
        t0 = time.perf_counter()
        r5 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "file_service",
                "operation": "read",
                "parameters": {"file_path": "/etc/shadow"},
                "session_id": sess_5,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d5 = r5.json()
        print_result(
            5,
            "Path Traversal Check (/etc/shadow is forbidden)",
            "BLOCK",
            "BLOCK" if r5.status_code == 403 else "ALLOW",
            d5.get("detail", d5.get("error")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 6: Sequence Rule Violation (No Auth First)
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 6: Sequence Rule Enforcement (Action Without Prerequisite)")
        sess_6 = f"demo-unauth-sess-{int(time.time())}"
        t0 = time.perf_counter()
        r6 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "session_id": sess_6,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d6 = r6.json()
        print_result(
            6,
            "Sequence Rule Block (get_customer before authenticate)",
            "BLOCK",
            "BLOCK" if r6.status_code == 403 else "ALLOW",
            d6.get("detail", d6.get("error")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 7: Legitimate Multi-Step Workflow
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 7: Legitimate Multi-Step Workflow Sequence")
        sess_7 = f"demo-fullflow-sess-{int(time.time())}"
        # Step 1: Authenticate
        s1_res = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "authenticate",
                "parameters": {"customer_id": 101},
                "session_id": sess_7,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        print(f"       Step 1 (authenticate): {s1_res.json().get('status')} (HTTP {s1_res.status_code})")

        # Step 2: Get Customer
        s2_res = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "session_id": sess_7,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        print(f"       Step 2 (get_customer): {s2_res.json().get('status')} (HTTP {s2_res.status_code})")

        # Step 3: Update Customer
        t0 = time.perf_counter()
        s3_res = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "support-agent",
                "tool": "customer_database",
                "operation": "update_customer",
                "parameters": {"customer_id": 101, "notes": "Verified VIP account"},
                "session_id": sess_7,
            },
            headers={"X-Agent-API-Key": "agent-key-support-001"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d7 = s3_res.json()
        print_result(
            7,
            "Complete Multi-Step Sequence Flow",
            "ALLOW",
            d7.get("status"),
            str(d7.get("result", {}).get("message")),
            ms,
        )

        # ---------------------------------------------------------------------
        # SCENARIO 8: Shadow Mode Calibration
        # ---------------------------------------------------------------------
        print_banner("SCENARIO 8: Shadow Mode Calibration (Bonus Requirement)")
        sess_8 = f"demo-shadow-sess-{int(time.time())}"
        await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "shadow-agent",
                "tool": "customer_database",
                "operation": "authenticate",
                "parameters": {"customer_id": 101},
                "session_id": sess_8,
            },
            headers={"X-Agent-API-Key": "agent-key-shadow-002"},
        )
        # customer 103 is out-of-scope for shadow-audit-policy -> triggers SHADOW_WOULD_BLOCK but allows tool execution
        t0 = time.perf_counter()
        r8 = await client.post(
            INTERCEPT_URL,
            json={
                "agent_id": "shadow-agent",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 103},
                "session_id": sess_8,
            },
            headers={"X-Agent-API-Key": "agent-key-shadow-002"},
        )
        ms = (time.perf_counter() - t0) * 1000
        d8 = r8.json()
        print_result(
            8,
            "Shadow Mode: Violation Logged, Tool Executed",
            "SHADOW_WOULD_BLOCK",
            d8.get("status"),
            f"Customer returned: {d8.get('result', {}).get('customer', {}).get('name')}",
            ms,
        )

    print_banner("ALL 8 DEMO SCENARIOS COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(run_demo())
