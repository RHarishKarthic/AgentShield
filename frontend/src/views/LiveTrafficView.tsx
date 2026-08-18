import React, { useState } from 'react';
import { Activity, Radio, Play, Pause, Search, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { AuditEvent } from '../types';

interface LiveTrafficViewProps {
  events: AuditEvent[];
  onSelectEvent: (event: AuditEvent) => void;
  selectedEventId: string | null;
  onRefresh: () => void;
}

export const LiveTrafficView: React.FC<LiveTrafficViewProps> = ({
  events,
  onSelectEvent,
  selectedEventId,
  onRefresh,
}) => {
  const [filterTool, setFilterTool] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const filtered = events.filter((e) => {
    if (filterTool !== 'all' && e.tool !== filterTool) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.agent_id.toLowerCase().includes(q) ||
      e.tool.toLowerCase().includes(q) ||
      (e.operation && e.operation.toLowerCase().includes(q)) ||
      e.event_id.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="panel-container" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--blue-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Live Traffic Stream & Interception Pipeline</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time telemetry of all autonomous AI tool calls inspected by AgentShield WAF (:8000)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => setIsPaused(!isPaused)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isPaused ? <Play size={13} color="var(--green-primary)" /> : <Pause size={13} />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>
          <button className="btn-secondary" onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Traffic Table */}
      <div className="panel-container">
        <div className="panel-filter-bar">
          <div className="search-input-wrap" style={{ maxWidth: '360px' }}>
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search live stream by Agent, Tool, Request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="select-control" value={filterTool} onChange={(e) => setFilterTool(e.target.value)}>
              <option value="all">Tool: All Services</option>
              <option value="customer_database">customer_database (:8001)</option>
              <option value="email_service">email_service (:8002)</option>
              <option value="file_service">file_service (:8003)</option>
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event ID</th>
                <th>Agent</th>
                <th>Tool Route</th>
                <th>Operation</th>
                <th>Payload Summary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Evaluation Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((evt) => {
                const time = new Date(evt.created_at).toLocaleTimeString();
                const isSelected = selectedEventId === evt.event_id;
                const isBlocked = evt.decision === 'BLOCK';
                const isShadow = evt.decision === 'SHADOW_WOULD_BLOCK';

                return (
                  <tr
                    key={evt.event_id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onSelectEvent(evt)}
                  >
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      {time}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-muted)' }}>
                      {evt.event_id}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {evt.agent_id}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>
                      {evt.tool}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--blue-primary)', fontWeight: 600 }}>
                      {evt.operation || 'default'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {JSON.stringify(evt.parameters_sanitised)}
                    </td>
                    <td>
                      <span className={`badge ${isBlocked ? 'badge-block' : isShadow ? 'badge-shadow' : 'badge-allow'}`}>
                        {evt.decision === 'SHADOW_WOULD_BLOCK' ? 'SHADOW' : evt.decision}
                      </span>
                    </td>
                    <td className="mono-cell" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {evt.execution_time_ms ? `${evt.execution_time_ms} ms` : '2.1 ms'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
