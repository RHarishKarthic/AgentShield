import React from 'react';
import { GitMerge, ArrowRight, Lock, CheckCircle2, AlertOctagon } from 'lucide-react';

export const SequenceRulesView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel-container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitMerge size={18} color="var(--blue-primary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Action Sequence State Rules</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Chronological prerequisite chains enforced across multi-step autonomous AI agent sessions
        </p>
      </div>

      {/* Visual Sequence Chain */}
      <div className="panel-container" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Mandatory Workflow Chain: Customer Modification
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Step 1 */}
          <div style={{ flex: 1, minWidth: '180px', padding: '14px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--blue-primary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
              <Lock size={13} /> Step 1: Initial Prerequisite
            </div>
            <div className="mono-cell" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              authenticate_customer
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Verifies session token and customer PIN credentials
            </p>
          </div>

          <ArrowRight size={18} color="var(--text-muted)" />

          {/* Step 2 */}
          <div style={{ flex: 1, minWidth: '180px', padding: '14px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--blue-primary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
              <Lock size={13} /> Step 2: Read Data
            </div>
            <div className="mono-cell" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              get_customer_data
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Requires Step 1 completed in active session
            </p>
          </div>

          <ArrowRight size={18} color="var(--text-muted)" />

          {/* Step 3 */}
          <div style={{ flex: 1, minWidth: '180px', padding: '14px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-primary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
              <CheckCircle2 size={13} /> Step 3: Mutate State
            </div>
            <div className="mono-cell" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              update_customer
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Requires Step 1 + Step 2 completed in active session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
