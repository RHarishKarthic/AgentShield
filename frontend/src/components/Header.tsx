import React from 'react';
import { Shield, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import { WSStatus } from '../hooks/useWebSocket';
import { Policy } from '../types';

interface HeaderProps {
  wsStatus: WSStatus;
  policies: Policy[];
  activePolicy: Policy | null;
  onSwitchPolicyMode: (policyId: string, mode: 'enforcement' | 'shadow') => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  policies,
  activePolicy,
  onSwitchPolicyMode,
  onRefresh,
}) => {
  return (
    <header className="header glass-panel">
      <div className="brand-section">
        <div className="brand-logo">
          <Shield size={24} />
        </div>
        <div className="brand-title">
          <h1>AgentShield WAF</h1>
          <p>Autonomous AI Security Gateway &middot; Real-Time Interception</p>
        </div>
      </div>

      <div className="header-status">
        {activePolicy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Policy Mode:</span>
            <button
              onClick={() =>
                onSwitchPolicyMode(
                  activePolicy.policy_id,
                  activePolicy.mode === 'enforcement' ? 'shadow' : 'enforcement'
                )
              }
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor:
                  activePolicy.mode === 'enforcement'
                    ? 'var(--accent-allow-border)'
                    : 'var(--accent-shadow-border)',
                background:
                  activePolicy.mode === 'enforcement'
                    ? 'var(--accent-allow-bg)'
                    : 'var(--accent-shadow-bg)',
                color:
                  activePolicy.mode === 'enforcement'
                    ? 'var(--accent-allow)'
                    : 'var(--accent-shadow)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
              title="Click to toggle between Enforcement and Shadow calibration mode"
            >
              {activePolicy.mode.toUpperCase()} MODE
            </button>
          </div>
        )}

        <div className="pulse-badge">
          <div className={`pulse-dot ${wsStatus}`} />
          <span>LIVE TELEMETRY {wsStatus.toUpperCase()}</span>
        </div>

        <button
          onClick={onRefresh}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            padding: '0.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Refresh statistics"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
};
