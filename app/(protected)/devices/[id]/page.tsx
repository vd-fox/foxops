import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DeviceDetail } from '@/components/devices/DeviceDetail';
import type { Database } from '@/types/database';

interface Props {
  params: { id: string };
}

type Device = Database['public']['Tables']['devices']['Row'] & {
  holder?: { full_name: string | null; email: string | null } | null;
};

type Log = {
  id: string;
  action_type: Database['public']['Tables']['handover_logs']['Row']['action_type'];
  timestamp: string;
  from_profile?: { full_name: string | null } | null;
  to_profile?: { full_name: string | null } | null;
  batch?: {
    id: string | null;
    handover_number: number | null;
    signature_path: string | null;
    courier_signature_path: string | null;
    dispatcher_signature_path: string | null;
    notes: string | null;
    document_path: string | null;
    dispatcher?: { full_name: string | null } | null;
  } | null;
};

type FieldHistory = Database['public']['Tables']['device_history']['Row'];
type FlagHistory = Database['public']['Tables']['device_flag_history']['Row'];

export default async function DeviceDetailPage({ params }: Props) {
  const { profile } = await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();

  const { data: device } = await supabase
    .from('devices')
    .select('*, holder:profiles!devices_current_holder_id_fkey(full_name, email)')
    .eq('id', params.id)
    .single();

  if (!device) {
    notFound();
  }

  const { data: logs } = await supabase
    .from('handover_logs')
    .select(
      'id, action_type, timestamp, from_profile:profiles!handover_logs_from_profile_id_fkey(full_name), to_profile:profiles!handover_logs_to_profile_id_fkey(full_name), batch:handover_batches(id, handover_number, signature_path, courier_signature_path, dispatcher_signature_path, document_path, notes, dispatcher:profiles!handover_batches_dispatcher_id_fkey(full_name))'
    )
    .eq('device_id', device.id)
    .order('timestamp', { ascending: false });

  const { data: flagDefinitions } = await supabase.from('device_flag_definitions').select('*').order('name');

  const { data: flagValues } = await supabase
    .from('device_flag_values')
    .select('flag_id, value, note')
    .eq('device_id', device.id);

  const { data: fieldHistory } = await supabase
    .from('device_history')
    .select('*')
    .eq('device_id', device.id)
    .order('changed_at', { ascending: false });

  const { data: flagHistory } = await supabase
    .from('device_flag_history')
    .select('*, flag:device_flag_definitions(name)')
    .eq('device_id', device.id)
    .order('changed_at', { ascending: false });

  const pickFirst = <T,>(value: T[] | T | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

  const normalizedLogs: Log[] = (logs ?? []).map((log) => {
    const fromProfile = pickFirst(log.from_profile);
    const toProfile = pickFirst(log.to_profile);
    const batch = pickFirst(log.batch);
    const dispatcher = batch ? pickFirst(batch.dispatcher) : null;

    return {
      id: log.id,
      action_type: log.action_type,
      timestamp: log.timestamp,
      from_profile: fromProfile,
      to_profile: toProfile,
      batch: batch ? { ...batch, dispatcher } : null
    };
  });

  return (
    <div className="space-y-4">
      <Link href="/devices" className="text-sm text-primary">
        ← Back to devices
      </Link>
      <DeviceDetail
        device={device as Device}
        logs={normalizedLogs}
        canEdit={profile.role === 'ADMIN'}
        customFlags={flagDefinitions ?? []}
        flagValues={flagValues ?? []}
        fieldHistory={(fieldHistory as FieldHistory[]) ?? []}
        flagHistory={(flagHistory as (FlagHistory & { flag?: { name: string | null } | null })[]) ?? []}
      />
    </div>
  );
}
