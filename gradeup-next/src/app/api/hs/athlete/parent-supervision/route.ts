/**
 * /api/hs/athlete/parent-supervision
 *
 * Athlete-owned toggle for removing parent supervision once the
 * athlete turns 18 OR is past their high-school graduation year.
 *
 *   GET    → { eligible, ageYears, ageMonths, graduationYear,
 *             parentUnlinkedAt, parentUnlinkReason, parent }
 *     The client uses this to render the toggle state + the "you can
 *     unlink when you turn 18 or graduate" copy when not yet eligible.
 *
 *   PATCH  → { action: 'unlink' | 'relink', reason? }
 *     Flips hs_athlete_profiles.parent_unlinked_at +
 *     parent_unlink_reason. Server re-verifies eligibility — the
 *     client UI is a hint, the server is the gate.
 *
 * Auth: SSR Supabase client (session cookie). Athlete-only.
 *       CSRF: enforced by middleware's double-submit cookie pattern
 *       for PATCH; the client attaches X-CSRF-Token from the
 *       csrf_token cookie (see src/hooks/useCsrf.ts).
 *
 * We intentionally DO NOT touch hs_parent_athlete_links rows or
 * parental_consents rows on unlink. Historical parental approval
 * of past deals stays auditable forever; the flag on this profile
 * only skips the consent-scope gate on NEW deals going forward
 * (see deal-validation.ts::checkConsentScope).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/**
 * Shape returned by GET — mirrors the server-trusted state the
 * ParentSupervisionCard renders from. Exported so the client
 * component can type the fetch response without re-declaring.
 */
export interface ParentSupervisionState {
  /** True when the athlete is allowed to unlink (age >= 18 OR graduated). */
  eligible: boolean;
  /** Age in whole years, or null when date_of_birth is missing. */
  ageYears: number | null;
  /** Leftover months after the whole years, 0-11. Null when dob missing. */
  ageMonths: number | null;
  /** 4-digit graduation year from hs_athlete_profiles. */
  graduationYear: number;
  /** ISO timestamp when the athlete unlinked, or null. */
  parentUnlinkedAt: string | null;
  /** Reason recorded at unlink time, or null. */
  parentUnlinkReason: 'turned_18' | 'graduated' | 'athlete_choice' | null;
  /**
   * Public-safe parent info for the "re-link" confirmation UI.
   * Null when no verified parent link exists.
   */
  parent: {
    /** hs_parent_athlete_links.id — carried back to the client for reference. */
    linkId: string;
    /** Parent's email, masked (e.g. "j***@example.com") so re-link is recognisable without leaking. */
    emailMasked: string | null;
    /** Parent full_name from hs_parent_profiles, for human confirmation. */
    fullName: string | null;
  } | null;
}

// ----------------------------------------------------------------------------
// PATCH body validation
// ----------------------------------------------------------------------------

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('unlink'),
    reason: z.enum(['turned_18', 'graduated', 'athlete_choice']),
  }),
  z.object({
    action: z.literal('relink'),
  }),
]);

// ----------------------------------------------------------------------------
// Eligibility + helpers
// ----------------------------------------------------------------------------

interface AgeBreakdown {
  years: number | null;
  months: number | null;
}

/**
 * Compute whole-year + leftover-month age from an ISO date-of-birth.
 * Returns { years: null, months: null } when dob is missing or
 * unparseable so callers can fall back to graduation-year gating.
 */
function ageFromDob(dob: string | null): AgeBreakdown {
  if (!dob) return { years: null, months: null };
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return { years: null, months: null };

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  // Guard against future-dated DOBs in bad data.
  if (years < 0) return { years: 0, months: 0 };
  return { years, months };
}

/**
 * Athlete is eligible to unlink when either:
 *   * age >= 18 (legal adult — can sign their own deals), OR
 *   * graduation_year <= current calendar year (they're past HS,
 *     which matches the product framing: HS-NIL gating ends at
 *     graduation even if they're a young senior).
 *
 * When date_of_birth is missing we only use the graduation check.
 */
function computeEligibility(params: {
  ageYears: number | null;
  graduationYear: number;
}): boolean {
  const currentYear = new Date().getUTCFullYear();
  if (params.graduationYear <= currentYear) return true;
  if (params.ageYears !== null && params.ageYears >= 18) return true;
  return false;
}

/**
 * Light email mask. "jane.doe@example.com" → "j***@example.com".
 * Used only for UI confirmation on re-link — we never surface the
 * full parent email to the athlete surface post-unlink.
 */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

// ----------------------------------------------------------------------------
// Shared: load the athlete's supervision state
// ----------------------------------------------------------------------------

interface ProfileRow {
  user_id: string;
  date_of_birth: string | null;
  graduation_year: number;
  parent_unlinked_at: string | null;
  parent_unlink_reason: string | null;
}

async function loadSupervisionState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<
  | { ok: true; state: ParentSupervisionState }
  | { ok: false; status: number; error: string }
> {
  const { data: profileData, error: profileErr } = await supabase
    .from('hs_athlete_profiles')
    .select(
      'user_id, date_of_birth, graduation_year, parent_unlinked_at, parent_unlink_reason',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    return { ok: false, status: 500, error: 'Could not load athlete profile.' };
  }
  if (!profileData) {
    return {
      ok: false,
      status: 404,
      error: 'No HS athlete profile found for this user.',
    };
  }

  const profile = profileData as ProfileRow;
  const age = ageFromDob(profile.date_of_birth);
  const eligible = computeEligibility({
    ageYears: age.years,
    graduationYear: profile.graduation_year,
  });

  // Pull the most recent VERIFIED parent link so the UI can show
  // "re-link to Jane Doe (j***@example.com)" after an unlink.
  // We only look at verified rows — a pending invite isn't
  // supervising the athlete yet.
  const { data: linkRow } = await supabase
    .from('hs_parent_athlete_links')
    .select('id, parent_profile_id, verified_at')
    .eq('athlete_user_id', userId)
    .not('verified_at', 'is', null)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let parent: ParentSupervisionState['parent'] = null;
  if (linkRow) {
    const typedLink = linkRow as {
      id: string;
      parent_profile_id: string;
      verified_at: string | null;
    };

    // Parent email lives on auth.users.email (via the parent's user_id),
    // which isn't queryable from the athlete's session under RLS. We
    // fall back to hs_parent_profiles.full_name and omit the email when
    // we can't resolve it safely — the masked email is a nice-to-have.
    const { data: parentProfile } = await supabase
      .from('hs_parent_profiles')
      .select('full_name, user_id')
      .eq('id', typedLink.parent_profile_id)
      .maybeSingle();

    const typedParent = parentProfile as
      | { full_name: string | null; user_id: string | null }
      | null;

    parent = {
      linkId: typedLink.id,
      emailMasked: null, // email lives in auth.users; not worth a service-role hop here
      fullName: typedParent?.full_name ?? null,
    };
  }

  return {
    ok: true,
    state: {
      eligible,
      ageYears: age.years,
      ageMonths: age.months,
      graduationYear: profile.graduation_year,
      parentUnlinkedAt: profile.parent_unlinked_at,
      parentUnlinkReason:
        profile.parent_unlink_reason as ParentSupervisionState['parentUnlinkReason'],
      parent,
    },
  };
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
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

    // No rate limit on GET — state is tiny + read-only; the
    // settings page fetches it once per page load.

    const result = await loadSupervisionState(supabase, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// PATCH
// ----------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(patchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 },
      );
    }

    const payload = validation.data;

    // Re-verify eligibility server-side for unlink. Relink is always
    // allowed — an athlete can always invite supervision back, even
    // before 18, because restoring oversight never weakens protection.
    const stateResult = await loadSupervisionState(supabase, user.id);
    if (!stateResult.ok) {
      return NextResponse.json(
        { error: stateResult.error },
        { status: stateResult.status },
      );
    }

    if (payload.action === 'unlink') {
      if (!stateResult.state.eligible) {
        return NextResponse.json(
          {
            error:
              'Not yet eligible to remove parent supervision. You can unlink when you turn 18 or after you graduate.',
            code: 'not_eligible',
          },
          { status: 403 },
        );
      }

      const { error: updateErr } = await supabase
        .from('hs_athlete_profiles')
        .update({
          parent_unlinked_at: new Date().toISOString(),
          parent_unlink_reason: payload.reason,
        })
        .eq('user_id', user.id);

      if (updateErr) {
        return NextResponse.json(
          { error: `Could not unlink: ${updateErr.message}` },
          { status: 500 },
        );
      }
    } else {
      // relink — clear both columns
      const { error: updateErr } = await supabase
        .from('hs_athlete_profiles')
        .update({
          parent_unlinked_at: null,
          parent_unlink_reason: null,
        })
        .eq('user_id', user.id);

      if (updateErr) {
        return NextResponse.json(
          { error: `Could not re-link: ${updateErr.message}` },
          { status: 500 },
        );
      }
    }

    // Return the refreshed state so the client can update in a
    // single round trip — avoids a PATCH-then-GET race.
    const refreshed = await loadSupervisionState(supabase, user.id);
    if (!refreshed.ok) {
      return NextResponse.json(
        { error: refreshed.error },
        { status: refreshed.status },
      );
    }

    return NextResponse.json(refreshed.state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
