# 🛡️ AgentShield — The Autonomous AI Agent WAF
> **Enterprise Agentic Security Gateway**
> **Unit 5  Agentic AI Security - PS-5.1 The Agent WAF**
> *Web Application Firewall for AI Agent Tool Invocations*
> 

[![CI Pipeline](https://github.com/RHarishKarthic/AgentShield/actions/workflows/ci.yml/badge.svg)](https://github.com/RHarishKarthic/AgentShield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/Python-3.12%2B-brightgreen.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-teal.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://docker.com)

---

## 🌐 Live Production Deployments

| Component | Live Deployment URL | Description |
| :--- | :--- | :--- |
| **SOC Dashboard** | [https://agentshield-frontend-lrhq.onrender.com](https://agentshield-frontend-lrhq.onrender.com) | Real-Time React 19 Security Operations Console |
| **WAF Gateway API** | [https://agentshield-backend-77dp.onrender.com](https://agentshield-backend-77dp.onrender.com) | Core Interception Proxy & Policy Engine (`/docs` available) |
| **Source Repository** | [https://github.com/RHarishKarthic/AgentShield](https://github.com/RHarishKarthic/AgentShield) | Production Codebase & CI/CD Pipelines |

---

## 📋 Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. How Enterprise Systems Route Traffic Through AgentShield](#2-how-enterprise-systems-route-traffic-through-agentshield)
- [3. Architecture & Data Flow](#3-architecture--data-flow)
- [4. Core Security Guardrails & Policy Matrix](#4-core-security-guardrails--policy-matrix)
- [5. Requirements Traceability Matrix](#5-requirements-traceability-matrix)
- [6. Quickstart Guide](#6-quickstart-guide)
  - [Option A: Docker Compose (One-Command Launch)](#option-a-docker-compose-one-command-launch)
  - [Option B: Local Development Setup](#option-b-local-development-setup)
- [7. Interactive Threat & LLM Agent Simulator](#7-interactive-threat--llm-agent-simulator)
- [8. Real-Time Dashboard & Telemetry](#8-real-time-dashboard--telemetry)
- [9. REST API & WebSocket Reference](#9-rest-api--websocket-reference)
- [10. Performance & Latency Benchmarks](#10-performance--latency-benchmarks)
- [11. Automated Testing & Verification](#11-automated-testing--verification)

---

## 1. Executive Summary

Autonomous AI agents leverage Large Language Models (LLMs) to perform tool calling and orchestrate real-world operations (executing SQL queries, dispatching emails, reading virtual files, and modifying records). However, LLMs are vulnerable to indirect prompt injection, parameter tampering, unauthorized data access, and out-of-order execution cascades.

**AgentShield** is an inline, zero-trust **Agentic Web Application Firewall (WAF)** that sits between autonomous AI agents and downstream enterprise tools. It intercepts, validates, sanitizes, and audits every tool call in real time with **sub-5ms latency**.

### Core Capabilities:
- **Distributed Atomic Rate Limiting**: Redis sliding-window rate limiting preventing denial-of-service and runaway tool loops.
- **Deep Parameter & Injection Inspection**: Recursive validation scanning tool arguments for SQL injection, path traversal, script injection, and oversized payloads.
- **Data Scope Enforcement**: Restricts access to authorized customer IDs, file paths, email domains, and departments.
- **Session-Aware Sequence Rules**: Enforces chronological state prerequisites (e.g., must `authenticate_customer` before `get_customer_data` or `update_customer`).
- **Shadow Calibration Mode**: Evaluates live traffic against new policies, logging violations without blocking execution.
- **Native LLM Reasoner Integration**: Built-in support for swappable LLM reasoning providers (Groq Cloud Llama 3.3 70B, OpenAI GPT-4o-mini, Ollama, and Rule-based fallbacks).
- **Real-Time Streaming Observability**: Live WebSocket telemetry feed, interactive attack simulator, and reactive React 19 dashboard.

---

## 2. How Enterprise Systems Route Traffic Through AgentShield

AgentShield is a specialized firewall purpose-built for the AI Agent-to-Tool boundary.

```
                       BEFORE (Unprotected & Vulnerable)
┌──────────────┐                                       ┌─────────────────────────┐
│   AI Agent   │ ────────── Direct Unchecked Call ───► │ Company Internal DB     │
└──────────────┘                                       └─────────────────────────┘

                       AFTER (Protected by AgentShield)
┌──────────────┐         1. Intercept Call             ┌─────────────────────────┐
│   AI Agent   │ ────────────────────────────────────► │     AgentShield WAF     │
└──────────────┘                                       │     Gateway (:8000)     │
                                                       └────────────┬────────────┘
                                                                    │ 2. Evaluates Policy (< 4ms)
                                                                    │    If Allowed: Forwards
                                                                    ▼
                                                       ┌─────────────────────────┐
                                                       │ Company Internal DB     │
                                                       │ (Isolated in VPC)       │
                                                       └─────────────────────────┘
```

### Integration in 3 Steps:

1. **Point AI Agent Tool Calls to AgentShield**:
   Instead of calling the database directly, the agent sends its tool call to `POST /api/v1/waf/intercept`:
   ```python
   # Protected Tool Call from AI Agent
   response = requests.post(
       "https://agentshield-backend-77dp.onrender.com/api/v1/waf/intercept",
       headers={"X-Agent-API-Key": "agent-key-support-001"},
       json={
           "agent_id": "support-agent",
           "tool": "customer_database",
           "operation": "get_customer",
           "parameters": {"customer_id": 101},
           "session_id": "user-session-123"
       }
   )
   ```

2. **Register Downstream Tool Microservices**:
   Register internal APIs in AgentShield's Tool Registry (`POST /api/v1/tools`):
   ```json
   {
     "tool_id": "customer_database",
     "name": "Production Customer DB",
     "endpoint_url": "https://internal-db.company.internal:8001",
     "method": "POST"
   }
   ```

3. **VPC Network Isolation**:
   Isolate internal tools and databases in a private network where only the **AgentShield Gateway** is allowed inbound access.

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph AgentRuntime["Autonomous Agent Runtime"]
        UserPrompt["User Prompt / Instruction"] --> LLM["LLM Reasoner (Groq / OpenAI / Ollama)"]
        LLM --> ToolCallDecision["Tool Call Selection"]
        ToolCallDecision --> WAFClient["WAF Gateway Client (Strict Routing)"]
    end

    subgraph AgentShield["AgentShield Security Gateway (:8000)"]
        WAFClient --> ReverseProxy["WAF Intercept Proxy (/api/v1/waf/intercept)"]
        ReverseProxy --> AuthCheck["Agent Authentication (HMAC / Key Check)"]
        AuthCheck --> PolicyEngine["Policy Evaluation Engine"]

        subgraph Rules["Security Engine Rules"]
            PolicyEngine --> RL["1. Rate Limit Rule (Redis Sliding Window)"]
            PolicyEngine --> PV["2. Parameter Validation Rule (SQLi / XSS)"]
            PolicyEngine --> DS["3. Data Scope Rule (IDs / Paths / Domains)"]
            PolicyEngine --> SEQ["4. Sequence Rule (Prerequisites DAG)"]
        end

        PolicyEngine --> Disposition{"Decision?"}
        Disposition -- "BLOCK" --> Refusal["Synthesize Security Refusal (HTTP 403)"]
        Disposition -- "SHADOW" --> ShadowLog["Record Violation (Non-blocking HTTP 200)"]
        Disposition -- "ALLOW" --> Forwarder["Tool Forwarder (Safe HTTP Client)"]
        ShadowLog --> Forwarder

        PolicyEngine --> Audit["Audit Logger & PII Sanitizer"]
        Audit --> Postgres[(PostgreSQL 16 Storage)]
        Audit --> WS["WebSocket Broadcaster (/ws/events)"]
    end

    subgraph DownstreamServices["Enterprise Microservices"]
        Forwarder --> CustDB["Customer Service (:8001)"]
        Forwarder --> EmailSvc["Email Service (:8002)"]
        Forwarder --> FileSvc["File Service (:8003)"]
    end

    subgraph Observability["Real-Time Dashboard (:5173 / :80)"]
        WS --> Dashboard["React 19 Security Dashboard"]
        Dashboard --> SimPanel["Interactive Threat & LLM Simulator"]
    end
```

---

## 4. Core Security Guardrails & Policy Matrix

AgentShield policies are declaratively defined and hot-reloaded:

```yaml
policy_id: "support-agent-policy"
name: "Customer Support Agent Policy"
mode: "enforcement"  # "enforcement" or "shadow"

policy_config:
  rate_limit:
    requests: 5
    window_seconds: 60

  parameter_validation:
    max_parameter_size: 2048
    max_total_size: 65536
    blocked_patterns:
      - "DROP TABLE"
      - "--"
      - "<script>"
      - "UNION SELECT"
      - "/etc/shadow"
      - "../"
      - ";--"
      - "eval("
      - "exec("

  data_scope:
    customer_ids: [101, 102, 103]
    allowed_file_paths:
      - "/data/public/"
      - "/data/reports/"
    allowed_email_domains:
      - "@example.com"
      - "@enterprise.corp"
    departments:
      - "Engineering"
      - "Marketing"
      - "Finance"

  sequence_rules:
    - action: "get_customer_data"
      requires:
        - "authenticate_customer"
    - action: "update_customer"
      requires:
        - "authenticate_customer"
        - "get_customer_data"
```

---

## 5. Requirements Traceability Matrix

| Requirement ID | Security Requirement / Capability | Implementation Component | Verification Test / Evidence |
|---|---|---|---|
| **PS5.1-M01** | Intercept tool calls before reaching target API | `app/waf/proxy.py`, `app/api/v1/waf.py` | `test_stage3_waf.py` |
| **PS5.1-M02** | Declarative Policy Definition (YAML/JSON) | `app/schemas/policy.py`, `app/services/policy_service.py` | `test_stage2_tools.py` |
| **PS5.1-M03** | Rule 1: Rate Limiting per agent/tool | `app/policies/rate_limit.py` | `test_criterion_1_rate_limiting`, `test_concurrency.py` |
| **PS5.1-M04** | Rule 2: Parameter & Injection Inspection | `app/policies/parameter_validation.py` | `test_criterion_2_parameter_injection_block` |
| **PS5.1-M05** | Rule 3: Data Scope Enforcement | `app/policies/data_scope.py` | `test_criterion_3_out_of_scope_data_block` |
| **PS5.1-M06** | Rule 4: Action Sequence Rules | `app/policies/sequence.py` | `test_criterion_4_sequence_rule_enforcement` |
| **PS5.1-M07** | Real-Time Dashboard showing tool traffic | `frontend/src/App.tsx`, `frontend/src/components/*` | `test_stage8_websocket.py`, UI Build |
| **PS5.1-M08** | Audit log capturing all decisions & redaction | `app/audit/service.py`, `app/audit/sanitizer.py` | `test_stage5_audit.py`, `test_audit_sanitizer.py` |
| **BONUS** | Shadow Mode (Log without blocking) | `app/waf/engine.py`, `app/waf/proxy.py` | `test_stage6_shadow_mode.py` |
| **GEN-01-07** | Production Readiness, Docker, CI/CD, Docs | `docker-compose.yml`, `.github/workflows/ci.yml` | Full suite, `run_benchmarks.py` |

---

## 6. Quickstart Guide

### Option A: Docker Compose (One-Command Launch)
Launch the complete 5-service architecture with a single command:

```bash
docker compose up --build
```

**Services Launched:**
- **Frontend Dashboard**: `http://localhost:5173` (or `http://localhost:3000`)
- **WAF Gateway API**: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- **Customer Microservice**: `http://localhost:8001`
- **Email Microservice**: `http://localhost:8002`
- **File Microservice**: `http://localhost:8003`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

---

### Option B: Local Development Setup

#### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker run -d --name agentshield-postgres -e POSTGRES_DB=agentshield -e POSTGRES_USER=agentshield -e POSTGRES_PASSWORD=agentshield_dev_password -p 5432:5432 postgres:16-alpine
docker run -d --name agentshield-redis -p 6379:6379 redis:7-alpine
```

#### 2. Start Downstream Microservices
```bash
cd tools
python run_all_tools.py
# Customer (:8001), Email (:8002), File Storage (:8003)
```

#### 3. Start Backend WAF Gateway
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run migrations & seed data
alembic upgrade head
python ../scripts/seed_data.py

# Launch FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. Start React Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

---

## 7. Interactive Threat & LLM Agent Simulator

Open the **`Simulate / Test`** modal on the dashboard to test 6 tactical scenarios or execute prompts with real LLMs:

1. **1. Normal Call (ALLOW)**: Authenticates Customer 101 &rarr; Reads profile &rarr; `HTTP 200 ALLOWED`
2. **2. Rate Limit Burst**: Dispatches 6 rapid email requests &rarr; 6th request triggers rate violation &rarr; `HTTP 403 BLOCKED`
3. **3. SQL Injection Attack**: Sends `UNION SELECT null, password` &rarr; Caught by parameter inspection &rarr; `HTTP 403 BLOCKED`
4. **4. Data Boundary Bypass**: Requests Customer 999 (out of scope [101-103]) &rarr; `HTTP 403 BLOCKED`
5. **5. Sequence Violation**: Calls `get_customer` without prior authentication &rarr; `HTTP 403 BLOCKED`
6. **6. Shadow Calibration**: Executes out-of-scope call under `shadow-agent` &rarr; `HTTP 200 SHADOW_WOULD_BLOCK` (Dry-run logged)

---

## 8. Real-Time Dashboard & Telemetry

The dashboard provides real-time security observability:
- **Temporal Filter Controls**: Exact server-side aggregation for `Last 1 hour`, `Last 24 hours`, `Last 7 days`, and `All Time`.
- **Live Traffic Stream**: WebSocket-driven push stream of all intercepted tool calls.
- **Forensic Audit Log Trail**: Searchable audit logs with permanent PII redaction and CSV/JSON export.
- **Policy Control Center**: 1-click mode switching between `Enforcement` and `Shadow`, and interactive **`+ Create New Policy`** modal.
- **Tool Registry**: Port and scope visualizer for all registered microservices.

---

## 9. REST API & WebSocket Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/waf/intercept` | Intercept and evaluate agent tool call | `X-Agent-API-Key` |
| `POST` | `/api/v1/waf/prompt` | Execute natural language prompt through LLM reasoner + WAF | Public / Dashboard |
| `GET` | `/api/v1/metrics` | Server-side temporal metrics (`?time_range=1h\|24h\|7d\|all`) | Public / Dashboard |
| `GET` | `/api/v1/audit` | Paginated audit log events with filtering | Public / Dashboard |
| `GET` | `/api/v1/policies` | List all registered security policies | Public / Dashboard |
| `POST` | `/api/v1/policies` | Register new security policy | `X-API-Key` |
| `PATCH`| `/api/v1/policies/{id}` | Update policy configuration / mode | `X-API-Key` |
| `GET` | `/api/v1/tools` | List registered downstream tools | Public / Dashboard |
| `GET` | `/api/v1/agents` | List registered AI agents | Public / Dashboard |
| `GET` | `/health` | Liveness health check | Public |
| `GET` | `/ready` | Readiness check (Postgres + Redis status) | Public |
| `WS` | `/ws/events` | Real-time WebSocket event stream | Public / Dashboard |

---

## 10. Performance & Latency Benchmarks

Benchmarks executed over 100 sequential and concurrent iterations via `scripts/run_benchmarks.py`:

```
-----------------------------------------------------------------
BENCHMARK RESULTS (WAF Policy Engine Execution Time):
-----------------------------------------------------------------
  Total Invocations:     100
  Min Latency:           2.298 ms
  Mean Latency:          2.764 ms
  Median (p50):          2.657 ms
  p95 Latency:           3.731 ms
  p99 Latency:           4.594 ms
  Max Latency:           4.599 ms
-----------------------------------------------------------------
VERDICT: PASS — Policy evaluation latency is sub-5ms (Target: < 50ms).
=================================================================
```

---

## 11. Automated Testing & Verification

Run the full automated test suite containing unit, integration, concurrency, and fault-tolerance tests:

```bash
cd backend
pytest -v --cov=app
```

```
============================= test session starts =============================
collected 38 items

tests/integration/test_concurrency.py::test_concurrent_rate_limiting_exactness PASSED
tests/integration/test_concurrency.py::test_concurrent_multi_session_isolation PASSED
tests/integration/test_fail_closed_resilience.py::test_deactivated_agent_rejection PASSED
tests/integration/test_fail_closed_resilience.py::test_deactivated_tool_rejection PASSED
tests/integration/test_fail_closed_resilience.py::test_downstream_tool_connection_error_resilience PASSED
tests/integration/test_latency_benchmark.py::test_waf_policy_evaluation_latency PASSED
tests/integration/test_stage2_tools.py::test_customer_service_flow PASSED
tests/integration/test_stage2_tools.py::test_email_service_flow PASSED
tests/integration/test_stage2_tools.py::test_file_service_flow PASSED
tests/integration/test_stage2_tools.py::test_backend_registries PASSED
tests/integration/test_stage3_waf.py::test_waf_intercept_allowed_flow PASSED
tests/integration/test_stage3_waf.py::test_waf_rejects_unknown_agent PASSED
tests/integration/test_stage3_waf.py::test_waf_rejects_invalid_api_key PASSED
tests/integration/test_stage3_waf.py::test_waf_rejects_unknown_tool PASSED
tests/integration/test_stage4_policies.py::test_criterion_1_rate_limiting PASSED
tests/integration/test_stage4_policies.py::test_criterion_2_parameter_injection_block PASSED
tests/integration/test_stage4_policies.py::test_criterion_3_out_of_scope_data_block PASSED
tests/integration/test_stage4_policies.py::test_criterion_4_sequence_rule_enforcement PASSED
tests/integration/test_stage5_audit.py::test_audit_persisted_for_allowed_and_blocked_calls PASSED
tests/integration/test_stage5_audit.py::test_audit_single_event_endpoint PASSED
tests/integration/test_stage5_audit.py::test_metrics_endpoint PASSED
tests/integration/test_stage6_shadow_mode.py::test_shadow_mode_logs_violation_and_allows_tool_execution PASSED
tests/integration/test_stage6_shadow_mode.py::test_enforcement_vs_shadow_mode_contrast PASSED
tests/integration/test_stage7_agent.py::test_agent_autonomous_allowed_execution PASSED
tests/integration/test_stage7_agent.py::test_agent_handles_waf_security_block PASSED
tests/integration/test_stage7_agent.py::test_agent_under_shadow_mode PASSED
tests/integration/test_stage8_websocket.py::test_websocket_broadcast_delivery PASSED
tests/unit/test_audit_sanitizer.py::test_sanitizer_redacts_sensitive_keys PASSED
tests/unit/test_audit_sanitizer.py::test_sanitizer_truncates_long_strings PASSED
tests/unit/test_data_scope.py::test_data_scope_enforcement PASSED
tests/unit/test_health.py::test_health_endpoint PASSED
tests/unit/test_health.py::test_ready_endpoint PASSED
tests/unit/test_parameter_validation.py::test_parameter_validation_catches_sql_injection PASSED
tests/unit/test_parameter_validation.py::test_parameter_validation_catches_oversized_payload PASSED
tests/unit/test_rate_limit.py::test_rate_limit_enforces_max_calls PASSED
tests/unit/test_rate_limit.py::test_rate_limit_fail_closed_without_redis PASSED
tests/unit/test_sequence.py::test_sequence_rule_enforcement PASSED
tests/unit/test_sequence.py::test_sequence_isolation_between_sessions PASSED

============================= 38 passed in 3.02s ==============================
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
