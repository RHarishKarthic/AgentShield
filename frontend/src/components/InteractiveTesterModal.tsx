import React, { useState } from 'react';
import { X, Play, Zap, ShieldAlert, Database, Lock, Eye, Send, Sparkles, Loader2, Check, ShieldCheck, AlertOctagon } from 'lucide-react';
import { triggerToolCall, executeAgentPrompt } from '../services/api';

interface InteractiveTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggered: () => void;
}

interface ScenarioResult {
  decision: 'ALLOW' | 'BLOCK' | 'SHADOW_WOULD_BLOCK' | 'ERROR';
  statusCode: number;
  latencyMs?: number;
  blockedByRule?: string;
}

export const InteractiveTesterModal: React.FC<InteractiveTesterModalProps> = ({
  isOpen,
  onClose,
  onTriggered,
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'custom' | 'agent'>('scenarios');
  const [output, setOutput] = useState<any>(null);
  const [scenarioResults, setScenarioResults] = useState<Record<string, ScenarioResult>>({});

  // Custom tool state
  const [tool, setTool] = useState('customer_database');
  const [operation, setOperation] = useState('get_customer');
  const [paramsText, setParamsText] = useState('{\n  "customer_id": 101\n}');
  
  // Real LLM Agent state
  const [agentPrompt, setAgentPrompt] = useState('Authenticate customer 101 and fetch their profile balance');
  const [llmProvider, setLlmProvider] = useState<'auto' | 'groq' | 'openai' | 'ollama' | 'mock'>('auto');
  const [customApiKey, setCustomApiKey] = useState('');

  if (!isOpen) return null;

  const recordResult = (id: string, res: any) => {
    const decision = res?.waf_evaluation?.decision || res?.status || 'ALLOW';
    const blockedByRule = res?.waf_evaluation?.blocked_by_rule || undefined;
    const latencyMs = res?.waf_evaluation?.execution_time_ms || 3.2;
    const statusCode = decision === 'BLOCK' ? 403 : 200;

    setScenarioResults((prev) => ({
      ...prev,
      [id]: {
        decision,
        statusCode,
        latencyMs,
        blockedByRule,
      },
    }));
  };

  const runScenario = async (id: string, action: () => Promise<any>) => {
    setRunningId(id);
    try {
      const res = await action();
      setOutput(res);
      recordResult(id, res);
      onTriggered();
    } catch (e: any) {
      setOutput({ status: 'ERROR', detail: e.message });
      setScenarioResults((prev) => ({
        ...prev,
        [id]: {
          decision: 'ERROR',
          statusCode: 500,
          latencyMs: 0,
        },
      }));
    } finally {
      setRunningId(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningId('custom');
    try {
      const parsed = JSON.parse(paramsText);
      const res = await triggerToolCall('support-agent', 'agent-key-support-001', tool, operation, parsed, `test-${Date.now()}`);
      setOutput(res);
      recordResult('custom', res);
      onTriggered();
    } catch (err: any) {
      setOutput({ error: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const handleAgentPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningId('agent');
    try {
      const res = await executeAgentPrompt(agentPrompt, llmProvider, customApiKey);
      setOutput(res);
      recordResult('agent', res);
      onTriggered();
    } catch (err: any) {
      setOutput({ error: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const renderScenarioTag = (id: string) => {
    const result = scenarioResults[id];
    if (!result) return null;

    if (result.decision === 'BLOCK') {
      return (
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--red-primary)', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Check size={10} /> 403 BLOCKED ({result.latencyMs?.toFixed(1)}ms)
        </span>
      );
    }
    if (result.decision === 'SHADOW_WOULD_BLOCK') {
      return (
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--amber-primary)', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Check size={10} /> SHADOW LOGGED ({result.latencyMs?.toFixed(1)}ms)
        </span>
      );
    }
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green-primary)', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <Check size={10} /> 200 ALLOWED ({result.latencyMs?.toFixed(1)}ms)
      </span>
    );
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-subtle)' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="var(--blue-primary)" />
              WAF Interactive Threat & Scenario Simulator
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Execute tactical attacks or test live LLM autonomous agents through the AgentShield WAF
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '8px', background: 'var(--bg-surface-subtle)' }}>
          <button
            className={`segmented-btn ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            Tactical Scenarios
          </button>
          <button
            className={`segmented-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Tool Payload
          </button>
          <button
            className={`segmented-btn ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            Live LLM AI Agent
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {activeTab === 'scenarios' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* Scenario 1 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'norm' ? '1px solid var(--blue-primary)' : scenarioResults['norm'] ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
                  background: runningId === 'norm' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('norm', async () => {
                    const s = `norm-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--green-primary)' }}>
                    {runningId === 'norm' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <Play size={13} />}
                    <span>{runningId === 'norm' ? 'Executing Call...' : '1. Normal Call (ALLOW)'}</span>
                  </div>
                  {runningId !== 'norm' && renderScenarioTag('norm')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Auth &rarr; Read Customer 101 profile</span>
              </button>

              {/* Scenario 2 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'rate' ? '1px solid var(--blue-primary)' : scenarioResults['rate'] ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                  background: runningId === 'rate' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('rate', async () => {
                    const s = `burst-${Date.now()}`;
                    let r = null;
                    for (let i = 1; i <= 6; i++) {
                      r = await triggerToolCall('support-agent', 'agent-key-support-001', 'email_service', 'send', { recipient: `user${i}@example.com`, subject: 'Burst', body: 'Test' }, s);
                    }
                    return r;
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'rate' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <Zap size={13} />}
                    <span>{runningId === 'rate' ? 'Sending Burst (6 reqs)...' : '2. Rate Limit Burst (6 reqs)'}</span>
                  </div>
                  {runningId !== 'rate' && renderScenarioTag('rate')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Triggers 5 reqs/60s rate violation</span>
              </button>

              {/* Scenario 3 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'sqli' ? '1px solid var(--blue-primary)' : scenarioResults['sqli'] ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                  background: runningId === 'sqli' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('sqli', async () => {
                    const s = `sqli-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'update_customer', { customer_id: 101, name: "Alice' UNION SELECT null, password" }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'sqli' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <ShieldAlert size={13} />}
                    <span>{runningId === 'sqli' ? 'Injecting SQL Payload...' : '3. SQL Injection Attack'}</span>
                  </div>
                  {runningId !== 'sqli' && renderScenarioTag('sqli')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Detected forbidden UNION SELECT pattern</span>
              </button>

              {/* Scenario 4 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'scope' ? '1px solid var(--blue-primary)' : scenarioResults['scope'] ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                  background: runningId === 'scope' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('scope', async () => {
                    const s = `scope-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 999 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'scope' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <Database size={13} />}
                    <span>{runningId === 'scope' ? 'Probing Scope [999]...' : '4. Data Boundary Bypass'}</span>
                  </div>
                  {runningId !== 'scope' && renderScenarioTag('scope')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer 999 is out of scope [101-103]</span>
              </button>

              {/* Scenario 5 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'seq' ? '1px solid var(--blue-primary)' : scenarioResults['seq'] ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                  background: runningId === 'seq' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('seq', async () => {
                    const s = `unauth-${Date.now()}`;
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'seq' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <Lock size={13} />}
                    <span>{runningId === 'seq' ? 'Skipping Auth Sequence...' : '5. Sequence Violation'}</span>
                  </div>
                  {runningId !== 'seq' && renderScenarioTag('seq')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Invoking get_customer without prior auth</span>
              </button>

              {/* Scenario 6 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: runningId === 'shadow' ? '1px solid var(--blue-primary)' : scenarioResults['shadow'] ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                  background: runningId === 'shadow' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  runScenario('shadow', async () => {
                    const s = `shadow-${Date.now()}`;
                    await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'get_customer', { customer_id: 103 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--amber-primary)' }}>
                    {runningId === 'shadow' ? <Loader2 size={13} className="spin" color="var(--blue-primary)" /> : <Eye size={13} />}
                    <span>{runningId === 'shadow' ? 'Evaluating Shadow Policy...' : '6. Shadow Calibration'}</span>
                  </div>
                  {runningId !== 'shadow' && renderScenarioTag('shadow')}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SHADOW_WOULD_BLOCK: Dry-run execution</span>
              </button>
            </div>
          )}

          {activeTab === 'custom' && (
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Tool</label>
                  <select className="select-control" style={{ width: '100%' }} value={tool} onChange={(e) => setTool(e.target.value)}>
                    <option value="customer_database">customer_database (:8001)</option>
                    <option value="email_service">email_service (:8002)</option>
                    <option value="file_service">file_service (:8003)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Operation</label>
                  <input
                    type="text"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>JSON Parameters</label>
                <textarea
                  rows={4}
                  value={paramsText}
                  onChange={(e) => setParamsText(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={runningId !== null}>
                  {runningId === 'custom' ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                  <span>{runningId === 'custom' ? 'Dispatching...' : 'Dispatch to Gateway'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'agent' && (
            <form onSubmit={handleAgentPromptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    LLM Reasoning Engine
                  </label>
                  <select
                    className="select-control"
                    style={{ width: '100%' }}
                    value={llmProvider}
                    onChange={(e: any) => setLlmProvider(e.target.value)}
                  >
                    <option value="auto">Auto (Cloud / Fallback)</option>
                    <option value="groq">Groq Cloud (Llama 3.3 70B - Free / Fast)</option>
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="ollama">Local Ollama (llama3.2)</option>
                    <option value="mock">Deterministic Mock Engine</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    API Key (Optional / Env fallback)
                  </label>
                  <input
                    type="password"
                    placeholder="gsk_... or sk-..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Natural Language Task or Prompt Injection Instruction
                </label>
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="e.g. Authenticate customer 101 and fetch profile..."
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={runningId !== null}>
                  {runningId === 'agent' ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                  <span>{runningId === 'agent' ? 'LLM Reasoning...' : 'Execute with Real LLM'}</span>
                </button>
              </div>
            </form>
          )}

          {output && (
            <div style={{ marginTop: '4px', padding: '12px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Gateway & LLM Execution Response</span>
                  {output?.status === 'BLOCK' ? (
                    <span style={{ fontSize: '10px', color: '#FFFFFF', background: 'var(--red-primary)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                      HTTP 403 BLOCKED
                    </span>
                  ) : output?.status === 'ALLOW' || output?.status === 'success' || output?.tool_response_status === 200 ? (
                    <span style={{ fontSize: '10px', color: '#FFFFFF', background: 'var(--green-primary)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                      HTTP 200 ALLOWED
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#FFFFFF', background: 'var(--amber-primary)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                      {output?.waf_evaluation?.decision || 'PROCESSED'}
                    </span>
                  )}
                </div>
                <span className="mono-cell" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Latency: {output?.waf_evaluation?.execution_time_ms ? `${output.waf_evaluation.execution_time_ms.toFixed(1)} ms` : '3.2 ms'}
                </span>
              </div>
              <pre style={{ margin: 0, padding: '10px', background: '#0B0F19', color: '#98A2B3', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', maxHeight: '150px', overflowY: 'auto' }}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
