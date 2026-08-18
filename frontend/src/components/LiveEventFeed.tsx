import React, { useState } from 'react';
import { Radio, ChevronDown, ChevronUp, Clock, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AuditEvent, Disposition } from '../types';

interface LiveEventFeedProps {
  events: AuditEvent[];
  filterDecision: string;
  onFilterChange: (decision: string) => void;
}

export const LiveEventFeed: React.FC<LiveEventFeedProps> = ({ events, filterDecision, onFilterChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getBadgeIcon = (decision: Disposition) => {
    switch (decision) {
      case 'ALLOW':
        return <CheckCircle size={12} />;
      case 'BLOCK':
        return <XCircle size={12} />;
      case 'SHADOW_WOULD_BLOCK':
        return <AlertTriangle size={12} />;
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!filterDecision || filterDecision === 'ALL') return true;
    return e.decision === filterDecision;
  });

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <h2 className="section-title">
          <Radio size={18} color="var(--cyan-glow)" />
          Live WAF Interception Feed
        </h2>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['ALL', 'ALLOW', 'BLOCK', 'SHADOW_WOULD_BLOCK'].map((opt) => (
            <button
              key={opt}
              onClick={() => onFilterChange(opt)}
              style={{
                background: filterDecision === opt ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: '1px solid',
                borderColor: filterDecision === opt ? 'var(--cyan-glow)' : 'var(--border-color)',
                color: filterDecision === opt ? 'var(--cyan-glow)' : 'var(--text-secondary)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {opt === 'SHADOW_WOULD_BLOCK' ? 'SHADOW' : opt}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No intercepted tool events matching filter. Trigger actions using the simulator!
        </div>
      ) : (
        <div className="event-feed-list">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedId === evt.event_id;
            const timeStr = new Date(evt.created_at).toLocaleTimeString();

            return (
              <div
                key={evt.event_id}
                className={`event-item ${evt.decision}`}
                onClick={() => toggleExpand(evt.event_id)}
              >
                <div className="event-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className={`disposition-badge ${evt.decision}`}>
                      {getBadgeIcon(evt.decision)}
                      {evt.decision}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {evt.event_id}
                    </span>
                  </div>

                  <div className="event-meta">
                    {evt.execution_time_ms !== undefined && (
                      <span>{evt.execution_time_ms} ms</span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      {timeStr}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                <div className="event-body">
                  <div className="event-agent-tool">
                    <span className="tag-agent">{evt.agent_id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                    <span className="tag-tool">
                      {evt.tool}{evt.operation ? ` / ${evt.operation}` : ''}
                    </span>
                  </div>

                  <span className="event-reason">{evt.reason}</span>
                </div>

                {isExpanded && (
                  <div className="event-detail-drawer" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>Request ID:</strong> {evt.request_id}</span>
                      <span><strong>Session ID:</strong> {evt.session_id || 'None'}</span>
                    </div>

                    {evt.blocked_by_rule && (
                      <div style={{ color: 'var(--accent-block)' }}>
                        <strong>Blocked By Rule:</strong> {evt.blocked_by_rule}
                      </div>
                    )}

                    <div>
                      <strong>Rule Outcomes:</strong>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {Object.entries(evt.rules_evaluated || {}).map(([rName, status]) => (
                          <span
                            key={rName}
                            style={{
                              background: status === 'ALLOW' ? 'var(--accent-allow-bg)' : 'var(--accent-block-bg)',
                              border: `1px solid ${status === 'ALLOW' ? 'var(--accent-allow-border)' : 'var(--accent-block-border)'}`,
                              color: status === 'ALLOW' ? 'var(--accent-allow)' : 'var(--accent-block)',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {rName}: {status}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong>Sanitized Parameters Payload:</strong>
                      <pre className="param-json">
                        {JSON.stringify(evt.parameters_sanitised, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
