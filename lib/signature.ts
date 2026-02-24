import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function saveSignatureImage(base64: string, courierId: string) {
  if (!supabaseAdmin) throw new Error('Supabase admin client missing');
  const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid signature data');
  }
  const [, contentType, data] = match;
  const buffer = Buffer.from(data, 'base64');
  const path = `${courierId}/${randomUUID()}.png`;
  const { error } = await supabaseAdmin.storage.from('signatures').upload(path, buffer, {
    contentType,
    upsert: false
  });
  if (error) {
    throw error;
  }
  const {
    data: { publicUrl }
  } = supabaseAdmin.storage.from('signatures').getPublicUrl(path);
  return publicUrl;
}
