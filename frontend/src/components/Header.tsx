import React from 'react';
import { RefreshCw, PlayCircle, ShieldCheck, ChevronDown, Sun, Moon } from 'lucide-react';
import { WSStatus } from '../hooks/useWebSocket';

interface HeaderProps {
  onRefresh: () => void;
  onOpenTester: () => void;
  wsStatus: WSStatus;
  isRefreshing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onOpenTester,
  wsStatus,
  isRefreshing,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title">Security Overview</h1>
        <p className="page-subtitle">AI agent traffic, policy enforcement and threat activity</p>
      </div>

      <div className="header-right">
        {/* Environment Selector */}
        <select className="select-control" defaultValue="Production">
          <option value="Production">Env: Production (us-east-1)</option>
          <option value="Staging">Env: Staging (us-east-2)</option>
          <option value="Development">Env: Dev Cluster (local)</option>
        </select>

        {/* Time Range */}
        <select className="select-control" defaultValue="24h">
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All Time</option>
        </select>

        {/* Status Indicator */}
        <div className="status-pill-active">
          <div className="status-dot-active" />
          <span>Protection active</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} color="#FBBF24" />}
        </button>

        {/* Refresh Control */}
        <button
          className="btn-icon"
          onClick={onRefresh}
          title="Refresh Data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
        </button>

        {/* Quick Simulation / Test Trigger */}
        <button
          className="btn-primary"
          onClick={onOpenTester}
          title="Open Threat Simulator & Test Gateway"
        >
          <PlayCircle size={14} />
          <span>Simulate / Test</span>
        </button>
      </div>
    </header>
  );
};
