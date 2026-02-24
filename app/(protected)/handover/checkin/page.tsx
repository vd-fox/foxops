import { getSessionProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HandoverWizard } from '@/components/handover/HandoverWizard';
import type { Database } from '@/types/database';

export default async function HandoverReturnPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();

  const { data: couriers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'COURIER')
    .eq('active', true)
    .order('full_name');

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('status', 'ISSUED')
    .order('asset_tag');

  const { data: flagDefinitions } = await supabase.from('device_flag_definitions').select('*').order('name');

  let flagValues: Database['public']['Tables']['device_flag_values']['Row'][] = [];
  const deviceIds = (devices ?? []).map((device) => device.id);
  if (deviceIds.length) {
    const { data } = await supabase.from('device_flag_values').select('*').in('device_id', deviceIds);
    flagValues = data ?? [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Check in devices</h1>
      <HandoverWizard
        action="RETURN"
        couriers={couriers ?? []}
        devices={devices ?? []}
        flagDefinitions={flagDefinitions ?? []}
        flagValues={flagValues}
      />
    </div>
  );
}
