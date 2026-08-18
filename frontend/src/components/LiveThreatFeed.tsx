import React, { useState } from 'react';
import { Radio, Search, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { AuditEvent, Disposition } from '../types';

interface LiveThreatFeedProps {
  events: AuditEvent[];
  filterDecision: string;
  onFilterChange: (decision: string) => void;
}

export const LiveThreatFeed: React.FC<LiveThreatFeedProps> = ({
  events,
  filterDecision,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const copyPayload = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBadgeIcon = (decision: Disposition) => {
    switch (decision) {
      case 'ALLOW':
        return <CheckCircle2 size={12} />;
      case 'BLOCK':
        return <XCircle size={12} />;
      case 'SHADOW_WOULD_BLOCK':
        return <AlertCircle size={12} />;
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterDecision !== 'ALL' && e.decision !== filterDecision) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.agent_id.toLowerCase().includes(term) ||
      e.tool.toLowerCase().includes(term) ||
      (e.operation && e.operation.toLowerCase().includes(term)) ||
      (e.reason && e.reason.toLowerCase().includes(term)) ||
      e.event_id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="cyber-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card-header-bar" style={{ marginBottom: 0 }}>
        <h2 className="card-title">
          <Radio size={18} color="var(--cyan-accent)" />
          Live Threat & Interception Stream
        </h2>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['ALL', 'ALLOW', 'BLOCK', 'SHADOW_WOULD_BLOCK'].map((opt) => (
            <button
              key={opt}
              onClick={() => onFilterChange(opt)}
              style={{
                background: filterDecision === opt ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid',
                borderColor: filterDecision === opt ? 'var(--cyan-accent)' : 'var(--border-subtle)',
                color: filterDecision === opt ? 'var(--cyan-accent)' : 'var(--text-secondary)',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s ease',
              }}
            >
              {opt === 'SHADOW_WOULD_BLOCK' ? 'SHADOW' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Search Filter Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search by Agent, Tool, Operation, Event ID, or Reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.45rem 0.8rem 0.45rem 2rem',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
      </div>

      {/* Stream List */}
      {filteredEvents.length === 0 ? (
        <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No intercepted tool calls matching query. Trigger actions from the attack simulator or terminal console below!
        </div>
      ) : (
        <div className="feed-container">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedId === evt.event_id;
            const timeStr = new Date(evt.created_at).toLocaleTimeString();
            const paramJson = JSON.stringify(evt.parameters_sanitised, null, 2);

            return (
              <div
                key={evt.event_id}
                className={`feed-row ${evt.decision}`}
                onClick={() => toggleExpand(evt.event_id)}
              >
                <div className="feed-row-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`tag-badge ${evt.decision}`}>
                      {getBadgeIcon(evt.decision)}
                      {evt.decision === 'SHADOW_WOULD_BLOCK' ? 'SHADOW' : evt.decision}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {evt.event_id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {evt.execution_time_ms !== undefined && (
                      <span style={{ color: 'var(--cyan-accent)' }}>{evt.execution_time_ms} ms</span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={11} />
                      {timeStr}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                <div className="feed-row-middle">
                  <div className="agent-tool-tag">
                    <span className="agent-name">{evt.agent_id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                    <span className="tool-name">
                      {evt.tool}{evt.operation ? ` / ${evt.operation}` : ''}
                    </span>
                  </div>

                  <span className="feed-reason-text" title={evt.reason}>
                    {evt.reason}
                  </span>
                </div>

                {isExpanded && (
                  <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
                      <span><strong>Request ID:</strong> {evt.request_id}</span>
                      <span><strong>Session ID:</strong> {evt.session_id || 'None'}</span>
                    </div>

                    {evt.blocked_by_rule && (
                      <div style={{ color: 'var(--block-red)' }}>
                        <strong>Triggered Rule Engine:</strong> {evt.blocked_by_rule}
                      </div>
                    )}

                    <div>
                      <strong>Rule Pipeline Outcomes:</strong>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        {Object.entries(evt.rules_evaluated || {}).map(([rName, status]) => (
                          <span
                            key={rName}
                            style={{
                              background: status === 'ALLOW' ? 'var(--allow-bg)' : 'var(--block-bg)',
                              border: `1px solid ${status === 'ALLOW' ? 'var(--allow-border)' : 'var(--block-border)'}`,
                              color: status === 'ALLOW' ? 'var(--allow-green)' : 'var(--block-red)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                            }}
                          >
                            {rName}: {status}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <strong>Sanitized Payload (PII Redacted):</strong>
                        <button
                          onClick={() => copyPayload(evt.event_id, paramJson)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: copiedId === evt.event_id ? 'var(--allow-green)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {copiedId === evt.event_id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === evt.event_id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={{ margin: 0, padding: '0.5rem', background: '#070b14', borderRadius: '4px', color: '#a5b4fc', fontSize: '0.7rem', overflowX: 'auto' }}>
                        {paramJson}
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
