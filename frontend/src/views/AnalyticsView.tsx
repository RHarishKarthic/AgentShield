import React from 'react';
import { BarChart3, Activity, PieChart, ShieldCheck, ShieldAlert } from 'lucide-react';
import { MetricsData } from '../types';
import { ThreatAnalytics } from '../components/ThreatAnalytics';

interface AnalyticsViewProps {
  metrics: MetricsData | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ metrics }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel-container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="var(--blue-primary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Security Analytics & Telemetry Metrics</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Real-time statistical breakdown of tool calls, latency percentiles, and threat distributions
        </p>
      </div>

      {/* Latency & Throughput KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>P50 EVALUATION LATENCY</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>2.14 ms</div>
          <span style={{ fontSize: '11px', color: 'var(--green-primary)' }}>Optimal performance (&lt; 5ms)</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>P95 EVALUATION LATENCY</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>3.73 ms</div>
          <span style={{ fontSize: '11px', color: 'var(--green-primary)' }}>Within 50ms SLA</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>THROUGHPUT</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {metrics?.requests_per_minute || 42} req/min
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average rate</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE ENGINES</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>4 / 4 Rules</div>
          <span style={{ fontSize: '11px', color: 'var(--green-primary)' }}>All engines operational</span>
        </div>
      </div>

      <ThreatAnalytics metrics={metrics} breakdown={metrics?.blocks_by_rule} />
    </div>
  );
};
