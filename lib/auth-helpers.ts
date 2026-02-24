import { NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

const getProfile = async (userId: string) => {
  if (supabaseAdmin) {
    return supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  }
  const supabase = getSupabaseRouteClient();
  return supabase.from('profiles').select('*').eq('id', userId).single();
};

export async function requireAdminAccess() {
  const supabase = getSupabaseRouteClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const { data: profile, error } = await getProfile(session.user.id);

  if (error || !profile || !profile.active || profile.role !== 'ADMIN') {
    return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) } as const;
  }

  return { profile, supabase: supabaseAdmin ?? supabase } as const;
}

export async function requireAdmin() {
  return requireAdminAccess();
}
