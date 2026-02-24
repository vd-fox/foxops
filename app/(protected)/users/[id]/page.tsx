import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { getSessionProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

interface Props {
  params: { id: string };
}

type Profile = Database['public']['Tables']['profiles']['Row'];
type Device = Database['public']['Tables']['devices']['Row'];
type DeviceInfo = Pick<Device, 'id' | 'asset_tag' | 'type'>;

type HandoverBatch = {
  id: string;
  handover_number: number | null;
  action_type: 'ISSUE' | 'RETURN';
  created_at: string;
  document_path: string | null;
  logs:
    | {
        device_id: string;
        device: {
          id: string;
          asset_tag: string;
          type: Device['type'];
        } | null;
      }[]
    | null;
};

type DeviceGroup = {
  pda: DeviceInfo[];
  printer: DeviceInfo[];
};

export default async function UserDetailPage({ params }: Props) {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();

  const { data: user } = await supabase.from('profiles').select('*').eq('id', params.id).single<Profile>();
  if (!user) {
    notFound();
  }

  const { data: currentDevices } = await supabase
    .from('devices')
    .select('id, asset_tag, type, status, updated_at')
    .eq('current_holder_id', user.id)
    .order('asset_tag');

  const { data: handoverBatchesRaw, error: batchError } = await supabase
    .from('handover_batches')
    .select(
      `
        id,
        handover_number,
        action_type,
        created_at,
        document_path,
        logs:handover_logs(
          device_id,
          device:devices(
            id,
            asset_tag,
            type
          )
        )
      `
    )
    .or(`courier_id.eq.${user.id},dispatcher_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (batchError) {
    console.error('[users/id] handover batch fetch failed', batchError.message);
  }

  const pickFirst = <T,>(value: T[] | T | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

  const handoverBatches: HandoverBatch[] =
    handoverBatchesRaw?.map((batch) => ({
      ...batch,
      logs:
        batch.logs?.map((log) => ({
          ...log,
          device: pickFirst(log.device)
        })) ?? null
    })) ?? [];

  const mapDevices = (batch: HandoverBatch): DeviceGroup => {
    const logs = batch.logs ?? [];
    const devices = logs
      .map((log) => log.device)
      .filter((device): device is DeviceInfo => Boolean(device))
      .sort((a, b) => a.asset_tag.localeCompare(b.asset_tag));
    return {
      pda: devices.filter((device) => device.type === 'PDA'),
      printer: devices.filter((device) => device.type === 'MOBILE_PRINTER')
    };
  };

  const handovers = (handoverBatches ?? []).map((batch) => {
    const deviceGroups = mapDevices(batch);
    return {
      id: batch.id,
      handoverNumber: batch.handover_number,
      type: batch.action_type,
      createdAt: batch.created_at,
      documentUrl: batch.document_path ?? null,
      devices: deviceGroups
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{user.full_name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <Link href="/users" className="text-sm text-primary">
          ← Back to users
        </Link>
      </div>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Current devices ({currentDevices?.length ?? 0})</h2>
        {currentDevices && currentDevices.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2">Asset</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {currentDevices.map((device) => (
                <tr key={device.id} className="border-b last:border-none">
                  <td className="py-2 font-medium">{device.asset_tag}</td>
                  <td>{device.type}</td>
                  <td>{device.status}</td>
                  <td className="text-xs text-gray-500">{format(new Date(device.updated_at), 'PP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No active devices assigned.</p>
        )}
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Handovers</h2>
        {handovers.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No handovers recorded.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2">Handover ID</th>
                <th>Típus</th>
                <th>PDA</th>
                <th>Mobile printer</th>
                <th>Dátum</th>
                <th>Dokumentum</th>
              </tr>
            </thead>
            <tbody>
              {handovers.map((entry) => (
                <tr key={entry.id} className="border-b last:border-none">
                  <td className="py-2 font-semibold">{entry.handoverNumber ?? '—'}</td>
                  <td className="font-semibold">{entry.type === 'ISSUE' ? 'Kiadás' : 'Visszavétel'}</td>
                  <td>
                    {entry.devices.pda.length > 0 ? (
                      entry.devices.pda.map((device, index) => (
                        <span key={device.id} className="inline-flex items-center">
                          <Link href={`/devices/${device.id}`} className="text-primary underline">
                            {device.asset_tag}
                          </Link>
                          {index < entry.devices.pda.length - 1 && <span className="mx-1 text-gray-400">,</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    {entry.devices.printer.length > 0 ? (
                      entry.devices.printer.map((device, index) => (
                        <span key={device.id} className="inline-flex items-center">
                          <Link href={`/devices/${device.id}`} className="text-primary underline">
                            {device.asset_tag}
                          </Link>
                          {index < entry.devices.printer.length - 1 && <span className="mx-1 text-gray-400">,</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    {entry.createdAt ? format(new Date(entry.createdAt), 'yyyy.MM.dd HH:mm') : '—'}
                  </td>
                  <td>
                    {entry.documentUrl ? (
                      <a href={entry.documentUrl} target="_blank" className="text-primary underline">
                        Dokumentum letöltése
                      </a>
                    ) : (
                      <span className="text-gray-400">Nincs dokumentum</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
