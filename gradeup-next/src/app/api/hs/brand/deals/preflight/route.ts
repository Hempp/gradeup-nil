/**
 * POST /api/hs/brand/deals/preflight
 *
 * Dry-run endpoint used by the HS brand deal-creation form. Runs
 * validateDealCreation() against the specified athlete and returns the
 * state-rule result without writing anything.
 *
 * Contract:
 *   - Feature-flag gated: 404 when FEATURE_HS_NIL is off.
 *   - Authenticated brand only: the caller's user_id must own a `brands`
 *     row with is_hs_enabled=true. 401 otherwise.
 *   - Rate-limited via the shared `mutation` bucket (the call is
 *     non-mutating but it does an authenticated RPC lookup that could be
 *     abused for email enumeration — same budget as a real write).
 *   - Accepts a partial payload. Missing fields are tolerated — we only
 *     run the validator if we have enough data. If `resolve_only: true`
 *     is set, we only resolve the athlete and return the id (used by the
 *     submit path to save a round-trip).
 *
 * Returns:
 *   { ok: true,  athlete_id, state_code, requires_disclosure, consent_category }
 *   { ok: false, violations: string[], athlete_id?: string }
 *   { error: string }   // 4xx/5xx
 *
 * Privacy:
 *   The underlying find_hs_athlete_by_email RPC returns only the fields
 *   needed to disambiguate the match (first_name, school_name, state).
 *   We do NOT forward those back to the brand UI — the preflight
 *   response is intentionally scoped to validation results. If the
 *   athlete doesn't exist, we return a generic "no HS athlete with that
 *   email" message (same observable as RLS-hidden) to avoid enumeration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateDealCreation } from '@/lib/hs-nil/deal-validation';

// Everything in this schema is optional-ish. The preflight should run
// even with partial data — callers POST as soon as they have an email +
// a category so they get early feedback.
const preflightSchema = z.object({
  athlete_email: z.string().email().min(3).max(320),
  brand_id: z.string().uuid().optional(),
  title: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  deal_type: z.string().trim().min(1).max(40).optional(),
  compensation_type: z.string().trim().min(1).max(40).optional(),
  compensation_amount: z.number().min(0).max(100_000_000).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  deliverables: z.array(z.string()).max(50).optional().nullable(),
  tags: z.array(z.string()).max(20).optional().nullable(),
  target_bracket: z.string().optional(),
  involves_school_ip: z.boolean().optional(),
  is_contingent_on_performance: z.boolean().optional(),
  resolve_only: z.boolean().optional(),
});

interface AthleteLookupRow {
  user_id: string;
  first_name: string | null;
  school_name: string | null;
  state_code: string | null;
}

export async function POST(request: NextRequest) {
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
  const parsed = preflightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join('; '),
      },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  // Authorization: caller must own an HS-enabled brand.
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, profile_id, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string; is_hs_enabled: boolean }>();

  if (brandErr || !brand) {
    return NextResponse.json(
      { error: 'Brand profile not found' },
      { status: 403 }
    );
  }
  if (brand.is_hs_enabled !== true) {
    return NextResponse.json(
      { error: 'Brand is not HS-enabled' },
      { status: 403 }
    );
  }
  if (payload.brand_id && payload.brand_id !== brand.id) {
    return NextResponse.json(
      { error: 'brand_id mismatch' },
      { status: 403 }
    );
  }

  // Resolve athlete by email via the SECURITY DEFINER RPC. Returns empty
  // array for non-athletes / college-only emails.
  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    'find_hs_athlete_by_email',
    { lookup_email: payload.athlete_email.trim().toLowerCase() }
  );
  if (rpcErr) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-preflight] athlete lookup failed', rpcErr.message);
    return NextResponse.json(
      { ok: false, violations: ['Could not look up athlete right now.'] },
      { status: 502 }
    );
  }
  const rows = (rpcRows ?? []) as AthleteLookupRow[];
  const match = rows[0];
  if (!match?.user_id) {
    return NextResponse.json(
      {
        ok: false,
        violations: [
          'No HS athlete found with that email. Ask the athlete to sign up first, then retry.',
        ],
      },
      { status: 200 }
    );
  }

  // Translate auth.users.id → athletes.id. The deals table FKs
  // athletes(id), not auth users. The 20260418_008 backfill migration
  // guarantees one athletes row per HS signup, but we defensively
  // handle the miss.
  const { data: athleteRow } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', match.user_id)
    .maybeSingle<{ id: string }>();

  if (!athleteRow?.id) {
    return NextResponse.json(
      {
        ok: false,
        violations: [
          'Athlete account exists but is not fully provisioned yet. Ask them to open their dashboard once, then retry.',
        ],
      },
      { status: 200 }
    );
  }

  // Resolve-only mode: skip validation, hand back the id for the
  // submit path.
  if (payload.resolve_only) {
    return NextResponse.json(
      { ok: true, athlete_id: athleteRow.id },
      { status: 200 }
    );
  }

  // We need enough deal shape to validate. If the caller didn't send
  // deal_type + compensation_amount, we return a soft "not ready yet"
  // rather than erroring — preflight is best-effort.
  if (!payload.deal_type || typeof payload.compensation_amount !== 'number') {
    return NextResponse.json(
      {
        ok: false,
        violations: [
          'Preflight needs at minimum a deal category and compensation amount.',
        ],
      },
      { status: 200 }
    );
  }

  // The athletes row keyed on this HS user. validateDealCreation reads
  // hs_athlete_profiles directly to get state_code + DOB — it only
  // needs athlete.user_id + athlete.bracket.
  const result = await validateDealCreation({
    deal: {
      target_bracket: payload.target_bracket ?? 'high_school',
      deal_type: payload.deal_type,
      compensation_amount: payload.compensation_amount,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      tags: payload.tags ?? null,
      involves_school_ip: payload.involves_school_ip ?? false,
      is_contingent_on_performance: payload.is_contingent_on_performance ?? false,
    },
    athlete: {
      user_id: match.user_id,
      bracket: 'high_school',
    },
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        violations: result.violations,
        athlete_id: athleteRow.id,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      athlete_id: athleteRow.id,
      state_code: result.state_code,
      requires_disclosure: result.requires_disclosure,
      consent_category: result.consent_category,
    },
    { status: 200 }
  );
}
