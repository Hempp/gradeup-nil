/**
 * POST /api/hs/athlete/campaigns/apply
 *
 * Athlete-initiated campaign application. Body: { campaignId }.
 *
 * Runs through applyToCampaign() which gates on:
 *   - campaign status = 'open'
 *   - max_athletes not exceeded
 *   - athlete is HS bracket
 *   - validateDealCreation() passes (state rule + disclosure etc)
 *   - checkConsentScope() covers the campaign's category × amount × duration
 *
 * On consent-scope gap we return 409 with { suggestedScope } so the
 * athlete UI can redirect into /hs/consent/request prefilled.
 *
 * Rate-limited via the mutation bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { applyToCampaign } from '@/lib/hs-nil/campaigns';

const schema = z.object({
  campaignId: z.string().uuid(),
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

  const result = await applyToCampaign({
    athleteUserId: user.id,
    campaignId: parsed.data.campaignId,
  });

  if (!result.ok) {
    if (result.code === 'consent_scope_gap') {
      return NextResponse.json(
        {
          error: 'consent_scope_gap',
          violations: result.violations ?? [],
          suggested_scope: result.suggestedScope,
        },
        { status: 409 },
      );
    }
    const status =
      result.code === 'state_rule_violation'
        ? 422
        : result.code === 'not_hs_athlete'
          ? 403
          : result.code === 'already_applied'
            ? 409
            : result.code === 'campaign_full'
              ? 409
              : 400;
    return NextResponse.json(
      { error: result.code, violations: result.violations },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    participation_id: result.participationId,
  });
}
