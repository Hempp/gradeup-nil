/**
 * POST /api/hs/brand/match-feedback
 *
 * Record a brand's feedback on a suggested athlete. Writes to
 * `match_feedback_events` via the match-feedback service (service-role
 * client internally). Used by the MatchFeedbackButtons client component
 * on suggested-athlete cards.
 *
 * Authorization:
 *   - Feature-gated (FEATURE_HS_NIL). 404 when disabled.
 *   - Authenticated SSR session, resolved to a brand row with
 *     is_hs_enabled=true. 401 / 403 otherwise.
 *   - Rate-limited via the shared mutation bucket.
 *   - The body's athleteRef is HMAC-verified (same signAthleteRef /
 *     verifyAthleteRef pair the suggested page uses for the Propose
 *     button). Brands cannot mass-insert feedback on unseen athletes.
 *
 * Body:
 *   { athleteRef: string, signal: FeedbackSignal, sourcePage?: string }
 *
 * Response:
 *   { ok: true, id, weight, replacedPrior }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyAthleteRef } from '@/lib/hs-nil/matching';
import {
  recordFeedback,
  type FeedbackSourcePage,
} from '@/lib/hs-nil/match-feedback';

const schema = z.object({
  athleteRef: z.string().min(1),
  signal: z.enum([
    'thumb_up',
    'thumb_down',
    'dismiss',
    'saved_to_shortlist',
  ]),
  // Only the two surfaces a BRAND can legitimately drive from.
  sourcePage: z
    .enum(['/hs/brand/suggested', '/hs/brand/shortlist'])
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Resolve brand for this user.
    const { data: brand } = await supabase
      .from('brands')
      .select('id, is_hs_enabled')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!brand || brand.is_hs_enabled !== true) {
      return NextResponse.json(
        { error: 'HS brand profile required' },
        { status: 403 }
      );
    }

    const athleteId = verifyAthleteRef(parsed.data.athleteRef);
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Invalid athlete reference' },
        { status: 400 }
      );
    }

    const sourcePage: FeedbackSourcePage =
      parsed.data.sourcePage ?? '/hs/brand/suggested';

    const result = await recordFeedback({
      brandId: brand.id as string,
      athleteUserId: athleteId,
      signal: parsed.data.signal,
      sourcePage,
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      weight: result.weight,
      replacedPrior: result.replacedPrior,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-match-feedback] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
