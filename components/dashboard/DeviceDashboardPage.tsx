'use client';

/**
 * Device Fleet Dashboard
 * How to run:
 * - `npm install`
 * - `npm run dev`
 *
 * Thresholds:
 * - UTILIZATION_WARNING_THRESHOLD
 * - BROKEN_ALERT_THRESHOLD
 *
 * Plug in real data:
 * - Replace mock data in `components/dashboard/mockData.ts`
 * - Swap the polling simulation with API/WebSocket in `useEffect`
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  HandoverDaily,
  RecentHandover,
  Totals,
  DeviceTypeCount
} from '@/components/dashboard/mockData';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StatusDonut } from '@/components/dashboard/StatusDonut';
import { DeviceTypeBars } from '@/components/dashboard/DeviceTypeBars';
import { HandoversLine } from '@/components/dashboard/HandoversLine';
import { UtilizationKpi } from '@/components/dashboard/UtilizationKpi';
import { LiveActivityPulse } from '@/components/dashboard/LiveActivityPulse';

const UTILIZATION_WARNING_THRESHOLD = 0.75;
const BROKEN_ALERT_THRESHOLD = 0.05;

type Props = {
  totals: Totals;
  deviceTypes: DeviceTypeCount[];
  handoversDaily: HandoverDaily[];
  recentHandovers: RecentHandover[];
  enableDevSimulation?: boolean;
};

export function DeviceDashboardPage({
  totals,
  deviceTypes,
  handoversDaily,
  recentHandovers,
  enableDevSimulation = false
}: Props) {
  const [daily, setDaily] = useState<HandoverDaily[]>(handoversDaily);
  const [recent, setRecent] = useState<RecentHandover[]>(recentHandovers);
  const [pulseToken, setPulseToken] = useState(0);

  const triggerPulse = useCallback(() => setPulseToken((value) => value + 1), []);

  const utilization = totals.totalDevices ? totals.issued / totals.totalDevices : 0;
  const brokenRatio = totals.totalDevices ? totals.brokenLost / totals.totalDevices : 0;

  const lastEventLabel = useMemo(() => {
    const latest = recent[0];
    if (!latest) return 'Idle';
    return `${latest.action} • ${latest.deviceId}`;
  }, [recent]);

  useEffect(() => {
    if (!enableDevSimulation || process.env.NODE_ENV === 'production') return;
    const interval = setInterval(() => {
      if (Math.random() < 0.55) return;
      const now = new Date();
      const newEvent: RecentHandover = {
        deviceId: `PDA-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now.toISOString(),
        action: Math.random() > 0.5 ? 'ISSUE' : 'RETURN'
      };
      setRecent((prev) => [newEvent, ...prev].slice(0, 6));
      setDaily((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          issuedCount: last.issuedCount + (newEvent.action === 'ISSUE' ? 1 : 0)
        };
        return updated;
      });
      triggerPulse();
    }, 10000);
    return () => clearInterval(interval);
  }, [enableDevSimulation, triggerPulse]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Device Fleet</p>
            <h1 className="text-3xl font-semibold text-slate-900">Device Fleet Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Operational health at a glance</p>
          </div>
          <LiveActivityPulse pulseToken={pulseToken} lastEventLabel={lastEventLabel} />
        </header>

        <StatsCards totals={totals} />

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <StatusDonut totals={totals} />
          <div className="grid gap-4">
            <UtilizationKpi
              label="Utilization"
              value={utilization}
              threshold={UTILIZATION_WARNING_THRESHOLD}
              caption="Warning threshold: 75%"
              color="#2563eb"
            />
            <UtilizationKpi
              label="Broken ratio"
              value={brokenRatio}
              threshold={BROKEN_ALERT_THRESHOLD}
              caption="Alert threshold: 5%"
              color="#ef4444"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DeviceTypeBars data={deviceTypes} />
          <HandoversLine data={daily} showMovingAverage />
        </div>
      </div>
    </div>
  );
}
