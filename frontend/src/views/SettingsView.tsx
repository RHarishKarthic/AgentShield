import React, { useState } from 'react';
import { Settings, Server, Key, Shield, Check, Save } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8000/api/v1/waf/intercept');
  const [timeout, setTimeoutVal] = useState('10');
  const [failClosed, setFailClosed] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel-container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="var(--blue-primary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>AgentShield Gateway Configuration</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Core security proxy, timeout, and authentication settings
        </p>
      </div>

      <form onSubmit={handleSave} className="panel-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            WAF Gateway Interception Endpoint
          </label>
          <input
            type="text"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Downstream Timeout (Seconds)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeoutVal(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Fail-Closed Security Posture
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <input
                type="checkbox"
                id="failclosed"
                checked={failClosed}
                onChange={(e) => setFailClosed(e.target.checked)}
              />
              <label htmlFor="failclosed" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                Halt traffic on internal Redis / DB disconnect
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-default)', paddingTop: '14px' }}>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {saved ? <Check size={14} /> : <Save size={14} />}
            <span>{saved ? 'Settings Saved!' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
