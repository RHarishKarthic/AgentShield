import React, { useState } from 'react';
import { FileCheck2, Shield, Plus, X, Cpu, Flame, Check, Loader2, AlertCircle } from 'lucide-react';
import { Policy } from '../types';
import { createPolicy } from '../services/api';

interface AgentPoliciesViewProps {
  policies: Policy[];
  onToggleMode: (policyId: string) => void;
  onRefresh: () => void;
}

export const AgentPoliciesView: React.FC<AgentPoliciesViewProps> = ({
  policies,
  onToggleMode,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [policyId, setPolicyId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'enforcement' | 'shadow'>('enforcement');
  const [rateRequests, setRateRequests] = useState(5);
  const [rateWindow, setRateWindow] = useState(60);
  const [customerIds, setCustomerIds] = useState('101, 102, 103');
  const [filePaths, setFilePaths] = useState('/data/public/, /data/reports/');

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyId.trim() || !name.trim()) {
      setError('Policy ID and Name are required.');
      return;
    }

    setLoading(true);
    setError(null);

    const parsedCustomerIds = customerIds
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const parsedFilePaths = filePaths
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newPolicyPayload = {
      policy_id: policyId.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      description: description.trim() || 'Custom agent security policy ruleset.',
      mode,
      policy_config: {
        rate_limit: {
          requests: rateRequests,
          window_seconds: rateWindow,
        },
        parameter_validation: {
          max_parameter_size: 2048,
          max_total_size: 65536,
          blocked_patterns: ['DROP TABLE', '--', '<script>', 'UNION SELECT', '/etc/shadow', '../', ';--', 'eval(', 'exec('],
        },
        data_scope: {
          customer_ids: parsedCustomerIds.length > 0 ? parsedCustomerIds : [101, 102, 103],
          allowed_file_paths: parsedFilePaths.length > 0 ? parsedFilePaths : ['/data/public/'],
          allowed_email_domains: ['@example.com', '@enterprise.corp'],
          departments: ['Engineering', 'Marketing', 'Finance'],
        },
        sequence_rules: [
          { action: 'get_customer_data', requires: ['authenticate_customer'] },
          { action: 'update_customer', requires: ['authenticate_customer', 'get_customer_data'] },
        ],
      },
    };

    try {
      await createPolicy(newPolicyPayload);
      setIsModalOpen(false);
      // Reset form
      setPolicyId('');
      setName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create policy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="panel-container" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={18} color="var(--blue-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Agent Security Policies</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Declarative security guardrails, rate limits, parameter blocklists, and data scopes
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> <span>Create New Policy</span>
        </button>
      </div>

      {/* Policies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {policies.map((p) => {
          const isEnforcement = p.mode === 'enforcement';
          const cfg = p.policy_config || {};
          const rate = cfg.rate_limit || { requests: 5, window_seconds: 60 };
          const scope = cfg.data_scope || { customer_ids: [101, 102, 103] };

          return (
            <div key={p.policy_id} className="panel-container" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} color="var(--blue-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name || p.policy_id}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    background: isEnforcement ? 'var(--green-bg)' : 'var(--amber-bg)',
                    color: isEnforcement ? 'var(--green-primary)' : 'var(--amber-primary)',
                    border: `1px solid ${isEnforcement ? 'var(--green-border)' : 'var(--amber-border)'}`,
                  }}>
                    MODE: {p.mode.toUpperCase()}
                  </span>

                  <button
                    className="btn-secondary"
                    onClick={() => onToggleMode(p.policy_id)}
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {isEnforcement ? <Cpu size={12} /> : <Flame size={12} />}
                    <span>Switch to {isEnforcement ? 'Shadow' : 'Enforcement'}</span>
                  </button>
                </div>
              </div>

              {/* Active Rules Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', background: 'var(--bg-surface-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate Limiting</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {rate.requests || 5} requests / {rate.window_seconds || 60}s window
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Injection Filter</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    SQL & Path Traversal Blocklist
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Scope</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    Customer IDs [{scope.customer_ids ? scope.customer_ids.join(', ') : '101, 102, 103'}]
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sequence Rules</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    Strict Auth-First Enforcement
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Policy Modal */}
      {isModalOpen && (
        <div className="drawer-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-default)',
              overflow: 'hidden',
              margin: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="var(--blue-primary)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Create New Agent Policy</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && (
                <div style={{ padding: '8px 12px', background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red-primary)', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Policy Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. finance-agent-policy"
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Policy Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance Agent Ruleset"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Enforces transaction limits and customer scope boundaries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Operating Mode</label>
                  <select
                    className="select-control"
                    style={{ width: '100%' }}
                    value={mode}
                    onChange={(e: any) => setMode(e.target.value)}
                  >
                    <option value="enforcement">Enforcement (Active Block)</option>
                    <option value="shadow">Shadow (Dry-Run)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Rate Limit (Calls)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rateRequests}
                    onChange={(e) => setRateRequests(parseInt(e.target.value, 10) || 5)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Window (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={rateWindow}
                    onChange={(e) => setRateWindow(parseInt(e.target.value, 10) || 60)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Allowed Customer IDs (Comma-separated)</label>
                <input
                  type="text"
                  value={customerIds}
                  onChange={(e) => setCustomerIds(e.target.value)}
                  placeholder="101, 102, 103"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                  <span>{loading ? 'Creating Policy...' : 'Save & Register Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
