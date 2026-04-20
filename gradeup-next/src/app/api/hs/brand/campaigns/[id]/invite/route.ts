/**
 * POST /api/hs/brand/campaigns/[id]/invite
 *
 * Invite a batch of athletes (athlete_ids[]) to an invited_only or
 * hybrid campaign. Capped at campaign.max_athletes total invitations
 * per campaign via the service. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { inviteAthletes } from '@/lib/hs-nil/campaigns';

const schema = z.object({
  athlete_ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
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

  const result = await inviteAthletes({
    brandId: brand.id,
    campaignId: id,
    athleteIds: parsed.data.athlete_ids,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Could not invite athletes.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, invited: result.invited });
}
