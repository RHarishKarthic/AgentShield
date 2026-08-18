import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { LiveTrafficView } from './views/LiveTrafficView';
import { ThreatDetectionView } from './views/ThreatDetectionView';
import { AgentPoliciesView } from './views/AgentPoliciesView';
import { ToolPermissionsView } from './views/ToolPermissionsView';
import { SequenceRulesView } from './views/SequenceRulesView';
import { AuditLogView } from './views/AuditLogView';
import { ShadowModeView } from './views/ShadowModeView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { InteractiveTesterModal } from './components/InteractiveTesterModal';
import { PolicyModal } from './components/PolicyModal';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchMetrics, fetchAuditLogs, fetchPolicies, updatePolicyMode } from './services/api';
import { AuditEvent, MetricsData, Policy } from './types';

export const App: React.FC = () => {
  const [activeNavTab, setActiveNavTab] = useState<string>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('agentshield-theme') as 'light' | 'dark') || 'light';
  });
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [activeSessionFilter, setActiveSessionFilter] = useState<string | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState<boolean>(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agentshield-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Load telemetry data from backend APIs
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [m, a, p] = await Promise.all([
        fetchMetrics(),
        fetchAuditLogs(60),
        fetchPolicies(),
      ]);
      setMetrics(m);
      setEvents(a.items);
      setPolicies(p);
    } catch (err) {
      console.error('Error loading AgentShield telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Live WebSocket Event Handler
  const handleLiveEvent = useCallback((event: AuditEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 59)]);
    loadData();
  }, [loadData]);

  const { status: wsStatus } = useWebSocket(handleLiveEvent);

  const activePolicy = policies.find((p) => p.policy_id === 'support-agent-policy') || policies[0] || null;

  const handleToggleMode = async () => {
    if (!activePolicy) return;
    const newMode = activePolicy.mode === 'enforcement' ? 'shadow' : 'enforcement';
    try {
      await updatePolicyMode(activePolicy.policy_id, newMode);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle policy mode:', err);
    }
  };

  const threatCount = metrics?.blocked_count || events.filter((e) => e.decision === 'BLOCK').length;

  return (
    <div className="app-shell">
      {/* 1. Persistent 240px Left Navigation Rail (Dark Theme) */}
      <Sidebar
        activeTab={activeNavTab}
        onSelectTab={(tab) => {
          setActiveNavTab(tab);
          setActiveSessionFilter(null);
        }}
        threatCount={threatCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Main Enterprise Workspace */}
      <div className="main-wrapper">
        {/* Top Header */}
        <Header
          onRefresh={loadData}
          onOpenTester={() => setIsTesterOpen(true)}
          wsStatus={wsStatus}
          isRefreshing={isRefreshing}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Dashboard Body - Dynamic View Routing based on Left Sidebar Tab */}
        <main className="dashboard-content">
          {activeNavTab === 'overview' && (
            <OverviewView
              metrics={metrics}
              events={events}
              activePolicy={activePolicy}
              onToggleMode={handleToggleMode}
              selectedEvent={selectedEvent}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              activeSessionFilter={activeSessionFilter}
              onClearSessionFilter={() => setActiveSessionFilter(null)}
            />
          )}

          {activeNavTab === 'traffic' && (
            <LiveTrafficView
              events={events}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              selectedEventId={selectedEvent?.event_id || null}
              onRefresh={loadData}
            />
          )}

          {activeNavTab === 'threats' && (
            <ThreatDetectionView
              events={events}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              selectedEventId={selectedEvent?.event_id || null}
            />
          )}

          {activeNavTab === 'policies' && (
            <AgentPoliciesView
              policies={policies}
              onToggleMode={handleToggleMode}
            />
          )}

          {activeNavTab === 'tools' && (
            <ToolPermissionsView />
          )}

          {activeNavTab === 'sequence' && (
            <SequenceRulesView />
          )}

          {activeNavTab === 'audit' && (
            <AuditLogView
              events={events}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              selectedEventId={selectedEvent?.event_id || null}
            />
          )}

          {activeNavTab === 'shadow' && (
            <ShadowModeView
              events={events}
              activePolicy={activePolicy}
              onToggleMode={handleToggleMode}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              selectedEventId={selectedEvent?.event_id || null}
            />
          )}

          {activeNavTab === 'analytics' && (
            <AnalyticsView metrics={metrics} />
          )}

          {activeNavTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Slide-Over Security Investigation Drawer */}
      <InvestigationDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onFilterSession={(sessId) => {
          setActiveSessionFilter(sessId);
          setActiveNavTab('overview');
        }}
        onViewPolicy={() => setIsPolicyModalOpen(true)}
      />

      {/* Interactive Simulation & Test Modal */}
      <InteractiveTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onTriggered={loadData}
      />

      {/* Policy Rules & Controls Inspector Modal */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        policies={policies}
      />
    </div>
  );
};

export default App;
