/**
 * POST /api/hs/brand/public-profile/avatar-upload
 *
 * Multipart upload of a brand logo into the `brand-public-assets` bucket.
 * Path convention: {brand_id}/{uuid}.{ext}. Returns the public URL on
 * success. Uses the service-role storage client; bucket RLS policies
 * still cover direct-from-client writes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { updatePublicProfile } from '@/lib/hs-nil/brand-directory';

const BUCKET = 'brand-public-assets';
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg']);
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

function extFromName(name: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimited = await enforceRateLimit(request, 'upload', user.id);
  if (rateLimited) return rateLimited;

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Invalid form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File must be 1 to ${MAX_BYTES / 1024 / 1024}MB` },
      { status: 400 },
    );
  }
  const ext = extFromName(file.name) ?? '';
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: 'Unsupported extension' },
      { status: 400 },
    );
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Storage not configured' },
      { status: 500 },
    );
  }
  const sb = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const randomId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${brand.id}/${randomId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: publicUrlData } = sb.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = publicUrlData.publicUrl;

  await updatePublicProfile({
    brandId: brand.id,
    actorUserId: user.id,
    fields: { avatarUrl: publicUrl },
  });

  return NextResponse.json({ ok: true, url: publicUrl, path });
}
