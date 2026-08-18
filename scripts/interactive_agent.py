"""
AgentShield Live Interactive Agent REPL.

Allows you to interact directly with the real Autonomous AI Agent and WAF Gateway in real time.
Type any custom prompt or attack to see the live reasoning, WAF interception, and tool execution.
"""

import asyncio
import os
import sys
import uuid
import httpx

# Add project paths
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
sys.path.insert(0, root_dir)

from agent.agent import AutonomousAgent
from agent.llm import get_llm_provider
from agent.tools import WAFGatewayClient


def print_banner():
    print("\n" + "=" * 70)
    print("  🛡️  AGENTSHIELD LIVE INTERACTIVE AI AGENT CONSOLE")
    print("=" * 70)
    print("You are talking directly to the live autonomous AI Agent.")
    print("Every tool invocation is strictly intercepted by AgentShield WAF (:8000).")
    print("Commands:")
    print("  - Type any natural language task (e.g. 'Authenticate customer 101')")
  
    print("  - Type 'switch shadow' or 'switch enforcement' to change policy mode")
    print("  - Type 'reset' to start a new session")
    print("  - Type 'exit' or 'quit' to close")
    print("=" * 70 + "\n")


async def main():
    print_banner()

    gateway_url = os.getenv("WAF_GATEWAY_URL", "http://localhost:8000/api/v1/waf/intercept")
    agent_id = "support-agent"
    api_key = "agent-key-support-001"

    # Test gateway connectivity
    try:
        async with httpx.AsyncClient(timeout=5.0) as test_client:
            h = await test_client.get("http://localhost:8000/health")
            if h.status_code != 200:
                print(f"[!] Warning: Gateway at http://localhost:8000 returned status {h.status_code}")
    except Exception as e:
        print("[!] ERROR: Cannot reach AgentShield WAF Gateway at http://localhost:8000.")
        print("    Please ensure Docker or the backend server is running.")
        print(f"    Details: {e}")
        return

    session_id = f"sess-{uuid.uuid4().hex[:6]}"
    agent = AutonomousAgent(
        agent_id=agent_id,
        api_key=api_key,
        llm_provider=get_llm_provider(),
        waf_client=WAFGatewayClient(gateway_url=gateway_url, agent_id=agent_id, api_key=api_key),
    )

    print(f"[*] Active Session ID: {session_id}")
    print(f"[*] Active Agent: {agent_id} (Governed by 'support-agent-policy')\n")

    while True:
        try:
            user_input = input("\033[96mAgentShield Prompt > \033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

        if not user_input:
            continue

        if user_input.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break

        if user_input.lower() == "reset":
            session_id = f"sess-{uuid.uuid4().hex[:6]}"
            print(f"[*] Reset session. New Session ID: {session_id}\n")
            continue

        if user_input.lower().startswith("switch "):
            mode = user_input.split()[1].lower()
            if mode in ["shadow", "enforcement"]:
                async with httpx.AsyncClient() as client:
                    res = await client.patch(
                        "http://localhost:8000/api/v1/policies/support-agent-policy",
                        headers={"X-API-Key": "dev-api-key-agentshield-2026"},
                        json={"mode": mode},
                    )
                    if res.status_code == 200:
                        print(f"[+] Successfully switched policy to {mode.upper()} mode.\n")
                    else:
                        print(f"[-] Failed to update policy: {res.text}\n")
            else:
                print("Usage: switch shadow | switch enforcement\n")
            continue

        print("\n[*] Processing with AI Agent & AgentShield WAF...")
        res = await agent.execute_task(instruction=user_input, session_id=session_id)

        # Print step-by-step breakdown
        print("-" * 70)
        print(f"💭 LLM Reasoning: {res.get('thought', 'None')}")

        tool_call = res.get("tool_call")
        if tool_call:
            print(f"🛠️  Tool Selected: {tool_call['tool']} / {tool_call.get('operation')}")
            print(f"📦 Parameters:    {tool_call.get('parameters')}")
        else:
            print("🛠️  Tool Selected: None (Direct Answer)")

        disposition = res.get("waf_disposition")
        if disposition == "ALLOW":
            disp_color = "\033[92mALLOW (PASSED SECURITY CHECKS)\033[0m"
        elif disposition == "BLOCK":
            disp_color = "\033[91mBLOCK (SECURITY VIOLATION PREVENTED)\033[0m"
        elif disposition == "SHADOW_WOULD_BLOCK":
            disp_color = "\033[93mSHADOW_WOULD_BLOCK (VIOLATION RECORDED, TOOL EXECUTED)\033[0m"
        else:
            disp_color = disposition

        print(f"🛡️  WAF Verdict:   {disp_color}")

        if res.get("tool_result"):
            print(f"🏢 Tool Result:   {res['tool_result']}")

        if res.get("error"):
            print(f"🚫 Block Reason:  \033[91m{res['error']}\033[0m")

        print(f"\n🤖 Final AI Output:\n{res.get('final_answer')}")
        print("-" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
