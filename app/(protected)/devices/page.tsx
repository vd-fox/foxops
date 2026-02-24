import { getSessionProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DeviceManager } from '@/components/devices/DeviceManager';

export default async function DevicesPage() {
  const { profile } = await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();
  const { data: devices } = await supabase
    .from('devices')
    .select(
      'id, asset_tag, type, status, description, current_holder_id, profiles!devices_current_holder_id_fkey(full_name)'
    )
    .order('asset_tag');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Devices</h1>
      <DeviceManager devices={devices ?? []} canEdit={profile.role === 'ADMIN'} />
    </div>
  );
}
