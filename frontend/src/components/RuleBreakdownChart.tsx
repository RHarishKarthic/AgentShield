import React from 'react';
import { Sliders } from 'lucide-react';
import { MetricRuleBreakdown } from '../types';

interface RuleBreakdownChartProps {
  breakdown: MetricRuleBreakdown | undefined;
  totalBlocked: number;
}

export const RuleBreakdownChart: React.FC<RuleBreakdownChartProps> = ({ breakdown, totalBlocked }) => {
  const rules = [
    { label: 'Rate Limiting', key: 'rate_limit', count: breakdown?.rate_limit || 0 },
    { label: 'Parameter Validation', key: 'parameter_validation', count: breakdown?.parameter_validation || 0 },
    { label: 'Data Scope Enforcement', key: 'data_scope', count: breakdown?.data_scope || 0 },
    { label: 'Sequence Rules', key: 'sequence', count: breakdown?.sequence || 0 },
    { label: 'Authentication', key: 'authentication', count: breakdown?.authentication || 0 },
  ];

  const maxVal = Math.max(...rules.map((r) => r.count), 1);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div className="section-header">
        <h2 className="section-title">
          <Sliders size={18} color="var(--cyan-glow)" />
          Blocks by Rule Engine
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {totalBlocked} Total Interceptions
        </span>
      </div>

      <div className="rule-bar-list">
        {rules.map((rule) => {
          const pct = Math.round((rule.count / maxVal) * 100);
          return (
            <div key={rule.key} className="rule-bar-item">
              <div className="rule-bar-header">
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{rule.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-block)', fontWeight: 700 }}>
                  {rule.count}
                </span>
              </div>
              <div className="rule-bar-track">
                <div className="rule-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
