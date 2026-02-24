import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  console.log('[auth/login] Incoming request', { hasEmail: Boolean(email), hasPassword: Boolean(password) });

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
  }

  const supabase = getSupabaseRouteClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth/login] Failed', error.message);
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  console.log('[auth/login] Success for', email);
  return NextResponse.json({ ok: true });
}
