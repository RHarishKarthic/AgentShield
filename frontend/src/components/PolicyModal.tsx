import React from 'react';
import { X, FileCheck2, Shield, Layers, Lock, Cpu, Database, Wrench } from 'lucide-react';
import { Policy } from '../types';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies: Policy[];
  initialTab?: string;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  policies,
  initialTab = 'policies',
}) => {
  if (!isOpen) return null;

  const activePolicy = policies[0];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        style={{
          width: '720px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={16} color="var(--blue-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Agent Security Policy Rules & Controls
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Policy Overview */}
          <div style={{ padding: '12px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activePolicy?.policy_id || 'support-agent-policy'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {activePolicy?.description || 'Enterprise Tier-1 Support Agent Security Policy'}
              </div>
            </div>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              background: activePolicy?.mode === 'enforcement' ? 'var(--green-bg)' : 'var(--amber-bg)',
              color: activePolicy?.mode === 'enforcement' ? 'var(--green-primary)' : 'var(--amber-primary)',
              border: `1px solid ${activePolicy?.mode === 'enforcement' ? 'var(--green-border)' : 'var(--amber-border)'}`,
            }}>
              MODE: {activePolicy?.mode.toUpperCase() || 'ENFORCEMENT'}
            </span>
          </div>

          {/* Active Rules Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* 1. Rate Limiting */}
            <div style={{ padding: '12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '12px' }}>
                <Cpu size={14} color="var(--blue-primary)" />
                <span>1. Rate Limiting Rule</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Atomic Redis sliding window limiter
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)', background: 'var(--bg-surface-subtle)', padding: '6px 8px', borderRadius: '4px' }}>
                max_requests: 5 calls<br />
                window_seconds: 60 seconds
              </div>
            </div>

            {/* 2. Parameter Validation */}
            <div style={{ padding: '12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '12px' }}>
                <Shield size={14} color="var(--blue-primary)" />
                <span>2. Parameter Validation</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Recursive injection pattern scanning
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)', background: 'var(--bg-surface-subtle)', padding: '6px 8px', borderRadius: '4px' }}>
                forbidden: DROP TABLE, --, /etc/shadow<br />
                max_payload_bytes: 8192
              </div>
            </div>

            {/* 3. Data Scope */}
            <div style={{ padding: '12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '12px' }}>
                <Database size={14} color="var(--blue-primary)" />
                <span>3. Data Scope Boundary</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Enforces multi-tenant authorization boundaries
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)', background: 'var(--bg-surface-subtle)', padding: '6px 8px', borderRadius: '4px' }}>
                allowed_customer_ids: [101, 102, 103]<br />
                allowed_email_domains: [@example.com]
              </div>
            </div>

            {/* 4. Sequence Rules */}
            <div style={{ padding: '12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '12px' }}>
                <Lock size={14} color="var(--blue-primary)" />
                <span>4. Action Sequence Rules</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Enforces chronological prerequisite order
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)', background: 'var(--bg-surface-subtle)', padding: '6px 8px', borderRadius: '4px' }}>
                1. authenticate_customer (Required)<br />
                2. get_customer_data &rarr; 3. update_customer
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-surface-subtle)' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
