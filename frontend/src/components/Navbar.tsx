import React from 'react';
import { Shield, Radio, RefreshCw, Cpu, Flame } from 'lucide-react';
import { WSStatus } from '../hooks/useWebSocket';
import { Policy } from '../types';

interface NavbarProps {
  wsStatus: WSStatus;
  activePolicy: Policy | null;
  onToggleMode: () => void;
  onRefresh: () => void;
  latencyMs: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  wsStatus,
  activePolicy,
  onToggleMode,
  onRefresh,
  latencyMs,
}) => {
  const isEnforcement = activePolicy?.mode === 'enforcement';

  return (
    <nav className="soc-navbar">
      <div className="soc-brand">
        <div className="soc-logo-box">
          <Shield size={22} />
        </div>
        <div className="soc-title-wrap">
          <h1>AgentShield WAF</h1>
          <p>AI Agent Security Operations Center &middot; v1.0.0</p>
        </div>
      </div>

      <div className="soc-nav-right">
        {activePolicy && (
          <button
            className={`mode-switch-btn ${isEnforcement ? 'enforcement' : 'shadow'}`}
            onClick={onToggleMode}
            title="Click to toggle between Enforcement and Shadow Calibration mode"
          >
            {isEnforcement ? <Flame size={14} /> : <Cpu size={14} />}
            <span>MODE: {activePolicy.mode.toUpperCase()}</span>
          </button>
        )}

        <div className="soc-radar-pill">
          <div className={`soc-dot ${wsStatus}`} />
          <span>RADAR: {wsStatus.toUpperCase()}</span>
          {latencyMs > 0 && <span style={{ color: 'var(--cyan-accent)', marginLeft: '4px' }}>({latencyMs}ms)</span>}
        </div>

        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Refresh Metrics"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </nav>
  );
};
