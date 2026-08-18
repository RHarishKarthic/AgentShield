import React from 'react';
import { ShieldCheck, ShieldAlert, Shield, Gauge, Users, Wrench } from 'lucide-react';
import { MetricsData } from '../types';

interface MetricsOverviewProps {
  metrics: MetricsData | null;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="metrics-grid">
      <div className="metric-card total glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="metric-label">Total Invocations</span>
          <Shield size={18} color="var(--cyan-glow)" />
        </div>
        <span className="metric-value" style={{ color: 'var(--cyan-glow)' }}>
          {metrics.total_requests.toLocaleString()}
        </span>
        <span className="metric-subtext">{metrics.requests_per_minute} req/min current rate</span>
      </div>

      <div className="metric-card allow glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="metric-label">Allowed (Clean)</span>
          <ShieldCheck size={18} color="var(--accent-allow)" />
        </div>
        <span className="metric-value" style={{ color: 'var(--accent-allow)' }}>
          {metrics.allowed_count.toLocaleString()}
        </span>
        <span className="metric-subtext">{metrics.allow_percentage}% compliance rate</span>
      </div>

      <div className="metric-card block glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="metric-label">Blocked (Violations)</span>
          <ShieldAlert size={18} color="var(--accent-block)" />
        </div>
        <span className="metric-value" style={{ color: 'var(--accent-block)' }}>
          {metrics.blocked_count.toLocaleString()}
        </span>
        <span className="metric-subtext">{metrics.block_percentage}% block rate</span>
      </div>

      <div className="metric-card shadow glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="metric-label">Shadow Calibrations</span>
          <Gauge size={18} color="var(--accent-shadow)" />
        </div>
        <span className="metric-value" style={{ color: 'var(--accent-shadow)' }}>
          {metrics.shadow_count.toLocaleString()}
        </span>
        <span className="metric-subtext">Would-block non-enforced events</span>
      </div>
    </div>
  );
};
