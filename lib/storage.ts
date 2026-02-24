import { Buffer } from 'buffer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function uploadToBucket(params: {
  bucket: string;
  path: string;
  data: Uint8Array;
  contentType: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client unavailable');
  }
  const buffer = Buffer.from(params.data);
  const { error } = await supabaseAdmin.storage.from(params.bucket).upload(params.path, buffer, {
    upsert: true,
    contentType: params.contentType
  });
  if (error) {
    throw error;
  }
  const {
    data: { publicUrl }
  } = supabaseAdmin.storage.from(params.bucket).getPublicUrl(params.path);
  return publicUrl;
}
