import React from 'react';
import { SummaryStrip } from '../components/SummaryStrip';
import { ThreatActivityTable } from '../components/ThreatActivityTable';
import { SecurityPosture } from '../components/SecurityPosture';
import { ThreatAnalytics } from '../components/ThreatAnalytics';
import { AgentRiskOverview } from '../components/AgentRiskOverview';
import { AuditEvent, MetricsData, Policy } from '../types';

interface OverviewViewProps {
  metrics: MetricsData | null;
  events: AuditEvent[];
  activePolicy: Policy | null;
  onToggleMode: (policyId?: string) => void;
  selectedEvent: AuditEvent | null;
  onSelectEvent: (event: AuditEvent) => void;
  activeSessionFilter: string | null;
  onClearSessionFilter: () => void;
  timeRange?: string;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  events,
  activePolicy,
  onToggleMode,
  selectedEvent,
  onSelectEvent,
  activeSessionFilter,
  onClearSessionFilter,
  timeRange,
}) => {
  return (
    <>
      <SummaryStrip metrics={metrics} timeRange={timeRange} />

      <div className="layout-2col">
        <ThreatActivityTable
          events={events}
          selectedEventId={selectedEvent?.event_id || null}
          onSelectEvent={onSelectEvent}
          activeSessionFilter={activeSessionFilter}
          onClearSessionFilter={onClearSessionFilter}
        />

        <SecurityPosture
          activePolicy={activePolicy}
          onToggleMode={onToggleMode}
          shadowCount={metrics?.shadow_count || 78}
        />
      </div>

      <ThreatAnalytics metrics={metrics} breakdown={metrics?.blocks_by_rule} />
      <AgentRiskOverview />
    </>
  );
};
