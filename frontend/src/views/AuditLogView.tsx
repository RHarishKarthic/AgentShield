import React, { useState } from 'react';
import { History, Download, Search, FileText } from 'lucide-react';
import { AuditEvent } from '../types';

interface AuditLogViewProps {
  events: AuditEvent[];
  onSelectEvent: (event: AuditEvent) => void;
  selectedEventId: string | null;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  events,
  onSelectEvent,
  selectedEventId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const exportAllLogs = (format: 'json' | 'csv') => {
    let dataStr = '';
    let filename = `audit-log-export-${Date.now()}`;

    if (format === 'json') {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
      filename += '.json';
    } else {
      const headers = ['Event ID', 'Timestamp', 'Agent', 'Tool', 'Operation', 'Decision', 'Latency (ms)', 'Reason'];
      const rows = events.map((e) => [
        e.event_id,
        new Date(e.created_at).toISOString(),
        e.agent_id,
        e.tool,
        e.operation || '',
        e.decision,
        e.execution_time_ms || '',
        `"${(e.reason || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      filename += '.csv';
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = events.filter((e) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.agent_id.toLowerCase().includes(q) ||
      e.tool.toLowerCase().includes(q) ||
      e.event_id.toLowerCase().includes(q) ||
      (e.reason && e.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel-container" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--blue-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Forensic Audit Log Trail</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Immutable PostgreSQL audit records with PII & credentials permanently sanitized
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => exportAllLogs('csv')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Download size={13} /> <span>Export CSV</span>
          </button>
          <button className="btn-secondary" onClick={() => exportAllLogs('json')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={13} /> <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="panel-container">
        <div className="panel-filter-bar">
          <div className="search-input-wrap" style={{ maxWidth: '360px' }}>
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {filtered.length} permanent audit events
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Tool</th>
                <th>Operation</th>
                <th>Sanitized Parameters</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.event_id} className={selectedEventId === e.event_id ? 'selected' : ''} onClick={() => onSelectEvent(e)}>
                  <td className="mono-cell" style={{ color: 'var(--text-muted)' }}>{e.event_id}</td>
                  <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>{new Date(e.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{e.agent_id}</td>
                  <td className="mono-cell">{e.tool}</td>
                  <td className="mono-cell" style={{ color: 'var(--blue-primary)' }}>{e.operation || 'default'}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {JSON.stringify(e.parameters_sanitised)}
                  </td>
                  <td>
                    <span className={`badge ${e.decision === 'BLOCK' ? 'badge-block' : e.decision === 'SHADOW_WOULD_BLOCK' ? 'badge-shadow' : 'badge-allow'}`}>
                      {e.decision}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
