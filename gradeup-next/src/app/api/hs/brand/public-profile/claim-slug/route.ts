/**
 * POST /api/hs/brand/public-profile/claim-slug
 *
 * Claim a public slug for the signed-in brand. Semi-immutable — once
 * claimed the brand cannot re-claim without admin help.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { claimPublicSlug } from '@/lib/hs-nil/brand-directory';

const schema = z.object({
  slug: z.string().trim().min(3).max(64),
});

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

  const result = await claimPublicSlug({
    brandId: brand.id,
    slug: parsed.data.slug,
    actorUserId: user.id,
  });

  if (!result.ok) {
    const status =
      result.code === 'slug_conflict' || result.code === 'slug_locked'
        ? 409
        : result.code === 'forbidden'
          ? 403
          : result.code === 'not_found'
            ? 404
            : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true, slug: result.data?.slug });
}
