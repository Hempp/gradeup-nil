/**
 * POST /api/hs/admin/actions/transition-verify
 *
 * Admin-only. Verifies a pending bracket transition:
 *   1. Stamps the transition row (status='verified', confirmed_at=now,
 *      reviewer_user_id).
 *   2. Flips athletes.bracket='college' (single-table UPDATE keyed on
 *      profile_id; hs_athlete_profiles is preserved as history).
 *   3. Writes admin_audit_log (action='transition_verified',
 *      target_kind='athlete_transition').
 *   4. Best-effort: emails the athlete.
 *
 * Body: { transitionId: uuid }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  verifyTransition,
  getTransitionById,
} from '@/lib/hs-nil/transitions';
import { sendTransitionVerifiedToAthlete } from '@/lib/services/hs-nil/transition-emails';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const schema = z
  .object({
    transitionId: z.string().uuid(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await verifyTransition(v.data.transitionId, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        {
          status:
            result.code === 'not_found'
              ? 404
              : result.code === 'invalid_state'
                ? 400
                : 400,
        }
      );
    }

    // Best-effort athlete email. Needs the refreshed row for college name +
    // matriculation date, plus the athlete's email from auth.users.
    void (async () => {
      const row = await getTransitionById(v.data.transitionId);
      if (!row) return;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return;
      const sr = createServiceClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authUser } = await sr.auth.admin.getUserById(
        row.athlete_user_id
      );
      const email = authUser?.user?.email;
      if (!email) return;
      const firstName =
        (authUser.user?.user_metadata?.first_name as string | undefined) ??
        undefined;
      await sendTransitionVerifiedToAthlete({
        athleteEmail: email,
        athleteName: firstName,
        collegeName: row.college_name,
        matriculationDate: row.matriculation_date,
      });
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[transition-verify] email side-effect failed', err);
    });

    return NextResponse.json({
      ok: true,
      athleteUserId: result.data.athleteUserId,
      bracketFlipped: result.data.bracketFlipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/transition-verify]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
