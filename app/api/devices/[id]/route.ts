import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAccess();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const body = await req.json();
  const { customFlags, ...updates } = body;

  if (updates.is_damaged && !updates.damage_note?.trim()) {
    return NextResponse.json({ message: 'Damage note is required' }, { status: 400 });
  }
  if (updates.is_faulty && !updates.fault_note?.trim()) {
    return NextResponse.json({ message: 'Fault note is required' }, { status: 400 });
  }

  const { error } = await supabase.from('devices').update(updates).eq('id', params.id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (Array.isArray(customFlags)) {
    const payload = customFlags.map(
      (flag: { flagId: string; value: boolean; note?: string | null }) => ({
        device_id: params.id,
        flag_id: flag.flagId,
        value: Boolean(flag.value),
        note: flag.note ?? null
      })
    );
    const { error: flagError } = await supabase
      .from('device_flag_values')
      .upsert(payload, { onConflict: 'device_id,flag_id' });
    if (flagError) {
      return NextResponse.json({ message: flagError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
