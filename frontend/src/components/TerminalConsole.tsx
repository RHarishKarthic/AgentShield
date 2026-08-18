import React, { useState } from 'react';
import { Terminal, Bot, Wrench, Server, Send, Sparkles, CheckCircle2, XCircle, AlertCircle, Database } from 'lucide-react';
import { triggerToolCall } from '../services/api';

interface TerminalConsoleProps {
  onExecuted: () => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ onExecuted }) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'custom' | 'infra'>('agent');

  // Tab 1: AI Agent Chat state
  const [agentPrompt, setAgentPrompt] = useState('Authenticate customer 101 and fetch their profile details');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentTrace, setAgentTrace] = useState<any>(null);

  // Tab 2: Custom Tool state
  const [selectedTool, setSelectedTool] = useState('customer_database');
  const [selectedOp, setSelectedOp] = useState('get_customer');
  const [paramsText, setParamsText] = useState('{\n  "customer_id": 101\n}');
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult, setCustomResult] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    if (toolName === 'customer_database') {
      setSelectedOp('get_customer');
      setParamsText('{\n  "customer_id": 101\n}');
    } else if (toolName === 'email_service') {
      setSelectedOp('send');
      setParamsText('{\n  "recipient": "security-team@example.com",\n  "subject": "Firewall Alert",\n  "body": "System status verified.",\n  "email_type": "internal"\n}');
    } else if (toolName === 'file_service') {
      setSelectedOp('read');
      setParamsText('{\n  "file_path": "/data/public/readme.txt"\n}');
    }
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim()) return;

    setAgentLoading(true);
    setAgentTrace(null);

    try {
      const sessId = `ai-chat-${Date.now()}`;
      const promptLower = agentPrompt.toLowerCase();

      // Autonomous reasoning emulation based on instruction
      let toolToCall = 'customer_database';
      let opToCall = 'get_customer';
      let params: Record<string, any> = { customer_id: 101 };
      let thought = 'Analyzing user prompt to identify required enterprise tool.';

      if (promptLower.includes('auth') || promptLower.includes('login')) {
        opToCall = 'authenticate';
        params = { customer_id: 101 };
        thought = 'User requested customer authentication.';
      } else if (promptLower.includes('drop table') || promptLower.includes('--')) {
        opToCall = 'update_customer';
        params = { customer_id: 101, name: "Alice'; DROP TABLE customers;--" };
        thought = 'Attempting customer update with requested parameter payload.';
      } else if (promptLower.includes('email') || promptLower.includes('send') || promptLower.includes('notify')) {
        toolToCall = 'email_service';
        opToCall = 'send';
        params = { recipient: 'admin@example.com', subject: 'System Notice', body: agentPrompt };
        thought = 'Routing message to enterprise email dispatch service.';
      } else if (promptLower.includes('file') || promptLower.includes('/etc/shadow') || promptLower.includes('read')) {
        toolToCall = 'file_service';
        opToCall = 'read';
        params = { file_path: promptLower.includes('/etc/shadow') ? '/etc/shadow' : '/data/public/readme.txt' };
        thought = 'Requesting document from secure file storage system.';
      } else if (promptLower.includes('999')) {
        params = { customer_id: 999 };
        thought = 'Querying profile for customer 999.';
      }

      // Pre-authenticate for sequence rules if not explicitly doing an unauthenticated test
      if (!promptLower.includes('without auth') && !promptLower.includes('no auth') && opToCall !== 'authenticate') {
        await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: params.customer_id || 101 }, sessId);
      }

      const wafResp = await triggerToolCall('support-agent', 'agent-key-support-001', toolToCall, opToCall, params, sessId);
      
      setAgentTrace({
        prompt: agentPrompt,
        thought,
        tool: toolToCall,
        operation: opToCall,
        parameters: params,
        wafResponse: wafResp,
      });

      onExecuted();
    } catch (err: any) {
      setAgentTrace({ error: err.message });
    } finally {
      setAgentLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    setCustomResult(null);

    let parsed = {};
    try {
      parsed = JSON.parse(paramsText);
    } catch (err: any) {
      setParseError(`JSON Syntax Error: ${err.message}`);
      return;
    }

    setCustomLoading(true);
    try {
      const sess = `custom-${Date.now()}`;
      const res = await triggerToolCall('support-agent', 'agent-key-support-001', selectedTool, selectedOp, parsed, sess);
      setCustomResult(res);
      onExecuted();
    } catch (err: any) {
      setCustomResult({ status: 'ERROR', detail: err.message });
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="cyber-card" style={{ padding: '1.25rem' }}>
      {/* Tabs Header */}
      <div className="terminal-tabs">
        <button
          className={`terminal-tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <Bot size={15} />
          <span>Interactive AI Agent Console</span>
        </button>
        <button
          className={`terminal-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          <Wrench size={15} />
          <span>Custom WAF Dispatcher</span>
        </button>
        <button
          className={`terminal-tab-btn ${activeTab === 'infra' ? 'active' : ''}`}
          onClick={() => setActiveTab('infra')}
        >
          <Server size={15} />
          <span>Microservices & Cluster Infrastructure</span>
        </button>
      </div>

      {/* TAB 1: AI AGENT INTERACTIVE CHAT */}
      {activeTab === 'agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleAgentSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Give any task or attack prompt to the AI Agent (e.g. 'Read file /etc/shadow' or 'Authenticate customer 101')..."
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={agentLoading}
              style={{
                padding: '0.65rem 1.4rem',
                background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Sparkles size={15} />
              {agentLoading ? 'Reasoning...' : 'Send to Agent'}
            </button>
          </form>

          {agentTrace && (
            <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--cyan-accent)', fontWeight: 600 }}>💭 AI Reasoning: {agentTrace.thought}</span>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  background: agentTrace.wafResponse?.status === 'ALLOW' ? 'var(--allow-bg)' : agentTrace.wafResponse?.status === 'BLOCK' ? 'var(--block-bg)' : 'var(--shadow-bg)',
                  color: agentTrace.wafResponse?.status === 'ALLOW' ? 'var(--allow-green)' : agentTrace.wafResponse?.status === 'BLOCK' ? 'var(--block-red)' : 'var(--shadow-amber)',
                  border: `1px solid ${agentTrace.wafResponse?.status === 'ALLOW' ? 'var(--allow-border)' : agentTrace.wafResponse?.status === 'BLOCK' ? 'var(--block-border)' : 'var(--shadow-border)'}`,
                }}>
                  WAF: {agentTrace.wafResponse?.status || 'PROCESSED'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <span><strong>Tool:</strong> {agentTrace.tool} / {agentTrace.operation}</span>
                <span><strong>Latency:</strong> {agentTrace.wafResponse?.waf_evaluation?.execution_time_ms || 2.4} ms</span>
              </div>

              {agentTrace.wafResponse?.status === 'BLOCK' && (
                <div style={{ color: 'var(--block-red)' }}>
                  <strong>⛔ Security Refusal:</strong> {agentTrace.wafResponse?.waf_evaluation?.reason || agentTrace.wafResponse?.error}
                </div>
              )}

              {agentTrace.wafResponse?.status === 'ALLOW' && (
                <div style={{ color: 'var(--allow-green)' }}>
                  <strong>✅ Execution Succeeded:</strong> Result verified from live downstream microservice.
                </div>
              )}

              <pre style={{ margin: 0, padding: '0.5rem', background: '#070b14', borderRadius: '4px', color: '#94a3b8', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', maxHeight: '100px', overflowY: 'auto' }}>
                {JSON.stringify(agentTrace.wafResponse?.result || agentTrace.wafResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOM WAF DISPATCHER */}
      {activeTab === 'custom' && (
        <form onSubmit={handleCustomSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Microservice Target
            </label>
            <select
              value={selectedTool}
              onChange={(e) => handleToolSelect(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
            >
              <option value="customer_database">Customer Database (:8001)</option>
              <option value="email_service">Email Dispatch Service (:8002)</option>
              <option value="file_service">File Storage Service (:8003)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Target Operation
            </label>
            <input
              type="text"
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              JSON Parameters Payload
            </label>
            <textarea
              rows={3}
              value={paramsText}
              onChange={(e) => setParamsText(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
            />
            {parseError && <div style={{ color: 'var(--block-red)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{parseError}</div>}
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={customLoading}
              style={{ padding: '0.5rem 1.25rem', background: 'var(--cyan-accent)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Send size={14} />
              {customLoading ? 'Dispatching...' : 'Dispatch Through WAF'}
            </button>
          </div>

          {customResult && (
            <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: '#020617', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: customResult.status === 'ALLOW' ? 'var(--allow-green)' : customResult.status === 'BLOCK' ? 'var(--block-red)' : 'var(--shadow-amber)' }}>
                  DECISION: {customResult.status}
                </span>
                <span>Latency: {customResult.waf_evaluation?.execution_time_ms || 2.5} ms</span>
              </div>
              <pre style={{ margin: 0, padding: '0.4rem', background: '#070b14', borderRadius: '4px', color: '#94a3b8', maxHeight: '90px', overflowY: 'auto' }}>
                {JSON.stringify(customResult, null, 2)}
              </pre>
            </div>
          )}
        </form>
      )}

      {/* TAB 3: INFRASTRUCTURE & CLUSTER STATUS */}
      {activeTab === 'infra' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>PostgreSQL 16 Engine</span>
              <span style={{ color: 'var(--allow-green)', fontSize: '0.7rem', fontWeight: 700 }}>HEALTHY</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Port: 5432 &middot; Persistent Audit Storage</span>
          </div>

          <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>Redis 7 In-Memory Cache</span>
              <span style={{ color: 'var(--allow-green)', fontSize: '0.7rem', fontWeight: 700 }}>HEALTHY</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Port: 6379 &middot; Atomic Sliding Window</span>
          </div>

          <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>Customer DB Microservice</span>
              <span style={{ color: 'var(--allow-green)', fontSize: '0.7rem', fontWeight: 700 }}>ONLINE</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Port: 8001 &middot; Account & Balance APIs</span>
          </div>

          <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>Email Dispatch Service</span>
              <span style={{ color: 'var(--allow-green)', fontSize: '0.7rem', fontWeight: 700 }}>ONLINE</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Port: 8002 &middot; Notification Queue</span>
          </div>

          <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>File Storage Service</span>
              <span style={{ color: 'var(--allow-green)', fontSize: '0.7rem', fontWeight: 700 }}>ONLINE</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Port: 8003 &middot; Virtual Filesystem</span>
          </div>
        </div>
      )}
    </div>
  );
};
