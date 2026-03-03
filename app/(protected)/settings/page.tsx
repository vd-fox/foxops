import { getSessionProfile } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FlagDefinitionsManager } from '@/components/settings/FlagDefinitionsManager';
import { DeviceTypeManager } from '@/components/settings/DeviceTypeManager';
import { DeviceSupplierManager } from '@/components/settings/DeviceSupplierManager';
import { SiteManager } from '@/components/settings/SiteManager';

export default async function SettingsPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();
  const [{ data: definitions }, { data: deviceTypes }, { data: suppliers }, { data: sites }] = await Promise.all([
    supabase.from('device_flag_definitions').select('*').order('name'),
    supabase.from('device_type_definitions').select('*').order('name'),
    supabase.from('device_supplier_definitions').select('*').order('name'),
    supabase.from('site_definitions').select('*').order('name')
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Settings</h1>
      <FlagDefinitionsManager initialDefinitions={definitions ?? []} />
      <DeviceTypeManager initialTypes={deviceTypes ?? []} />
      <DeviceSupplierManager initialSuppliers={suppliers ?? []} />
      <SiteManager initialSites={sites ?? []} />
    </div>
  );
}
