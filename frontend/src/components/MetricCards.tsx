import React from 'react';
import { ShieldCheck, ShieldAlert, Shield, Eye, Activity } from 'lucide-react';
import { MetricsData } from '../types';

interface MetricCardsProps {
  metrics: MetricsData | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="telemetry-grid">
      {/* 1. Total Invocations */}
      <div className="kpi-card total cyber-card">
        <div className="kpi-header">
          <span className="kpi-title">Total Invocations</span>
          <Shield size={16} color="var(--cyan-accent)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number" style={{ color: 'var(--cyan-accent)' }}>
            {metrics.total_requests.toLocaleString()}
          </span>
        </div>
        <div className="kpi-footer">
          <span><Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />Throughput</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {metrics.requests_per_minute} req/min
          </span>
        </div>
      </div>

      {/* 2. Allowed */}
      <div className="kpi-card allow cyber-card">
        <div className="kpi-header">
          <span className="kpi-title">Allowed Traffic</span>
          <ShieldCheck size={16} color="var(--allow-green)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number" style={{ color: 'var(--allow-green)' }}>
            {metrics.allowed_count.toLocaleString()}
          </span>
        </div>
        <div className="kpi-footer">
          <span>Compliance Rate</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--allow-green)' }}>
            {metrics.allow_percentage}%
          </span>
        </div>
      </div>

      {/* 3. Blocked */}
      <div className="kpi-card block cyber-card">
        <div className="kpi-header">
          <span className="kpi-title">Blocked Threats</span>
          <ShieldAlert size={16} color="var(--block-red)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number" style={{ color: 'var(--block-red)' }}>
            {metrics.blocked_count.toLocaleString()}
          </span>
        </div>
        <div className="kpi-footer">
          <span>Block Rate</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--block-red)' }}>
            {metrics.block_percentage}%
          </span>
        </div>
      </div>

      {/* 4. Shadow Calibrations */}
      <div className="kpi-card shadow cyber-card">
        <div className="kpi-header">
          <span className="kpi-title">Shadow Calibrations</span>
          <Eye size={16} color="var(--shadow-amber)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number" style={{ color: 'var(--shadow-amber)' }}>
            {metrics.shadow_count.toLocaleString()}
          </span>
        </div>
        <div className="kpi-footer">
          <span>Observed Violations</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--shadow-amber)' }}>
            Dry-Run Mode
          </span>
        </div>
      </div>
    </div>
  );
};
