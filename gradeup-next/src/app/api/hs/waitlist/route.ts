import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  validateInput,
  formatValidationError,
  safeText,
} from '@/lib/validations';
import { sendWaitlistConfirmation } from '@/lib/services/hs-nil/emails';
import { checkAndEnroll } from '@/lib/hs-nil/nurture-sequences';

/**
 * HS-NIL waitlist capture.
 *
 * Unauthenticated POST endpoint. Gated behind the HS_NIL feature flag
 * (returns 404 when disabled so we don't advertise its existence).
 * Rate-limited by IP to prevent list spam.
 */

const PILOT_STATE_SET = new Set<USPSStateCode>(PILOT_STATES);

const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(254),
  role: z.enum(['athlete', 'parent', 'coach', 'brand']),
  state_code: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'State code must be 2 letters'),
  grad_year: z
    .number()
    .int()
    .min(2026)
    .max(2035)
    .optional()
    .nullable(),
  sport: safeText(80).optional().nullable(),
  school_name: safeText(160).optional().nullable(),
  referred_by: safeText(160).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Hard gate: HS flag off → route does not exist.
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Unauthenticated — rate-limit by IP.
    const rateLimited = await enforceRateLimit(request, 'mutation', null);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(waitlistSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const input = validation.data;

    // Only pilot states are valid waitlist targets for now. Everyone
    // else should go through the "my state isn't listed" path on the
    // client, which submits a different payload (or nothing at all).
    if (!PILOT_STATE_SET.has(input.state_code as USPSStateCode)) {
      return NextResponse.json(
        { error: `State ${input.state_code} is not yet open for the HS-NIL pilot` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Reject states we know prohibit HS NIL outright. Even if a pilot
    // state got added to the prohibited list, this check surfaces it.
    const { data: rules, error: rulesError } = await supabase
      .from('state_nil_rules')
      .select('status')
      .eq('state_code', input.state_code)
      .single();

    if (rulesError || !rules) {
      return NextResponse.json(
        { error: `Unknown state ${input.state_code}` },
        { status: 400 }
      );
    }

    if (rules.status === 'prohibited') {
      return NextResponse.json(
        { error: `HS NIL is currently prohibited in ${input.state_code}` },
        { status: 400 }
      );
    }

    // Insert. The unique index on (lower(email), role) gives us
    // idempotent "already on list" behavior without a race-prone
    // pre-check. We select the id so the nurture enrollment hook
    // below can fire on the new row.
    const { data: insertedRow, error: insertError } = await supabase
      .from('hs_waitlist')
      .insert({
        email: input.email,
        role: input.role,
        state_code: input.state_code,
        grad_year: input.grad_year ?? null,
        sport: input.sport ?? null,
        school_name: input.school_name ?? null,
        referred_by: input.referred_by ?? null,
      })
      .select('id')
      .maybeSingle();

    // Duplicate → treat as success (the user's intent is "be on the
    // list"; they don't need to know they double-submitted).
    const isDuplicate =
      insertError &&
      // Postgres unique violation
      ((insertError as { code?: string }).code === '23505' ||
        /duplicate key|unique/i.test(insertError.message ?? ''));

    if (insertError && !isDuplicate) {
      return NextResponse.json(
        { error: 'Could not join waitlist. Please try again.' },
        { status: 500 }
      );
    }

    // Compute position. The count is the *total* rows — the caller
    // uses this as a ranking signal. We intentionally don't try to
    // return the exact per-row position; total count is the marketing
    // number people care about.
    const { count } = await supabase
      .from('hs_waitlist')
      .select('id', { count: 'exact', head: true });

    // Fire confirmation email. Fail-closed: the DB row is the source of
    // truth for waitlist membership; if Resend is down we still return
    // success to the caller and log the failure for out-of-band retry.
    // We intentionally skip the send on duplicate signups so re-submitters
    // don't get spammed with "welcome" mails every time they click.
    if (!isDuplicate) {
      try {
        await sendWaitlistConfirmation({
          email: input.email,
          role: input.role,
          stateCode: input.state_code,
          position: count ?? null,
        });
      } catch (err) {
        // Defensive — sendWaitlistConfirmation already returns a result
        // object rather than throwing, but belt-and-suspenders here so
        // an unexpected error never breaks the signup.
        // eslint-disable-next-line no-console
        console.warn('[hs-nil waitlist] confirmation email threw', {
          email: input.email,
          role: input.role,
          stateCode: input.state_code,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Phase 15 — enroll this new waitlist row in the role-appropriate
      // nurture sequence. Best-effort wrap: if this fails we still
      // return success because the user IS on the list (that's the
      // source-of-truth signal). The day-1 email fires tomorrow via
      // the hs-nurture-sequencer cron.
      const newWaitlistId = insertedRow?.id;
      if (newWaitlistId) {
        try {
          await checkAndEnroll(newWaitlistId);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[hs-nil waitlist] nurture enrollment threw', {
            waitlistId: newWaitlistId,
            role: input.role,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      position: count ?? null,
      alreadyOnList: Boolean(isDuplicate),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

