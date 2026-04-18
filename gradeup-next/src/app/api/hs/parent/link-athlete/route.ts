/**
 * POST /api/hs/parent/link-athlete
 *
 * Authenticated parent endpoint. Given an athlete's email, creates a pending-
 * verification link in `hs_parent_athlete_links`. If the athlete isn't
 * registered yet (or isn't in the HS-NIL scope), we degrade to
 * `pending_invitation` so the caller can show a "we'll link automatically when
 * they sign up" state without erroring out.
 *
 * Flow:
 *   1. Gate behind FEATURE_HS_NIL (returns 404 when disabled).
 *   2. Authenticate via the SSR Supabase client (session cookie).
 *   3. Rate-limit per user on the `mutation` bucket (30/min).
 *   4. Zod-validate the body — tiny surface: { athleteEmail }.
 *   5. Resolve the parent's profile id from auth.uid(). If no profile
 *      row exists yet (migration unapplied or signup aborted), we
 *      return a typed 409 so the client can prompt the user to finish
 *      onboarding.
 *   6. Delegate to the parents service to perform the link. It handles
 *      both 'pending_verification' and 'pending_invitation' statuses.
 *
 * NOTE: We intentionally do NOT call the `find_hs_athlete_by_email`
 *       RPC directly here — the parents service encapsulates that
 *       lookup behind `resolveAthleteByEmail`. If/when the RPC is
 *       wired up in the service, this route benefits automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';

const bodySchema = z.object({
  athleteEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(254, 'Email is too long'),
  // Optional — falls through to the parent's own relationship if omitted.
  relationship: z.enum(['parent', 'legal_guardian']).optional(),
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

    // Parent-only route. Anyone else with a session gets a flat 403 so we
    // don't leak whether the route exists to, say, a logged-in brand.
    const role = (user.user_metadata ?? {}).role;
    if (role !== 'hs_parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(bodySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    // Resolve the parent's durable profile. The service's linkAthlete
    // needs the profile id, not the user id.
    const { data: profileRow, error: profileError } = await supabase
      .from('hs_parent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: 'Could not load parent profile' },
        { status: 500 }
      );
    }

    if (!profileRow?.id) {
      // Migration unapplied OR signup never completed the profile write.
      // Tell the client to finish onboarding rather than failing silently.
      return NextResponse.json(
        {
          error: 'Parent profile not set up yet',
          code: 'profile_missing',
        },
        { status: 409 }
      );
    }

    // Dynamic import keeps the browser-only service module out of the
    // initial route-module graph and matches the pattern used by other
    // HS-NIL routes that call into services.
    const { linkAthlete } = await import('@/lib/services/hs-nil/parents');

    const result = await linkAthlete({
      parentProfileId: profileRow.id as string,
      athleteEmail: validation.data.athleteEmail,
      relationship: validation.data.relationship,
    });

    return NextResponse.json(
      {
        ok: true,
        status: result.status, // 'pending_verification' | 'pending_invitation'
        linkId: result.linkId,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
