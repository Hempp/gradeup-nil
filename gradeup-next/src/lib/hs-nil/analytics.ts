/**
 * HS-NIL Founder Analytics Aggregation Service
 * ----------------------------------------------------------------------------
 * Read-only aggregation helpers for the founder / ops-lead analytics
 * dashboard at /hs/admin/analytics.
 *
 * Every function here issues SELECTs only. All write paths stay out of this
 * module — callers should pass the authenticated Supabase SSR client, and
 * the page-level admin role-gate is the caller's responsibility (mirrors the
 * pattern in src/app/(hs)/hs/admin/page.tsx).
 *
 * Performance notes
 * ─────────────────
 * Postgres does the heavy lifting. Time-bucketed aggregations use
 * `date_trunc` server-side where possible (via the `.rpc`-style count
 * queries with range predicates). Where an aggregate requires grouping
 * that PostgREST cannot express compactly (`GROUP BY date_trunc(...)`),
 * we fall back to a tight ranged SELECT that pulls only the columns
 * needed and does the bucketing in JS — always paired with a date
 * range to keep the row count bounded. Any such path is flagged with
 * a `// TODO(materialized-view)` comment.
 *
 * Date range defaults are set by the caller (pages). All functions
 * accept ISO strings (`YYYY-MM-DD` or full timestamps) so URL query
 * params can flow through without conversion.
 *
 * Cohort retention metric (authoritative definition)
 * ──────────────────────────────────────────────────
 *   Cohort:     calendar week an athlete's hs_athlete_profiles row was
 *               created (ISO week, UTC).
 *   Week N:     number of full calendar weeks since cohort start.
 *   Retained:   the athlete triggered at least one of the following
 *               events in week N:
 *                 1. ≥1 row in deal_share_events with user_id = athlete
 *                 2. ≥1 parental_consents row with athlete_user_id =
 *                    athlete AND signed_at within the week
 *                 3. ≥1 deals row where athlete_id belongs to this
 *                    athlete AND deals.updated_at within the week
 *                    AND status != 'draft' (proxy for a status
 *                    transition — we don't track per-status timestamps
 *                    for every transition).
 *   Rate:       count(retained athletes) / count(cohort size).
 *
 * Privacy
 * ───────
 * Individual PII never leaves this module in aggregate views. Top-
 * referrers may include first-name + last-initial (admin is already
 * role-gated at the page layer; this is comparable to what admin
 * already sees on /hs/admin).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface DateRange {
  rangeStart: string; // ISO
  rangeEnd: string; // ISO (inclusive semantically; half-open in practice)
}

export interface FunnelFilter extends DateRange {
  stateCode?: string | null;
}

export interface SignupFunnel {
  waitlistCount: number;
  invitedCount: number;
  signupCount: number;
  consentCount: number;
  dealCount: number;
  dealPaidCount: number;
  shareCount: number;
  /** conversion rate from previous step, 0..1, step-aligned array */
  stepRates: Array<{
    from: string;
    to: string;
    rate: number;
  }>;
}

export interface CohortRow {
  cohortWeekStart: string; // ISO, Monday 00:00 UTC
  cohortSize: number;
  /** weeksSinceSignup[0] = retention in week 0 (signup week itself); null if future */
  weeksSinceSignup: Array<number | null>;
}

export interface CohortMatrix {
  maxWeeks: number;
  rows: CohortRow[];
}

export interface DealVolumePoint {
  bucketStart: string; // ISO
  count: number;
  amountCents: number;
}

export interface ReferralSummary {
  totalReferredClicks: number;
  totalReferredSignups: number;
  totalReferredConsents: number;
  totalReferredFirstDeals: number;
  clickToSignupRate: number;
  signupToConsentRate: number;
  topReferrers: Array<{
    referringUserId: string;
    displayName: string; // first-name + last-initial, admin-only
    signups: number;
    conversions: number; // first_deal_signed events
  }>;
  /** Compare referred cohort vs organic cohort on signup→consent conversion. */
  referredSignupToConsent: number;
  organicSignupToConsent: number;
}

export interface MatchRankerQuality {
  suggestedCount: number;
  proposedCount: number;
  proposedRate: number;
  completedCount: number;
  completedRateAmongProposed: number;
  /** Avg days between the first 'thumb_up'-ish signal and the 'proposed_deal' signal per athlete. */
  avgDaysSuggestToPropose: number | null;
}

export interface StateActivation {
  stateCode: string;
  waitlistCount: number;
  signupCount: number;
  waitlistToSignup: number; // 0..1
  activeDealCount: number;
}

export interface DisputeRate {
  totalDeals: number;
  totalDisputes: number;
  disputesPer100Deals: number;
  resolutionBreakdown: Record<string, number>;
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

const COMPLETED_STATUSES = ['paid', 'completed'] as const;
const ACTIVE_DEAL_STATUSES = [
  'pending',
  'negotiating',
  'accepted',
  'active',
] as const;

function toCents(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function safeRate(num: number, denom: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(denom) || denom <= 0) return 0;
  return num / denom;
}

/** Monday-00:00 UTC for the ISO week containing `d`. */
function isoWeekStartUtc(d: Date): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dow = x.getUTCDay(); // 0 = Sunday
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  x.setUTCDate(x.getUTCDate() - daysFromMonday);
  return x;
}

function truncDayUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function truncMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function weeksBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

// ----------------------------------------------------------------------------
// 1. Signup funnel
// ----------------------------------------------------------------------------

export async function getSignupFunnel(
  supabase: SupabaseClient,
  opts: FunnelFilter
): Promise<SignupFunnel> {
  const { rangeStart, rangeEnd, stateCode } = opts;
  const state = stateCode && stateCode !== 'all' ? stateCode : null;

  // Waitlist — all rows created in window. Optional state filter.
  const waitlistQ = supabase
    .from('hs_waitlist')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd);
  if (state) waitlistQ.eq('state_code', state);
  const waitlistRes = await waitlistQ;
  if (waitlistRes.error) throw waitlistRes.error;
  const waitlistCount = waitlistRes.count ?? 0;

  // Invited — hs_waitlist with invitation_sent_at in window.
  const invitedQ = supabase
    .from('hs_waitlist')
    .select('*', { count: 'exact', head: true })
    .gte('invitation_sent_at', rangeStart)
    .lt('invitation_sent_at', rangeEnd);
  if (state) invitedQ.eq('state_code', state);
  const invitedRes = await invitedQ;
  if (invitedRes.error) throw invitedRes.error;
  const invitedCount = invitedRes.count ?? 0;

  // Signups — hs_athlete_profiles created in window (the authoritative HS athlete signup event).
  const signupQ = supabase
    .from('hs_athlete_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd);
  if (state) signupQ.eq('state_code', state);
  const signupRes = await signupQ;
  if (signupRes.error) throw signupRes.error;
  const signupCount = signupRes.count ?? 0;

  // Consents signed in window.
  const consentQ = supabase
    .from('parental_consents')
    .select('*', { count: 'exact', head: true })
    .gte('signed_at', rangeStart)
    .lt('signed_at', rangeEnd);
  const consentRes = await consentQ;
  if (consentRes.error) throw consentRes.error;
  const consentCount = consentRes.count ?? 0;

  // Deal signed — deals with target_bracket=high_school created in window.
  const dealQ = supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .eq('target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd);
  if (state) dealQ.eq('state_code', state);
  const dealRes = await dealQ;
  if (dealRes.error) throw dealRes.error;
  const dealCount = dealRes.count ?? 0;

  // Paid/completed deals — completed_at in window.
  const paidQ = supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .eq('target_bracket', 'high_school')
    .in('status', [...COMPLETED_STATUSES])
    .gte('completed_at', rangeStart)
    .lt('completed_at', rangeEnd);
  if (state) paidQ.eq('state_code', state);
  const paidRes = await paidQ;
  if (paidRes.error) throw paidRes.error;
  const dealPaidCount = paidRes.count ?? 0;

  // Share events — all share events in window for HS deals. deal_share_events
  // doesn't carry target_bracket directly; we join via deals. PostgREST nested
  // filter uses the ! syntax.
  // TODO(materialized-view): add hs_share_event_counts view if this becomes hot.
  const shareQ = supabase
    .from('deal_share_events')
    .select('deal_id, deals!inner(target_bracket)', {
      count: 'exact',
      head: true,
    })
    .eq('deals.target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd);
  const shareRes = await shareQ;
  if (shareRes.error) throw shareRes.error;
  const shareCount = shareRes.count ?? 0;

  const stepRates = [
    {
      from: 'waitlist',
      to: 'invited',
      rate: safeRate(invitedCount, waitlistCount),
    },
    {
      from: 'invited',
      to: 'signup',
      rate: safeRate(signupCount, invitedCount),
    },
    {
      from: 'signup',
      to: 'consent',
      rate: safeRate(consentCount, signupCount),
    },
    {
      from: 'consent',
      to: 'deal_signed',
      rate: safeRate(dealCount, consentCount),
    },
    {
      from: 'deal_signed',
      to: 'deal_paid',
      rate: safeRate(dealPaidCount, dealCount),
    },
    {
      from: 'deal_paid',
      to: 'share',
      rate: safeRate(shareCount, dealPaidCount),
    },
  ];

  return {
    waitlistCount,
    invitedCount,
    signupCount,
    consentCount,
    dealCount,
    dealPaidCount,
    shareCount,
    stepRates,
  };
}

// ----------------------------------------------------------------------------
// 2. Weekly cohort retention matrix
// ----------------------------------------------------------------------------
// Returns up to `cohortWeeks` rows (one per cohort week) × up to `cohortWeeks`
// columns (weeks since signup). Bounded: cohortWeeks=12 → at most 144 cells.
//
// Rationale for in-JS assembly: the input row count is bounded by
// `hs_athlete_profiles` over the window (currently hundreds, pilot-scale).
// A single SELECT with a narrow column set is cheaper than orchestrating
// three joined `date_trunc` queries. If the signup table balloons past
// ~10k rows this should move to a SQL view.
// TODO(materialized-view): hs_cohort_retention_weekly if signup volume > 10k.

export async function getWeeklyCohortRetention(
  supabase: SupabaseClient,
  opts: { cohortWeeks: number }
): Promise<CohortMatrix> {
  const cohortWeeks = Math.max(1, Math.min(52, opts.cohortWeeks));

  const now = new Date();
  const thisWeekStart = isoWeekStartUtc(now);
  const windowStart = addDays(thisWeekStart, -cohortWeeks * 7);
  const windowStartIso = windowStart.toISOString();

  // 1. Cohort membership: all HS athlete profiles in window.
  const { data: profiles, error: profileErr } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id, created_at')
    .gte('created_at', windowStartIso)
    .limit(5000); // sanity cap; pilot unlikely to hit.
  if (profileErr) throw profileErr;
  if (!profiles || profiles.length === 0) {
    return { maxWeeks: cohortWeeks, rows: [] };
  }

  type P = { user_id: string; created_at: string };
  const typedProfiles = profiles as P[];

  const athleteIds = typedProfiles.map((p) => p.user_id);
  const cohortByAthlete = new Map<string, Date>();
  for (const p of typedProfiles) {
    cohortByAthlete.set(p.user_id, isoWeekStartUtc(new Date(p.created_at)));
  }

  // 2. Retention events, all three signals, for these athletes.
  //
  // deal_share_events: event.user_id is the clicking user (athlete or parent).
  // We keep only athletes-in-cohort via IN clause to bound the response.
  const [shareRes, consentRes, dealRes] = await Promise.all([
    supabase
      .from('deal_share_events')
      .select('user_id, created_at')
      .in('user_id', athleteIds)
      .gte('created_at', windowStartIso)
      .limit(20000),
    supabase
      .from('parental_consents')
      .select('athlete_user_id, signed_at')
      .in('athlete_user_id', athleteIds)
      .gte('signed_at', windowStartIso)
      .limit(20000),
    // deals.updated_at as a proxy for a status transition. We exclude 'draft'
    // because draft updates are the brand editing before the athlete sees it.
    supabase
      .from('deals')
      .select('athlete_id, updated_at, status, athletes!inner(profile_id)')
      .eq('target_bracket', 'high_school')
      .in('athletes.profile_id', athleteIds)
      .neq('status', 'draft')
      .gte('updated_at', windowStartIso)
      .limit(20000),
  ]);

  if (shareRes.error) throw shareRes.error;
  if (consentRes.error) throw consentRes.error;
  if (dealRes.error) throw dealRes.error;

  // Map athlete → set of ISO-week indices where retention fires.
  const retainedByAthlete = new Map<string, Set<number>>();

  function mark(userId: string, when: Date) {
    const cohort = cohortByAthlete.get(userId);
    if (!cohort) return;
    const n = weeksBetween(cohort, isoWeekStartUtc(when));
    if (n < 0 || n >= cohortWeeks) return;
    if (!retainedByAthlete.has(userId)) {
      retainedByAthlete.set(userId, new Set());
    }
    retainedByAthlete.get(userId)!.add(n);
  }

  for (const row of (shareRes.data ?? []) as Array<{
    user_id: string;
    created_at: string;
  }>) {
    mark(row.user_id, new Date(row.created_at));
  }
  for (const row of (consentRes.data ?? []) as Array<{
    athlete_user_id: string;
    signed_at: string;
  }>) {
    mark(row.athlete_user_id, new Date(row.signed_at));
  }
  for (const row of (dealRes.data ?? []) as Array<{
    updated_at: string;
    athletes: { profile_id: string } | Array<{ profile_id: string }> | null;
  }>) {
    const profileId = Array.isArray(row.athletes)
      ? row.athletes[0]?.profile_id
      : row.athletes?.profile_id;
    if (!profileId) continue;
    mark(profileId, new Date(row.updated_at));
  }

  // 3. Bucket by cohort week.
  const cohortMap = new Map<string, string[]>(); // weekIso -> athleteIds
  for (const [aid, cohortDate] of cohortByAthlete.entries()) {
    const key = cohortDate.toISOString();
    if (!cohortMap.has(key)) cohortMap.set(key, []);
    cohortMap.get(key)!.push(aid);
  }

  const sortedCohortKeys = [...cohortMap.keys()].sort();
  const rows: CohortRow[] = sortedCohortKeys.map((key) => {
    const members = cohortMap.get(key)!;
    const cohortDate = new Date(key);
    const weeksElapsed = weeksBetween(cohortDate, thisWeekStart);
    const availableWeeks = Math.min(cohortWeeks, weeksElapsed + 1);

    const weeksSinceSignup: Array<number | null> = [];
    for (let w = 0; w < cohortWeeks; w++) {
      if (w >= availableWeeks) {
        weeksSinceSignup.push(null);
        continue;
      }
      let retained = 0;
      for (const aid of members) {
        if (retainedByAthlete.get(aid)?.has(w)) retained++;
      }
      weeksSinceSignup.push(safeRate(retained, members.length));
    }

    return {
      cohortWeekStart: key,
      cohortSize: members.length,
      weeksSinceSignup,
    };
  });

  return { maxWeeks: cohortWeeks, rows };
}

// ----------------------------------------------------------------------------
// 3. Deal volume time series
// ----------------------------------------------------------------------------

export async function getDealVolumeTimeSeries(
  supabase: SupabaseClient,
  opts: DateRange & { granularity: 'day' | 'week' | 'month' }
): Promise<DealVolumePoint[]> {
  const { rangeStart, rangeEnd, granularity } = opts;

  // We pull id/compensation/created_at/status and bucket in JS. Rows are
  // bounded by HS deal volume × window, which is small pilot-scale.
  // TODO(materialized-view): hs_deal_volume_daily if deal volume > 5k/day.
  const { data, error } = await supabase
    .from('deals')
    .select('id, compensation_amount, created_at, status, completed_at')
    .eq('target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(5000);

  if (error) throw error;

  const buckets = new Map<string, { count: number; amountCents: number }>();
  const trunc =
    granularity === 'day'
      ? truncDayUtc
      : granularity === 'week'
        ? isoWeekStartUtc
        : truncMonthUtc;

  for (const r of (data ?? []) as Array<{
    id: string;
    compensation_amount: number | string;
    created_at: string;
    status: string;
    completed_at: string | null;
  }>) {
    const bucket = trunc(new Date(r.created_at)).toISOString();
    const existing = buckets.get(bucket) ?? { count: 0, amountCents: 0 };
    existing.count += 1;
    existing.amountCents += toCents(r.compensation_amount);
    buckets.set(bucket, existing);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([bucketStart, v]) => ({
      bucketStart,
      count: v.count,
      amountCents: v.amountCents,
    }));
}

// ----------------------------------------------------------------------------
// 4. Referral graph summary
// ----------------------------------------------------------------------------

export async function getReferralGraphSummary(
  supabase: SupabaseClient,
  range: DateRange
): Promise<ReferralSummary> {
  // Funnel events.
  const { data: events, error: eventsErr } = await supabase
    .from('referral_conversion_events')
    .select('event_type, referral_attribution_id, happened_at')
    .gte('happened_at', range.rangeStart)
    .lt('happened_at', range.rangeEnd)
    .limit(10000);
  if (eventsErr) throw eventsErr;

  let clicks = 0;
  let signups = 0;
  let consents = 0;
  let firstDeals = 0;
  const perAttributionFirstDeals = new Map<string, number>();

  for (const e of (events ?? []) as Array<{
    event_type: string;
    referral_attribution_id: string;
  }>) {
    switch (e.event_type) {
      case 'code_clicked':
        clicks++;
        break;
      case 'signup_completed':
        signups++;
        break;
      case 'first_consent_signed':
        consents++;
        break;
      case 'first_deal_signed':
        firstDeals++;
        perAttributionFirstDeals.set(
          e.referral_attribution_id,
          (perAttributionFirstDeals.get(e.referral_attribution_id) ?? 0) + 1
        );
        break;
      default:
        break;
    }
  }

  // Top referrers — group attributions by referring_user_id where a signup
  // happened in the window.
  const { data: attributions, error: attrErr } = await supabase
    .from('referral_attributions')
    .select('id, referring_user_id, referred_user_id, converted_at')
    .gte('converted_at', range.rangeStart)
    .lt('converted_at', range.rangeEnd)
    .not('referred_user_id', 'is', null)
    .limit(5000);
  if (attrErr) throw attrErr;

  const byReferrer = new Map<
    string,
    { signups: number; conversions: number; attrs: string[] }
  >();
  for (const a of (attributions ?? []) as Array<{
    id: string;
    referring_user_id: string;
  }>) {
    if (!byReferrer.has(a.referring_user_id)) {
      byReferrer.set(a.referring_user_id, {
        signups: 0,
        conversions: 0,
        attrs: [],
      });
    }
    const entry = byReferrer.get(a.referring_user_id)!;
    entry.signups += 1;
    entry.attrs.push(a.id);
    if ((perAttributionFirstDeals.get(a.id) ?? 0) > 0) {
      entry.conversions += 1;
    }
  }

  const topReferrerIds = [...byReferrer.entries()]
    .sort((x, y) => y[1].signups - x[1].signups)
    .slice(0, 10)
    .map(([id]) => id);

  // Resolve names for display. profiles has first_name/last_name for anyone
  // who has a profiles row.
  const nameMap = new Map<string, string>();
  if (topReferrerIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', topReferrerIds);
    for (const p of (profs ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>) {
      const fi = (p.first_name ?? '').trim();
      const la = (p.last_name ?? '').trim();
      const display = fi
        ? `${fi}${la ? ` ${la[0]}.` : ''}`
        : `User ${p.id.slice(0, 6)}`;
      nameMap.set(p.id, display);
    }
  }

  // Organic cohort: total signups in window that are NOT referred.
  const [signupTotalRes, signupReferredRes] = await Promise.all([
    supabase
      .from('hs_athlete_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', range.rangeStart)
      .lt('created_at', range.rangeEnd),
    supabase
      .from('referral_attributions')
      .select('*', { count: 'exact', head: true })
      .gte('converted_at', range.rangeStart)
      .lt('converted_at', range.rangeEnd)
      .eq('role_signed_up_as', 'hs_athlete'),
  ]);

  const signupTotal = signupTotalRes.count ?? 0;
  const signupReferred = signupReferredRes.count ?? 0;
  const signupOrganic = Math.max(0, signupTotal - signupReferred);

  // signup→consent rate approximations. Pull consent signed_at in window,
  // bucket by referred_user_id presence.
  const { data: consentRows } = await supabase
    .from('parental_consents')
    .select('athlete_user_id, signed_at')
    .gte('signed_at', range.rangeStart)
    .lt('signed_at', range.rangeEnd)
    .limit(5000);

  const consentAthleteIds = new Set<string>();
  for (const c of (consentRows ?? []) as Array<{ athlete_user_id: string }>) {
    consentAthleteIds.add(c.athlete_user_id);
  }

  // Who was referred and also consented?
  const { data: referredSignups } = await supabase
    .from('referral_attributions')
    .select('referred_user_id')
    .gte('converted_at', range.rangeStart)
    .lt('converted_at', range.rangeEnd)
    .not('referred_user_id', 'is', null)
    .limit(5000);

  let referredConsented = 0;
  for (const r of (referredSignups ?? []) as Array<{
    referred_user_id: string;
  }>) {
    if (consentAthleteIds.has(r.referred_user_id)) referredConsented++;
  }
  const referredSignupCount = (referredSignups ?? []).length;
  const organicConsented = Math.max(
    0,
    consentAthleteIds.size - referredConsented
  );

  return {
    totalReferredClicks: clicks,
    totalReferredSignups: signups,
    totalReferredConsents: consents,
    totalReferredFirstDeals: firstDeals,
    clickToSignupRate: safeRate(signups, clicks),
    signupToConsentRate: safeRate(consents, signups),
    topReferrers: topReferrerIds.map((id) => ({
      referringUserId: id,
      displayName: nameMap.get(id) ?? `User ${id.slice(0, 6)}`,
      signups: byReferrer.get(id)!.signups,
      conversions: byReferrer.get(id)!.conversions,
    })),
    referredSignupToConsent: safeRate(referredConsented, referredSignupCount),
    organicSignupToConsent: safeRate(organicConsented, signupOrganic),
  };
}

// ----------------------------------------------------------------------------
// 5. Match ranker quality
// ----------------------------------------------------------------------------

export async function getMatchRankerQuality(
  supabase: SupabaseClient,
  range: DateRange
): Promise<MatchRankerQuality> {
  // Suggestion "served" → any positive/negative feedback event on a
  // suggested card. We treat the distinct (brand_id, athlete_user_id)
  // pair with any event in window as one suggestion.
  const { data: events, error } = await supabase
    .from('match_feedback_events')
    .select('brand_id, athlete_user_id, signal, created_at')
    .gte('created_at', range.rangeStart)
    .lt('created_at', range.rangeEnd)
    .limit(20000);
  if (error) throw error;

  const seenPairs = new Set<string>();
  const firstSignalPerPair = new Map<string, string>(); // pairKey -> ISO
  const firstProposedPerPair = new Map<string, string>();
  let proposedCount = 0;
  let completedCount = 0;

  for (const e of (events ?? []) as Array<{
    brand_id: string;
    athlete_user_id: string;
    signal: string;
    created_at: string;
  }>) {
    const key = `${e.brand_id}::${e.athlete_user_id}`;
    seenPairs.add(key);
    if (!firstSignalPerPair.has(key)) {
      firstSignalPerPair.set(key, e.created_at);
    } else if (e.created_at < firstSignalPerPair.get(key)!) {
      firstSignalPerPair.set(key, e.created_at);
    }
    if (e.signal === 'proposed_deal') {
      proposedCount++;
      if (
        !firstProposedPerPair.has(key) ||
        e.created_at < firstProposedPerPair.get(key)!
      ) {
        firstProposedPerPair.set(key, e.created_at);
      }
    }
    if (e.signal === 'deal_completed') {
      completedCount++;
    }
  }

  let totalDays = 0;
  let durationSamples = 0;
  for (const [key, proposedAt] of firstProposedPerPair.entries()) {
    const firstAt = firstSignalPerPair.get(key);
    if (!firstAt) continue;
    const diffMs =
      new Date(proposedAt).getTime() - new Date(firstAt).getTime();
    if (diffMs < 0) continue;
    totalDays += diffMs / (24 * 60 * 60 * 1000);
    durationSamples++;
  }

  return {
    suggestedCount: seenPairs.size,
    proposedCount,
    proposedRate: safeRate(proposedCount, seenPairs.size),
    completedCount,
    completedRateAmongProposed: safeRate(completedCount, proposedCount),
    avgDaysSuggestToPropose:
      durationSamples > 0
        ? Math.round((totalDays / durationSamples) * 10) / 10
        : null,
  };
}

// ----------------------------------------------------------------------------
// 6. Per-state activation
// ----------------------------------------------------------------------------

export async function getActivationByState(
  supabase: SupabaseClient
): Promise<StateActivation[]> {
  const { data: rules, error: rulesErr } = await supabase
    .from('state_nil_rules')
    .select('state_code, status');
  if (rulesErr) throw rulesErr;

  const stateCodes = ((rules ?? []) as Array<{ state_code: string }>).map(
    (r) => r.state_code
  );

  // Fetch per-state counts in parallel, capped to pilot states.
  const results = await Promise.all(
    stateCodes.map(async (code) => {
      const [waitRes, signupRes, activeDealsRes] = await Promise.all([
        supabase
          .from('hs_waitlist')
          .select('*', { count: 'exact', head: true })
          .eq('state_code', code),
        supabase
          .from('hs_athlete_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('state_code', code),
        supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('target_bracket', 'high_school')
          .eq('state_code', code)
          .in('status', [...ACTIVE_DEAL_STATUSES]),
      ]);

      const waitlistCount = waitRes.count ?? 0;
      const signupCount = signupRes.count ?? 0;
      const activeDealCount = activeDealsRes.count ?? 0;
      return {
        stateCode: code,
        waitlistCount,
        signupCount,
        waitlistToSignup: safeRate(signupCount, waitlistCount),
        activeDealCount,
      };
    })
  );

  return results.sort((a, b) => b.signupCount - a.signupCount);
}

// ----------------------------------------------------------------------------
// 7. Dispute rate
// ----------------------------------------------------------------------------

export async function getDisputeRate(
  supabase: SupabaseClient,
  range: DateRange
): Promise<DisputeRate> {
  const [dealsRes, disputeRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('target_bracket', 'high_school')
      .gte('created_at', range.rangeStart)
      .lt('created_at', range.rangeEnd),
    supabase
      .from('deal_disputes')
      .select('status')
      .gte('created_at', range.rangeStart)
      .lt('created_at', range.rangeEnd)
      .limit(5000),
  ]);

  if (disputeRes.error) throw disputeRes.error;

  const totalDeals = dealsRes.count ?? 0;
  const disputeRows = (disputeRes.data ?? []) as Array<{ status: string }>;
  const totalDisputes = disputeRows.length;
  const resolutionBreakdown: Record<string, number> = {};
  for (const r of disputeRows) {
    resolutionBreakdown[r.status] = (resolutionBreakdown[r.status] ?? 0) + 1;
  }

  return {
    totalDeals,
    totalDisputes,
    disputesPer100Deals:
      totalDeals > 0 ? Math.round((totalDisputes / totalDeals) * 1000) / 10 : 0,
    resolutionBreakdown,
  };
}

// ----------------------------------------------------------------------------
// Date helpers (exported for page default ranges)
// ----------------------------------------------------------------------------

/** Returns {rangeStart, rangeEnd} with end = now, start = now - `days`. */
export function defaultRange(days: number): DateRange {
  const end = new Date();
  const start = addDays(end, -days);
  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
  };
}

/**
 * Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD into a DateRange, falling back to the
 * default window. Half-open semantics: rangeEnd is exclusive.
 */
export function parseRangeParams(
  sp: { from?: string; to?: string },
  defaultDays: number
): DateRange {
  const def = defaultRange(defaultDays);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const rangeStart =
    sp.from && dateRe.test(sp.from)
      ? new Date(`${sp.from}T00:00:00.000Z`).toISOString()
      : def.rangeStart;
  const rangeEnd =
    sp.to && dateRe.test(sp.to)
      ? new Date(
          new Date(`${sp.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000
        ).toISOString()
      : def.rangeEnd;
  return { rangeStart, rangeEnd };
}

// ----------------------------------------------------------------------------
// Formatting helpers for UI
// ----------------------------------------------------------------------------

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatDateIso(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
