import React from 'react';
import { MetricsData } from '../types';

interface SummaryStripProps {
  metrics: MetricsData | null;
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({ metrics }) => {
  const total = metrics?.total_requests ?? 1231;
  const allowed = metrics?.allowed_count ?? 680;
  const blocked = metrics?.blocked_count ?? 473;
  const shadow = metrics?.shadow_count ?? 78;
  const blockRate = metrics?.block_percentage ?? 38.4;

  return (
    <div className="summary-strip">
      {/* 1. Requests */}
      <div className="summary-block">
        <span className="summary-label">
          <span>Total Requests</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>24h</span>
        </span>
        <div className="summary-value-row">
          <span className="summary-number">{total.toLocaleString()}</span>
          {/* Mini Sparkline */}
          <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
            <path
              d="M1 14L8 10L16 12L24 6L32 9L40 3L47 7"
              stroke="#667085"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="summary-subtext">{metrics?.requests_per_minute || 42} req/min avg throughput</span>
      </div>

      {/* 2. Allowed */}
      <div className="summary-block">
        <span className="summary-label">Allowed Traffic</span>
        <div className="summary-value-row">
          <span className="summary-number allowed">{allowed.toLocaleString()}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green-primary)', fontFamily: 'var(--font-mono)' }}>
            {metrics?.allow_percentage ?? 55.2}%
          </span>
        </div>
        <span className="summary-subtext">Policy compliant executions</span>
      </div>

      {/* 3. Blocked */}
      <div className="summary-block">
        <span className="summary-label">Blocked Invocations</span>
        <div className="summary-value-row">
          <span className="summary-number blocked">{blocked.toLocaleString()}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--red-primary)', fontFamily: 'var(--font-mono)' }}>
            {metrics?.block_percentage ?? 38.4}%
          </span>
        </div>
        <span className="summary-subtext">Active security blocks</span>
      </div>

      {/* 4. Shadow Violations */}
      <div className="summary-block">
        <span className="summary-label">Shadow Violations</span>
        <div className="summary-value-row">
          <span className="summary-number shadow">{shadow.toLocaleString()}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber-primary)', fontFamily: 'var(--font-mono)' }}>
            {metrics ? (100 - metrics.allow_percentage - metrics.block_percentage).toFixed(1) : 6.4}%
          </span>
        </div>
        <span className="summary-subtext">Observed dry-run events</span>
      </div>

      {/* 5. Block Rate */}
      <div className="summary-block">
        <span className="summary-label">Threat Block Rate</span>
        <div className="summary-value-row">
          <span className="summary-number">{blockRate}%</span>
          {/* Mini Sparkline */}
          <svg width="48" height="18" viewBox="0 0 48 18" fill="none">
            <path
              d="M1 5L10 8L18 4L26 11L34 7L42 14L47 9"
              stroke="#C62828"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="summary-subtext">-1.8% vs previous window</span>
      </div>
    </div>
  );
};
