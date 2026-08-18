import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  FileCheck2,
  Wrench,
  GitMerge,
  History,
  Eye,
  BarChart3,
  Settings,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  threatCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  threatCount,
  theme,
  onToggleTheme,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'traffic', label: 'Live Traffic', icon: Activity },
    { id: 'threats', label: 'Threat Detection', icon: ShieldAlert, badge: threatCount > 0 ? threatCount : undefined },
    { id: 'policies', label: 'Agent Policies', icon: FileCheck2 },
    { id: 'tools', label: 'Tool Permissions', icon: Wrench },
    { id: 'sequence', label: 'Sequence Rules', icon: GitMerge },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'shadow', label: 'Shadow Mode', icon: Eye },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar-rail">
      <div className="sidebar-top">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Shield size={16} />
          </div>
          <div className="brand-text">
            <span className="brand-title">AgentShield</span>
            <span className="brand-badge">WAF Enterprise</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Operations</span>
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}

          <span className="nav-section-label" style={{ marginTop: '8px' }}>Security Controls</span>
          {navItems.slice(3, 8).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <span className="nav-section-label" style={{ marginTop: '8px' }}>System</span>
          {navItems.slice(8).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom: Theme Switcher & User Profile */}
      <div className="sidebar-bottom">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '6px',
            background: 'var(--sidebar-toggle-bg)',
            border: '1px solid var(--sidebar-toggle-border)',
            color: 'var(--sidebar-toggle-text)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '10px',
            transition: 'all 0.15s ease',
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sidebar-user-name)' }}>
            {theme === 'light' ? <Moon size={14} color="#356AE6" /> : <Sun size={14} color="#FBBF24" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--sidebar-label)', fontFamily: 'var(--font-mono)' }}>
            {theme}
          </span>
        </button>

        {/* User Card */}
        <div className="user-card">
          <div className="user-avatar">HK</div>
          <div className="user-info">
            <span className="user-name">Harish Karthic</span>
            <span className="user-role">SecOps Workspace &middot; Prod</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
