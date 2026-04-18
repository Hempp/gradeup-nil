/**
 * POST /api/hs/signup/ensure-athlete
 *
 * Thin bridge endpoint. The HS athlete signup page runs in the browser
 * and can't reach `ensureAthleteRow` (service-role, server-only), so
 * this route wraps the helper behind the authenticated user's session.
 *
 * Contract:
 *   - Authenticates via the SSR Supabase client — only the currently
 *     signed-in user can create their own athletes row.
 *   - Feature-gated behind FEATURE_HS_NIL so it 404s in college-only
 *     environments.
 *   - Returns { ok: true, athleteId, created } or { error }.
 *   - Errors are non-fatal for the client: signup will log the warn
 *     and proceed, relying on the 20260418_008 backfill as a safety
 *     net for any misses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ensureAthleteRow } from '@/lib/hs-nil/athlete-identity';

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).default(''),
});

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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      );
    }

    const result = await ensureAthleteRow({
      userId: user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: user.email ?? '',
      bracket: 'high_school',
    });

    return NextResponse.json(
      { ok: true, athleteId: result.athleteId, created: result.created },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
