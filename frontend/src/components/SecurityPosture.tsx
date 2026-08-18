import React from 'react';
import { ShieldCheck, Check, AlertTriangle, Flame, Cpu } from 'lucide-react';
import { Policy } from '../types';

interface SecurityPostureProps {
  activePolicy: Policy | null;
  onToggleMode: () => void;
  shadowCount: number;
}

export const SecurityPosture: React.FC<SecurityPostureProps> = ({
  activePolicy,
  onToggleMode,
  shadowCount,
}) => {
  const isEnforcement = activePolicy?.mode === 'enforcement';

  return (
    <div className="panel-container">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Security Posture</span>
      </div>

      <div className="posture-panel">
        {/* Score Gauge */}
        <div className="score-gauge-container">
          <div className="score-circle">
            <span className="score-text-inner">82</span>
          </div>
          <div className="score-label-wrap">
            <span className="score-title">82 / 100</span>
            <span className="score-desc">Overall Security Score</span>
          </div>
        </div>

        {/* Compact Indicators */}
        <div className="posture-meters">
          <div className="posture-row">
            <span className="posture-row-label">Policy Coverage</span>
            <span className="posture-row-val">96%</span>
          </div>
          <div className="posture-row">
            <span className="posture-row-label">Tool Restrictions</span>
            <span className="posture-row-val">91%</span>
          </div>
          <div className="posture-row">
            <span className="posture-row-label">Sequence Protection</span>
            <span className="posture-row-val">87%</span>
          </div>
          <div className="posture-row">
            <span className="posture-row-label">Data Boundaries</span>
            <span className="posture-row-val">94%</span>
          </div>
          <div className="posture-row">
            <span className="posture-row-label">Shadow Violations</span>
            <span className="posture-row-val" style={{ color: 'var(--amber-primary)' }}>
              {shadowCount || 78}
            </span>
          </div>
        </div>

        {/* Active Controls */}
        <div className="active-controls-box">
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Active Controls
          </span>

          <div className="control-item">
            <Check size={14} className="check-icon" />
            <span>Authentication enforcement</span>
          </div>
          <div className="control-item">
            <Check size={14} className="check-icon" />
            <span>Tool allowlisting</span>
          </div>
          <div className="control-item">
            <Check size={14} className="check-icon" />
            <span>Sequence validation</span>
          </div>
          <div className="control-item">
            <Check size={14} className="check-icon" />
            <span>Data boundary protection</span>
          </div>
          <div className="control-item">
            <Check size={14} className="check-icon" />
            <span>Rate limiting</span>
          </div>
          <div className="control-item">
            <AlertTriangle size={14} className="warn-icon" />
            <span>Shadow policy review</span>
          </div>
        </div>

        {/* Policy Mode Switcher */}
        {activePolicy && (
          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Operating Mode:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isEnforcement ? 'var(--green-primary)' : 'var(--amber-primary)' }}>
                {activePolicy.mode.toUpperCase()}
              </span>
            </div>
            <button
              className="btn-secondary"
              onClick={onToggleMode}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              {isEnforcement ? <Cpu size={13} /> : <Flame size={13} />}
              <span>Switch to {isEnforcement ? 'Shadow Mode' : 'Enforcement Mode'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
