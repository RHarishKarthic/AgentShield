import React from 'react';
import { FileCheck2, Shield, Plus, Edit, Flame, Cpu, Check, Lock, Database } from 'lucide-react';
import { Policy } from '../types';

interface AgentPoliciesViewProps {
  policies: Policy[];
  onToggleMode: (policyId: string) => void;
}

export const AgentPoliciesView: React.FC<AgentPoliciesViewProps> = ({
  policies,
  onToggleMode,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="panel-container" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={18} color="var(--blue-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Agent Security Policies</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Declarative security guardrails, rate limits, parameter blocklists, and data scopes
          </p>
        </div>

        <button className="btn-primary">
          <Plus size={14} /> <span>Create New Policy</span>
        </button>
      </div>

      {/* Policies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {policies.map((p) => {
          const isEnforcement = p.mode === 'enforcement';

          return (
            <div key={p.policy_id} className="panel-container" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} color="var(--blue-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.policy_id}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    background: isEnforcement ? 'var(--green-bg)' : 'var(--amber-bg)',
                    color: isEnforcement ? 'var(--green-primary)' : 'var(--amber-primary)',
                    border: `1px solid ${isEnforcement ? 'var(--green-border)' : 'var(--amber-border)'}`,
                  }}>
                    MODE: {p.mode.toUpperCase()}
                  </span>

                  <button
                    className="btn-secondary"
                    onClick={() => onToggleMode(p.policy_id)}
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {isEnforcement ? <Cpu size={12} /> : <Flame size={12} />}
                    <span>Switch to {isEnforcement ? 'Shadow' : 'Enforcement'}</span>
                  </button>
                </div>
              </div>

              {/* Active Rules Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', background: 'var(--bg-surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate Limiting</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    5 requests / 60s window
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Injection Filter</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    SQL & Path Traversal Blocklist
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Scope</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    Customer IDs [101, 102, 103]
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sequence Rules</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    Strict Auth-First Enforcement
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
