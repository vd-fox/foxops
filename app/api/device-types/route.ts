import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const supabase = supabaseAdmin ?? auth.supabase;
  const { data, error } = await supabase.from('device_type_definitions').select('*').order('name');
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
  const { name, category } = body;
  if (!name || !category) {
    return NextResponse.json({ message: 'Name and category are required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('device_type_definitions')
    .insert({ name, category })
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
