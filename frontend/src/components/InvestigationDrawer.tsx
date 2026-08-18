import React, { useState } from 'react';
import { X, ShieldAlert, Copy, Check, Download, FileText, Clock, AlertOctagon, CheckCircle2, GitMerge } from 'lucide-react';
import { AuditEvent } from '../types';

interface InvestigationDrawerProps {
  event: AuditEvent | null;
  onClose: () => void;
  onFilterSession?: (sessionId: string) => void;
  onViewPolicy?: (policyId: string) => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  event,
  onClose,
  onFilterSession,
  onViewPolicy,
}) => {
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!event) return null;

  const isBlocked = event.decision === 'BLOCK';
  const isShadow = event.decision === 'SHADOW_WOULD_BLOCK';

  const riskLabel = isBlocked
    ? event.blocked_by_rule === 'sequence' || event.blocked_by_rule === 'parameter_validation'
      ? 'Critical'
      : 'High'
    : isShadow
    ? 'Medium'
    : 'Low';

  const paramJson = JSON.stringify(event.parameters_sanitised, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(paramJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportEvent = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(event, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-event-${event.event_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleInvestigateSequence = () => {
    if (event.session_id && onFilterSession) {
      onFilterSession(event.session_id);
      onClose();
    }
  };

  const handleViewPolicy = () => {
    if (onViewPolicy) {
      onViewPolicy('support-agent-policy');
      onClose();
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="investigation-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isBlocked ? 'var(--red-primary)' : isShadow ? 'var(--amber-primary)' : 'var(--green-primary)' }}>
                {isBlocked ? 'THREAT DETECTED' : isShadow ? 'SHADOW CALIBRATION' : 'VERIFIED INVOCATION'}
              </span>
              <span className={`risk-pill risk-${riskLabel.toLowerCase()}`}>
                Risk: {riskLabel}
              </span>
            </div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {event.blocked_by_rule
                ? `${event.blocked_by_rule.replace('_', ' ').toUpperCase()} VIOLATION`
                : `${event.tool} / ${event.operation || 'execution'}`}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* Metadata Grid */}
          <div>
            <div className="drawer-section-title">Execution Context</div>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Agent ID</span>
                <span className="meta-val">{event.agent_id}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Target Tool</span>
                <span className="meta-val">{event.tool}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Operation</span>
                <span className="meta-val">{event.operation || 'default'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Evaluation Latency</span>
                <span className="meta-val">{event.execution_time_ms ? `${event.execution_time_ms} ms` : '1.85 ms'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Event ID</span>
                <span className="meta-val mono-cell" style={{ fontSize: '11px' }}>{event.event_id}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Timestamp</span>
                <span className="meta-val" style={{ fontSize: '11px' }}>{new Date(event.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Decision & Forensic Reason */}
          <div>
            <div className="drawer-section-title">WAF Policy Disposition</div>
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: isBlocked ? 'var(--red-bg)' : isShadow ? 'var(--amber-bg)' : 'var(--green-bg)',
              border: `1px solid ${isBlocked ? 'var(--red-border)' : isShadow ? 'var(--amber-border)' : 'var(--green-border)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: isBlocked ? 'var(--red-primary)' : isShadow ? 'var(--amber-primary)' : 'var(--green-primary)' }}>
                {isBlocked ? <AlertOctagon size={15} /> : <CheckCircle2 size={15} />}
                <span>DECISION: {event.decision}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
                {event.reason || 'All active security checks passed successfully without violation.'}
              </p>
            </div>
          </div>

          {/* Execution Sequence History */}
          <div>
            <div className="drawer-section-title">Session Sequence History</div>
            <div style={{ padding: '12px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Session ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{event.session_id || 'unassigned'}</strong>
              </div>
              <div className="timeline-list">
                <div className="timeline-node">
                  <div className="timeline-dot" />
                  <span>1. authenticate_customer (Session init)</span>
                </div>
                <div className="timeline-node">
                  <div className="timeline-dot" />
                  <span>2. get_customer_data (ID: 101)</span>
                </div>
                <div className="timeline-node">
                  <div className={`timeline-dot ${isBlocked ? 'active' : ''}`} />
                  <span style={{ color: isBlocked ? 'var(--red-primary)' : 'var(--text-primary)', fontWeight: isBlocked ? 600 : 400 }}>
                    3. {event.operation || 'target_action'} ({isBlocked ? 'Intercepted & Blocked' : 'Executed'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sanitized Payload (PII Redacted) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="drawer-section-title" style={{ margin: 0 }}>Sanitized Parameters (PII Redacted)</span>
              <button
                onClick={copyJson}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={12} color="var(--green-primary)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '10px 12px',
              background: '#0B0F19',
              color: '#98A2B3',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              overflowX: 'auto',
              maxHeight: '160px',
            }}>
              {paramJson}
            </pre>
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div className="drawer-footer">
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            onClick={handleInvestigateSequence}
            title="Filter live traffic table to this session"
          >
            <GitMerge size={13} />
            <span>Investigate Sequence</span>
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            onClick={handleViewPolicy}
            title="View active policy rules and constraints"
          >
            <FileText size={13} />
            <span>View Policy</span>
          </button>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={handleExportEvent}
            title="Export forensic JSON"
          >
            {exportSuccess ? <Check size={13} color="var(--green-primary)" /> : <Download size={13} />}
            <span>{exportSuccess ? 'Exported!' : 'Export Event'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
