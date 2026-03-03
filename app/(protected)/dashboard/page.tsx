import { getSessionProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DeviceDashboardPage } from '@/components/dashboard/DeviceDashboardPage';
import type { DeviceTypeCount, HandoverDaily, RecentHandover, Totals } from '@/components/dashboard/mockData';

export default async function DashboardPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();

  const now = new Date();
  const days = 21;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  const formatLocalDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [{ data: devices }, { data: recentLogs }, { data: issuedLogs }] = await Promise.all([
    supabase
      .from('devices')
      .select('status, type, device_type:device_type_definitions(name)'),
    supabase
      .from('handover_logs')
      .select('device_id, action_type, timestamp, device:devices(asset_tag)')
      .order('timestamp', { ascending: false })
      .limit(8),
    supabase
      .from('handover_logs')
      .select('timestamp, action_type')
      .gte('timestamp', startIso)
      .eq('action_type', 'ISSUE')
  ]);

  const pickFirst = <T,>(value: T[] | T | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

  const totals: Totals = {
    totalDevices: devices?.length ?? 0,
    available: 0,
    issued: 0,
    brokenLost: 0,
    inService: 0
  };

  const typeCounts = new Map<string, number>();
  (devices ?? []).forEach((device) => {
    totals.totalDevices += 0;
    const status = device.status;
    if (status === 'AVAILABLE') totals.available += 1;
    if (status === 'ISSUED') totals.issued += 1;
    if (status === 'BROKEN' || status === 'LOST') totals.brokenLost += 1;
    if (status === 'IN_SERVICE') totals.inService += 1;

    const rawType = (device as { device_type?: unknown }).device_type;
    const deviceType = pickFirst(rawType) as { name?: string | null } | null;
    const key = deviceType?.name || device.type || 'Unknown';
    typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1);
  });

  const deviceTypes: DeviceTypeCount[] = Array.from(typeCounts.entries()).map(([type, count]) => ({
    type,
    count
  }));

  const countsByDate = new Map<string, number>();
  (issuedLogs ?? []).forEach((log) => {
    const dateKey = formatLocalDate(new Date(log.timestamp));
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  });

  const handoversDaily: HandoverDaily[] = Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = formatLocalDate(date);
    return { date: key, issuedCount: countsByDate.get(key) ?? 0 };
  });

  const recentHandovers: RecentHandover[] = (recentLogs ?? []).map((log) => {
    const rawDevice = (log as { device?: unknown }).device;
    const device = pickFirst(rawDevice) as { asset_tag?: string | null } | null;
    return {
      deviceId: device?.asset_tag ?? log.device_id,
      timestamp: log.timestamp,
      action: log.action_type
    };
  });

  return (
    <DeviceDashboardPage
      totals={totals}
      deviceTypes={deviceTypes}
      handoversDaily={handoversDaily}
      recentHandovers={recentHandovers}
    />
  );
}
