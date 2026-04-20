/**
 * POST /api/hs/brand/campaigns/[id]/participants/[participationId]/accept
 *
 * Brand accepts an applied participant. This spawns a real deal row
 * via the same validateDealCreation path the /api/deals POST uses.
 * The participation row gets status='active' and individual_deal_id
 * populated. All downstream deal-flow (contract → deliverable →
 * review → payout) operates on the deal row without modification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { acceptParticipation } from '@/lib/hs-nil/campaigns';

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

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const result = await acceptParticipation({
    brandId: brand.id,
    participationId,
  });
  if (!result.ok) {
    const status = result.code === 'not_found'
      ? 404
      : result.code === 'state_rule_violation'
        ? 422
        : 409;
    return NextResponse.json(
      { error: result.code, violations: result.violations },
      { status },
    );
  }
  return NextResponse.json({
    ok: true,
    deal_id: result.dealId,
    participation_id: result.participationId,
  });
}
