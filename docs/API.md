# AgentShield API Reference

> **Base URL:** `http://localhost:8000`
> **Interactive Docs:** `http://localhost:8000/docs` (Swagger UI) · `http://localhost:8000/redoc`
> **API Version:** `v1`

---

## Table of Contents

- [Authentication](#authentication)
- [Response Conventions](#response-conventions)
- [Error Codes](#error-codes)
- [Endpoints](#endpoints)
  - [Health](#1-health)
  - [WAF Gateway](#2-waf-gateway)
  - [Agents](#3-agents)
  - [Tools](#4-tools)
  - [Policies](#5-policies)
  - [Audit Log](#6-audit-log)
  - [Metrics](#7-metrics)
  - [WebSocket](#8-websocket-real-time-events)
- [Schemas Reference](#schemas-reference)
- [Policy Configuration Schema](#policy-configuration-schema)
- [WAF Decision Values](#waf-decision-values)

---

## Authentication

AgentShield uses two distinct API keys:

### 1. WAF Admin API Key (`X-API-Key`)
Used to authenticate requests to **admin CRUD endpoints** (agents, tools, policies) and the `/waf/prompt` endpoint.

```
X-API-Key: dev-api-key-agentshield-2026
```

> Set via the `WAF_API_KEY` environment variable. The dev default works out of the box.

### 2. Agent API Key (`X-Agent-API-Key`)
Used by **AI agents** when calling the `/waf/intercept` endpoint. This is the per-agent key generated at registration time.

```
X-Agent-API-Key: <agent_raw_api_key>
```

### Which endpoints require auth?

| Endpoint | Auth Required | Header |
|----------|--------------|--------|
| `GET /health` | No | — |
| `GET /ready` | No | — |
| `POST /api/v1/waf/intercept` | Yes | `X-Agent-API-Key` |
| `POST /api/v1/waf/prompt` | Yes | `X-API-Key` |
| `GET /api/v1/agents` | No | — |
| `POST /api/v1/agents` | Yes | `X-API-Key` |
| `PATCH /api/v1/agents/{id}` | Yes | `X-API-Key` |
| `DELETE /api/v1/agents/{id}` | Yes | `X-API-Key` |
| `GET /api/v1/tools` | No | — |
| `POST /api/v1/tools` | Yes | `X-API-Key` |
| `GET /api/v1/policies` | No | — |
| `POST /api/v1/policies` | Yes | `X-API-Key` |
| `GET /api/v1/audit` | No | — |
| `GET /api/v1/metrics` | No | — |

---

## Response Conventions

- All responses are **JSON** (`Content-Type: application/json`)
- All timestamps are **ISO 8601 UTC** (e.g. `2026-08-20T10:30:00Z`)
- Every response includes an **`X-Request-ID`** header for tracing
- Successful creates return **`201 Created`**
- Successful deletes return **`204 No Content`** (empty body)
- WAF **BLOCK** decisions return **`403 Forbidden`**

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| `400 Bad Request` | Invalid request body or duplicate ID |
| `401 Unauthorized` | Missing or invalid API key |
| `403 Forbidden` | Request blocked by WAF policy |
| `404 Not Found` | Resource (agent/tool/policy/event) not found |
| `503 Service Unavailable` | Tool is deactivated or a dependency is unreachable |
| `500 Internal Server Error` | Unexpected server error (request_id included for tracing) |

**Error body format:**
```json
{
  "detail": "Agent 'unknown-agent' is not registered with AgentShield"
}
```

---

## Endpoints

---

### 1. Health

#### `GET /health` — Liveness Probe
Returns `200 OK` if the FastAPI process is running. Does **not** check DB or Redis.

```bash
curl http://localhost:8000/health
```

**Response `200`:**
```json
{
  "status": "healthy",
  "service": "AgentShield"
}
```

---

#### `GET /ready` — Readiness Probe
Returns `200 OK` if all dependencies (PostgreSQL + Redis) are connected.

```bash
curl http://localhost:8000/ready
```

**Response `200`:**
```json
{
  "status": "ready",
  "service": "AgentShield",
  "dependencies": {
    "postgresql": "connected",
    "redis": "connected"
  }
}
```

**Response `503`** (dependency unavailable):
```json
{
  "status": "not_ready",
  "service": "AgentShield",
  "dependencies": {
    "postgresql": "connected",
    "redis": "unavailable"
  }
}
```

---

### 2. WAF Gateway

The core security intercept pipeline. All agent tool calls should go through here.

---

#### `POST /api/v1/waf/intercept` — Intercept Tool Call

The main WAF endpoint. Authenticates the agent, evaluates all security policies,
then either forwards the call to the downstream tool or blocks it.

**Auth:** `X-Agent-API-Key: <agent_key>`

```bash
curl -X POST http://localhost:8000/api/v1/waf/intercept \
  -H "Content-Type: application/json" \
  -H "X-Agent-API-Key: agent-key-support-001" \
  -d '{
    "agent_id": "support-agent",
    "tool": "customer_database",
    "operation": "authenticate",
    "parameters": { "customer_id": 101 },
    "session_id": "session-abc123"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Registered agent identifier |
| `tool` | string | Yes | Registered tool identifier |
| `operation` | string | No | Sub-operation on the tool (e.g. `get_customer`, `send`, `read`) |
| `parameters` | object | No | Tool call parameters payload |
| `session_id` | string | No | Session ID for sequence policy tracking |

**Response `200` — ALLOW:**
```json
{
  "status": "ALLOW",
  "tool": "customer_database",
  "operation": "authenticate",
  "result": { "customer_id": 101, "name": "Alice Smith", "authenticated": true },
  "error": null,
  "request_id": "a1b2c3d4",
  "waf_evaluation": {
    "decision": "ALLOW",
    "mode": "enforcement",
    "policy_id": "support-agent-policy",
    "policy_version": 1,
    "rules": {
      "authentication": "ALLOW",
      "rate_limit": "ALLOW",
      "parameter_validation": "ALLOW",
      "data_scope": "ALLOW",
      "sequence": "ALLOW"
    },
    "reason": "All security policy checks passed successfully",
    "blocked_by_rule": null,
    "execution_time_ms": 3.142
  }
}
```

**Response `403` — BLOCK:**
```json
{
  "status": "BLOCK",
  "tool": "customer_database",
  "operation": "get_customer",
  "result": null,
  "error": "Sequence rule violation: Action 'get_customer_data' requires prerequisite action(s) ['authenticate_customer'] first",
  "request_id": "x9y8z7w6",
  "waf_evaluation": {
    "decision": "BLOCK",
    "mode": "enforcement",
    "policy_id": "support-agent-policy",
    "policy_version": 1,
    "rules": {
      "authentication": "ALLOW",
      "rate_limit": "ALLOW",
      "parameter_validation": "ALLOW",
      "data_scope": "ALLOW",
      "sequence": "BLOCK"
    },
    "reason": "Sequence rule violation: ...",
    "blocked_by_rule": "sequence",
    "execution_time_ms": 1.87
  }
}
```

> **Tip:** Always use a consistent `session_id` within a conversation turn so the sequence policy can track your authentication step across calls.

---

#### `POST /api/v1/waf/prompt` — Natural Language Agent Prompt

Accepts a plain English instruction, sends it to a live LLM, gets a structured tool call,
then runs it through the full WAF intercept pipeline. Great for testing and demos.

**Auth:** `X-API-Key: <waf_admin_key>`

```bash
curl -X POST http://localhost:8000/api/v1/waf/prompt \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{
    "prompt": "Authenticate customer 101",
    "agent_id": "support-agent",
    "provider": "groq",
    "api_key": "gsk_xxxx",
    "session_id": "demo-session-1"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Natural language instruction |
| `agent_id` | string | No | Agent to run as (default: `"support-agent"`) |
| `provider` | string | No | LLM backend: `"groq"`, `"openai"`, `"ollama"`, `"mock"`, `"auto"` |
| `api_key` | string | No | LLM provider API key (Groq/OpenAI) |
| `model` | string | No | Model override (e.g. `"llama-3.3-70b-versatile"`) |
| `session_id` | string | No | Session ID for sequence tracking |

**LLM Providers:**

| Provider | Value | Notes |
|----------|-------|-------|
| Groq (Llama 3.3 70B) | `"groq"` | Requires `GROQ_API_KEY` or `api_key` in body |
| OpenAI (GPT-4o-mini) | `"openai"` | Requires `OPENAI_API_KEY` or `api_key` in body |
| Ollama (local) | `"ollama"` | Runs at `http://localhost:11434` |
| Rule-based mock | `"mock"` | Deterministic, no external calls |
| Auto-detect | `"auto"` | Uses Groq if key found, else mock |

**Response `200`:**
```json
{
  "prompt": "Get profile for customer 101",
  "session_id": "demo-session-1",
  "provider_used": "GroqProvider",
  "thought": "The user wants customer 101's profile. I need to authenticate first.",
  "tool_call": {
    "tool": "customer_database",
    "operation": "authenticate",
    "parameters": { "customer_id": 101 }
  },
  "waf_evaluation": { "decision": "ALLOW", "policy_id": "support-agent-policy" },
  "status": "ALLOW",
  "result": { "authenticated": true },
  "error": null,
  "final_answer": "Tool 'customer_database' executed successfully via WAF."
}
```

---

### 3. Agents

CRUD management for registered AI agents.

---

#### `POST /api/v1/agents` — Register Agent

**Auth:** `X-API-Key`

```bash
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{
    "agent_id": "billing-agent",
    "name": "Billing Support Agent",
    "description": "Handles billing queries",
    "policy_id": "support-agent-policy",
    "is_active": true
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Unique agent identifier (e.g. `"billing-agent"`) |
| `name` | string | Yes | Display name |
| `description` | string | No | Agent description |
| `policy_id` | string | No | WAF policy to enforce for this agent |
| `is_active` | bool | No | Default `true` |
| `api_key` | string | No | Custom API key. If omitted, one is auto-generated |
| `custom_metadata` | object | No | Arbitrary key-value metadata |

**Response `201`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "billing-agent",
  "name": "Billing Support Agent",
  "description": "Handles billing queries",
  "policy_id": "support-agent-policy",
  "is_active": true,
  "custom_metadata": {},
  "created_at": "2026-08-20T10:00:00Z",
  "updated_at": "2026-08-20T10:00:00Z",
  "raw_api_key": "xK9mP2qR8nVjTwZ4..."
}
```

> `raw_api_key` is returned **once only** at creation time. Store it securely — it cannot be retrieved again.

---

#### `GET /api/v1/agents` — List Agents

```bash
curl "http://localhost:8000/api/v1/agents?active_only=true"
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `active_only` | bool | `false` | Return only active agents |

---

#### `GET /api/v1/agents/{agent_id}` — Get Agent

```bash
curl http://localhost:8000/api/v1/agents/support-agent
```

---

#### `PATCH /api/v1/agents/{agent_id}` — Update Agent

**Auth:** `X-API-Key`

```bash
curl -X PATCH http://localhost:8000/api/v1/agents/support-agent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{ "is_active": false, "policy_id": "strict-policy" }'
```

**Request Body** (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Updated display name |
| `description` | string | Updated description |
| `policy_id` | string | New policy to apply |
| `is_active` | bool | Enable or disable the agent |
| `custom_metadata` | object | Merge or replace metadata |

---

#### `DELETE /api/v1/agents/{agent_id}` — Delete Agent

**Auth:** `X-API-Key`

```bash
curl -X DELETE http://localhost:8000/api/v1/agents/billing-agent \
  -H "X-API-Key: dev-api-key-agentshield-2026"
```

**Response `204`:** No content.

---

### 4. Tools

CRUD management for downstream tool services.

---

#### `POST /api/v1/tools` — Register Tool

**Auth:** `X-API-Key`

```bash
curl -X POST http://localhost:8000/api/v1/tools \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{
    "tool_id": "payment_service",
    "name": "Payment Processing Service",
    "description": "Handles payment transactions",
    "endpoint_url": "http://payment-service:8004",
    "method": "POST",
    "is_active": true
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_id` | string | Yes | Unique identifier (e.g. `"customer_database"`) |
| `name` | string | Yes | Display name |
| `description` | string | No | Tool description |
| `endpoint_url` | string | Yes | Downstream service base URL |
| `method` | string | No | HTTP method (default: `"POST"`) |
| `is_active` | bool | No | Default `true` |
| `parameters_schema` | object | No | JSON Schema for expected parameters |
| `custom_metadata` | object | No | Arbitrary metadata |

> **Docker override:** Set env var `TOOL_{TOOL_ID_UPPER}_URL` to override `endpoint_url` at runtime.
> Example: for `tool_id="customer_database"`, set `TOOL_CUSTOMER_DATABASE_URL=http://tools:8001`

---

#### `GET /api/v1/tools` — List Tools
#### `GET /api/v1/tools/{tool_id}` — Get Tool
#### `PATCH /api/v1/tools/{tool_id}` — Update Tool
#### `DELETE /api/v1/tools/{tool_id}` — Delete Tool

Same pattern as the agents endpoints above.

---

### 5. Policies

Security policies define the WAF rules enforced for each agent.

---

#### `POST /api/v1/policies` — Create Policy

**Auth:** `X-API-Key`

```bash
curl -X POST http://localhost:8000/api/v1/policies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{
    "policy_id": "strict-policy",
    "name": "Strict Security Policy",
    "mode": "enforcement",
    "policy_config": {
      "rate_limit": { "requests": 3, "window_seconds": 60 },
      "parameter_validation": {
        "max_parameter_size": 1024,
        "max_total_size": 32768,
        "blocked_patterns": ["DROP TABLE", "--", "<script>"]
      },
      "data_scope": {
        "customer_ids": [101, 102],
        "allowed_file_paths": ["/data/public/"],
        "allowed_email_domains": ["@example.com"],
        "departments": ["Engineering"]
      },
      "sequence_rules": [
        { "action": "get_customer_data", "requires": ["authenticate_customer"] }
      ]
    }
  }'
```

**Response `201`:** `PolicyResponse` with `version: 1`.

---

#### `GET /api/v1/policies` — List Policies

```bash
curl http://localhost:8000/api/v1/policies
```

---

#### `GET /api/v1/policies/{policy_id}` — Get Policy

```bash
curl http://localhost:8000/api/v1/policies/support-agent-policy
```

---

#### `PATCH /api/v1/policies/{policy_id}` — Update Policy

**Auth:** `X-API-Key`  
Every update **auto-increments** `version` for full audit traceability.

```bash
# Switch to shadow mode (log violations but don't block)
curl -X PATCH http://localhost:8000/api/v1/policies/support-agent-policy \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-agentshield-2026" \
  -d '{ "mode": "shadow" }'
```

**Updatable fields (all optional):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Updated display name |
| `description` | string | Updated description |
| `mode` | `"enforcement"` or `"shadow"` | Toggle enforcement mode |
| `policy_config` | object | Full replacement of rule config |

---

#### `DELETE /api/v1/policies/{policy_id}` — Delete Policy

**Auth:** `X-API-Key`

```bash
curl -X DELETE http://localhost:8000/api/v1/policies/strict-policy \
  -H "X-API-Key: dev-api-key-agentshield-2026"
```

---

### 6. Audit Log

Persistent record of every WAF-intercepted tool call stored in PostgreSQL.

---

#### `GET /api/v1/audit` — Query Audit Events

```bash
curl "http://localhost:8000/api/v1/audit?decision=BLOCK&agent_id=support-agent&limit=20"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | string | Filter by agent identifier |
| `tool` | string | Filter by tool identifier |
| `decision` | string | `ALLOW`, `BLOCK`, or `SHADOW_WOULD_BLOCK` |
| `blocked_by_rule` | string | `rate_limit`, `parameter_validation`, `data_scope`, `sequence`, `authentication` |
| `session_id` | string | Filter by session identifier |
| `start_date` | ISO datetime | Events after this timestamp |
| `end_date` | ISO datetime | Events before this timestamp |
| `limit` | int (1–500) | Max results per page (default: `50`) |
| `offset` | int | Pagination offset (default: `0`) |

**Response `200`:**
```json
{
  "total": 247,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event_id": "evt_3f2a1b4c9e8d7c6b...",
      "request_id": "a1b2c3d4",
      "session_id": "session-abc123",
      "agent_id": "support-agent",
      "tool": "customer_database",
      "operation": "get_customer",
      "parameters_sanitised": { "customer_id": 999 },
      "rules_evaluated": {
        "authentication": "ALLOW",
        "rate_limit": "ALLOW",
        "parameter_validation": "ALLOW",
        "data_scope": "BLOCK",
        "sequence": "ALLOW"
      },
      "decision": "BLOCK",
      "reason": "Out-of-scope data access: Customer ID 999 is not in authorized scope [101, 102, 103]",
      "blocked_by_rule": "data_scope",
      "policy_id": "support-agent-policy",
      "policy_version": 1,
      "mode": "enforcement",
      "execution_time_ms": 2.41,
      "tool_response_status": null,
      "source_ip": "172.18.0.1",
      "created_at": "2026-08-20T10:30:00Z"
    }
  ]
}
```

---

#### `GET /api/v1/audit/{event_id}` — Get Single Event

```bash
curl http://localhost:8000/api/v1/audit/evt_3f2a1b4c9e8d7c6b
```

Accepts either the short `event_id` string or the full UUID.

---

### 7. Metrics

Real-time aggregated security statistics from the audit log.

---

#### `GET /api/v1/metrics` — Get Security Metrics

```bash
curl "http://localhost:8000/api/v1/metrics?time_range=24h"
```

**Query Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `time_range` | `1h`, `24h`, `7d`, `all` | Aggregation window (default: all time) |

**Response `200`:**
```json
{
  "total_requests": 1423,
  "allowed_count": 1198,
  "blocked_count": 195,
  "shadow_count": 30,
  "allow_percentage": 84.2,
  "block_percentage": 13.7,
  "blocks_by_rule": {
    "rate_limit": 42,
    "parameter_validation": 88,
    "data_scope": 51,
    "sequence": 14,
    "authentication": 0
  },
  "requests_per_minute": 3.7,
  "active_agents_count": 2,
  "active_tools_count": 3
}
```

---

### 8. WebSocket — Real-Time Events

Receive live audit events as they are created, without polling.

#### `WS /ws/events`

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/events');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'AUDIT_EVENT') {
    console.log('New WAF event:', data.event);
  }
};

// Keep-alive
setInterval(() => ws.send('ping'), 30000);
```

**Incoming message format:**
```json
{
  "type": "AUDIT_EVENT",
  "event": {
    "event_id": "evt_abc123...",
    "agent_id": "support-agent",
    "tool": "email_service",
    "operation": "send",
    "decision": "BLOCK",
    "reason": "Out-of-scope email domain...",
    "blocked_by_rule": "data_scope",
    "execution_time_ms": 1.93,
    "created_at": "2026-08-20T10:30:00.123Z"
  }
}
```

---

## Schemas Reference

### `AgentResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal unique ID |
| `agent_id` | string | Human-readable agent ID |
| `name` | string | Display name |
| `description` | string / null | Description |
| `policy_id` | string / null | Associated policy ID |
| `is_active` | bool | Agent is active |
| `custom_metadata` | object | Arbitrary metadata |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last modified |
| `raw_api_key` | string / null | **Only on creation** |

---

### `ToolResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal unique ID |
| `tool_id` | string | Human-readable tool ID |
| `name` | string | Display name |
| `description` | string / null | Description |
| `endpoint_url` | string | Downstream service URL |
| `method` | string | HTTP method |
| `is_active` | bool | Tool is enabled |
| `parameters_schema` | object / null | JSON Schema for params |
| `custom_metadata` | object | Arbitrary metadata |
| `created_at` | datetime | Registration timestamp |
| `updated_at` | datetime | Last modified |

---

### `PolicyResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal unique ID |
| `policy_id` | string | Human-readable policy ID |
| `name` | string | Display name |
| `description` | string / null | Description |
| `mode` | `"enforcement"` / `"shadow"` | Enforcement mode |
| `policy_config` | PolicyConfig | Full rule configuration |
| `version` | int | Auto-incremented on every update |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last modified |

---

### `AuditEventResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal primary key |
| `event_id` | string | Short event ID (e.g. `evt_abc...`) |
| `request_id` | string | HTTP request correlation ID |
| `session_id` | string / null | Agent session identifier |
| `agent_id` | string | Which agent made the call |
| `tool` | string | Which tool was targeted |
| `operation` | string / null | Which operation |
| `parameters_sanitised` | object / null | Redacted parameters |
| `rules_evaluated` | object | Per-rule: `"ALLOW"` or `"BLOCK"` |
| `decision` | string | `ALLOW`, `BLOCK`, `SHADOW_WOULD_BLOCK` |
| `reason` | string | Human-readable explanation |
| `blocked_by_rule` | string / null | First blocking rule |
| `policy_id` | string / null | Policy evaluated |
| `policy_version` | int / null | Policy version at time of evaluation |
| `mode` | string | `enforcement` or `shadow` |
| `execution_time_ms` | float / null | Policy evaluation latency |
| `tool_response_status` | int / null | HTTP status from downstream (null if blocked) |
| `source_ip` | string / null | Client IP address |
| `created_at` | datetime | Event timestamp |

---

## Policy Configuration Schema

```json
{
  "rate_limit": {
    "requests": 5,
    "window_seconds": 60
  },
  "parameter_validation": {
    "max_parameter_size": 2048,
    "max_total_size": 65536,
    "blocked_patterns": [
      "DROP TABLE", "--", "<script>", "UNION SELECT",
      "/etc/shadow", "../", ";--", "eval(", "exec("
    ]
  },
  "data_scope": {
    "customer_ids": [101, 102, 103],
    "allowed_file_paths": ["/data/public/", "/data/reports/"],
    "allowed_email_domains": ["@example.com", "@enterprise.corp"],
    "departments": ["Engineering", "Marketing", "Finance"]
  },
  "sequence_rules": [
    {
      "action": "get_customer_data",
      "requires": ["authenticate_customer"]
    },
    {
      "action": "update_customer",
      "requires": ["authenticate_customer", "get_customer_data"]
    }
  ]
}
```

### Rule Descriptions

| Rule | Description |
|------|-------------|
| `rate_limit` | Sliding-window rate limiter (Redis-backed). Blocks agents exceeding `requests` calls within `window_seconds`. Fails **closed** if Redis is down. |
| `parameter_validation` | Inspects all parameter values recursively for blocked substrings (SQL injection, XSS, path traversal, command injection) and enforces payload size limits. |
| `data_scope` | Resource-level authorization. Blocks calls targeting customer IDs, file paths, email domains, or departments outside the agent's declared scope. |
| `sequence_rules` | Session-aware workflow enforcement. Rejects actions whose prerequisite steps haven't been completed in the same `session_id`. Uses Redis with TTL-bounded in-memory fallback. |

---

## WAF Decision Values

| Value | HTTP Status | Meaning |
|-------|-------------|---------|
| `ALLOW` | `200` | All policy checks passed. Request forwarded to downstream tool. |
| `BLOCK` | `403` | One or more policy rules failed. Request **not** forwarded. |
| `SHADOW_WOULD_BLOCK` | `200` | Policy would block in enforcement mode, but policy is in **shadow mode**. Request forwarded, violation logged. |
| `NO_TOOL_REQUIRED` | `200` | LLM responded with a direct answer — no tool invoked. |

---

## Quick Workflow Example

```bash
# 1. Authenticate customer (satisfies sequence prerequisite)
curl -X POST http://localhost:8000/api/v1/waf/intercept \
  -H "X-Agent-API-Key: agent-key-support-001" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"support-agent","tool":"customer_database","operation":"authenticate","parameters":{"customer_id":101},"session_id":"my-session"}'

# 2. Get customer profile (allowed because step 1 ran first)
curl -X POST http://localhost:8000/api/v1/waf/intercept \
  -H "X-Agent-API-Key: agent-key-support-001" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"support-agent","tool":"customer_database","operation":"get_customer","parameters":{"customer_id":101},"session_id":"my-session"}'

# 3. Try out-of-scope customer (BLOCKED by data_scope rule)
curl -X POST http://localhost:8000/api/v1/waf/intercept \
  -H "X-Agent-API-Key: agent-key-support-001" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"support-agent","tool":"customer_database","operation":"get_customer","parameters":{"customer_id":999},"session_id":"my-session"}'

# 4. Check block events in the audit log
curl "http://localhost:8000/api/v1/audit?decision=BLOCK&limit=5"

# 5. Real-time metrics
curl "http://localhost:8000/api/v1/metrics?time_range=1h"
```
