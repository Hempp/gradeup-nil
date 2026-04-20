/**
 * HS-NIL "NIL at 1" Annual Report — Aggregation Service
 * ----------------------------------------------------------------------------
 * Opendorse's "NIL at 3" and "NIL at 4" reports own the college NIL
 * narrative — journalists and investors cite them. This module assembles
 * the HS equivalent: one JSON blob that answers every journalist question
 * in a single round-trip, ready to freeze into annual_report_snapshots.
 *
 * Design tenets
 * ─────────────
 *   1. Data-first, narrative-second. `collectAnnualReportData` returns
 *      pure numbers. Narrative rendering lives in annual-report-narrative.ts.
 *   2. Time-window flexible. Every aggregator takes {rangeStart, rangeEnd}.
 *      The founder can generate a report for "concierge window" (30 days),
 *      "first quarter" (3 months), or a full calendar year without touching
 *      this module.
 *   3. Citations-first. Each section documents its SQL origin inline so a
 *      journalist checking a number can trace it back to the query + table.
 *   4. Snapshot discipline at the caller: once the founder publishes, the
 *      API route freezes the return value of `collectAnnualReportData` into
 *      annual_report_snapshots.data_jsonb. Underlying data can evolve after
 *      publish without changing the published numbers.
 *   5. Fail-soft. If a sub-aggregator blows up the whole report shouldn't
 *      fail — we surface a `partialFailures` array in the envelope so the
 *      admin sees which section needs hand-patching.
 *
 * Reads are SELECT-only. Caller passes the authenticated Supabase SSR
 * client; admin-gating is enforced at the page / API route layer.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface AnnualReportRange {
  /** Report "year" as in "NIL at N" — 2026 = HS NIL at 1. */
  year: number;
  /** Inclusive ISO date or timestamp — half-open with rangeEnd in queries. */
  rangeStart: string;
  /** Exclusive ISO date or timestamp. */
  rangeEnd: string;
}

export interface AthleteFigures {
  totalAthletes: number;
  byState: Array<{ stateCode: string; count: number }>;
  bySport: Array<{ sport: string; count: number }>;
  byVerificationTier: Array<{ tier: string; count: number }>;
  byGradYear: Array<{ gradYear: number | null; count: number }>;
  /** % of athletes with at least one institution_verified GPA snapshot. */
  institutionVerifiedGpaPct: number;
}

export interface DealFigures {
  totalDeals: number;
  completedDeals: number;
  completedRate: number;
  totalGrossCents: number;
  avgCompletionDays: number | null;
  byState: Array<{ stateCode: string; count: number; grossCents: number }>;
  topBrandsByDealCount: Array<{
    brandId: string;
    brandName: string;
    dealCount: number;
    grossCents: number;
  }>;
  topSportsByDealVolume: Array<{
    sport: string;
    dealCount: number;
    grossCents: number;
  }>;
}

export interface ComplianceFigures {
  disclosuresSent: number;
  disclosuresAttempted: number;
  disclosureSuccessRate: number;
  disclosuresByState: Array<{ stateCode: string; sent: number; failed: number }>;
  disclosuresByRecipientType: Array<{ recipientType: string; count: number }>;
  disputesRaised: number;
  disputesByCategory: Array<{ category: string; count: number }>;
  disputeResolutionOutcomes: Array<{ outcome: string; count: number }>;
  parentalConsentsSigned: number;
  consentsByAgeBucket: Array<{
    bucket: 'under_14' | '14_15' | '16_17';
    count: number;
  }>;
  consentsByScopeCategory: Array<{ category: string; count: number }>;
}

export interface ReferralFigures {
  referralsAttributed: number;
  referralConversionRate: number;
  /** Parent-to-parent primary driver count. */
  topReferrerTier: Array<{ tier: '1' | '2_to_5' | '6_to_10' | '11_plus'; count: number }>;
  referredSignups: number;
  organicSignups: number;
  referredVsOrganicConsentRate: {
    referred: number;
    organic: number;
  };
}

export interface ShareFigures {
  totalShareEvents: number;
  byPlatform: Array<{ platform: string; count: number }>;
  avgSharesPerCompletedDeal: number;
  /**
   * Signups with a non-null referral attribution whose attribution row
   * was created within 24h of a share_event in the window. Approximates
   * "share-triggered secondary signups".
   */
  shareTriggeredSignups: number;
}

export interface TrajectoryFigures {
  trajectoryProfilesCreated: number;
  publicTokensGenerated: number;
  publicUrlViews: number;
  /** Cross-section — same number as AthleteFigures.institutionVerifiedGpaPct. */
  institutionVerifiedGpaPct: number;
}

export interface BrandFigures {
  totalHsEnabledBrands: number;
  byVertical: Array<{ vertical: string; count: number }>;
  totalSpendCents: number;
  avgDealCents: number;
}

export interface StateFigures {
  totalActivatedStates: number;
  perState: Array<{
    stateCode: string;
    waitlistCount: number;
    signupCount: number;
    conversionRate: number;
    activeDeals: number;
    completedDeals: number;
    /** Days from waitlist launch → first pilot-open admin action. */
    daysWaitlistToPilotOpen: number | null;
    /** Best single headline story — pulled from case_studies if available. */
    headlineStoryUrl: string | null;
  }>;
}

export interface AnnualReportData {
  meta: {
    reportYear: number;
    reportLabel: string; // "HS NIL at 1"
    rangeStart: string;
    rangeEnd: string;
    generatedAt: string;
    schemaVersion: '1.0.0';
  };
  athletes: AthleteFigures;
  deals: DealFigures;
  compliance: ComplianceFigures;
  referrals: ReferralFigures;
  shares: ShareFigures;
  trajectory: TrajectoryFigures;
  brands: BrandFigures;
  states: StateFigures;
  /**
   * Which sub-aggregators failed. Empty array = clean run. Present so the
   * preview page can flag patches needed before publish.
   */
  partialFailures: Array<{ section: string; message: string }>;
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

function safeRate(num: number, denom: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(denom) || denom <= 0) return 0;
  return num / denom;
}

function dollarsToCents(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function ageFromIsoDob(dobIso: string | null): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function diffDays(fromIso: string | null, toIso: string | null): number | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function topN<T>(
  items: T[],
  key: (x: T) => number,
  n: number
): T[] {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, n);
}

// ----------------------------------------------------------------------------
// Section 1 — Athlete figures
// ----------------------------------------------------------------------------
// SQL origin:
//   hs_athlete_profiles (user_id, state_code, sport, grad_year,
//     verification_tier, created_at, date_of_birth)
//   hs_athlete_gpa_snapshots (athlete_user_id, tier)
// ----------------------------------------------------------------------------

export async function collectAthleteFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<AthleteFigures> {
  const { rangeStart, rangeEnd } = range;

  const { data: profiles, error } = await supabase
    .from('hs_athlete_profiles')
    .select(
      'user_id, state_code, sport, grad_year, verification_tier, created_at'
    )
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(50000);

  if (error) throw error;

  type P = {
    user_id: string;
    state_code: string | null;
    sport: string | null;
    grad_year: number | null;
    verification_tier: string | null;
  };
  const rows = (profiles ?? []) as P[];

  const byStateMap = new Map<string, number>();
  const bySportMap = new Map<string, number>();
  const byTierMap = new Map<string, number>();
  const byGradMap = new Map<string, number>(); // key = String(gradYear) or 'unknown'
  const athleteIds: string[] = [];

  for (const r of rows) {
    athleteIds.push(r.user_id);
    const state = r.state_code ?? 'unknown';
    byStateMap.set(state, (byStateMap.get(state) ?? 0) + 1);
    const sport = r.sport ?? 'unknown';
    bySportMap.set(sport, (bySportMap.get(sport) ?? 0) + 1);
    const tier = r.verification_tier ?? 'self_reported';
    byTierMap.set(tier, (byTierMap.get(tier) ?? 0) + 1);
    const gradKey = r.grad_year === null || r.grad_year === undefined
      ? 'unknown'
      : String(r.grad_year);
    byGradMap.set(gradKey, (byGradMap.get(gradKey) ?? 0) + 1);
  }

  // institution_verified GPA cross-section — athletes with ≥1 institution-
  // verified snapshot.
  let institutionVerifiedCount = 0;
  if (athleteIds.length > 0) {
    // Chunk to avoid massive IN lists.
    const chunk = 500;
    const verified = new Set<string>();
    for (let i = 0; i < athleteIds.length; i += chunk) {
      const slice = athleteIds.slice(i, i + chunk);
      const { data, error: gErr } = await supabase
        .from('hs_athlete_gpa_snapshots')
        .select('athlete_user_id')
        .in('athlete_user_id', slice)
        .eq('tier', 'institution_verified');
      if (gErr) break;
      for (const row of (data ?? []) as Array<{ athlete_user_id: string }>) {
        verified.add(row.athlete_user_id);
      }
    }
    institutionVerifiedCount = verified.size;
  }

  return {
    totalAthletes: rows.length,
    byState: [...byStateMap.entries()]
      .map(([stateCode, count]) => ({ stateCode, count }))
      .sort((a, b) => b.count - a.count),
    bySport: [...bySportMap.entries()]
      .map(([sport, count]) => ({ sport, count }))
      .sort((a, b) => b.count - a.count),
    byVerificationTier: [...byTierMap.entries()]
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count),
    byGradYear: [...byGradMap.entries()]
      .map(([k, count]) => ({
        gradYear: k === 'unknown' ? null : Number(k),
        count,
      }))
      .sort((a, b) => {
        if (a.gradYear === null) return 1;
        if (b.gradYear === null) return -1;
        return a.gradYear - b.gradYear;
      }),
    institutionVerifiedGpaPct: safeRate(institutionVerifiedCount, rows.length),
  };
}

// ----------------------------------------------------------------------------
// Section 2 — Deal figures
// ----------------------------------------------------------------------------
// SQL origin:
//   deals (id, brand_id, athlete_id, status, compensation_amount,
//     state_code, target_bracket='high_school', created_at, completed_at)
//   brands (id, company_name)
//   athletes (id, sport)
// ----------------------------------------------------------------------------

export async function collectDealFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<DealFigures> {
  const { rangeStart, rangeEnd } = range;

  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, brand_id, athlete_id, status, compensation_amount, state_code,
       created_at, completed_at,
       brand:brands(id, company_name),
       athlete:athletes(id, sport)`
    )
    .eq('target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(50000);

  if (error) throw error;

  type DealRow = {
    id: string;
    brand_id: string | null;
    athlete_id: string | null;
    status: string;
    compensation_amount: number | string;
    state_code: string | null;
    created_at: string;
    completed_at: string | null;
    brand: { id: string; company_name: string } | Array<{ id: string; company_name: string }> | null;
    athlete: { id: string; sport: string | null } | Array<{ id: string; sport: string | null }> | null;
  };

  const rows = (data ?? []) as DealRow[];

  let totalGross = 0;
  let completedCount = 0;
  const completionDays: number[] = [];

  const byStateMap = new Map<string, { count: number; grossCents: number }>();
  type BrandAgg = { brandId: string; brandName: string; dealCount: number; grossCents: number };
  const brandMap = new Map<string, BrandAgg>();
  const sportMap = new Map<string, { sport: string; dealCount: number; grossCents: number }>();

  for (const r of rows) {
    const cents = dollarsToCents(r.compensation_amount);
    totalGross += cents;

    const isCompleted = (COMPLETED_STATUSES as readonly string[]).includes(r.status);
    if (isCompleted) {
      completedCount += 1;
      const d = diffDays(r.created_at, r.completed_at);
      if (d !== null) completionDays.push(d);
    }

    const state = r.state_code ?? 'unknown';
    const sRec = byStateMap.get(state) ?? { count: 0, grossCents: 0 };
    sRec.count += 1;
    sRec.grossCents += cents;
    byStateMap.set(state, sRec);

    const brand = Array.isArray(r.brand) ? r.brand[0] : r.brand;
    if (brand) {
      const rec = brandMap.get(brand.id) ?? {
        brandId: brand.id,
        brandName: brand.company_name,
        dealCount: 0,
        grossCents: 0,
      };
      rec.dealCount += 1;
      rec.grossCents += cents;
      brandMap.set(brand.id, rec);
    }

    const ath = Array.isArray(r.athlete) ? r.athlete[0] : r.athlete;
    const sport = ath?.sport ?? 'unknown';
    const sp = sportMap.get(sport) ?? { sport, dealCount: 0, grossCents: 0 };
    sp.dealCount += 1;
    sp.grossCents += cents;
    sportMap.set(sport, sp);
  }

  const avgCompletionDays =
    completionDays.length > 0
      ? Math.round(
          completionDays.reduce((acc, d) => acc + d, 0) / completionDays.length
        )
      : null;

  return {
    totalDeals: rows.length,
    completedDeals: completedCount,
    completedRate: safeRate(completedCount, rows.length),
    totalGrossCents: totalGross,
    avgCompletionDays,
    byState: [...byStateMap.entries()]
      .map(([stateCode, v]) => ({ stateCode, count: v.count, grossCents: v.grossCents }))
      .sort((a, b) => b.count - a.count),
    topBrandsByDealCount: topN([...brandMap.values()], (b) => b.dealCount, 10),
    topSportsByDealVolume: topN([...sportMap.values()], (s) => s.dealCount, 10),
  };
}

// ----------------------------------------------------------------------------
// Section 3 — Compliance figures
// ----------------------------------------------------------------------------
// SQL origin:
//   hs_deal_disclosures (status, state_code, recipient_type, created_at)
//   deal_disputes (reason_category, status, created_at)
//   parental_consents (athlete_user_id, scope_categories, signed_at)
//   hs_athlete_profiles (date_of_birth)  [cross-ref for age buckets]
// ----------------------------------------------------------------------------

export async function collectComplianceFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<ComplianceFigures> {
  const { rangeStart, rangeEnd } = range;

  const [discRes, dispRes, consentRes] = await Promise.all([
    supabase
      .from('hs_deal_disclosures')
      .select('status, state_code, recipient_type')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .limit(50000),
    supabase
      .from('deal_disputes')
      .select('reason_category, status')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .limit(20000),
    supabase
      .from('parental_consents')
      .select('athlete_user_id, scope_categories, signed_at')
      .gte('signed_at', rangeStart)
      .lt('signed_at', rangeEnd)
      .limit(20000),
  ]);

  if (discRes.error) throw discRes.error;
  if (dispRes.error) throw dispRes.error;
  if (consentRes.error) throw consentRes.error;

  // Disclosures
  type DiscRow = { status: string; state_code: string | null; recipient_type: string | null };
  const discRows = (discRes.data ?? []) as DiscRow[];
  let sent = 0;
  let attempted = 0;
  const discStateMap = new Map<string, { sent: number; failed: number }>();
  const discRecipientMap = new Map<string, number>();
  for (const r of discRows) {
    attempted += 1;
    if (r.status === 'sent') sent += 1;
    const state = r.state_code ?? 'unknown';
    const s = discStateMap.get(state) ?? { sent: 0, failed: 0 };
    if (r.status === 'sent') s.sent += 1;
    else if (r.status === 'failed') s.failed += 1;
    discStateMap.set(state, s);
    const recipient = r.recipient_type ?? 'unknown';
    discRecipientMap.set(recipient, (discRecipientMap.get(recipient) ?? 0) + 1);
  }

  // Disputes
  type DispRow = { reason_category: string; status: string };
  const dispRows = (dispRes.data ?? []) as DispRow[];
  const disputeCatMap = new Map<string, number>();
  const disputeOutcomeMap = new Map<string, number>();
  for (const r of dispRows) {
    disputeCatMap.set(r.reason_category, (disputeCatMap.get(r.reason_category) ?? 0) + 1);
    disputeOutcomeMap.set(r.status, (disputeOutcomeMap.get(r.status) ?? 0) + 1);
  }

  // Consents — resolve age buckets via hs_athlete_profiles.date_of_birth.
  type ConsentRow = {
    athlete_user_id: string;
    scope_categories: string[] | null;
  };
  const consentRows = (consentRes.data ?? []) as ConsentRow[];
  const athleteIds = [...new Set(consentRows.map((c) => c.athlete_user_id))];
  const dobMap = new Map<string, string | null>();
  if (athleteIds.length > 0) {
    const chunk = 500;
    for (let i = 0; i < athleteIds.length; i += chunk) {
      const slice = athleteIds.slice(i, i + chunk);
      const { data } = await supabase
        .from('hs_athlete_profiles')
        .select('user_id, date_of_birth')
        .in('user_id', slice);
      for (const row of (data ?? []) as Array<{
        user_id: string;
        date_of_birth: string | null;
      }>) {
        dobMap.set(row.user_id, row.date_of_birth);
      }
    }
  }

  let under14 = 0;
  let age14_15 = 0;
  let age16_17 = 0;
  const scopeMap = new Map<string, number>();
  for (const c of consentRows) {
    const age = ageFromIsoDob(dobMap.get(c.athlete_user_id) ?? null);
    if (age === null) {
      // Unknown age — don't guess. Skip bucket assignment so figures aren't
      // misleading; it still counts toward the total.
    } else if (age < 14) under14 += 1;
    else if (age <= 15) age14_15 += 1;
    else if (age <= 17) age16_17 += 1;

    for (const cat of c.scope_categories ?? []) {
      scopeMap.set(cat, (scopeMap.get(cat) ?? 0) + 1);
    }
  }

  return {
    disclosuresSent: sent,
    disclosuresAttempted: attempted,
    disclosureSuccessRate: safeRate(sent, attempted),
    disclosuresByState: [...discStateMap.entries()]
      .map(([stateCode, v]) => ({ stateCode, sent: v.sent, failed: v.failed }))
      .sort((a, b) => b.sent - a.sent),
    disclosuresByRecipientType: [...discRecipientMap.entries()]
      .map(([recipientType, count]) => ({ recipientType, count }))
      .sort((a, b) => b.count - a.count),
    disputesRaised: dispRows.length,
    disputesByCategory: [...disputeCatMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    disputeResolutionOutcomes: [...disputeOutcomeMap.entries()]
      .map(([outcome, count]) => ({ outcome, count }))
      .sort((a, b) => b.count - a.count),
    parentalConsentsSigned: consentRows.length,
    consentsByAgeBucket: [
      { bucket: 'under_14', count: under14 },
      { bucket: '14_15', count: age14_15 },
      { bucket: '16_17', count: age16_17 },
    ],
    consentsByScopeCategory: [...scopeMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ----------------------------------------------------------------------------
// Section 4 — Referral figures
// ----------------------------------------------------------------------------
// SQL origin:
//   referral_attributions (referring_user_id, referred_user_id, converted_at)
//   referral_conversion_events (event_type, happened_at)
//   parental_consents (athlete_user_id, signed_at)
//   hs_athlete_profiles (user_id, created_at)   [organic signup count]
// ----------------------------------------------------------------------------

export async function collectReferralFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<ReferralFigures> {
  const { rangeStart, rangeEnd } = range;

  const [attrRes, eventsRes, totalSignupRes] = await Promise.all([
    supabase
      .from('referral_attributions')
      .select('id, referring_user_id, referred_user_id, converted_at')
      .gte('converted_at', rangeStart)
      .lt('converted_at', rangeEnd)
      .not('referred_user_id', 'is', null)
      .limit(20000),
    supabase
      .from('referral_conversion_events')
      .select('event_type')
      .gte('happened_at', rangeStart)
      .lt('happened_at', rangeEnd)
      .limit(50000),
    supabase
      .from('hs_athlete_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd),
  ]);

  if (attrRes.error) throw attrRes.error;
  if (eventsRes.error) throw eventsRes.error;

  type AttrRow = { id: string; referring_user_id: string; referred_user_id: string };
  const attrs = (attrRes.data ?? []) as AttrRow[];

  let clicks = 0;
  for (const e of (eventsRes.data ?? []) as Array<{ event_type: string }>) {
    if (e.event_type === 'code_clicked') clicks += 1;
  }

  // Top-referrer tier distribution.
  const perReferrer = new Map<string, number>();
  for (const a of attrs) {
    perReferrer.set(
      a.referring_user_id,
      (perReferrer.get(a.referring_user_id) ?? 0) + 1
    );
  }
  let tier1 = 0;
  let tier2_5 = 0;
  let tier6_10 = 0;
  let tier11 = 0;
  for (const count of perReferrer.values()) {
    if (count <= 1) tier1 += 1;
    else if (count <= 5) tier2_5 += 1;
    else if (count <= 10) tier6_10 += 1;
    else tier11 += 1;
  }

  const referredSignups = attrs.length;
  const totalSignups = totalSignupRes.count ?? 0;
  const organicSignups = Math.max(0, totalSignups - referredSignups);

  // Consent conversion comparison. Pull consents in window; bucket by
  // whether athlete_user_id appears in referred IDs.
  const referredUserIds = new Set(attrs.map((a) => a.referred_user_id));
  const { data: consentRows } = await supabase
    .from('parental_consents')
    .select('athlete_user_id')
    .gte('signed_at', rangeStart)
    .lt('signed_at', rangeEnd)
    .limit(20000);
  let referredConsented = 0;
  const consentedSet = new Set<string>();
  for (const c of (consentRows ?? []) as Array<{ athlete_user_id: string }>) {
    consentedSet.add(c.athlete_user_id);
  }
  for (const id of referredUserIds) {
    if (consentedSet.has(id)) referredConsented += 1;
  }
  const organicConsented = Math.max(0, consentedSet.size - referredConsented);

  return {
    referralsAttributed: referredSignups,
    referralConversionRate: safeRate(referredSignups, clicks),
    topReferrerTier: [
      { tier: '1', count: tier1 },
      { tier: '2_to_5', count: tier2_5 },
      { tier: '6_to_10', count: tier6_10 },
      { tier: '11_plus', count: tier11 },
    ],
    referredSignups,
    organicSignups,
    referredVsOrganicConsentRate: {
      referred: safeRate(referredConsented, referredSignups),
      organic: safeRate(organicConsented, organicSignups),
    },
  };
}

// ----------------------------------------------------------------------------
// Section 5 — Share figures
// ----------------------------------------------------------------------------
// SQL origin:
//   deal_share_events (deal_id, platform, user_id, created_at)
//   deals (id, target_bracket, status)
//   referral_attributions (referring_user_id, created_at, referred_user_id)
// ----------------------------------------------------------------------------

export async function collectShareFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<ShareFigures> {
  const { rangeStart, rangeEnd } = range;

  const { data: shareRows, error } = await supabase
    .from('deal_share_events')
    .select(
      'deal_id, platform, user_id, created_at, deals!inner(target_bracket, status)'
    )
    .eq('deals.target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(50000);
  if (error) throw error;

  type ShareRow = {
    deal_id: string;
    platform: string;
    user_id: string;
    created_at: string;
    deals: { status: string } | Array<{ status: string }> | null;
  };
  const rows = (shareRows ?? []) as ShareRow[];

  const platformMap = new Map<string, number>();
  const completedDealIds = new Set<string>();
  const sharesPerDeal = new Map<string, number>();
  const shareTimes: Array<{ userId: string; ts: string }> = [];

  for (const r of rows) {
    platformMap.set(r.platform, (platformMap.get(r.platform) ?? 0) + 1);
    const deal = Array.isArray(r.deals) ? r.deals[0] : r.deals;
    if (deal && (COMPLETED_STATUSES as readonly string[]).includes(deal.status)) {
      completedDealIds.add(r.deal_id);
    }
    sharesPerDeal.set(r.deal_id, (sharesPerDeal.get(r.deal_id) ?? 0) + 1);
    shareTimes.push({ userId: r.user_id, ts: r.created_at });
  }

  const completedDealCount = completedDealIds.size;
  const totalSharesForCompletedDeals = [...completedDealIds].reduce(
    (acc, id) => acc + (sharesPerDeal.get(id) ?? 0),
    0
  );

  // Share-triggered secondary signups: referral_attributions whose
  // converted_at fell within 24h after a share event authored by the
  // same referring_user_id. Bounded approximation.
  const { data: attrs } = await supabase
    .from('referral_attributions')
    .select('referring_user_id, converted_at')
    .gte('converted_at', rangeStart)
    .lt('converted_at', rangeEnd)
    .not('referred_user_id', 'is', null)
    .limit(20000);

  const sharesByUser = new Map<string, number[]>();
  for (const s of shareTimes) {
    const arr = sharesByUser.get(s.userId) ?? [];
    arr.push(new Date(s.ts).getTime());
    sharesByUser.set(s.userId, arr);
  }
  for (const arr of sharesByUser.values()) arr.sort((a, b) => a - b);

  let shareTriggered = 0;
  for (const a of (attrs ?? []) as Array<{
    referring_user_id: string;
    converted_at: string;
  }>) {
    const arr = sharesByUser.get(a.referring_user_id);
    if (!arr || arr.length === 0) continue;
    const convTs = new Date(a.converted_at).getTime();
    // Binary-search-lite: any share in [convTs - 24h, convTs].
    const lowerBound = convTs - 24 * 60 * 60 * 1000;
    for (const st of arr) {
      if (st > convTs) break;
      if (st >= lowerBound) {
        shareTriggered += 1;
        break;
      }
    }
  }

  return {
    totalShareEvents: rows.length,
    byPlatform: [...platformMap.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count),
    avgSharesPerCompletedDeal:
      completedDealCount > 0
        ? Math.round((totalSharesForCompletedDeals / completedDealCount) * 10) / 10
        : 0,
    shareTriggeredSignups: shareTriggered,
  };
}

// ----------------------------------------------------------------------------
// Section 6 — Trajectory figures
// ----------------------------------------------------------------------------
// SQL origin:
//   hs_athlete_trajectory_shares (athlete_user_id, public_token, view_count,
//     created_at)
//   hs_athlete_gpa_snapshots (athlete_user_id, tier)
// ----------------------------------------------------------------------------

export async function collectTrajectoryFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<TrajectoryFigures> {
  const { rangeStart, rangeEnd } = range;

  const { data: shares, error } = await supabase
    .from('hs_athlete_trajectory_shares')
    .select('id, athlete_user_id, public_token, view_count, created_at')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(20000);

  // trajectory shares table may not exist in all environments; fail-soft.
  let trajectoryProfilesCreated = 0;
  let publicTokensGenerated = 0;
  let publicUrlViews = 0;

  if (!error) {
    type Row = {
      athlete_user_id: string;
      public_token: string | null;
      view_count: number | null;
    };
    const rows = (shares ?? []) as Row[];
    trajectoryProfilesCreated = new Set(rows.map((r) => r.athlete_user_id)).size;
    publicTokensGenerated = rows.filter((r) => r.public_token).length;
    publicUrlViews = rows.reduce((acc, r) => acc + (r.view_count ?? 0), 0);
  }

  // Cross-section with institution_verified GPA.
  const { data: profiles } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(50000);
  const athleteIds = ((profiles ?? []) as Array<{ user_id: string }>).map(
    (p) => p.user_id
  );
  let verifiedCount = 0;
  if (athleteIds.length > 0) {
    const chunk = 500;
    const verified = new Set<string>();
    for (let i = 0; i < athleteIds.length; i += chunk) {
      const slice = athleteIds.slice(i, i + chunk);
      const { data } = await supabase
        .from('hs_athlete_gpa_snapshots')
        .select('athlete_user_id')
        .in('athlete_user_id', slice)
        .eq('tier', 'institution_verified');
      for (const row of (data ?? []) as Array<{ athlete_user_id: string }>) {
        verified.add(row.athlete_user_id);
      }
    }
    verifiedCount = verified.size;
  }

  return {
    trajectoryProfilesCreated,
    publicTokensGenerated,
    publicUrlViews,
    institutionVerifiedGpaPct: safeRate(verifiedCount, athleteIds.length),
  };
}

// ----------------------------------------------------------------------------
// Section 7 — Brand figures
// ----------------------------------------------------------------------------
// SQL origin:
//   brands (id, industry, is_hs_enabled, hs_approved_at)
//   deals (brand_id, compensation_amount, target_bracket='high_school', status)
// ----------------------------------------------------------------------------

export async function collectBrandFigures(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<BrandFigures> {
  const { rangeStart, rangeEnd } = range;

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, industry, is_hs_enabled')
    .eq('is_hs_enabled', true)
    .limit(5000);
  if (error) throw error;

  type BrandRow = { id: string; industry: string | null };
  const brandRows = (brands ?? []) as BrandRow[];
  const verticalMap = new Map<string, number>();
  for (const b of brandRows) {
    const v = b.industry ?? 'unknown';
    verticalMap.set(v, (verticalMap.get(v) ?? 0) + 1);
  }

  // Brand spend in window, HS deals only.
  const { data: dealsData } = await supabase
    .from('deals')
    .select('compensation_amount, status')
    .eq('target_bracket', 'high_school')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .limit(50000);

  let totalSpend = 0;
  let dealCount = 0;
  for (const d of (dealsData ?? []) as Array<{
    compensation_amount: number | string;
    status: string;
  }>) {
    totalSpend += dollarsToCents(d.compensation_amount);
    dealCount += 1;
  }

  return {
    totalHsEnabledBrands: brandRows.length,
    byVertical: [...verticalMap.entries()]
      .map(([vertical, count]) => ({ vertical, count }))
      .sort((a, b) => b.count - a.count),
    totalSpendCents: totalSpend,
    avgDealCents: dealCount > 0 ? Math.round(totalSpend / dealCount) : 0,
  };
}

// ----------------------------------------------------------------------------
// Section 8 — State figures
// ----------------------------------------------------------------------------
// SQL origin:
//   state_pilot_activations (state_code, activated_at, paused_at)
//   hs_waitlist (state_code, created_at)
//   hs_athlete_profiles (state_code, created_at)
//   deals (state_code, status, target_bracket='high_school')
//   case_studies (state_code, published_at, share_url)   [optional]
// ----------------------------------------------------------------------------

export async function collectStateFigures(
  supabase: SupabaseClient,
  _range: AnnualReportRange
): Promise<StateFigures> {
  const { data: activations, error } = await supabase
    .from('state_pilot_activations')
    .select('state_code, activated_at, paused_at');
  if (error) throw error;

  type ActivationRow = {
    state_code: string;
    activated_at: string | null;
    paused_at: string | null;
  };
  const acts = (activations ?? []) as ActivationRow[];
  const totalActivated = acts.filter((a) => a.activated_at && !a.paused_at).length;

  const perState: StateFigures['perState'] = [];

  for (const a of acts) {
    const code = a.state_code;
    const [waitRes, signupRes, activeRes, completedRes, firstWaitRes, caseRes] =
      await Promise.all([
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
        supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('target_bracket', 'high_school')
          .eq('state_code', code)
          .in('status', [...COMPLETED_STATUSES]),
        supabase
          .from('hs_waitlist')
          .select('created_at')
          .eq('state_code', code)
          .order('created_at', { ascending: true })
          .limit(1),
        supabase
          .from('case_studies')
          .select('share_url, published_at')
          .eq('state_code', code)
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(1),
      ]);

    const waitlistCount = waitRes.count ?? 0;
    const signupCount = signupRes.count ?? 0;
    const activeDeals = activeRes.count ?? 0;
    const completedDeals = completedRes.count ?? 0;
    const firstWait = ((firstWaitRes.data ?? []) as Array<{ created_at: string }>)[0]
      ?.created_at ?? null;
    const daysWaitlistToPilotOpen = diffDays(firstWait, a.activated_at);
    const caseRow = ((caseRes.data ?? []) as Array<{ share_url: string | null }>)[0];
    const headlineStoryUrl = caseRow?.share_url ?? null;

    perState.push({
      stateCode: code,
      waitlistCount,
      signupCount,
      conversionRate: safeRate(signupCount, waitlistCount),
      activeDeals,
      completedDeals,
      daysWaitlistToPilotOpen,
      headlineStoryUrl,
    });
  }

  return {
    totalActivatedStates: totalActivated,
    perState: perState.sort((x, y) => y.signupCount - x.signupCount),
  };
}

// ----------------------------------------------------------------------------
// Top-level assembler
// ----------------------------------------------------------------------------

export async function collectAnnualReportData(
  supabase: SupabaseClient,
  range: AnnualReportRange
): Promise<AnnualReportData> {
  const reportLabel = `HS NIL at ${Math.max(1, range.year - 2025)}`;
  const partialFailures: AnnualReportData['partialFailures'] = [];

  async function run<T>(
    section: string,
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      partialFailures.push({
        section,
        message: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  }

  const [
    athletes,
    deals,
    compliance,
    referrals,
    shares,
    trajectory,
    brands,
    states,
  ] = await Promise.all([
    run<AthleteFigures>('athletes', () => collectAthleteFigures(supabase, range), {
      totalAthletes: 0,
      byState: [],
      bySport: [],
      byVerificationTier: [],
      byGradYear: [],
      institutionVerifiedGpaPct: 0,
    }),
    run<DealFigures>('deals', () => collectDealFigures(supabase, range), {
      totalDeals: 0,
      completedDeals: 0,
      completedRate: 0,
      totalGrossCents: 0,
      avgCompletionDays: null,
      byState: [],
      topBrandsByDealCount: [],
      topSportsByDealVolume: [],
    }),
    run<ComplianceFigures>(
      'compliance',
      () => collectComplianceFigures(supabase, range),
      {
        disclosuresSent: 0,
        disclosuresAttempted: 0,
        disclosureSuccessRate: 0,
        disclosuresByState: [],
        disclosuresByRecipientType: [],
        disputesRaised: 0,
        disputesByCategory: [],
        disputeResolutionOutcomes: [],
        parentalConsentsSigned: 0,
        consentsByAgeBucket: [
          { bucket: 'under_14', count: 0 },
          { bucket: '14_15', count: 0 },
          { bucket: '16_17', count: 0 },
        ],
        consentsByScopeCategory: [],
      }
    ),
    run<ReferralFigures>(
      'referrals',
      () => collectReferralFigures(supabase, range),
      {
        referralsAttributed: 0,
        referralConversionRate: 0,
        topReferrerTier: [
          { tier: '1', count: 0 },
          { tier: '2_to_5', count: 0 },
          { tier: '6_to_10', count: 0 },
          { tier: '11_plus', count: 0 },
        ],
        referredSignups: 0,
        organicSignups: 0,
        referredVsOrganicConsentRate: { referred: 0, organic: 0 },
      }
    ),
    run<ShareFigures>('shares', () => collectShareFigures(supabase, range), {
      totalShareEvents: 0,
      byPlatform: [],
      avgSharesPerCompletedDeal: 0,
      shareTriggeredSignups: 0,
    }),
    run<TrajectoryFigures>(
      'trajectory',
      () => collectTrajectoryFigures(supabase, range),
      {
        trajectoryProfilesCreated: 0,
        publicTokensGenerated: 0,
        publicUrlViews: 0,
        institutionVerifiedGpaPct: 0,
      }
    ),
    run<BrandFigures>('brands', () => collectBrandFigures(supabase, range), {
      totalHsEnabledBrands: 0,
      byVertical: [],
      totalSpendCents: 0,
      avgDealCents: 0,
    }),
    run<StateFigures>('states', () => collectStateFigures(supabase, range), {
      totalActivatedStates: 0,
      perState: [],
    }),
  ]);

  return {
    meta: {
      reportYear: range.year,
      reportLabel,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
    },
    athletes,
    deals,
    compliance,
    referrals,
    shares,
    trajectory,
    brands,
    states,
    partialFailures,
  };
}

// ----------------------------------------------------------------------------
// CSV helpers — the admin "Export Data CSV" button streams one file per section
// ----------------------------------------------------------------------------

export type CsvSection =
  | 'athletes_by_state'
  | 'athletes_by_sport'
  | 'athletes_by_tier'
  | 'athletes_by_grad_year'
  | 'deals_by_state'
  | 'deals_top_brands'
  | 'deals_top_sports'
  | 'compliance_disclosures_by_state'
  | 'compliance_disclosures_by_recipient'
  | 'compliance_disputes_by_category'
  | 'compliance_consents_by_age'
  | 'compliance_consents_by_scope'
  | 'referrals_tier_distribution'
  | 'shares_by_platform'
  | 'brands_by_vertical'
  | 'states_per_state';

export const CSV_SECTIONS: CsvSection[] = [
  'athletes_by_state',
  'athletes_by_sport',
  'athletes_by_tier',
  'athletes_by_grad_year',
  'deals_by_state',
  'deals_top_brands',
  'deals_top_sports',
  'compliance_disclosures_by_state',
  'compliance_disclosures_by_recipient',
  'compliance_disputes_by_category',
  'compliance_consents_by_age',
  'compliance_consents_by_scope',
  'referrals_tier_distribution',
  'shares_by_platform',
  'brands_by_vertical',
  'states_per_state',
];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvCell(r[h])).join(','));
  }
  return lines.join('\n');
}

export function sectionToCsv(data: AnnualReportData, section: CsvSection): string {
  switch (section) {
    case 'athletes_by_state':
      return rowsToCsv(['state_code', 'count'], data.athletes.byState);
    case 'athletes_by_sport':
      return rowsToCsv(['sport', 'count'], data.athletes.bySport);
    case 'athletes_by_tier':
      return rowsToCsv(['tier', 'count'], data.athletes.byVerificationTier);
    case 'athletes_by_grad_year':
      return rowsToCsv(['grad_year', 'count'], data.athletes.byGradYear);
    case 'deals_by_state':
      return rowsToCsv(
        ['state_code', 'count', 'gross_cents'],
        data.deals.byState.map((r) => ({
          state_code: r.stateCode,
          count: r.count,
          gross_cents: r.grossCents,
        }))
      );
    case 'deals_top_brands':
      return rowsToCsv(
        ['brand_id', 'brand_name', 'deal_count', 'gross_cents'],
        data.deals.topBrandsByDealCount.map((r) => ({
          brand_id: r.brandId,
          brand_name: r.brandName,
          deal_count: r.dealCount,
          gross_cents: r.grossCents,
        }))
      );
    case 'deals_top_sports':
      return rowsToCsv(
        ['sport', 'deal_count', 'gross_cents'],
        data.deals.topSportsByDealVolume.map((r) => ({
          sport: r.sport,
          deal_count: r.dealCount,
          gross_cents: r.grossCents,
        }))
      );
    case 'compliance_disclosures_by_state':
      return rowsToCsv(
        ['state_code', 'sent', 'failed'],
        data.compliance.disclosuresByState
      );
    case 'compliance_disclosures_by_recipient':
      return rowsToCsv(
        ['recipient_type', 'count'],
        data.compliance.disclosuresByRecipientType.map((r) => ({
          recipient_type: r.recipientType,
          count: r.count,
        }))
      );
    case 'compliance_disputes_by_category':
      return rowsToCsv(['category', 'count'], data.compliance.disputesByCategory);
    case 'compliance_consents_by_age':
      return rowsToCsv(['bucket', 'count'], data.compliance.consentsByAgeBucket);
    case 'compliance_consents_by_scope':
      return rowsToCsv(
        ['category', 'count'],
        data.compliance.consentsByScopeCategory
      );
    case 'referrals_tier_distribution':
      return rowsToCsv(['tier', 'count'], data.referrals.topReferrerTier);
    case 'shares_by_platform':
      return rowsToCsv(['platform', 'count'], data.shares.byPlatform);
    case 'brands_by_vertical':
      return rowsToCsv(['vertical', 'count'], data.brands.byVertical);
    case 'states_per_state':
      return rowsToCsv(
        [
          'state_code',
          'waitlist_count',
          'signup_count',
          'conversion_rate',
          'active_deals',
          'completed_deals',
          'days_waitlist_to_pilot_open',
          'headline_story_url',
        ],
        data.states.perState.map((r) => ({
          state_code: r.stateCode,
          waitlist_count: r.waitlistCount,
          signup_count: r.signupCount,
          conversion_rate: r.conversionRate,
          active_deals: r.activeDeals,
          completed_deals: r.completedDeals,
          days_waitlist_to_pilot_open: r.daysWaitlistToPilotOpen,
          headline_story_url: r.headlineStoryUrl,
        }))
      );
  }
}

// ----------------------------------------------------------------------------
// Range helpers
// ----------------------------------------------------------------------------

export function parseAnnualRangeParams(sp: {
  year?: string;
  from?: string;
  to?: string;
}): AnnualReportRange {
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : new Date().getUTCFullYear();
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const defaultStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const defaultEnd = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
  const rangeStart =
    sp.from && dateRe.test(sp.from)
      ? new Date(`${sp.from}T00:00:00.000Z`).toISOString()
      : defaultStart;
  const rangeEnd =
    sp.to && dateRe.test(sp.to)
      ? new Date(
          new Date(`${sp.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000
        ).toISOString()
      : defaultEnd;
  return { year, rangeStart, rangeEnd };
}
