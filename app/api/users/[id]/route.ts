import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { hashPin } from '@/lib/utils/pin';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const { id } = params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.full_name) updates.full_name = body.full_name;
  if (body.role) updates.role = body.role;
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (body.pin) {
    if (!/^\d{4,6}$/.test(body.pin)) {
      return NextResponse.json({ message: 'PIN must be 4-6 digits' }, { status: 400 });
    }
    updates.pin_hash = await hashPin(body.pin);
  }
  if (body.email) updates.email = body.email;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'No updates' }, { status: 400 });
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
