import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { RuleBreakdownChart } from './components/RuleBreakdownChart';
import { LiveEventFeed } from './components/LiveEventFeed';
import { Simulator } from './components/Simulator';
import { CustomDispatcher } from './components/CustomDispatcher';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchMetrics, fetchAuditLogs, fetchPolicies, updatePolicyMode } from './services/api';
import { AuditEvent, MetricsData, Policy } from './types';

export const App: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('ALL');

  // Load initial telemetry & policies
  const refreshData = useCallback(async () => {
    try {
      const [m, auditData, pols] = await Promise.all([
        fetchMetrics(),
        fetchAuditLogs(40),
        fetchPolicies(),
      ]);
      setMetrics(m);
      setEvents(auditData.items);
      setPolicies(pols);

      const supportPolicy = pols.find((p) => p.policy_id === 'support-agent-policy') || pols[0] || null;
      setActivePolicy(supportPolicy);
    } catch (e) {
      console.error('Failed to load initial dashboard telemetry:', e);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Live WebSocket Event Handler — prepends event immediately & updates counter state
  const handleIncomingAuditEvent = useCallback((newEvent: AuditEvent) => {
    setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
    setMetrics((prev) => {
      if (!prev) return null;
      const isAllow = newEvent.decision === 'ALLOW';
      const isBlock = newEvent.decision === 'BLOCK';
      const isShadow = newEvent.decision === 'SHADOW_WOULD_BLOCK';

      const newTotal = prev.total_requests + 1;
      const newAllowed = prev.allowed_count + (isAllow ? 1 : 0);
      const newBlocked = prev.blocked_count + (isBlock ? 1 : 0);
      const newShadow = prev.shadow_count + (isShadow ? 1 : 0);

      const updatedBreakdown = { ...prev.blocks_by_rule };
      if (newEvent.blocked_by_rule && newEvent.blocked_by_rule in updatedBreakdown) {
        (updatedBreakdown as any)[newEvent.blocked_by_rule] += 1;
      }

      return {
        ...prev,
        total_requests: newTotal,
        allowed_count: newAllowed,
        blocked_count: newBlocked,
        shadow_count: newShadow,
        allow_percentage: Math.round((newAllowed / newTotal) * 1000) / 10,
        block_percentage: Math.round((newBlocked / newTotal) * 1000) / 10,
        blocks_by_rule: updatedBreakdown,
      };
    });
  }, []);

  const { status: wsStatus } = useWebSocket(handleIncomingAuditEvent);

  const handleSwitchPolicyMode = async (policyId: string, mode: 'enforcement' | 'shadow') => {
    try {
      const updated = await updatePolicyMode(policyId, mode);
      setActivePolicy(updated);
      setPolicies((prev) => prev.map((p) => (p.policy_id === policyId ? updated : p)));
    } catch (e) {
      console.error('Failed to toggle policy mode:', e);
    }
  };

  return (
    <div className="app-container">
      <Header
        wsStatus={wsStatus}
        policies={policies}
        activePolicy={activePolicy}
        onSwitchPolicyMode={handleSwitchPolicyMode}
        onRefresh={refreshData}
      />

      <MetricsOverview metrics={metrics} />

      <div className="dashboard-columns">
        <LiveEventFeed
          events={events}
          filterDecision={filterDecision}
          onFilterChange={setFilterDecision}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Simulator onTriggered={refreshData} />
          <RuleBreakdownChart
            breakdown={metrics?.blocks_by_rule}
            totalBlocked={metrics?.blocked_count || 0}
          />
        </div>
      </div>

      <CustomDispatcher onExecuted={refreshData} />
    </div>
  );
};
