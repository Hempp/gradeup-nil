/**
 * /api/hs/athlete/signup-snapshot
 *
 * POST — capture an initial self-reported GPA snapshot for an athlete at
 * signup time. This route exists because the trajectory service uses the
 * service-role Supabase key, which cannot live in the browser. The signup
 * page posts here after its hs_athlete_profiles insert.
 *
 * Gates:
 *   - Feature-flag: FEATURE_HS_NIL.
 *   - Auth: caller must be an authenticated HS athlete (verified via an
 *     hs_athlete_profiles row keyed by user_id).
 *   - Rate-limit: shared mutation bucket (per-user).
 *
 * Body: { gpa: number } in [0, 5].
 *
 * Returns: { ok: true } on success. Failures return a non-200 but are
 * documented as best-effort on the client side — the signup flow swallows
 * errors and moves on.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { captureGpaSnapshot } from '@/lib/hs-nil/trajectory';

const snapshotSchema = z
  .object({
    gpa: z.number().min(0).max(5),
  })
  .strict();

async function requireHsAthlete(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, userId: user.id };
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const gate = await requireHsAthlete();
    if (!gate.ok) return gate.response;

    const rateLimited = await enforceRateLimit(request, 'mutation', gate.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    const validation = validateInput(snapshotSchema, body ?? {});
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    await captureGpaSnapshot({
      athleteUserId: gate.userId,
      gpa: validation.data.gpa,
      tier: 'self_reported',
      source: 'initial_signup',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil signup-snapshot]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
