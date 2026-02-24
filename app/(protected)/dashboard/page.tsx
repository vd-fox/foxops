import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

type DeviceSummary = {
  total: number;
  status: Record<string, number>;
  type: Record<string, number>;
};

const deviceTypes = ['PDA', 'MOBILE_PRINTER'] as const;

export default async function DashboardPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();

  const [{ data: devices }, { data: handoverLogs }] = await Promise.all([
    supabase.from('devices').select('id, status, type'),
    supabase
      .from('handover_logs')
      .select('id, action_type, timestamp, device:devices!handover_logs_device_id_fkey(id, asset_tag)')
      .order('timestamp', { ascending: false })
      .limit(10)
  ]);

  const summary = (devices ?? []).reduce<DeviceSummary>(
    (acc, device) => {
      acc.total += 1;
      acc.status[device.status] = (acc.status[device.status] || 0) + 1;
      acc.type[device.type] = (acc.type[device.type] || 0) + 1;
      return acc;
    },
    { total: 0, status: {}, type: {} }
  );

  const recentHandovers = (handoverLogs ?? []).map((log) => {
    const rawDevice = (log as { device?: unknown }).device;
    const device = (Array.isArray(rawDevice) ? rawDevice[0] : rawDevice) as
      | { asset_tag?: string | null }
      | null
      | undefined;

    return {
      id: log.id,
      action: log.action_type,
      timestamp: log.timestamp,
      assetTag: device?.asset_tag ?? 'Ismeretlen eszköz'
    };
  });

  const formatTimestamp = (value: string) => format(new Date(value), 'yyyy.MM.dd HH:mm');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Stat title="Total devices" value={summary.total} />
        <Stat title="Available" value={summary.status['AVAILABLE'] ?? 0} />
        <Stat title="Issued" value={summary.status['ISSUED'] ?? 0} />
        <Stat title="Broken / Lost" value={(summary.status['BROKEN'] ?? 0) + (summary.status['LOST'] ?? 0)} />
        <Stat title="In service" value={summary.status['IN_SERVICE'] ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded bg-white p-4 shadow">
          <h2 className="text-lg font-semibold text-primary">By device type</h2>
          <ul className="mt-3 space-y-2">
            {deviceTypes.map((type) => (
              <li key={type} className="flex items-center justify-between border-b pb-2 last:border-none last:pb-0">
                <span>{type}</span>
                <span className="font-semibold">{summary.type[type] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded bg-white p-4 shadow">
          <h2 className="text-lg font-semibold text-primary">Recent handovers</h2>
          {recentHandovers.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No handovers recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentHandovers.map((log) => (
                <li key={log.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{log.assetTag}</p>
                    <p className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</p>
                  </div>
                  <StatusBadge value={log.action} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded bg-white p-4 text-center shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
