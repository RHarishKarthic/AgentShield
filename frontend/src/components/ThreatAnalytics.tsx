import React from 'react';
import { MetricRuleBreakdown, MetricsData } from '../types';

interface ThreatAnalyticsProps {
  metrics: MetricsData | null;
  breakdown: MetricRuleBreakdown | undefined;
}

export const ThreatAnalytics: React.FC<ThreatAnalyticsProps> = ({ metrics, breakdown }) => {
  const threats = [
    { label: 'Sequence Violations', count: breakdown?.sequence ?? 184, color: '#C62828' },
    { label: 'SQL Injection', count: breakdown?.parameter_validation ?? 142, color: '#D92D20' },
    { label: 'Rate Limit Abuse', count: breakdown?.rate_limit ?? 89, color: '#F04438' },
    { label: 'Out-of-Scope Access', count: breakdown?.data_scope ?? 48, color: '#B7791F' },
    { label: 'Authentication Failures', count: breakdown?.authentication ?? 10, color: '#667085' },
  ];

  const maxThreat = Math.max(...threats.map((t) => t.count), 1);

  const allowPct = metrics?.allow_percentage ?? 55.2;
  const blockPct = metrics?.block_percentage ?? 38.4;
  const shadowPct = metrics ? Math.max(0, +(100 - allowPct - blockPct).toFixed(1)) : 6.4;

  return (
    <div className="analytics-grid">
      {/* 1. Threat Distribution */}
      <div className="panel-container">
        <div className="panel-header">
          <span className="panel-title">Threat Distribution</span>
          <span className="panel-subtitle">By Attack & Rule Category</span>
        </div>

        <div style={{ padding: '16px' }}>
          {threats.map((t) => {
            const pct = Math.round((t.count / maxThreat) * 100);
            return (
              <div key={t.label} className="bar-row">
                <div className="bar-label-row">
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {t.count} incidents
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: t.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Policy Decisions Donut / Breakdown */}
      <div className="panel-container">
        <div className="panel-header">
          <span className="panel-title">Policy Decisions</span>
          <span className="panel-subtitle">24-Hour Enforcement Ratio</span>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
          {/* Donut Chart via SVG */}
          <div style={{ position: 'relative', width: '130px', height: '130px' }}>
            <svg width="130" height="130" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E4E7EC" strokeWidth="6" />
              {/* Allowed segment */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="var(--green-primary)"
                strokeWidth="6"
                strokeDasharray={`${allowPct} ${100 - allowPct}`}
                strokeDashoffset="25"
              />
              {/* Blocked segment */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="var(--red-primary)"
                strokeWidth="6"
                strokeDasharray={`${blockPct} ${100 - blockPct}`}
                strokeDashoffset={`${25 - allowPct}`}
              />
              {/* Shadow segment */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="var(--amber-primary)"
                strokeWidth="6"
                strokeDasharray={`${shadowPct} ${100 - shadowPct}`}
                strokeDashoffset={`${25 - allowPct - blockPct}`}
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics?.total_requests ?? '1.2k'}
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</span>
            </div>
          </div>

          {/* Decision Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--green-primary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Allowed &middot; {allowPct}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {metrics?.allowed_count ?? 680} executions
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--red-primary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Blocked &middot; {blockPct}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {metrics?.blocked_count ?? 473} violations halted
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber-primary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Shadow &middot; {shadowPct}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {metrics?.shadow_count ?? 78} dry-run observations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
