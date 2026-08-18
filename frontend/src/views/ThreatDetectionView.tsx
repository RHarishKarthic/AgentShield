import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertOctagon, Filter, Search, ShieldX } from 'lucide-react';
import { AuditEvent } from '../types';

interface ThreatDetectionViewProps {
  events: AuditEvent[];
  onSelectEvent: (event: AuditEvent) => void;
  selectedEventId: string | null;
}

export const ThreatDetectionView: React.FC<ThreatDetectionViewProps> = ({
  events,
  onSelectEvent,
  selectedEventId,
}) => {
  const [selectedRule, setSelectedRule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Only threats
  const threats = events.filter((e) => e.decision === 'BLOCK' || e.decision === 'SHADOW_WOULD_BLOCK');

  const filteredThreats = threats.filter((e) => {
    if (selectedRule !== 'all' && e.blocked_by_rule !== selectedRule) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.agent_id.toLowerCase().includes(q) ||
      e.tool.toLowerCase().includes(q) ||
      (e.reason && e.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL INCIDENTS</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--red-primary)', marginTop: '4px' }}>
            {threats.length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Security violations intercepted</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SQL & CODE INJECTION</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {threats.filter((t) => t.blocked_by_rule === 'parameter_validation').length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Parameter sanitization blocks</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SEQUENCE VIOLATIONS</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {threats.filter((t) => t.blocked_by_rule === 'sequence').length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Out-of-order execution attempts</span>
        </div>

        <div className="panel-container" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>DATA BOUNDARY BYPASS</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {threats.filter((t) => t.blocked_by_rule === 'data_scope').length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unauthorized customer IDs</span>
        </div>
      </div>

      {/* Threats Table */}
      <div className="panel-container">
        <div className="panel-filter-bar">
          <div className="search-input-wrap" style={{ maxWidth: '340px' }}>
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search threat incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="select-control" value={selectedRule} onChange={(e) => setSelectedRule(e.target.value)}>
              <option value="all">Rule: All Triggers</option>
              <option value="parameter_validation">Parameter Validation (Injection)</option>
              <option value="sequence">Sequence Violation</option>
              <option value="data_scope">Data Scope Enforcement</option>
              <option value="rate_limit">Rate Limiting</option>
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Agent</th>
                <th>Target Tool</th>
                <th>Triggered Rule</th>
                <th>Forensic Reason</th>
                <th>Disposition</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredThreats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No security violations logged matching current filter.
                  </td>
                </tr>
              ) : (
                filteredThreats.map((evt) => {
                  const isSelected = selectedEventId === evt.event_id;
                  const time = new Date(evt.created_at).toLocaleTimeString();

                  return (
                    <tr
                      key={evt.event_id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onSelectEvent(evt)}
                    >
                      <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>{time}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.agent_id}</td>
                      <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>{evt.tool}</td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--red-primary)', background: 'var(--red-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--red-border)' }}>
                          {evt.blocked_by_rule || 'policy_violation'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-primary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.reason}
                      </td>
                      <td>
                        <span className={`badge ${evt.decision === 'BLOCK' ? 'badge-block' : 'badge-shadow'}`}>
                          {evt.decision}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
