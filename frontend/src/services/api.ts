import { AuditEvent, MetricsData, Policy, Tool, Agent } from '../types';

const API_BASE = '/api/v1';

export async function fetchMetrics(): Promise<MetricsData> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchAuditLogs(limit = 50, offset = 0, filterParams: Record<string, string> = {}): Promise<{ total: number; items: AuditEvent[] }> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset), ...filterParams });
  const res = await fetch(`${API_BASE}/audit?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit events');
  return res.json();
}

export async function fetchPolicies(): Promise<Policy[]> {
  const res = await fetch(`${API_BASE}/policies`);
  if (!res.ok) throw new Error('Failed to fetch policies');
  return res.json();
}

export async function updatePolicyMode(policyId: string, mode: 'enforcement' | 'shadow'): Promise<Policy> {
  const res = await fetch(`${API_BASE}/policies/${policyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'dev-api-key-agentshield-2026',
    },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to update policy mode');
  return res.json();
}

export async function fetchTools(): Promise<Tool[]> {
  const res = await fetch(`${API_BASE}/tools`);
  if (!res.ok) throw new Error('Failed to fetch tools');
  return res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function triggerToolCall(
  agentId: string,
  apiKey: string,
  tool: string,
  operation: string,
  parameters: Record<string, any>,
  sessionId?: string,
): Promise<any> {
  const res = await fetch(`${API_BASE}/waf/intercept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-API-Key': apiKey,
    },
    body: JSON.stringify({
      agent_id: agentId,
      tool,
      operation,
      parameters,
      session_id: sessionId,
    }),
  });
  return res.json();
}
