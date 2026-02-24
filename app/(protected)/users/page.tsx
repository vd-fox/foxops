import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { UsersManager } from '@/components/users/UsersManager';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function UsersPage() {
  await getSessionProfile(['ADMIN']);
  const supabase = supabaseAdmin ?? getSupabaseServerClient();
  const { data: profiles } = await supabase.from('profiles').select('*').order('role');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary">User management</h1>
      <UsersManager initialProfiles={profiles ?? []} />
    </div>
  );
}
