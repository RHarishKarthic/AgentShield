import React, { useState } from 'react';
import { Send, Terminal, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { triggerToolCall } from '../services/api';

interface CustomDispatcherProps {
  onExecuted: () => void;
}

export const CustomDispatcher: React.FC<CustomDispatcherProps> = ({ onExecuted }) => {
  const [agentId, setAgentId] = useState('support-agent');
  const [apiKey, setApiKey] = useState('agent-key-support-001');
  const [tool, setTool] = useState('customer_database');
  const [operation, setOperation] = useState('get_customer');
  const [paramsText, setParamsText] = useState('{\n  "customer_id": 101\n}');
  const [sessionId, setSessionId] = useState(`custom-sess-${Date.now().toString().slice(-4)}`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleToolChange = (newTool: string) => {
    setTool(newTool);
    if (newTool === 'customer_database') {
      setOperation('get_customer');
      setParamsText('{\n  "customer_id": 101\n}');
    } else if (newTool === 'email_service') {
      setOperation('send');
      setParamsText('{\n  "recipient": "user@example.com",\n  "subject": "System Notice",\n  "body": "Your account is active.",\n  "email_type": "internal"\n}');
    } else if (newTool === 'file_service') {
      setOperation('read');
      setParamsText('{\n  "file_path": "/data/public/readme.txt"\n}');
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    setResult(null);

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(paramsText);
    } catch (err: any) {
      setParseError(`Invalid JSON: ${err.message}`);
      return;
    }

    setLoading(true);
    try {
      const resp = await triggerToolCall(agentId, apiKey, tool, operation, parsedParams, sessionId);
      setResult(resp);
      onExecuted();
    } catch (err: any) {
      setResult({ status: 'ERROR', detail: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
      <div className="section-header">
        <h2 className="section-title">
          <Terminal size={18} color="var(--cyan-glow)" />
          Live Interactive Tool Gateway (Test Any Payload)
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Send real requests through AgentShield WAF
        </span>
      </div>

      <form onSubmit={handleExecute} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Target Tool Microservice
          </label>
          <select
            value={tool}
            onChange={(e) => handleToolChange(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          >
            <option value="customer_database">Customer Database (:8001)</option>
            <option value="email_service">Email Service (:8002)</option>
            <option value="file_service">File Storage Service (:8003)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Operation
          </label>
          <input
            type="text"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Agent ID
          </label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Session ID
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Parameters (JSON Payload)
          </label>
          <textarea
            rows={4}
            value={paramsText}
            onChange={(e) => setParamsText(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
          />
          {parseError && <div style={{ color: 'var(--accent-block)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{parseError}</div>}
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSessionId(`custom-sess-${Date.now().toString().slice(-4)}`)}
            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            New Session
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.5rem 1.25rem', background: 'linear-gradient(90deg, #00f0ff, #10b981)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={14} />
            {loading ? 'Evaluating...' : 'Dispatch Through WAF'}
          </button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: `1px solid ${result.status === 'ALLOW' ? 'var(--accent-allow-border)' : result.status === 'BLOCK' ? 'var(--accent-block-border)' : 'var(--accent-shadow-border)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: result.status === 'ALLOW' ? 'var(--accent-allow)' : result.status === 'BLOCK' ? 'var(--accent-block)' : 'var(--accent-shadow)' }}>
              {result.status === 'ALLOW' ? <CheckCircle size={16} /> : result.status === 'BLOCK' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
              WAF DECISION: {result.status || 'PROCESSED'}
            </span>
            {result.waf_evaluation?.execution_time_ms && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Evaluation Latency: {result.waf_evaluation.execution_time_ms} ms
              </span>
            )}
          </div>

          {result.status === 'BLOCK' && result.waf_evaluation?.reason && (
            <div style={{ color: 'var(--accent-block)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <strong>WAF Block Reason:</strong> {result.waf_evaluation.reason}
            </div>
          )}

          {result.status === 'ALLOW' && result.error && (
            <div style={{ color: 'var(--accent-shadow)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <strong>Downstream Service Response:</strong> {result.error}
            </div>
          )}

          <pre style={{ margin: 0, padding: '0.5rem', background: '#04070d', borderRadius: '4px', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', maxHeight: '180px', overflowY: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
