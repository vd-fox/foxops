import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPin } from '@/lib/utils/pin';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
const allowedRoles: Profile['role'][] = ['ADMIN', 'COURIER'];

const adminClient = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role key is missing');
  }
  return supabaseAdmin;
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const role = req.nextUrl.searchParams.get('role');
  let query = supabase.from('profiles').select('*').order('role');
  if (role) {
    query = query.eq('role', role);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const body = await req.json();
  const { email, password, full_name, role, pin } = body;
  const needsPassword = role === 'ADMIN';
  if (!full_name || !role || (needsPassword && (!password || !email))) {
    return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
  }
  if (typeof role !== 'string' || !allowedRoles.includes(role as Profile['role'])) {
    return NextResponse.json({ message: 'Invalid role supplied' }, { status: 400 });
  }
  const normalizedPin =
    typeof pin === 'number'
      ? pin.toString().padStart(4, '0')
      : typeof pin === 'string'
        ? pin.trim()
        : '';
  if (role === 'COURIER' && !/^\d{4}$/.test(normalizedPin)) {
    return NextResponse.json({ message: 'PIN must be exactly 4 digits' }, { status: 400 });
  }
  const finalEmail =
    role === 'ADMIN'
      ? (email as string)
      : `courier+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@foxchange.internal`;
  const finalPassword = needsPassword ? (password as string) : randomBytes(24).toString('base64');
  const admin = adminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: finalEmail,
    password: finalPassword,
    email_confirm: true
  });
  if (createError || !created.user) {
    return NextResponse.json({ message: createError?.message || 'Failed to create user' }, { status: 400 });
  }
  const insert = {
    id: created.user.id,
    email: finalEmail,
    full_name,
    role: role as Profile['role'],
    active: true,
    pin_hash: role === 'COURIER' ? await hashPin(normalizedPin) : null
  };
  const { error } = await supabase.from('profiles').upsert(insert, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(insert, { status: 201 });
}
