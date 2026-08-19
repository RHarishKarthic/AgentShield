import React from 'react';
import { MetricsData } from '../types';

interface SummaryStripProps {
  metrics: MetricsData | null;
  timeRange?: string;
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({ metrics, timeRange = '24h' }) => {
  const total = metrics?.total_requests ?? 0;
  const allowed = metrics?.allowed_count ?? 0;
  const blocked = metrics?.blocked_count ?? 0;
  const shadow = metrics?.shadow_count ?? 0;

  const allowPct = total > 0 ? ((allowed / total) * 100).toFixed(1) : (metrics?.allow_percentage?.toFixed(1) ?? '100.0');
  const blockPct = total > 0 ? ((blocked / total) * 100).toFixed(1) : (metrics?.block_percentage?.toFixed(1) ?? '0.0');
  const shadowPct = total > 0 ? ((shadow / total) * 100).toFixed(1) : '0.0';

  const timeLabel = timeRange === 'all' ? 'All Time' : timeRange;

  return (
    <div className="summary-strip">
      {/* 1. Total Requests */}
      <div className="summary-block">
        <span className="summary-label">
          <span>Total Requests</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue-primary)', background: 'var(--blue-bg)', padding: '1px 5px', borderRadius: '3px' }}>
            {timeLabel}
          </span>
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
        <span className="summary-subtext">{metrics?.requests_per_minute || 2} req/min avg throughput</span>
      </div>

      {/* 2. Allowed Traffic */}
      <div className="summary-block">
        <span className="summary-label">Allowed Traffic</span>
        <div className="summary-value-row">
          <span className="summary-number allowed">{allowed.toLocaleString()}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green-primary)', fontFamily: 'var(--font-mono)' }}>
            {allowPct}%
          </span>
        </div>
        <span className="summary-subtext">Policy compliant executions</span>
      </div>

      {/* 3. Blocked Invocations */}
      <div className="summary-block">
        <span className="summary-label">Blocked Invocations</span>
        <div className="summary-value-row">
          <span className="summary-number blocked">{blocked.toLocaleString()}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--red-primary)', fontFamily: 'var(--font-mono)' }}>
            {blockPct}%
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
            {shadowPct}%
          </span>
        </div>
        <span className="summary-subtext">Observed dry-run events</span>
      </div>

      {/* 5. Threat Block Rate */}
      <div className="summary-block">
        <span className="summary-label">Threat Block Rate</span>
        <div className="summary-value-row">
          <span className="summary-number">{blockPct}%</span>
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
        <span className="summary-subtext">Threat mitigation percentage</span>
      </div>
    </div>
  );
};
