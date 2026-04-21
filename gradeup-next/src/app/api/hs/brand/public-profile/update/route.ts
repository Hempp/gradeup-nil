/**
 * PATCH /api/hs/brand/public-profile/update
 *
 * Update bio / website / avatar URL / city / region for the brand's
 * public profile. All fields optional; any field set to null clears it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { updatePublicProfile } from '@/lib/hs-nil/brand-directory';

const schema = z.object({
  bio: z.string().max(500).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  avatar_url: z.string().max(1000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  region: z.string().length(2).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
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
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return rateLimited;

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const result = await updatePublicProfile({
    brandId: brand.id,
    actorUserId: user.id,
    fields: {
      bio: p.bio,
      website: p.website,
      avatarUrl: p.avatar_url,
      city: p.city,
      region: p.region ? p.region.toUpperCase() : p.region,
    },
  });

  if (!result.ok) {
    const status =
      result.code === 'forbidden'
        ? 403
        : result.code === 'not_found'
          ? 404
          : result.code === 'invalid_fields'
            ? 400
            : 500;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
