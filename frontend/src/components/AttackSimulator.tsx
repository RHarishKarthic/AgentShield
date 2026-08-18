import React, { useState } from 'react';
import { Play, Zap, ShieldAlert, Database, Lock, Eye, Loader2 } from 'lucide-react';
import { triggerToolCall } from '../services/api';

interface AttackSimulatorProps {
  onTriggered: () => void;
}

export const AttackSimulator: React.FC<AttackSimulatorProps> = ({ onTriggered }) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<any>(null);

  const executeScenario = async (id: string, action: () => Promise<any>) => {
    setRunningId(id);
    try {
      const res = await action();
      setLastOutput(res);
      onTriggered();
    } catch (e: any) {
      setLastOutput({ status: 'ERROR', detail: e.message });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="cyber-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="card-header-bar" style={{ marginBottom: 0 }}>
        <h2 className="card-title">
          <Zap size={18} color="var(--cyan-accent)" />
          Attack & Scenario Simulator
        </h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1-Click Tactical Triggers</span>
      </div>

      <div className="scenario-grid">
        {/* Scenario 1 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('norm', async () => {
              const sessId = `sim-norm-${Date.now()}`;
              await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
              return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, sessId);
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'norm' ? <Loader2 size={14} className="spin" color="var(--allow-green)" /> : <Play size={14} color="var(--allow-green)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>1. Legitimate Tool Call</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Auth &rarr; Get Customer 101</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--allow-green)' }}>ALLOW</span>
        </button>

        {/* Scenario 2 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('rate', async () => {
              const sessId = `sim-burst-${Date.now()}`;
              let last = null;
              for (let i = 1; i <= 6; i++) {
                last = await triggerToolCall(
                  'support-agent',
                  'agent-key-support-001',
                  'email_service',
                  'send',
                  { recipient: `user${i}@example.com`, subject: `Burst ${i}`, body: `Test ${i}` },
                  sessId
                );
              }
              return last;
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'rate' ? <Loader2 size={14} className="spin" color="var(--block-red)" /> : <Zap size={14} color="var(--block-red)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>2. Rate Limit Burst (6 reqs)</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Exceeds 5 reqs/min quota</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--block-red)' }}>BLOCK (6th)</span>
        </button>

        {/* Scenario 3 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('sqli', async () => {
              const sessId = `sim-sqli-${Date.now()}`;
              await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
              return await triggerToolCall(
                'support-agent',
                'agent-key-support-001',
                'customer_database',
                'update_customer',
                { customer_id: 101, name: "Alice'; DROP TABLE customers;--" },
                sessId
              );
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'sqli' ? <Loader2 size={14} className="spin" color="var(--block-red)" /> : <ShieldAlert size={14} color="var(--block-red)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>3. SQL Injection Attack</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Payload: '; DROP TABLE;--</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--block-red)' }}>BLOCK</span>
        </button>

        {/* Scenario 4 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('scope', async () => {
              const sessId = `sim-scope-${Date.now()}`;
              await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
              return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 999 }, sessId);
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'scope' ? <Loader2 size={14} className="spin" color="var(--block-red)" /> : <Database size={14} color="var(--block-red)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>4. Out-of-Scope Data Access</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target: Customer 999</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--block-red)' }}>BLOCK</span>
        </button>

        {/* Scenario 5 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('seq', async () => {
              const sessId = `sim-unauth-${Date.now()}`;
              return await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, sessId);
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'seq' ? <Loader2 size={14} className="spin" color="var(--block-red)" /> : <Lock size={14} color="var(--block-red)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>5. Sequence Violation</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>No Prior Authentication</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--block-red)' }}>BLOCK</span>
        </button>

        {/* Scenario 6 */}
        <button
          className="scenario-btn"
          disabled={runningId !== null}
          onClick={() =>
            executeScenario('shadow', async () => {
              const sessId = `sim-shadow-${Date.now()}`;
              await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
              return await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'get_customer', { customer_id: 103 }, sessId);
            })
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {runningId === 'shadow' ? <Loader2 size={14} className="spin" color="var(--shadow-amber)" /> : <Eye size={14} color="var(--shadow-amber)" />}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>6. Shadow Calibration</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Non-blocking Dry Run</div>
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--shadow-amber)' }}>SHADOW</span>
        </button>
      </div>

      {lastOutput && (
        <div style={{ padding: '0.65rem', background: '#040711', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Gateway Response:</span>
            <span style={{ fontWeight: 700, color: lastOutput.status === 'ALLOW' ? 'var(--allow-green)' : lastOutput.status === 'BLOCK' ? 'var(--block-red)' : 'var(--shadow-amber)' }}>
              {lastOutput.status}
            </span>
          </div>
          <pre style={{ margin: 0, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', maxHeight: '70px', overflowY: 'auto' }}>
            {JSON.stringify(lastOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
