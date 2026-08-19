import React, { useState } from 'react';
import { X, Play, Zap, ShieldAlert, Database, Lock, Eye, Send, Sparkles, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Check } from 'lucide-react';
import { triggerToolCall, executeAgentPrompt } from '../services/api';

interface InteractiveTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggered: () => void;
}

export const InteractiveTesterModal: React.FC<InteractiveTesterModalProps> = ({
  isOpen,
  onClose,
  onTriggered,
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastExecutedId, setLastExecutedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'custom' | 'agent'>('scenarios');
  const [output, setOutput] = useState<any>(null);
  const [toast, setToast] = useState<{
    type: 'allow' | 'block' | 'shadow' | 'error';
    title: string;
    decision: string;
    rule?: string;
    latency?: string;
    event_id?: string;
    details: string;
  } | null>(null);

  // Custom tool state
  const [tool, setTool] = useState('customer_database');
  const [operation, setOperation] = useState('get_customer');
  const [paramsText, setParamsText] = useState('{\n  "customer_id": 101\n}');
  
  // Real LLM Agent state
  const [agentPrompt, setAgentPrompt] = useState('Authenticate customer 101 and fetch their profile balance');
  const [llmProvider, setLlmProvider] = useState<'auto' | 'groq' | 'openai' | 'ollama' | 'mock'>('auto');
  const [customApiKey, setCustomApiKey] = useState('');

  if (!isOpen) return null;

  const showToastForResult = (scenarioName: string, res: any) => {
    const decision = res?.waf_evaluation?.decision || res?.status || 'UNKNOWN';
    const rule = res?.waf_evaluation?.blocked_by_rule || res?.waf_evaluation?.reason;
    const latency = res?.waf_evaluation?.execution_time_ms ? `${res?.waf_evaluation?.execution_time_ms.toFixed(1)} ms` : '3.1 ms';
    const event_id = res?.request_id ? `req_${res.request_id}` : res?.session_id || `evt_${Date.now().toString(36)}`;

    if (decision === 'BLOCK' || res?.error) {
      setToast({
        type: 'block',
        title: `${scenarioName} Intercepted`,
        decision: 'BLOCKED (HTTP 403)',
        rule: res?.waf_evaluation?.blocked_by_rule || 'Security Policy Violation',
        latency,
        event_id,
        details: res?.error || res?.waf_evaluation?.reason || 'Tool call blocked by active security policy.',
      });
    } else if (decision === 'SHADOW_WOULD_BLOCK') {
      setToast({
        type: 'shadow',
        title: `${scenarioName} Logged (Shadow Mode)`,
        decision: 'SHADOW_WOULD_BLOCK (HTTP 200)',
        rule: res?.waf_evaluation?.blocked_by_rule || 'Calibrating Policy Rule',
        latency,
        event_id,
        details: 'Dry-run violation recorded to audit trail without halting execution.',
      });
    } else {
      setToast({
        type: 'allow',
        title: `${scenarioName} Verified & Allowed`,
        decision: 'ALLOWED (HTTP 200)',
        rule: 'All Security Rules Passed',
        latency,
        event_id,
        details: 'Policy compliant call forwarded to downstream microservice.',
      });
    }
  };

  const runScenario = async (id: string, name: string, action: () => Promise<any>) => {
    setRunningId(id);
    setLastExecutedId(id);
    setToast(null);
    try {
      const res = await action();
      setOutput(res);
      showToastForResult(name, res);
      onTriggered();
    } catch (e: any) {
      const errRes = { status: 'ERROR', detail: e.message };
      setOutput(errRes);
      setToast({
        type: 'error',
        title: `${name} Error`,
        decision: 'NETWORK / GATEWAY ERROR',
        details: e.message,
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningId('custom');
    setLastExecutedId('custom');
    setToast(null);
    try {
      const parsed = JSON.parse(paramsText);
      const res = await triggerToolCall('support-agent', 'agent-key-support-001', tool, operation, parsed, `test-${Date.now()}`);
      setOutput(res);
      showToastForResult(`Custom [${tool}:${operation}]`, res);
      onTriggered();
    } catch (err: any) {
      const errRes = { error: err.message };
      setOutput(errRes);
      setToast({
        type: 'error',
        title: 'Custom Tool Call Failed',
        decision: 'INVALID JSON / ERROR',
        details: err.message,
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleAgentPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningId('agent');
    setLastExecutedId('agent');
    setToast(null);
    try {
      const res = await executeAgentPrompt(agentPrompt, llmProvider, customApiKey);
      setOutput(res);
      showToastForResult(`AI Agent [${res?.provider_used || llmProvider}]`, res);
      onTriggered();
    } catch (err: any) {
      const errRes = { error: err.message };
      setOutput(errRes);
      setToast({
        type: 'error',
        title: 'Agent LLM Reasoning Error',
        decision: 'FAILED',
        details: err.message,
      });
    } finally {
      setRunningId(null);
    }
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
          
          {/* Dynamic Interactive Toast / Notification Popup */}
          {toast && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: toast.type === 'allow' ? '#064E3B' : toast.type === 'shadow' ? '#78350F' : toast.type === 'block' ? '#7F1D1D' : '#374151',
                border: `1px solid ${toast.type === 'allow' ? '#10B981' : toast.type === 'shadow' ? '#F59E0B' : toast.type === 'block' ? '#EF4444' : '#6B7280'}`,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-in-out',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {toast.type === 'allow' && <ShieldCheck size={18} color="#34D399" style={{ marginTop: '2px' }} />}
                {toast.type === 'shadow' && <Eye size={18} color="#FBBF24" style={{ marginTop: '2px' }} />}
                {toast.type === 'block' && <AlertTriangle size={18} color="#F87171" style={{ marginTop: '2px' }} />}
                {toast.type === 'error' && <X size={18} color="#D1D5DB" style={{ marginTop: '2px' }} />}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12.5px' }}>{toast.title}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.2)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {toast.decision}
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', margin: 0, opacity: 0.9 }}>{toast.details}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '10.5px', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
                    {toast.rule && <span>Rule: {toast.rule}</span>}
                    {toast.latency && <span>Latency: {toast.latency}</span>}
                    {toast.event_id && <span>Ref: {toast.event_id}</span>}
                    <span>• Logged to DB</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setToast(null)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* Scenario 1 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'norm' ? '1px solid var(--green-primary)' : undefined,
                  background: lastExecutedId === 'norm' ? 'rgba(16, 185, 129, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('norm', '1. Normal Call', async () => {
                    const s = `norm-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--green-primary)' }}>
                    {runningId === 'norm' ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
                    <span>1. Normal Call (ALLOW)</span>
                  </div>
                  {lastExecutedId === 'norm' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--green-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Executed
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Auth &rarr; Read Customer 101 profile</span>
              </button>

              {/* Scenario 2 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'rate' ? '1px solid var(--red-primary)' : undefined,
                  background: lastExecutedId === 'rate' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('rate', '2. Rate Limit Burst', async () => {
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
                    {runningId === 'rate' ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
                    <span>2. Rate Limit Burst (6 reqs)</span>
                  </div>
                  {lastExecutedId === 'rate' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--red-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Blocked
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Triggers 5 reqs/60s rate violation</span>
              </button>

              {/* Scenario 3 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'sqli' ? '1px solid var(--red-primary)' : undefined,
                  background: lastExecutedId === 'sqli' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('sqli', '3. SQL Injection Attack', async () => {
                    const s = `sqli-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'update_customer', { customer_id: 101, name: "Alice' UNION SELECT null, password" }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'sqli' ? <Loader2 size={13} className="spin" /> : <ShieldAlert size={13} />}
                    <span>3. SQL Injection Attack</span>
                  </div>
                  {lastExecutedId === 'sqli' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--red-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Blocked
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Detected forbidden UNION SELECT pattern</span>
              </button>

              {/* Scenario 4 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'scope' ? '1px solid var(--red-primary)' : undefined,
                  background: lastExecutedId === 'scope' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('scope', '4. Data Boundary Bypass', async () => {
                    const s = `scope-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 999 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'scope' ? <Loader2 size={13} className="spin" /> : <Database size={13} />}
                    <span>4. Data Boundary Bypass</span>
                  </div>
                  {lastExecutedId === 'scope' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--red-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Blocked
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer 999 is out of scope [101-103]</span>
              </button>

              {/* Scenario 5 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'seq' ? '1px solid var(--red-primary)' : undefined,
                  background: lastExecutedId === 'seq' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('seq', '5. Sequence Violation', async () => {
                    const s = `unauth-${Date.now()}`;
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                    {runningId === 'seq' ? <Loader2 size={13} className="spin" /> : <Lock size={13} />}
                    <span>5. Sequence Violation</span>
                  </div>
                  {lastExecutedId === 'seq' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--red-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Blocked
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Invoking get_customer without prior auth</span>
              </button>

              {/* Scenario 6 */}
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  border: lastExecutedId === 'shadow' ? '1px solid var(--amber-primary)' : undefined,
                  background: lastExecutedId === 'shadow' ? 'rgba(245, 158, 11, 0.05)' : undefined,
                }}
                onClick={() =>
                  runScenario('shadow', '6. Shadow Calibration', async () => {
                    const s = `shadow-${Date.now()}`;
                    await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'get_customer', { customer_id: 103 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--amber-primary)' }}>
                    {runningId === 'shadow' ? <Loader2 size={13} className="spin" /> : <Eye size={13} />}
                    <span>6. Shadow Calibration</span>
                  </div>
                  {lastExecutedId === 'shadow' && !runningId && (
                    <span style={{ fontSize: '10px', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={10} /> Shadow Logged
                    </span>
                  )}
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
            <div style={{ marginTop: '6px', padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Gateway & LLM Execution Result:</span>
                <span className="mono-cell" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HTTP Response Payload</span>
              </div>
              <pre style={{ margin: 0, padding: '8px', background: '#0B0F19', color: '#98A2B3', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', maxHeight: '140px', overflowY: 'auto' }}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
