import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, ArrowUpDown, ChevronRight } from 'lucide-react';
import { AuditEvent, Disposition } from '../types';

interface ThreatActivityTableProps {
  events: AuditEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: AuditEvent) => void;
  activeSessionFilter?: string | null;
  onClearSessionFilter?: () => void;
}

export const ThreatActivityTable: React.FC<ThreatActivityTableProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  activeSessionFilter,
  onClearSessionFilter,
}) => {
  const [viewMode, setViewMode] = useState<'all' | 'threats'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Compute Risk Level dynamically based on disposition and blocked rule
  const getRiskLevel = (event: AuditEvent): 'Critical' | 'High' | 'Medium' | 'Low' => {
    if (event.decision === 'ALLOW') return 'Low';
    if (event.blocked_by_rule === 'parameter_validation') return 'Critical';
    if (event.blocked_by_rule === 'sequence') return 'Critical';
    if (event.blocked_by_rule === 'data_scope') return 'High';
    if (event.blocked_by_rule === 'rate_limit') return 'Medium';
    return event.decision === 'SHADOW_WOULD_BLOCK' ? 'Medium' : 'High';
  };

  // Compute Policy Name
  const getPolicyName = (event: AuditEvent): string => {
    if (event.blocked_by_rule === 'sequence') return 'Sequence Rule';
    if (event.blocked_by_rule === 'parameter_validation') return 'Input Sanitization';
    if (event.blocked_by_rule === 'data_scope') return 'Data Boundary';
    if (event.blocked_by_rule === 'rate_limit') return 'Rate Limiting';
    if (event.operation === 'authenticate' || event.operation === 'authenticate_customer') return 'Authentication';
    return 'Standard Access';
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (activeSessionFilter && e.session_id !== activeSessionFilter) return false;
    if (viewMode === 'threats' && e.decision === 'ALLOW') return false;
    if (severityFilter !== 'all') {
      const r = getRiskLevel(e).toLowerCase();
      if (r !== severityFilter) return false;
    }
    if (agentFilter !== 'all' && e.agent_id !== agentFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.agent_id.toLowerCase().includes(q) ||
      e.tool.toLowerCase().includes(q) ||
      (e.operation && e.operation.toLowerCase().includes(q)) ||
      (e.reason && e.reason.toLowerCase().includes(q)) ||
      e.event_id.toLowerCase().includes(q) ||
      (e.session_id && e.session_id.toLowerCase().includes(q))
    );
  });

  const getBadgeClass = (decision: Disposition) => {
    switch (decision) {
      case 'ALLOW':
        return 'badge badge-allow';
      case 'BLOCK':
        return 'badge badge-block';
      case 'SHADOW_WOULD_BLOCK':
        return 'badge badge-shadow';
    }
  };

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'risk-pill risk-critical';
      case 'High': return 'risk-pill risk-high';
      case 'Medium': return 'risk-pill risk-medium';
      default: return 'risk-pill risk-low';
    }
  };

  return (
    <div className="panel-container">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-title">Threat Activity</span>
          <span className="panel-subtitle">&middot; {filteredEvents.length} events logged</span>
        </div>

        {activeSessionFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', background: 'var(--blue-bg)', color: 'var(--blue-primary)', border: '1px solid var(--blue-border)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
              Filtering Session: {activeSessionFilter}
            </span>
            <button
              onClick={onClearSessionFilter}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter & Controls Bar */}
      <div className="panel-filter-bar">
        {/* Toggle: All Traffic vs Threats Only */}
        <div className="segmented-toggle">
          <button
            className={`segmented-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Traffic
          </button>
          <button
            className={`segmented-btn ${viewMode === 'threats' ? 'active' : ''}`}
            onClick={() => setViewMode('threats')}
          >
            Threats Only
          </button>
        </div>

        {/* Search Field */}
        <div className="search-input-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search events, tools, agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="select-control"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            className="select-control"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">Agent: All</option>
            <option value="support-agent">support-agent</option>
            <option value="analytics-agent">analytics-agent</option>
            <option value="shadow-agent">shadow-agent</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-wrap">
        <table className="dense-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Agent</th>
              <th>Operation</th>
              <th>Tool</th>
              <th>Policy</th>
              <th>Risk</th>
              <th>Action</th>
              <th style={{ textAlign: 'right' }}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No activity matching the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const timeStr = new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const risk = getRiskLevel(evt);
                const policyName = getPolicyName(evt);
                const isSelected = selectedEventId === evt.event_id;

                return (
                  <tr
                    key={evt.event_id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onSelectEvent(evt)}
                  >
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>
                      {timeStr}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {evt.agent_id}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--blue-primary)', fontWeight: 500 }}>
                      {evt.operation || 'execute'}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>
                      {evt.tool}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {policyName}
                    </td>
                    <td>
                      <span className={getRiskClass(risk)}>{risk}</span>
                    </td>
                    <td>
                      <span className={getBadgeClass(evt.decision)}>
                        {evt.decision === 'SHADOW_WOULD_BLOCK' ? 'SHADOW' : evt.decision}
                      </span>
                    </td>
                    <td className="mono-cell" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {evt.execution_time_ms ? `${evt.execution_time_ms} ms` : '1.85 ms'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
