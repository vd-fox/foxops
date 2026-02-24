import { getSessionProfile } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FlagDefinitionsManager } from '@/components/settings/FlagDefinitionsManager';

export default async function SettingsPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();
  const { data: definitions } = await supabase.from('device_flag_definitions').select('*').order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Settings</h1>
      <FlagDefinitionsManager initialDefinitions={definitions ?? []} />
    </div>
  );
}
