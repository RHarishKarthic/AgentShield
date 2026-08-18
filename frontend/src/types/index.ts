export type Disposition = 'ALLOW' | 'BLOCK' | 'SHADOW_WOULD_BLOCK';

export interface AuditEvent {
  id: string;
  event_id: string;
  request_id: string;
  session_id?: string;
  agent_id: string;
  tool: string;
  operation?: string;
  parameters_sanitised?: Record<string, any>;
  rules_evaluated: Record<string, string>;
  decision: Disposition;
  reason: string;
  blocked_by_rule?: string;
  policy_id?: string;
  policy_version?: number;
  mode: 'enforcement' | 'shadow';
  execution_time_ms?: number;
  tool_response_status?: number;
  source_ip?: string;
  created_at: string;
}

export interface MetricRuleBreakdown {
  rate_limit: number;
  parameter_validation: number;
  data_scope: number;
  sequence: number;
  authentication: number;
}

export interface MetricsData {
  total_requests: number;
  allowed_count: number;
  blocked_count: number;
  shadow_count: number;
  allow_percentage: number;
  block_percentage: number;
  blocks_by_rule: MetricRuleBreakdown;
  requests_per_minute: number;
  active_agents_count: number;
  active_tools_count: number;
}

export interface Policy {
  id: string;
  policy_id: string;
  name: string;
  description?: string;
  mode: 'enforcement' | 'shadow';
  version: number;
  policy_config: {
    rate_limit?: {
      requests: number;
      window_seconds: number;
    };
    parameter_validation?: {
      max_parameter_size: number;
      max_total_size: number;
      blocked_patterns: string[];
    };
    data_scope?: {
      customer_ids: number[];
      allowed_file_paths: string[];
      allowed_email_domains: string[];
      departments: string[];
    };
    sequence_rules?: Array<{
      action: string;
      requires: string[];
    }>;
  };
}

export interface Tool {
  id: string;
  tool_id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  method: string;
  is_active: boolean;
}

export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  description?: string;
  policy_id?: string;
  is_active: boolean;
}
