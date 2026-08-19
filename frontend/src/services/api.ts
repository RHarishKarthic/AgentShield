import { AuditEvent, MetricsData, Policy, Tool, Agent } from '../types';

declare global {
  interface Window {
    __AGENTSHIELD_CONFIG__?: { apiBase?: string };
  }
}

/**
 * Dynamically resolves the API base URL.
 * Checks runtime window config first, then Vite env, and defaults to relative '/api/v1'.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.__AGENTSHIELD_CONFIG__?.apiBase) {
    return window.__AGENTSHIELD_CONFIG__.apiBase.replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_API_BASE) {
    return (import.meta.env.VITE_API_BASE as string).replace(/\/+$/, '');
  }
  return '/api/v1';
}

export async function fetchMetrics(): Promise<MetricsData> {
  const base = getApiBase();
  const res = await fetch(`${base}/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  return res.json();
}

export async function fetchAuditLogs(
  limit = 50,
  offset = 0,
  filterParams: Record<string, string> = {}
): Promise<{ total: number; items: AuditEvent[] }> {
  const base = getApiBase();
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset), ...filterParams });
  const res = await fetch(`${base}/audit?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch audit events: ${res.statusText}`);
  return res.json();
}

export async function fetchPolicies(): Promise<Policy[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/policies`);
  if (!res.ok) throw new Error(`Failed to fetch policies: ${res.statusText}`);
  return res.json();
}

export async function updatePolicyMode(policyId: string, mode: 'enforcement' | 'shadow'): Promise<Policy> {
  const base = getApiBase();
  const res = await fetch(`${base}/policies/${policyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'dev-api-key-agentshield-2026',
    },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`Failed to update policy mode: ${res.statusText}`);
  return res.json();
}

export async function fetchTools(): Promise<Tool[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/tools`);
  if (!res.ok) throw new Error(`Failed to fetch tools: ${res.statusText}`);
  return res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.statusText}`);
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
  const base = getApiBase();
  const res = await fetch(`${base}/waf/intercept`, {
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

export async function executeAgentPrompt(
  prompt: string,
  provider: string = 'auto',
  apiKey?: string,
  model?: string,
): Promise<any> {
  const base = getApiBase();
  const res = await fetch(`${base}/waf/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      provider,
      api_key: apiKey || undefined,
      model: model || undefined,
    }),
  });
  return res.json();
}
