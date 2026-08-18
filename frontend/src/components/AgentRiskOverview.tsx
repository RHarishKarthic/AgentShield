import React from 'react';
import { Bot, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

export const AgentRiskOverview: React.FC = () => {
  const agents = [
    {
      name: 'support-agent',
      role: 'Customer Support Autonomous ReAct Agent',
      requests: 642,
      blockRate: '31.2%',
      riskScore: 74,
      status: 'Monitor',
      statusColor: 'var(--amber-primary)',
      statusBg: 'var(--amber-bg)',
    },
    {
      name: 'analytics-agent',
      role: 'Internal Data Reporting & Export Agent',
      requests: 318,
      blockRate: '42.8%',
      riskScore: 81,
      status: 'Elevated',
      statusColor: 'var(--red-primary)',
      statusBg: 'var(--red-bg)',
    },
    {
      name: 'customer-agent',
      role: 'Self-Service Customer Profile Updater',
      requests: 271,
      blockRate: '18.4%',
      riskScore: 39,
      status: 'Healthy',
      statusColor: 'var(--green-primary)',
      statusBg: 'var(--green-bg)',
    },
  ];

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-title">Agent Risk Overview</span>
          <span className="panel-subtitle">&middot; Autonomous agent threat scoring & compliance</span>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="dense-table">
          <thead>
            <tr>
              <th>Agent Identity</th>
              <th>Role & Scope</th>
              <th style={{ textAlign: 'right' }}>Requests</th>
              <th style={{ textAlign: 'right' }}>Block Rate</th>
              <th style={{ textAlign: 'center' }}>Risk Score</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((ag) => (
              <tr key={ag.name}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={15} color="var(--text-secondary)" />
                    <span className="mono-cell">{ag.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {ag.role}
                </td>
                <td className="mono-cell" style={{ textAlign: 'right', fontWeight: 500 }}>
                  {ag.requests.toLocaleString()}
                </td>
                <td className="mono-cell" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ag.blockRate}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: ag.riskScore > 75 ? 'var(--red-bg)' : ag.riskScore > 50 ? 'var(--amber-bg)' : 'var(--green-bg)',
                    color: ag.riskScore > 75 ? 'var(--red-primary)' : ag.riskScore > 50 ? 'var(--amber-primary)' : 'var(--green-primary)',
                  }}>
                    {ag.riskScore} / 100
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: ag.statusBg,
                    color: ag.statusColor,
                  }}>
                    {ag.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
