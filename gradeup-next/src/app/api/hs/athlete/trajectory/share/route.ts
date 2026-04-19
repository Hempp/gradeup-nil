/**
 * /api/hs/athlete/trajectory/share
 *
 *   POST   — create a new public trajectory share token for the auth'd athlete.
 *   DELETE — revoke an existing share owned by the auth'd athlete.
 *
 * Feature-flag gated (FEATURE_HS_NIL). Rate-limited via the shared
 * mutation bucket. The caller's auth is the sole gate — revoke
 * enforces ownership at the service-role layer so a leaked token
 * alone can't revoke someone else's share.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  createTrajectoryShare,
  revokeTrajectoryShare,
} from '@/lib/hs-nil/trajectory';

const createSchema = z
  .object({
    label: z.string().max(80).nullable().optional(),
    expiresInDays: z.number().int().positive().max(730).nullable().optional(),
  })
  .strict();

const revokeSchema = z
  .object({
    shareId: z.string().uuid(),
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

  // Require an hs_athlete_profiles row so only HS athletes can create shares.
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
    const validation = validateInput(createSchema, body ?? {});
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const share = await createTrajectoryShare({
      athleteUserId: gate.userId,
      label: validation.data.label ?? null,
      expiresInDays: validation.data.expiresInDays ?? null,
    });

    return NextResponse.json({ ok: true, share });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil trajectory share POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const gate = await requireHsAthlete();
    if (!gate.ok) return gate.response;

    const rateLimited = await enforceRateLimit(request, 'mutation', gate.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    const validation = validateInput(revokeSchema, body ?? {});
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const result = await revokeTrajectoryShare(
      validation.data.shareId,
      gate.userId
    );

    if (!result.ok) {
      const status = result.reason === 'forbidden' ? 403 : 404;
      return NextResponse.json(
        { error: result.reason ?? 'Revoke failed' },
        { status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil trajectory share DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
