/**
 * GET /api/hs/referrals/rewards
 *
 * Returns the caller's referral-reward summary: current tier, next
 * tier, grants, and active perks. Callers are expected to be
 * hs_parent or hs_athlete — brands don't participate in referral
 * rewards and get a 403.
 *
 * Fail-soft: on service-layer errors we return a 500 with the
 * error string. The rewards page is defensive and renders an
 * empty-state when the payload is missing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getUserRewardSummary } from '@/lib/hs-nil/referral-rewards';

export async function GET(_request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent' && meta.role !== 'hs_athlete') {
    return NextResponse.json(
      { error: 'Referral rewards are only available for HS parents and athletes.' },
      { status: 403 }
    );
  }

  try {
    const summary = await getUserRewardSummary(user.id);
    return NextResponse.json({
      currentTier: summary.currentTier,
      nextTier: summary.nextTier,
      conversionCount: summary.conversionCount,
      grants: summary.grants,
      activePerks: summary.activePerks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rewards lookup failed';
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-rewards] failure', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
