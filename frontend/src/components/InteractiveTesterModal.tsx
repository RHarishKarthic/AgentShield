import React, { useState } from 'react';
import { X, Play, Zap, ShieldAlert, Database, Lock, Eye, Send, Sparkles, Loader2 } from 'lucide-react';
import { triggerToolCall } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'scenarios' | 'custom' | 'agent'>('scenarios');
  const [output, setOutput] = useState<any>(null);

  // Custom tool state
  const [tool, setTool] = useState('customer_database');
  const [operation, setOperation] = useState('get_customer');
  const [paramsText, setParamsText] = useState('{\n  "customer_id": 101\n}');
  const [agentPrompt, setAgentPrompt] = useState('Authenticate customer 101 and fetch profile balance');

  if (!isOpen) return null;

  const runScenario = async (id: string, action: () => Promise<any>) => {
    setRunningId(id);
    try {
      const res = await action();
      setOutput(res);
      onTriggered();
    } catch (e: any) {
      setOutput({ status: 'ERROR', detail: e.message });
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
      const promptLower = agentPrompt.toLowerCase();
      let t = 'customer_database';
      let op = 'get_customer';
      let p: any = { customer_id: 101 };
      const sess = `prompt-${Date.now()}`;

      if (promptLower.includes('drop table')) {
        op = 'update_customer';
        p = { customer_id: 101, name: "Alice'; DROP TABLE customers;--" };
      } else if (promptLower.includes('999')) {
        p = { customer_id: 999 };
      } else if (promptLower.includes('/etc/shadow')) {
        t = 'file_service';
        op = 'read';
        p = { file_path: '/etc/shadow' };
      } else if (promptLower.includes('email')) {
        t = 'email_service';
        op = 'send';
        p = { recipient: 'team@example.com', subject: 'Notice', body: agentPrompt };
      } else {
        await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sess);
      }

      const res = await triggerToolCall('support-agent', 'agent-key-support-001', t, op, p, sess);
      setOutput({ agent_prompt: agentPrompt, tool_executed: t, operation: op, result: res });
      onTriggered();
    } catch (err: any) {
      setOutput({ error: err.message });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        style={{
          width: '640px',
          maxWidth: '92vw',
          maxHeight: '88vh',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-subtle)' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>WAF Interactive Threat & Scenario Simulator</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Execute live security attack scenarios and test custom payloads against the gateway</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
            AI Agent Instruction
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeTab === 'scenarios' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                onClick={() =>
                  runScenario('norm', async () => {
                    const s = `norm-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--green-primary)' }}>
                  <Play size={13} /> 1. Normal Call (ALLOW)
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Auth &rarr; Read Customer 101 profile</span>
              </button>

              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                  <Zap size={13} /> 2. Rate Limit Burst (6 reqs)
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Triggers 5 reqs/60s rate violation</span>
              </button>

              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                onClick={() =>
                  runScenario('sqli', async () => {
                    const s = `sqli-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'update_customer', { customer_id: 101, name: "Alice'; DROP TABLE customers;--" }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                  <ShieldAlert size={13} /> 3. SQL Injection Attack
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Detected forbidden DROP TABLE pattern</span>
              </button>

              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                onClick={() =>
                  runScenario('scope', async () => {
                    const s = `scope-${Date.now()}`;
                    await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 999 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                  <Database size={13} /> 4. Data Boundary Bypass
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer 999 is out of scope [101-103]</span>
              </button>

              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                onClick={() =>
                  runScenario('seq', async () => {
                    const s = `unauth-${Date.now()}`;
                    return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--red-primary)' }}>
                  <Lock size={13} /> 5. Sequence Violation
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Invoking get_customer without prior auth</span>
              </button>

              <button
                className="btn-secondary"
                disabled={runningId !== null}
                style={{ textAlign: 'left', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                onClick={() =>
                  runScenario('shadow', async () => {
                    const s = `shadow-${Date.now()}`;
                    await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'authenticate', { customer_id: 101 }, s);
                    return await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'get_customer', { customer_id: 103 }, s);
                  })
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--amber-primary)' }}>
                  <Eye size={13} /> 6. Shadow Calibration
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
                  <Send size={13} /> <span>Dispatch to Gateway</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'agent' && (
            <form onSubmit={handleAgentPromptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Natural Language Task / Attack Instruction</label>
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="e.g. Read file /etc/shadow or Authenticate customer 101..."
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={runningId !== null}>
                  <Sparkles size={13} /> <span>Execute via Autonomous Agent</span>
                </button>
              </div>
            </form>
          )}

          {output && (
            <div style={{ marginTop: '6px', padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Gateway Response:</div>
              <pre style={{ margin: 0, padding: '8px', background: '#0B0F19', color: '#98A2B3', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', maxHeight: '120px', overflowY: 'auto' }}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
