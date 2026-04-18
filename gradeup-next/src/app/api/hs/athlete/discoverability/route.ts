/**
 * POST /api/hs/athlete/discoverability
 *
 * Athlete flips their is_discoverable flag on hs_athlete_profiles.
 *
 * Authorization model:
 *   - Feature-flag gated (FEATURE_HS_NIL). 404 when disabled.
 *   - Authenticated SSR session.
 *   - Mutation rate limiter (30/min/user) via the shared bucket.
 *   - RLS on hs_athlete_profiles_update_own is the authoritative check:
 *     the UPDATE only touches auth.uid() = user_id rows.
 *
 * Body: { isDiscoverable: boolean }
 * Returns: { isDiscoverable, updatedAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { toggleAthleteDiscoverability } from '@/lib/hs-nil/matching';

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = (await request.json().catch(() => null)) as
      | { isDiscoverable?: unknown }
      | null;

    if (!body || typeof body.isDiscoverable !== 'boolean') {
      return NextResponse.json(
        { error: 'isDiscoverable (boolean) is required.' },
        { status: 400 }
      );
    }

    const result = await toggleAthleteDiscoverability(
      supabase,
      user.id,
      body.isDiscoverable
    );

    // eslint-disable-next-line no-console
    console.log('[hs-nil discoverability] toggled', {
      userId: user.id,
      isDiscoverable: result.isDiscoverable,
      updatedAt: result.updatedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil discoverability] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
