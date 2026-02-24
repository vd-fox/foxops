import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function getSessionProfile(requiredRoles?: Profile['role'][]): Promise<{
  profile: Profile;
  supabaseUserId: string;
}> {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    console.warn('[auth] No session found, redirecting to /login');
    redirect('/login');
  }

  const fetchProfile = async () => {
    if (supabaseAdmin) {
      return await supabaseAdmin.from('profiles').select('*').eq('id', session.user.id).single();
    }
    return await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  };

  let { data: profile, error } = await fetchProfile();

  if ((error || !profile) && supabaseAdmin && session.user.email) {
    const displayName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    console.warn('[auth] Missing profile, attempting upsert', { userId: session.user.id });
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: displayName,
        role: 'ADMIN',
        active: true
      })
      .throwOnError();

    const refetch = await fetchProfile();
    profile = refetch.data ?? null;
    error = refetch.error ?? null;
  }

  if (error || !profile || !profile.active) {
    console.warn('[auth] Invalid profile, signing out', { userId: session.user.id, error: error?.message });
    await supabase.auth.signOut();
    redirect('/login');
  }

  if (requiredRoles && !requiredRoles.includes(profile.role)) {
    console.warn('[auth] Role mismatch, signing out and redirecting to /login', {
      userId: session.user.id,
      requiredRoles,
      actualRole: profile.role
    });
    await supabase.auth.signOut();
    redirect('/login');
  }

  return { profile, supabaseUserId: session.user.id };
}
