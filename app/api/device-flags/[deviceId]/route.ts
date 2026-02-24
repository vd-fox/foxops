import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: { deviceId: string } }) {
  const auth = await requireAdminAccess();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const { deviceId } = params;
  const body = await req.json();
  const flags = Array.isArray(body?.flags) ? body.flags : [];

  if (!deviceId) {
    return NextResponse.json({ message: 'Device required' }, { status: 400 });
  }

  const upsertPayload = flags.map((flag: { flagId: string; value: boolean; note?: string | null }) => ({
    device_id: deviceId,
    flag_id: flag.flagId,
    value: Boolean(flag.value),
    note: flag.note ?? null
  }));

  if (upsertPayload.length === 0) {
    await supabase.from('device_flag_values').delete().eq('device_id', deviceId);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from('device_flag_values').upsert(upsertPayload, { onConflict: 'device_id,flag_id' });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
