import React from 'react';
import { Eye, Shield, Check, Flame, Cpu, AlertTriangle } from 'lucide-react';
import { AuditEvent, Policy } from '../types';

interface ShadowModeViewProps {
  events: AuditEvent[];
  activePolicy: Policy | null;
  onToggleMode: () => void;
  onSelectEvent: (event: AuditEvent) => void;
  selectedEventId: string | null;
}

export const ShadowModeView: React.FC<ShadowModeViewProps> = ({
  events,
  activePolicy,
  onToggleMode,
  onSelectEvent,
  selectedEventId,
}) => {
  const isEnforcement = activePolicy?.mode === 'enforcement';
  const shadowEvents = events.filter((e) => e.decision === 'SHADOW_WOULD_BLOCK');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overview Banner */}
      <div className="panel-container" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="var(--amber-primary)" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Shadow Mode & Dry-Run Policy Calibration Lab
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '700px' }}>
              Shadow Mode evaluates incoming AI agent tool calls in real time and audits violations with <code>SHADOW_WOULD_BLOCK</code> without breaking live production workflows.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={onToggleMode}
            style={{ background: isEnforcement ? 'var(--amber-primary)' : 'var(--green-primary)', border: 'none' }}
          >
            {isEnforcement ? <Eye size={14} /> : <Shield size={14} />}
            <span>{isEnforcement ? 'Switch to Shadow Mode' : 'Promote to Enforcement Mode'}</span>
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="panel-container" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green-primary)', textTransform: 'uppercase' }}>
            ENFORCEMENT MODE
          </span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
            Strict Active Blocking (HTTP 403)
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Any rule violation immediately terminates the request. Downstream tool is never executed.
          </p>
        </div>

        <div className="panel-container" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--amber-primary)', textTransform: 'uppercase' }}>
            SHADOW CALIBRATION MODE
          </span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
            Dry-Run Observation (HTTP 200)
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Violations are logged to the dashboard and audit trail, but the tool is permitted to execute for calibration.
          </p>
        </div>
      </div>

      {/* Shadow Events Table */}
      <div className="panel-container">
        <div className="panel-header">
          <span className="panel-title">Observed Shadow Violations ({shadowEvents.length})</span>
          <span className="panel-subtitle">Events that would be blocked under Enforcement Mode</span>
        </div>

        <div className="data-table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Tool</th>
                <th>Operation</th>
                <th>Simulated Block Reason</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {shadowEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No shadow violations recorded. All agent calls are compliant.
                  </td>
                </tr>
              ) : (
                shadowEvents.map((e) => (
                  <tr key={e.event_id} className={selectedEventId === e.event_id ? 'selected' : ''} onClick={() => onSelectEvent(e)}>
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>{new Date(e.created_at).toLocaleTimeString()}</td>
                    <td style={{ fontWeight: 600 }}>{e.agent_id}</td>
                    <td className="mono-cell">{e.tool}</td>
                    <td className="mono-cell" style={{ color: 'var(--blue-primary)' }}>{e.operation || 'default'}</td>
                    <td style={{ color: 'var(--amber-primary)', fontWeight: 500 }}>{e.reason}</td>
                    <td>
                      <span className="badge badge-shadow">SHADOW_WOULD_BLOCK</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
