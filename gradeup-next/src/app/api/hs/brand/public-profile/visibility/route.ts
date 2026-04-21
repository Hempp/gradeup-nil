/**
 * POST /api/hs/brand/public-profile/visibility
 *
 * Toggle the public directory visibility flag. Requires a claimed slug
 * when flipping on.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { setVisibility } from '@/lib/hs-nil/brand-directory';

const schema = z.object({ visible: z.boolean() });

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

  const result = await setVisibility({
    brandId: brand.id,
    visible: parsed.data.visible,
    actorUserId: user.id,
  });

  if (!result.ok) {
    const status =
      result.code === 'forbidden'
        ? 403
        : result.code === 'invalid_fields'
          ? 400
          : result.code === 'not_found'
            ? 404
            : 500;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true, visible: result.data?.visible });
}
