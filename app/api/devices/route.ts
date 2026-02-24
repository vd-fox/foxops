import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAccess();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const status = req.nextUrl.searchParams.get('status');
  let query = supabase.from('devices').select('*').order('asset_tag');
  if (status) {
    query = query.eq('status', status);
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
  const supabase = supabaseAdmin ?? auth.supabase;
  const body = await req.json();
  const { asset_tag, type, description, sim_card_id, phone_number, is_damaged, damage_note, is_faulty, fault_note } =
    body;
  if (!asset_tag || !type) {
    return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
  }
  if (is_damaged && !damage_note?.trim()) {
    return NextResponse.json({ message: 'Damage note is required' }, { status: 400 });
  }
  if (is_faulty && !fault_note?.trim()) {
    return NextResponse.json({ message: 'Fault note is required' }, { status: 400 });
  }
  const { error } = await supabase.from('devices').insert({
    asset_tag,
    type,
    description,
    sim_card_id: sim_card_id || null,
    phone_number: phone_number || null,
    is_damaged: Boolean(is_damaged),
    damage_note: damage_note || null,
    is_faulty: Boolean(is_faulty),
    fault_note: fault_note || null
  });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
