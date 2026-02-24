import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const { data, error } = await supabase.from('device_flag_definitions').select('*').order('name');
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const body = await req.json();
  const { name, description } = body;
  if (!name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('device_flag_definitions')
    .insert({ name, description: description || null })
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
