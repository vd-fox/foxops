import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPin } from '@/lib/utils/pin';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type CourierType = Database['public']['Tables']['profiles']['Row']['courier_type'];
type UserType = 'ADMIN' | 'CONTRACTOR' | 'EMPLOYEE';

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
  const { user_type } = body as { user_type?: UserType };

  if (!user_type || !['ADMIN', 'CONTRACTOR', 'EMPLOYEE'].includes(user_type)) {
    return NextResponse.json({ message: 'Invalid user type supplied' }, { status: 400 });
  }

  const normalizeEmailPart = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '.')
      .toLowerCase();

  const buildCourierEmail = (first: string, last: string) => {
    const firstPart = normalizeEmailPart(first);
    const lastPart = normalizeEmailPart(last);
    if (!firstPart || !lastPart) {
      throw new Error('Invalid name for email generation');
    }
    return `${firstPart}.${lastPart}@foxpost.hu`;
  };

  const normalizePin = (value: unknown) =>
    typeof value === 'number'
      ? value.toString().padStart(4, '0')
      : typeof value === 'string'
        ? value.trim()
        : '';

  const ensurePin = (value: unknown) => {
    const normalized = normalizePin(value);
    if (!/^\d{4}$/.test(normalized)) {
      return { error: NextResponse.json({ message: 'PIN must be exactly 4 digits' }, { status: 400 }) } as const;
    }
    return { pin: normalized } as const;
  };

  let role: Profile['role'] = 'ADMIN';
  let finalEmail = '';
  let finalPassword = '';
  let profileInsert: Partial<Profile> = { active: true };

  if (user_type === 'ADMIN') {
    const { email, password, full_name } = body as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    if (!full_name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    role = 'ADMIN';
    finalEmail = email;
    finalPassword = password;
    profileInsert = {
      ...profileInsert,
      full_name,
      role
    };
  } else if (user_type === 'CONTRACTOR') {
    const {
      company_name,
      vat_number,
      company_number,
      representative_first_name,
      representative_last_name,
      representative_email,
      representative_phone,
      pin
    } = body as {
      company_name?: string;
      vat_number?: string;
      company_number?: string;
      representative_first_name?: string;
      representative_last_name?: string;
      representative_email?: string;
      representative_phone?: string;
      pin?: string;
    };

    if (
      !company_name ||
      !vat_number ||
      !company_number ||
      !representative_first_name ||
      !representative_last_name ||
      !representative_email ||
      !representative_phone
    ) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    const pinCheck = ensurePin(pin);
    if ('error' in pinCheck) return pinCheck.error;

    role = 'COURIER';
    try {
      finalEmail = buildCourierEmail(representative_first_name, representative_last_name);
    } catch (error) {
      return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
    finalPassword = randomBytes(24).toString('base64');
    profileInsert = {
      ...profileInsert,
      full_name: `${representative_first_name} ${representative_last_name}`,
      role,
      courier_type: 'CONTRACTOR' as CourierType,
      company_name,
      vat_number,
      company_number,
      representative_first_name,
      representative_last_name,
      representative_email,
      representative_phone,
      pin_hash: await hashPin(pinCheck.pin)
    };
  } else if (user_type === 'EMPLOYEE') {
    const { first_name, last_name, employee_email, employee_phone, employee_id, position, pin } = body as {
      first_name?: string;
      last_name?: string;
      employee_email?: string;
      employee_phone?: string;
      employee_id?: string;
      position?: string;
      pin?: string;
    };

    if (!first_name || !last_name || !employee_email || !employee_phone || !employee_id || !position) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    const pinCheck = ensurePin(pin);
    if ('error' in pinCheck) return pinCheck.error;

    role = 'COURIER';
    try {
      finalEmail = buildCourierEmail(first_name, last_name);
    } catch (error) {
      return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
    finalPassword = randomBytes(24).toString('base64');
    profileInsert = {
      ...profileInsert,
      full_name: `${first_name} ${last_name}`,
      role,
      courier_type: 'EMPLOYEE' as CourierType,
      first_name,
      last_name,
      employee_email,
      employee_phone,
      employee_id,
      position,
      pin_hash: await hashPin(pinCheck.pin)
    };
  }
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
    ...profileInsert
  };
  const { error } = await supabase.from('profiles').upsert(insert, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(insert, { status: 201 });
}
