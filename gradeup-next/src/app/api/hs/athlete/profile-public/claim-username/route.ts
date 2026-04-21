/**
 * POST /api/hs/athlete/profile-public/claim-username
 *
 * Auth'd HS athlete claims a username for their public profile.
 * Claim-once: once set, changes require admin action (TODO).
 *
 * Feature-flag gated (FEATURE_HS_NIL). Mutation rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  claimUsername,
  isReservedUsername,
} from '@/lib/hs-nil/athlete-profile';

const schema = z
  .object({
    username: z.string().min(3).max(30),
  })
  .strict();

async function requireHsAthlete(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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
    const validation = validateInput(schema, body ?? {});
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    // TS-layer reserved check mirrors the SQL is_reserved_username() CHECK.
    if (isReservedUsername(validation.data.username)) {
      return NextResponse.json(
        { error: 'That username is reserved. Try another.' },
        { status: 400 }
      );
    }

    const result = await claimUsername({
      athleteUserId: gate.userId,
      username: validation.data.username,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil profile-public claim-username]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
