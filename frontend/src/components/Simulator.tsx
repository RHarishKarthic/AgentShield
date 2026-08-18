import React, { useState } from 'react';
import { Play, Zap, ShieldAlert, Database, Lock, Gauge } from 'lucide-react';
import { triggerToolCall } from '../services/api';

interface SimulatorProps {
  onTriggered: () => void;
}

export const Simulator: React.FC<SimulatorProps> = ({ onTriggered }) => {
  const [running, setRunning] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<any>(null);

  // Scenario 1: Normal clean call
  const runNormalCall = async () => {
    setRunning('normal');
    try {
      const sessId = `sim-norm-${Date.now()}`;
      // Auth first for sequence rules
      await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
      const res = await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, sessId);
      setLastOutput(res);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  // Scenario 2: Rate Limit Burst (6 rapid requests)
  const runRateLimitBurst = async () => {
    setRunning('rate_limit');
    try {
      const sessId = `sim-burst-${Date.now()}`;
      await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
      let lastRes = null;
      for (let i = 1; i <= 6; i++) {
        lastRes = await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'get_customer', { customer_id: 101 }, sessId);
      }
      setLastOutput(lastRes);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  // Scenario 3: SQL Injection Simulation
  const runSqlInjection = async () => {
    setRunning('injection');
    try {
      const sessId = `sim-sqli-${Date.now()}`;
      await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
      const res = await triggerToolCall(
        'support-agent',
        'agent-key-support-001',
        'customer_database',
        'update_customer',
        { customer_id: 101, name: "Alice'; DROP TABLE customers;--" },
        sessId
      );
      setLastOutput(res);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  // Scenario 4: Out-of-Scope Data Access (Customer 999)
  const runScopeViolation = async () => {
    setRunning('scope');
    try {
      const sessId = `sim-scope-${Date.now()}`;
      await triggerToolCall('support-agent', 'agent-key-support-001', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
      const res = await triggerToolCall(
        'support-agent',
        'agent-key-support-001',
        'customer_database',
        'get_customer',
        { customer_id: 999 },
        sessId
      );
      setLastOutput(res);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  // Scenario 5: Sequence Rule Violation (Get without Auth)
  const runSequenceViolation = async () => {
    setRunning('sequence');
    try {
      const unauthSession = `sim-unauth-${Date.now()}`;
      const res = await triggerToolCall(
        'support-agent',
        'agent-key-support-001',
        'customer_database',
        'get_customer',
        { customer_id: 101 },
        unauthSession
      );
      setLastOutput(res);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  // Scenario 6: Shadow Mode Calibration Call
  const runShadowCall = async () => {
    setRunning('shadow');
    try {
      const sessId = `sim-shadow-${Date.now()}`;
      await triggerToolCall('shadow-agent', 'agent-key-shadow-002', 'customer_database', 'authenticate', { customer_id: 101 }, sessId);
      // customer 103 is out of scope for shadow-audit-policy -> triggers SHADOW_WOULD_BLOCK
      const res = await triggerToolCall(
        'shadow-agent',
        'agent-key-shadow-002',
        'customer_database',
        'get_customer',
        { customer_id: 103 },
        sessId
      );
      setLastOutput(res);
      onTriggered();
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div className="section-header">
        <h2 className="section-title">
          <Zap size={18} color="var(--cyan-glow)" />
          Attack & Scenario Simulator
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interactive Demo Controls</span>
      </div>

      <div className="simulator-panel">
        <button
          className={`sim-btn ${running === 'normal' ? 'active' : ''}`}
          onClick={runNormalCall}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={14} color="var(--accent-allow)" />
            1. Normal Call (ALLOW)
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>cust_id: 101</span>
        </button>

        <button
          className={`sim-btn ${running === 'rate_limit' ? 'active' : ''}`}
          onClick={runRateLimitBurst}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} color="var(--accent-block)" />
            2. Rate Limit Burst (6 reqs)
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>limit: 5/min</span>
        </button>

        <button
          className={`sim-btn ${running === 'injection' ? 'active' : ''}`}
          onClick={runSqlInjection}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={14} color="var(--accent-block)" />
            3. SQL Injection Simulation
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DROP TABLE</span>
        </button>

        <button
          className={`sim-btn ${running === 'scope' ? 'active' : ''}`}
          onClick={runScopeViolation}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={14} color="var(--accent-block)" />
            4. Out-of-Scope Data Access
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>cust_id: 999</span>
        </button>

        <button
          className={`sim-btn ${running === 'sequence' ? 'active' : ''}`}
          onClick={runSequenceViolation}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={14} color="var(--accent-block)" />
            5. Sequence Rule Violation
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Auth First</span>
        </button>

        <button
          className={`sim-btn ${running === 'shadow' ? 'active' : ''}`}
          onClick={runShadowCall}
          disabled={running !== null}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gauge size={14} color="var(--accent-shadow)" />
            6. Shadow Mode Calibration
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Would Block</span>
        </button>
      </div>

      {lastOutput && (
        <div style={{ marginTop: '0.85rem', padding: '0.65rem', background: 'rgba(0,0,0,0.5)', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Last Gateway Output:</span>
            <span style={{ fontWeight: 700, color: lastOutput.status === 'ALLOW' ? 'var(--accent-allow)' : lastOutput.status === 'BLOCK' ? 'var(--accent-block)' : 'var(--accent-shadow)' }}>
              {lastOutput.status}
            </span>
          </div>
          <pre style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', maxHeight: '90px', overflowY: 'auto' }}>
            {JSON.stringify(lastOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
