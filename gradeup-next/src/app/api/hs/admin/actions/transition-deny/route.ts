/**
 * POST /api/hs/admin/actions/transition-deny
 *
 * Admin-only. Denies a pending bracket transition with a reason
 * (minimum 20 characters — this is the copy the athlete sees in the
 * email and on the status card). Writes admin_audit_log.
 *
 * Body: { transitionId: uuid, denialReason: string >= 20 }
 *
 * Note: "Request more info" is deliberately not implemented in this
 * pass. TODO: add a third status transition ('needs_more_info') that
 * lets the athlete submit a second proof without a full re-initiation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { denyTransition, getTransitionById } from '@/lib/hs-nil/transitions';
import { sendTransitionDeniedToAthlete } from '@/lib/services/hs-nil/transition-emails';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const schema = z
  .object({
    transitionId: z.string().uuid(),
    denialReason: z.string().min(20).max(2000),
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

    const result = await denyTransition(
      v.data.transitionId,
      user.id,
      v.data.denialReason
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        {
          status: result.code === 'not_found' ? 404 : 400,
        }
      );
    }

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
      await sendTransitionDeniedToAthlete({
        athleteEmail: email,
        athleteName: firstName,
        collegeName: row.college_name,
        denialReason: row.denial_reason ?? v.data.denialReason,
      });
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[transition-deny] email side-effect failed', err);
    });

    return NextResponse.json({
      ok: true,
      athleteUserId: result.data.athleteUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/transition-deny]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
