import React from 'react';
import { Sliders, Shield, Layers } from 'lucide-react';
import { MetricRuleBreakdown, Policy } from '../types';

interface ThreatRadarProps {
  breakdown: MetricRuleBreakdown | undefined;
  totalBlocked: number;
  activePolicy: Policy | null;
}

export const ThreatRadar: React.FC<ThreatRadarProps> = ({ breakdown, totalBlocked, activePolicy }) => {
  const rules = [
    { label: 'Rate Limiting', key: 'rate_limit', count: breakdown?.rate_limit || 0 },
    { label: 'Parameter Validation', key: 'parameter_validation', count: breakdown?.parameter_validation || 0 },
    { label: 'Data Scope Enforcement', key: 'data_scope', count: breakdown?.data_scope || 0 },
    { label: 'Sequence Rules', key: 'sequence', count: breakdown?.sequence || 0 },
    { label: 'Agent Authentication', key: 'authentication', count: breakdown?.authentication || 0 },
  ];

  const maxVal = Math.max(...rules.map((r) => r.count), 1);

  return (
    <div className="cyber-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card-header-bar" style={{ marginBottom: 0 }}>
        <h2 className="card-title">
          <Sliders size={18} color="var(--cyan-accent)" />
          Blocks by Rule Engine
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {totalBlocked} Total Interceptions
        </span>
      </div>

      {/* Meter Bars */}
      <div className="rule-meter-list">
        {rules.map((rule) => {
          const pct = Math.round((rule.count / maxVal) * 100);
          return (
            <div key={rule.key} className="rule-meter-item">
              <div className="rule-meter-labels">
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{rule.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--block-red)', fontWeight: 700 }}>
                  {rule.count}
                </span>
              </div>
              <div className="rule-meter-track">
                <div className="rule-meter-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Policy Metadata Card */}
      {activePolicy && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: 'var(--cyan-accent)' }}>
              <Layers size={13} /> Active Policy: {activePolicy.policy_id}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>v{activePolicy.version}</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{activePolicy.description}</p>
        </div>
      )}
    </div>
  );
};
