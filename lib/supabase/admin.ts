import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.warn('Supabase admin client is not fully configured.');
}

export const supabaseAdmin = url && serviceRoleKey ? createClient<Database>(url, serviceRoleKey) : null;
