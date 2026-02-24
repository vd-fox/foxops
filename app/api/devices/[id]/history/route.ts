import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/auth-helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAccess();
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('handover_logs')
    .select('*')
    .eq('device_id', params.id)
    .order('timestamp', { ascending: false });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
