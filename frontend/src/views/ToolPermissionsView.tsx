import React from 'react';
import { Wrench, Database, Mail, Folder, CheckCircle, ExternalLink } from 'lucide-react';

export const ToolPermissionsView: React.FC = () => {
  const tools = [
    {
      id: 'customer_database',
      name: 'Customer Database Service',
      port: 8001,
      icon: Database,
      endpoint: 'http://localhost:8001',
      methods: ['POST', 'GET'],
      operations: ['authenticate', 'get_customer', 'update_customer'],
      status: 'Active',
      rateLimit: '5 calls/min',
      scope: 'Restricted to Tenant IDs [101, 102, 103]',
    },
    {
      id: 'email_service',
      name: 'Email Dispatch Service',
      port: 8002,
      icon: Mail,
      endpoint: 'http://localhost:8002',
      methods: ['POST'],
      operations: ['send', 'batch_send'],
      status: 'Active',
      rateLimit: '5 calls/min',
      scope: 'Restricted to domain @example.com',
    },
    {
      id: 'file_service',
      name: 'Secure File Storage Service',
      port: 8003,
      icon: Folder,
      endpoint: 'http://localhost:8003',
      methods: ['POST', 'GET'],
      operations: ['read', 'write', 'delete'],
      status: 'Active',
      rateLimit: '5 calls/min',
      scope: 'Restricted to /data/public/* (Root paths forbidden)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="panel-container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={18} color="var(--blue-primary)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Tool Permissions & Service Registry</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Microservices and tools reachable only through the AgentShield WAF gateway
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.id} className="panel-container" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color="var(--blue-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</h3>
                    <span className="mono-cell" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Port: {t.port}</span>
                  </div>
                </div>
                <span className="status-pill-active" style={{ fontSize: '10.5px', padding: '2px 8px' }}>ONLINE</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', background: 'var(--bg-surface-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Allowed Operations:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {t.operations.map((op) => (
                      <span key={op} className="mono-cell" style={{ fontSize: '11px', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--border-default)' }}>
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Security Scope:</span>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-primary)', marginTop: '2px' }}>{t.scope}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
