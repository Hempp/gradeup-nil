/**
 * POST /api/hs/brand/campaigns/[id]/participants/[participationId]/reject
 *
 * Brand rejects an applied participant. Optional reason string is
 * echoed back to the athlete in the close email. No deal row is
 * affected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { rejectParticipation } from '@/lib/hs-nil/campaigns';

const schema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; participationId: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { participationId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const result = await rejectParticipation({
    brandId: brand.id,
    participationId,
    reason: parsed.data.reason ?? null,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Could not reject.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
