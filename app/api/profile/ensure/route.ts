import { NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

export async function POST() {
  const supabase = getSupabaseRouteClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    console.warn('[profile/ensure] No session found');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    console.error('[profile/ensure] Missing admin client');
    return NextResponse.json({ message: 'Admin client not configured' }, { status: 500 });
  }

  console.log('[profile/ensure] Upserting profile', { userId: session.user.id });

  const { data: existingProfileRaw } = await supabaseAdmin
    .from('profiles')
    .select('role,active')
    .eq('id', session.user.id)
    .maybeSingle();
  const existingProfile = existingProfileRaw as
    | { role: ProfileInsert['role']; active: boolean }
    | null;

  const payload: ProfileInsert = {
    id: session.user.id,
    email: session.user.email ?? '',
    full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
    role: existingProfile?.role ?? 'ADMIN',
    active: existingProfile?.active ?? true
  };

  await (supabaseAdmin as any).from('profiles').upsert(payload).throwOnError();

  return NextResponse.json({ ok: true });
}
