/**
 * HS-NIL Match Feedback Service
 * ----------------------------------------------------------------------------
 * Phase 8 flywheel for the brand→athlete matching surface. Brands leave
 * explicit signals (thumb_up / thumb_down / dismiss / saved_to_shortlist)
 * on suggested-athlete cards; implicit signals fire from the deal lifecycle
 * (proposed_deal / deal_completed / deal_cancelled). Every signal writes a
 * row to `match_feedback_events` with a precomputed weight, and the
 * updated `match_hs_athletes_for_brand` RPC folds the per-(brand,athlete)
 * aggregate back into its ranker.
 *
 * All writes use the service-role client — the RLS policy on
 * match_feedback_events grants only SELECT to the authenticated role,
 * and this module enforces the "weight must match signal" contract in
 * TypeScript rather than via a trigger so future re-weighting lives in
 * one place.
 *
 * Server-only. Do not import from client components.
 *
 * See migration `20260419_004_match_feedback.sql` for schema.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Feedback signals + weights (canonical)
// ---------------------------------------------------------------------------

/** Valid signal strings — must stay in sync with the SQL CHECK. */
export type FeedbackSignal =
  | 'thumb_up'
  | 'thumb_down'
  | 'dismiss'
  | 'saved_to_shortlist'
  | 'proposed_deal'
  | 'deal_completed'
  | 'deal_cancelled';

/** Canonical feedback weights. Mirrored in the migration comment. */
export const FEEDBACK_WEIGHTS: Readonly<Record<FeedbackSignal, number>> = {
  thumb_up: 0.1,
  thumb_down: -0.2,
  dismiss: -0.05,
  saved_to_shortlist: 0.2,
  proposed_deal: 0.4,
  deal_completed: 0.6,
  deal_cancelled: -0.3,
};

/** Source-page strings — must stay in sync with the SQL CHECK. */
export type FeedbackSourcePage =
  | '/hs/brand/suggested'
  | '/hs/brand/shortlist'
  | '/hs/brand/deals/new'
  | '/hs/brand/deals/[id]'
  | 'cron'
  | 'webhook'
  | 'admin';

// ---------------------------------------------------------------------------
// Service-role client (server-only)
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil/match-feedback] service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Idempotency groups
// ---------------------------------------------------------------------------
// Thumb / dismiss / save signals are "opinions" — a brand can only hold
// ONE opinion from each group at a time for a given athlete. Flipping a
// thumb deletes the prior opinion and inserts the new one so the affinity
// view does not accumulate contradictory weights.
//
// Deal-lifecycle signals (proposed / completed / cancelled) are additive
// events — they stack. They are NOT in any idempotency group.
// ---------------------------------------------------------------------------

const THUMB_GROUP: readonly FeedbackSignal[] = ['thumb_up', 'thumb_down'];
const DISMISS_GROUP: readonly FeedbackSignal[] = ['dismiss'];
const SAVE_GROUP: readonly FeedbackSignal[] = ['saved_to_shortlist'];

function idempotencyGroupFor(signal: FeedbackSignal): readonly FeedbackSignal[] | null {
  if (THUMB_GROUP.includes(signal)) return THUMB_GROUP;
  if (DISMISS_GROUP.includes(signal)) return DISMISS_GROUP;
  if (SAVE_GROUP.includes(signal)) return SAVE_GROUP;
  return null;
}

// ---------------------------------------------------------------------------
// recordFeedback
// ---------------------------------------------------------------------------

export interface RecordFeedbackInput {
  brandId: string;
  athleteUserId: string;
  signal: FeedbackSignal;
  sourcePage: FeedbackSourcePage;
}

export interface RecordFeedbackResult {
  id: string;
  signal: FeedbackSignal;
  weight: number;
  replacedPrior: boolean;
}

/**
 * Record a feedback signal. For thumb / dismiss / save signals, deletes
 * any prior opinion in the same idempotency group for this (brand,
 * athlete) pair before inserting so affinity reflects the brand's
 * current opinion, not their history of flip-flopping.
 *
 * For deal-lifecycle signals (proposed / completed / cancelled) this is
 * a plain append — those events stack.
 */
export async function recordFeedback(
  input: RecordFeedbackInput,
  sbOverride?: SupabaseClient
): Promise<RecordFeedbackResult> {
  const sb = sbOverride ?? getServiceRoleClient();
  const weight = FEEDBACK_WEIGHTS[input.signal];

  if (typeof weight !== 'number') {
    throw new Error(`[match-feedback] unknown signal: ${input.signal}`);
  }

  // Step 1: if this is an opinion signal, clear the prior opinion from
  // the same group so affinity reflects current state, not history.
  const group = idempotencyGroupFor(input.signal);
  let replacedPrior = false;
  if (group) {
    const { data: priors, error: deleteError } = await sb
      .from('match_feedback_events')
      .delete()
      .eq('brand_id', input.brandId)
      .eq('athlete_user_id', input.athleteUserId)
      .in('signal', group as unknown as string[])
      .select('id');
    if (deleteError) {
      // eslint-disable-next-line no-console
      console.warn(
        '[match-feedback] prior-opinion delete failed',
        deleteError.message
      );
    } else if ((priors ?? []).length > 0) {
      replacedPrior = true;
    }
  }

  // Step 2: insert the new event.
  const { data, error } = await sb
    .from('match_feedback_events')
    .insert({
      brand_id: input.brandId,
      athlete_user_id: input.athleteUserId,
      signal: input.signal,
      source_page: input.sourcePage,
      weight,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `[match-feedback] insert failed: ${error?.message ?? 'no row returned'}`
    );
  }

  return {
    id: data.id as string,
    signal: input.signal,
    weight,
    replacedPrior,
  };
}

// ---------------------------------------------------------------------------
// Shortlist operations
// ---------------------------------------------------------------------------

export interface ShortlistedAthleteRow {
  id: string;
  athleteUserId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddToShortlistInput {
  brandId: string;
  athleteUserId: string;
  notes?: string;
}

/**
 * Add an athlete to this brand's shortlist. Also emits a
 * `saved_to_shortlist` feedback signal so the affinity view reflects
 * the save as a strong positive.
 *
 * Idempotent on (brand_id, athlete_user_id) thanks to the UNIQUE
 * constraint — re-saving updates notes instead of throwing.
 */
export async function addToShortlist(
  input: AddToShortlistInput,
  sbOverride?: SupabaseClient
): Promise<ShortlistedAthleteRow> {
  const sb = sbOverride ?? getServiceRoleClient();

  const notes = input.notes?.trim() ?? null;

  const { data, error } = await sb
    .from('brand_athlete_shortlist')
    .upsert(
      {
        brand_id: input.brandId,
        athlete_user_id: input.athleteUserId,
        notes,
      },
      { onConflict: 'brand_id,athlete_user_id' }
    )
    .select('id, athlete_user_id, notes, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(
      `[match-feedback] shortlist insert failed: ${error?.message ?? 'no row returned'}`
    );
  }

  // Fire the affinity signal. Best-effort — a save is still a save
  // even if the event log write hiccups.
  try {
    await recordFeedback(
      {
        brandId: input.brandId,
        athleteUserId: input.athleteUserId,
        signal: 'saved_to_shortlist',
        sourcePage: '/hs/brand/suggested',
      },
      sb
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[match-feedback] saved_to_shortlist signal failed',
      err instanceof Error ? err.message : String(err)
    );
  }

  return {
    id: data.id as string,
    athleteUserId: data.athlete_user_id as string,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Update a brand's notes on a shortlisted athlete. Does NOT emit a
 * new affinity signal — edits are not new opinions.
 */
export async function updateShortlistNotes(
  brandId: string,
  athleteUserId: string,
  notes: string | null,
  sbOverride?: SupabaseClient
): Promise<ShortlistedAthleteRow | null> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { data, error } = await sb
    .from('brand_athlete_shortlist')
    .update({ notes: notes?.trim() || null })
    .eq('brand_id', brandId)
    .eq('athlete_user_id', athleteUserId)
    .select('id, athlete_user_id, notes, created_at, updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(`[match-feedback] shortlist update failed: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id as string,
    athleteUserId: data.athlete_user_id as string,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Remove an athlete from the brand's shortlist. Does NOT delete the
 * underlying `saved_to_shortlist` signal — that signal persists in
 * the affinity aggregation as a historical positive indicator.
 */
export async function removeFromShortlist(
  brandId: string,
  athleteUserId: string,
  sbOverride?: SupabaseClient
): Promise<{ removed: boolean }> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { data, error } = await sb
    .from('brand_athlete_shortlist')
    .delete()
    .eq('brand_id', brandId)
    .eq('athlete_user_id', athleteUserId)
    .select('id');

  if (error) {
    throw new Error(`[match-feedback] shortlist delete failed: ${error.message}`);
  }
  return { removed: (data ?? []).length > 0 };
}

// ---------------------------------------------------------------------------
// getShortlistForBrand — joined with athlete profile + affinity
// ---------------------------------------------------------------------------

export interface ShortlistedAthleteDetail extends ShortlistedAthleteRow {
  firstName: string;
  schoolName: string | null;
  sport: string | null;
  gpa: number | null;
  gpaVerificationTier: string;
  stateCode: string | null;
  graduationYear: number | null;
  affinityScore: number;
  signalCount: number;
}

/**
 * Fetch the brand's shortlist joined with the athlete profile and
 * affinity aggregate. Uses the service-role client so RLS on
 * hs_athlete_profiles doesn't hide rows we have a legitimate save on.
 */
export async function getShortlistForBrand(
  brandId: string,
  sbOverride?: SupabaseClient
): Promise<ShortlistedAthleteDetail[]> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: rows, error } = await sb
    .from('brand_athlete_shortlist')
    .select('id, athlete_user_id, notes, created_at, updated_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[match-feedback] shortlist fetch failed: ${error.message}`);
  }

  const shortlist = (rows ?? []) as Array<{
    id: string;
    athlete_user_id: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>;

  if (shortlist.length === 0) return [];

  const ids = shortlist.map((r) => r.athlete_user_id);

  // Profile lookup (service-role bypasses RLS on hs_athlete_profiles).
  const { data: profiles } = await sb
    .from('hs_athlete_profiles')
    .select(
      'user_id, school_name, sport, gpa, gpa_verification_tier, state_code, graduation_year'
    )
    .in('user_id', ids);

  const profileByUser = new Map<string, {
    user_id: string;
    school_name: string | null;
    sport: string | null;
    gpa: number | null;
    gpa_verification_tier: string;
    state_code: string | null;
    graduation_year: number | null;
  }>();
  for (const p of (profiles ?? []) as Array<{
    user_id: string;
    school_name: string | null;
    sport: string | null;
    gpa: number | null;
    gpa_verification_tier: string;
    state_code: string | null;
    graduation_year: number | null;
  }>) {
    profileByUser.set(p.user_id, p);
  }

  // Affinity lookup scoped to this brand.
  const { data: affinities } = await sb
    .from('brand_athlete_affinity')
    .select('athlete_user_id, affinity_score, signal_count')
    .eq('brand_id', brandId)
    .in('athlete_user_id', ids);

  const affinityByUser = new Map<string, { affinity_score: number; signal_count: number }>();
  for (const a of (affinities ?? []) as Array<{
    athlete_user_id: string;
    affinity_score: number | string;
    signal_count: number;
  }>) {
    affinityByUser.set(a.athlete_user_id, {
      affinity_score: Number(a.affinity_score),
      signal_count: a.signal_count,
    });
  }

  // Best-effort first-name lookup via auth admin.
  const nameByUser = new Map<string, string>();
  await Promise.all(
    ids.map(async (uid) => {
      try {
        const { data } = await sb.auth.admin.getUserById(uid);
        const meta = (data.user?.user_metadata ?? {}) as { first_name?: string };
        nameByUser.set(uid, meta.first_name?.trim() || 'Athlete');
      } catch {
        nameByUser.set(uid, 'Athlete');
      }
    })
  );

  return shortlist.map((row) => {
    const profile = profileByUser.get(row.athlete_user_id);
    const affinity = affinityByUser.get(row.athlete_user_id);
    return {
      id: row.id,
      athleteUserId: row.athlete_user_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      firstName: nameByUser.get(row.athlete_user_id) ?? 'Athlete',
      schoolName: profile?.school_name ?? null,
      sport: profile?.sport ?? null,
      gpa: profile?.gpa !== undefined && profile?.gpa !== null ? Number(profile.gpa) : null,
      gpaVerificationTier: profile?.gpa_verification_tier ?? 'self_reported',
      stateCode: profile?.state_code ?? null,
      graduationYear: profile?.graduation_year ?? null,
      affinityScore: affinity?.affinity_score ?? 0,
      signalCount: affinity?.signal_count ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// getDismissedAthleteIds — for hide-dismissed filter on /hs/brand/suggested
// ---------------------------------------------------------------------------

/**
 * List athlete ids this brand has dismissed in the last `windowDays`.
 * Used by the suggested page to filter out dismissals unless
 * ?show_dismissed=1 is set.
 */
export async function getDismissedAthleteIds(
  brandId: string,
  windowDays = 30,
  sbOverride?: SupabaseClient
): Promise<Set<string>> {
  const sb = sbOverride ?? getServiceRoleClient();
  const sinceIso = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await sb
    .from('match_feedback_events')
    .select('athlete_user_id')
    .eq('brand_id', brandId)
    .eq('signal', 'dismiss')
    .gt('created_at', sinceIso);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[match-feedback] dismiss lookup failed', error.message);
    return new Set();
  }
  return new Set(
    (data ?? []).map((r) => (r as { athlete_user_id: string }).athlete_user_id)
  );
}

/**
 * Count of athletes in the brand's shortlist. Convenience for dashboard
 * badges; does not use service role because the authenticated SELECT
 * RLS policy already scopes to own rows.
 */
export async function countShortlistForBrand(
  sb: SupabaseClient,
  brandId: string
): Promise<number> {
  const { count, error } = await sb
    .from('brand_athlete_shortlist')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId);
  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Admin aggregates
// ---------------------------------------------------------------------------

export interface AthleteFeedbackSummary {
  athleteUserId: string;
  positiveCount: number;
  negativeCount: number;
  netWeight: number;
  distinctBrands: number;
  signalBreakdown: Record<FeedbackSignal, number>;
}

/**
 * Admin-only. Collapse every brand's feedback on a given athlete into
 * a single summary — used by the admin match-quality page to flag
 * athletes who are consistently thumbed down (possible misrepresented
 * profile) or consistently saved (possible undervalued gem).
 *
 * The caller is responsible for gating to admin role before invoking.
 */
export async function getFeedbackSummaryForAthlete(
  athleteUserId: string,
  sbOverride?: SupabaseClient
): Promise<AthleteFeedbackSummary> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { data, error } = await sb
    .from('match_feedback_events')
    .select('brand_id, signal, weight')
    .eq('athlete_user_id', athleteUserId);

  if (error) {
    throw new Error(`[match-feedback] summary fetch failed: ${error.message}`);
  }

  const rows =
    (data ?? []) as Array<{
      brand_id: string;
      signal: FeedbackSignal;
      weight: number | string;
    }>;

  const breakdown: Record<FeedbackSignal, number> = {
    thumb_up: 0,
    thumb_down: 0,
    dismiss: 0,
    saved_to_shortlist: 0,
    proposed_deal: 0,
    deal_completed: 0,
    deal_cancelled: 0,
  };
  const brands = new Set<string>();
  let positive = 0;
  let negative = 0;
  let netWeight = 0;

  for (const r of rows) {
    brands.add(r.brand_id);
    if (breakdown[r.signal] !== undefined) breakdown[r.signal] += 1;
    const w = Number(r.weight);
    if (w > 0) positive += 1;
    else if (w < 0) negative += 1;
    netWeight += w;
  }

  return {
    athleteUserId,
    positiveCount: positive,
    negativeCount: negative,
    netWeight,
    distinctBrands: brands.size,
    signalBreakdown: breakdown,
  };
}

// ---------------------------------------------------------------------------
// getMatchQualityMetrics — admin dashboard
// ---------------------------------------------------------------------------

export interface MatchQualityMetrics {
  windowDays: number;
  suggestionsServed: number;
  proposedDeals: number;
  proposedRate: number;
  completedDeals: number;
  completionRate: number;
  averageAffinity: number;
  topAthletes: Array<{
    athleteUserId: string;
    maskedHandle: string;
    positiveWeight: number;
    distinctBrands: number;
  }>;
}

/**
 * Admin-only. Aggregate funnel metrics for the match flywheel.
 *
 *   - suggestionsServed: distinct athletes rendered on /hs/brand/suggested
 *     in the window. Approximated by counting distinct (brand, athlete)
 *     pairs that have ANY feedback event in the window + the at-least-
 *     shown proxy that a shown card always has the chance to be clicked.
 *     We don't have an explicit impression log; this is the best
 *     proxy without extending the schema further.
 *   - proposedRate: proposed_deal / suggestionsServed.
 *   - completionRate: deal_completed / proposed_deal (real funnel).
 *   - averageAffinity: mean SUM(weight) across brand-athlete pairs.
 *   - topAthletes: top 5 by positive-weight sum. Handles are masked
 *     as `${firstName} · ${uuidPrefix}` so the admin can audit without
 *     leaking PII into this non-sensitive surface.
 */
export async function getMatchQualityMetrics(
  windowDays = 30,
  sbOverride?: SupabaseClient
): Promise<MatchQualityMetrics> {
  const sb = sbOverride ?? getServiceRoleClient();
  const sinceIso = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: events, error } = await sb
    .from('match_feedback_events')
    .select('brand_id, athlete_user_id, signal, weight, created_at')
    .gt('created_at', sinceIso);

  if (error) {
    throw new Error(`[match-feedback] metrics fetch failed: ${error.message}`);
  }

  const rows =
    (events ?? []) as Array<{
      brand_id: string;
      athlete_user_id: string;
      signal: FeedbackSignal;
      weight: number | string;
      created_at: string;
    }>;

  const uniqueBrandAthlete = new Set<string>();
  let proposed = 0;
  let completed = 0;
  const affinityByPair = new Map<string, number>();

  for (const r of rows) {
    const key = `${r.brand_id}:${r.athlete_user_id}`;
    uniqueBrandAthlete.add(key);
    if (r.signal === 'proposed_deal') proposed += 1;
    if (r.signal === 'deal_completed') completed += 1;
    const w = Number(r.weight);
    affinityByPair.set(key, (affinityByPair.get(key) ?? 0) + w);
  }

  const suggestionsServed = uniqueBrandAthlete.size;
  const proposedRate =
    suggestionsServed > 0 ? proposed / suggestionsServed : 0;
  const completionRate = proposed > 0 ? completed / proposed : 0;
  const averageAffinity =
    affinityByPair.size > 0
      ? Array.from(affinityByPair.values()).reduce((a, b) => a + b, 0) /
        affinityByPair.size
      : 0;

  // Top athletes by positive-weight sum across brands.
  const positiveByAthlete = new Map<
    string,
    { weight: number; brands: Set<string> }
  >();
  for (const r of rows) {
    const w = Number(r.weight);
    if (w <= 0) continue;
    const entry = positiveByAthlete.get(r.athlete_user_id) ?? {
      weight: 0,
      brands: new Set<string>(),
    };
    entry.weight += w;
    entry.brands.add(r.brand_id);
    positiveByAthlete.set(r.athlete_user_id, entry);
  }

  const sorted = Array.from(positiveByAthlete.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);

  const topAthletes: MatchQualityMetrics['topAthletes'] = await Promise.all(
    sorted.map(async ([uid, v]) => {
      let firstName = 'Athlete';
      try {
        const { data } = await sb.auth.admin.getUserById(uid);
        const meta = (data.user?.user_metadata ?? {}) as { first_name?: string };
        firstName = (meta.first_name ?? '').trim() || 'Athlete';
      } catch {
        // fall through
      }
      return {
        athleteUserId: uid,
        maskedHandle: `${firstName} · ${uid.slice(0, 8)}`,
        positiveWeight: Number(v.weight.toFixed(3)),
        distinctBrands: v.brands.size,
      };
    })
  );

  return {
    windowDays,
    suggestionsServed,
    proposedDeals: proposed,
    proposedRate,
    completedDeals: completed,
    completionRate,
    averageAffinity: Number(averageAffinity.toFixed(4)),
    topAthletes,
  };
}

// ---------------------------------------------------------------------------
// Implicit-signal call-site TODOs
// ---------------------------------------------------------------------------
//
// These signals fire from OTHER modules. Match-Feedback does NOT edit those
// modules — the TODO notes below flag the exact spot where a follow-up pass
// must call recordFeedback().
//
// 1) proposed_deal
//    File:      src/app/api/deals/route.ts
//    Function:  POST handler that creates a new deal row.
//    Condition: target_bracket != 'college' AND the request was initiated
//               from the suggested-athletes surface (signed athlete-ref
//               present — see signAthleteRef / verifyAthleteRef in
//               matching.ts).
//    Call:      await recordFeedback({
//                 brandId, athleteUserId,
//                 signal: 'proposed_deal',
//                 sourcePage: '/hs/brand/deals/new',
//               });
//
// 2) deal_completed
//    File:      src/lib/hs-nil/completion-hooks.ts
//    Function:  afterDealPaid()
//    Condition: after the status → 'paid' promotion, once brand + athlete
//               are loaded.
//    Call:      await recordFeedback({
//                 brandId: deal.brand.id,
//                 athleteUserId: deal.athlete.profile_id,
//                 signal: 'deal_completed',
//                 sourcePage: 'webhook',
//               });
//
// 3) deal_cancelled
//    Files:     src/lib/hs-nil/approvals.ts (request_revision → decline
//               loop, and explicit reject handlers),
//               src/lib/hs-nil/disputes.ts (resolveInFavorOfBrand when
//               the deal terminates unfavorably for the athlete),
//               src/app/api/hs/deals/[id]/... for any manual cancel.
//    Condition: fires exactly once when a deal transitions to
//               'rejected' | 'cancelled' | 'disputed_brand_win'.
//    Call:      await recordFeedback({
//                 brandId, athleteUserId,
//                 signal: 'deal_cancelled',
//                 sourcePage: 'webhook',
//               });
//
// These TODOs are intentionally NOT implemented here — the co-agents in
// parallel own those files and edits must be serialized. MATCH-FEEDBACK's
// scope is the data model + service + UI only.
// ---------------------------------------------------------------------------
