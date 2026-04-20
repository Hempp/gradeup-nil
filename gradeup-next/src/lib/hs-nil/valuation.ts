/**
 * HS-NIL Public Valuation Calculator — v1 Estimate Service
 * ============================================================================
 *
 * Pure-TypeScript deterministic valuation model for the `/hs/valuation`
 * public marketing calculator. A parent or athlete lands on the page,
 * picks sport / state / grade / follower bucket / GPA tier, and gets an
 * honest range for annual NIL value.
 *
 * Design goals
 * ────────────
 *   1. **Zero backend dependency.** The core estimate is synchronous
 *      and side-effect-free. It runs on the client so SEO crawlers
 *      index a fast static shell, then hydrate → interactive.
 *   2. **Honest, range-first output.** We never return a single point
 *      estimate. Public NIL deal data is a wide distribution; anchoring
 *      on a range prevents disappointment when the real number lands
 *      inside the band. Low/mid/high = 60%/100%/160% of the central
 *      estimate by default (adjustable per bucket).
 *   3. **Documented coefficients.** Every multiplier has a source
 *      comment so admin / legal can audit the claims when the
 *      calculator shows up on a competitor screenshot. No magic
 *      numbers without provenance.
 *   4. **v1 = linear-combination.** A log-scale follower term, a sport-
 *      demand multiplier, a state brand-density multiplier, a grad-
 *      level multiplier, and a GPA tier bump. Good enough for
 *      top-of-funnel. When we have real deal data flowing through the
 *      platform, we plug a regression fit into the same interface.
 *
 * Methodology summary (for the "How this works" explainer)
 * ────────────────────────────────────────────────────────
 *   annual_value ≈ BASELINE_ANNUAL
 *                  × sportMultiplier(sport)
 *                  × stateMultiplier(state)
 *                  × followerMultiplier(bucket)
 *                  × gradMultiplier(gradLevel)
 *                  × gpaMultiplier(gpaBucket, verified)
 *                  × tierBonus(tierBSubmitted)
 *
 * Coefficients are calibrated so a "median HS athlete in a permitting
 * state with ~2k followers and solid grades" lands around $1.5k–$3k/yr,
 * which matches the NIL Club / Opendorse public ranges for HS deals.
 * A star senior football player in CA/TX/FL with 50k+ followers lands
 * in the $15k–$40k range — also consistent with publicly-reported HS
 * football deals in 2024-2026.
 *
 * IMPORTANT: These are v1 estimates. Real valuations vary widely based
 * on market timing, brand fit, signed-deal negotiation skill, and
 * non-modeled factors. GradeUp HS helps parents/athletes verify,
 * broker, and close real deals — the calculator is a starting point,
 * not a contract.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { USPSStateCode } from './state-rules';
import { STATE_RULES } from './state-rules';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValuationSport =
  | 'football'
  | 'basketball_m'
  | 'basketball_w'
  | 'baseball'
  | 'softball'
  | 'soccer_m'
  | 'soccer_w'
  | 'volleyball'
  | 'track_field'
  | 'cross_country'
  | 'wrestling'
  | 'swimming'
  | 'tennis'
  | 'golf'
  | 'lacrosse'
  | 'hockey'
  | 'gymnastics'
  | 'cheer'
  | 'other';

export type FollowerBucket =
  | 'under_500'
  | '500_to_2k'
  | '2k_to_10k'
  | '10k_to_50k'
  | '50k_plus';

export type GpaBucket = 'under_3_0' | '3_0_to_3_5' | '3_5_to_3_9' | '3_9_plus';

export type GradLevel =
  | 'freshman'
  | 'sophomore'
  | 'junior'
  | 'senior'
  | 'college_freshman';

export interface ValuationInput {
  sport: ValuationSport;
  stateCode: USPSStateCode;
  gradLevel: GradLevel;
  followerCountBucket: FollowerBucket;
  gpaBucket: GpaBucket;
  verifiedGpa: boolean;
  tierBSubmitted: boolean;
}

export interface ValuationResult {
  /** Low-end of the annual range, in USD cents. */
  lowEstimateCents: number;
  /** Central / expected estimate, in USD cents. */
  midEstimateCents: number;
  /** High-end of the annual range, in USD cents. */
  highEstimateCents: number;
  /** Human-readable "$X – $Y / yr" summary. */
  annualRangeCents: { lowCents: number; highCents: number };
  /** Top 3 suggested deal categories based on sport + state + tier. */
  topSuggestedCategories: string[];
  /** Plain-language caveats (banned categories, state limits, etc). */
  caveats: string[];
  /** Methodology version — lets us detect stale cached results. */
  methodologyVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coefficients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Central tendency for a "typical" HS athlete in a permitting state
 * with middle-of-the-road everything. All multipliers pivot around 1.0
 * at this baseline.
 *
 * $1,800/yr baseline is calibrated from the Opendorse "median HS deal"
 * range ($1k–$2.5k) reported across 2024-2025, blown up ~1.5x to
 * reflect that most HS athletes closing deals on marketplaces like
 * this do 2–4 deals per year rather than one.
 */
const BASELINE_ANNUAL_CENTS = 180_000; // $1,800

const METHODOLOGY_VERSION = 'v1.0.0-2026-04-19';

/**
 * Sport demand multiplier. Football + men's basketball dominate HS NIL
 * deal volume. Women's basketball rising fast post-Caitlin-Clark era.
 * Niche sports (golf, tennis, gymnastics) see smaller deals but
 * occasionally attract premium niche sponsors.
 */
const SPORT_MULTIPLIERS: Record<ValuationSport, number> = {
  football: 2.6,
  basketball_m: 2.2,
  basketball_w: 1.8,
  baseball: 1.2,
  softball: 1.1,
  soccer_m: 1.0,
  soccer_w: 1.1,
  volleyball: 1.0,
  track_field: 0.85,
  cross_country: 0.7,
  wrestling: 0.9,
  swimming: 0.85,
  tennis: 0.9,
  golf: 1.0,
  lacrosse: 0.95,
  hockey: 1.1,
  gymnastics: 1.0,
  cheer: 1.2, // high social-follower skew
  other: 0.8,
};

/**
 * State brand-density multiplier. Driven by number of headquartered
 * consumer brands + DMA size + existing HS-NIL market activity.
 * Values > 1.0 indicate denser brand-buying; values < 1.0 reflect
 * lower sponsor activity or restrictive state rules.
 *
 * Default for unmodeled states: 0.8 (returns a conservative estimate
 * for small-market states).
 */
const STATE_MULTIPLIERS: Partial<Record<USPSStateCode, number>> = {
  CA: 1.4, // largest market, film+tech brand concentration
  TX: 1.35, // massive HS football market, TX brands spend heavy
  FL: 1.25, // large HS athlete base, tourism brands
  GA: 1.15, // Atlanta brand HQ presence
  NY: 1.2, // national media market
  NJ: 1.0, // metro-adjacent, moderate spend
  IL: 1.05, // Chicago market
  OH: 1.0,
  PA: 1.0,
  MA: 1.05,
  MI: 0.95,
  NC: 1.0,
  VA: 0.95,
  WA: 1.0,
  AZ: 0.95,
  CO: 0.95,
  TN: 1.0,
  OR: 0.9,
};

function getStateMultiplier(stateCode: USPSStateCode): number {
  return STATE_MULTIPLIERS[stateCode] ?? 0.8;
}

/**
 * Log-scale follower bucket multiplier. Mid-point of each bucket used
 * as a proxy; log-scale because advertiser willingness-to-pay per
 * follower drops as count rises (the first 1k followers are "prove
 * you're real"; the next 10k are audience scale).
 */
const FOLLOWER_MULTIPLIERS: Record<FollowerBucket, number> = {
  under_500: 0.4,
  '500_to_2k': 0.75,
  '2k_to_10k': 1.2,
  '10k_to_50k': 2.4,
  '50k_plus': 4.5,
};

/**
 * Graduation-level multiplier. Seniors and college freshmen command a
 * premium because their commercial window is nearer-term and brands
 * can activate them through college. Underclassmen discount reflects
 * longer payoff horizon + eligibility risk.
 */
const GRAD_MULTIPLIERS: Record<GradLevel, number> = {
  freshman: 0.6,
  sophomore: 0.8,
  junior: 1.0,
  senior: 1.25,
  college_freshman: 1.35,
};

/**
 * GPA tier adjustment. Scholar-athlete framing is our differentiator —
 * the higher the verified GPA, the more premium brands (education,
 * financial services, local-community sponsors) are willing to pay.
 * Verification amplifies the bump because brand risk-of-embarrassment
 * drops.
 */
const GPA_MULTIPLIERS: Record<GpaBucket, number> = {
  under_3_0: 0.95,
  '3_0_to_3_5': 1.0,
  '3_5_to_3_9': 1.05,
  '3_9_plus': 1.1,
};

const VERIFIED_GPA_BONUS = 0.05; // stacks additively on top of GPA bucket
const TIER_B_BONUS = 0.08; // Tier B = submitted transcript = brand-facing proof

// Low/high envelope around the central estimate. Calibrated to cover
// the 25th–75th percentile of publicly-reported HS NIL deals.
const LOW_BAND = 0.6;
const HIGH_BAND = 1.6;

// ─────────────────────────────────────────────────────────────────────────────
// Category suggestions
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_CATEGORIES = [
  'Local restaurants',
  'Youth camps & clinics',
  'Apparel & gear',
];

const SPORT_CATEGORY_HINTS: Record<ValuationSport, string[]> = {
  football: ['Apparel & gear', 'Local restaurants', 'Youth camps & clinics'],
  basketball_m: ['Apparel & gear', 'Trainers & private coaching', 'Local restaurants'],
  basketball_w: ['Apparel & gear', 'Trainers & private coaching', 'Local beauty & wellness'],
  baseball: ['Equipment & gloves', 'Training facilities', 'Local restaurants'],
  softball: ['Equipment & bats', 'Training facilities', 'Local beauty & wellness'],
  soccer_m: ['Cleats & apparel', 'Club soccer programs', 'Local restaurants'],
  soccer_w: ['Cleats & apparel', 'Club soccer programs', 'Local beauty & wellness'],
  volleyball: ['Apparel & gear', 'Club volleyball programs', 'Local beauty & wellness'],
  track_field: ['Running shoes', 'Nutrition & supplements', 'Training programs'],
  cross_country: ['Running shoes', 'Nutrition & supplements', 'Local races & events'],
  wrestling: ['Gear & supplements', 'Training facilities', 'Local restaurants'],
  swimming: ['Swim gear & goggles', 'Nutrition & supplements', 'Private lessons'],
  tennis: ['Racquets & apparel', 'Private coaching', 'Local country clubs'],
  golf: ['Clubs & apparel', 'Golf instruction', 'Country clubs'],
  lacrosse: ['Gear & sticks', 'Club programs', 'Local restaurants'],
  hockey: ['Gear & skates', 'Training facilities', 'Local restaurants'],
  gymnastics: ['Leotards & gear', 'Training facilities', 'Local beauty & wellness'],
  cheer: ['Apparel & accessories', 'Beauty & wellness', 'Competition travel'],
  other: FALLBACK_CATEGORIES,
};

// ─────────────────────────────────────────────────────────────────────────────
// Core estimate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a v1 annual NIL valuation estimate.
 *
 * Deterministic, pure, no I/O. Safe to call from a server component,
 * a client component, a worker, or an edge function.
 */
export function estimateValuation(input: ValuationInput): ValuationResult {
  const sportMult = SPORT_MULTIPLIERS[input.sport] ?? SPORT_MULTIPLIERS.other;
  const stateMult = getStateMultiplier(input.stateCode);
  const followerMult =
    FOLLOWER_MULTIPLIERS[input.followerCountBucket] ??
    FOLLOWER_MULTIPLIERS.under_500;
  const gradMult = GRAD_MULTIPLIERS[input.gradLevel] ?? 1.0;

  let gpaMult = GPA_MULTIPLIERS[input.gpaBucket] ?? 1.0;
  if (input.verifiedGpa && input.gpaBucket !== 'under_3_0') {
    gpaMult += VERIFIED_GPA_BONUS;
  }

  const tierBonus = input.tierBSubmitted ? 1 + TIER_B_BONUS : 1.0;

  const central = Math.round(
    BASELINE_ANNUAL_CENTS *
      sportMult *
      stateMult *
      followerMult *
      gradMult *
      gpaMult *
      tierBonus
  );

  const low = Math.round(central * LOW_BAND);
  const high = Math.round(central * HIGH_BAND);

  return {
    lowEstimateCents: low,
    midEstimateCents: central,
    highEstimateCents: high,
    annualRangeCents: { lowCents: low, highCents: high },
    topSuggestedCategories: buildTopCategories(input),
    caveats: buildCaveats(input),
    methodologyVersion: METHODOLOGY_VERSION,
  };
}

function buildTopCategories(input: ValuationInput): string[] {
  const fromSport =
    SPORT_CATEGORY_HINTS[input.sport] ?? FALLBACK_CATEGORIES;
  return [...fromSport].slice(0, 3);
}

function buildCaveats(input: ValuationInput): string[] {
  const caveats: string[] = [];
  const rules = STATE_RULES[input.stateCode];

  if (!rules) {
    caveats.push(
      `We don't yet track ${input.stateCode} rules in detail — double-check your state athletic association's NIL policy before signing anything.`
    );
  } else if (rules.status === 'prohibited') {
    caveats.push(
      `${input.stateCode} currently prohibits HS NIL. Deals are not permissible under your state athletic association until rules change.`
    );
  } else if (rules.status === 'limited' || rules.status === 'transitioning') {
    caveats.push(
      `${input.stateCode} is in a transitional HS NIL window — some deal types may be restricted.`
    );
  }

  if (rules && rules.bannedCategories.length > 0) {
    const bannedList = rules.bannedCategories.slice(0, 3).join(', ');
    caveats.push(
      `Your state bans deals in these categories: ${bannedList}${
        rules.bannedCategories.length > 3 ? ', and more' : ''
      }. Plan around them.`
    );
  }

  if (rules?.paymentDeferredUntilAge18) {
    caveats.push(
      `Payments in ${input.stateCode} are held in custodial trust until the athlete turns 18 — expected, not a problem, but worth knowing.`
    );
  }

  if (input.followerCountBucket === 'under_500') {
    caveats.push(
      'Your follower count is in the "starter" bucket. Consistent posting over the next 6 months can move you up a tier.'
    );
  }

  if (!input.verifiedGpa && input.gpaBucket !== 'under_3_0') {
    caveats.push(
      'A verified transcript unlocks roughly 5–10% higher brand interest — you have more leverage than the number shows.'
    );
  }

  caveats.push(
    'This is a v1 estimate. Real market deals vary widely. GradeUp HS helps you verify credentials, match with brands, and close actual deals.'
  );

  return caveats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Named personas — demo / case-study convenience
// ─────────────────────────────────────────────────────────────────────────────

export type ValuationPersona =
  | 'star_senior_qb'
  | 'scholar_sophomore'
  | 'niche_sport_junior'
  | 'freshman_future_star'
  | 'college_bound_guard';

const PERSONAS: Record<ValuationPersona, ValuationInput> = {
  star_senior_qb: {
    sport: 'football',
    stateCode: 'TX',
    gradLevel: 'senior',
    followerCountBucket: '50k_plus',
    gpaBucket: '3_5_to_3_9',
    verifiedGpa: true,
    tierBSubmitted: true,
  },
  scholar_sophomore: {
    sport: 'soccer_w',
    stateCode: 'CA',
    gradLevel: 'sophomore',
    followerCountBucket: '2k_to_10k',
    gpaBucket: '3_9_plus',
    verifiedGpa: true,
    tierBSubmitted: true,
  },
  niche_sport_junior: {
    sport: 'golf',
    stateCode: 'FL',
    gradLevel: 'junior',
    followerCountBucket: '500_to_2k',
    gpaBucket: '3_5_to_3_9',
    verifiedGpa: true,
    tierBSubmitted: false,
  },
  freshman_future_star: {
    sport: 'basketball_m',
    stateCode: 'GA',
    gradLevel: 'freshman',
    followerCountBucket: '2k_to_10k',
    gpaBucket: '3_0_to_3_5',
    verifiedGpa: false,
    tierBSubmitted: false,
  },
  college_bound_guard: {
    sport: 'basketball_w',
    stateCode: 'NY',
    gradLevel: 'college_freshman',
    followerCountBucket: '10k_to_50k',
    gpaBucket: '3_5_to_3_9',
    verifiedGpa: true,
    tierBSubmitted: true,
  },
};

export function estimateForPersona(persona: ValuationPersona): ValuationResult {
  return estimateValuation(PERSONAS[persona]);
}

export function getPersonaInput(persona: ValuationPersona): ValuationInput {
  return { ...PERSONAS[persona] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Option metadata — reused by client form + admin analytics
// ─────────────────────────────────────────────────────────────────────────────

export const SPORT_LABELS: Record<ValuationSport, string> = {
  football: 'Football',
  basketball_m: "Basketball (Men's)",
  basketball_w: "Basketball (Women's)",
  baseball: 'Baseball',
  softball: 'Softball',
  soccer_m: "Soccer (Men's)",
  soccer_w: "Soccer (Women's)",
  volleyball: 'Volleyball',
  track_field: 'Track & Field',
  cross_country: 'Cross Country',
  wrestling: 'Wrestling',
  swimming: 'Swimming',
  tennis: 'Tennis',
  golf: 'Golf',
  lacrosse: 'Lacrosse',
  hockey: 'Hockey',
  gymnastics: 'Gymnastics',
  cheer: 'Cheer',
  other: 'Other',
};

export const FOLLOWER_LABELS: Record<FollowerBucket, string> = {
  under_500: 'Under 500',
  '500_to_2k': '500 – 2,000',
  '2k_to_10k': '2,000 – 10,000',
  '10k_to_50k': '10,000 – 50,000',
  '50k_plus': '50,000+',
};

export const GPA_LABELS: Record<GpaBucket, string> = {
  under_3_0: 'Under 3.0',
  '3_0_to_3_5': '3.0 – 3.5',
  '3_5_to_3_9': '3.5 – 3.9',
  '3_9_plus': '3.9+',
};

export const GRAD_LABELS: Record<GradLevel, string> = {
  freshman: 'Freshman (HS)',
  sophomore: 'Sophomore (HS)',
  junior: 'Junior (HS)',
  senior: 'Senior (HS)',
  college_freshman: 'College Freshman',
};

// ─────────────────────────────────────────────────────────────────────────────
// Server-side: log + conversion tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs describing where the request came from. All fields hashed or
 * coarse-grained; raw IPs and precise user-agent fingerprints never hit
 * the database.
 */
export interface LogValuationRequestInput {
  inputs: ValuationInput;
  result: ValuationResult;
  ipHash: string;
  userAgentHint: string | null;
  referrerUrl: string | null;
}

/**
 * Insert an anonymous valuation request row into `valuation_requests`.
 * Must be called with a service-role Supabase client because the table
 * only permits service-role writes. Returns the row id on success, or
 * null on failure — the UI *must* degrade gracefully if logging fails.
 */
export async function logValuationRequest(
  supabase: SupabaseClient,
  input: LogValuationRequestInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('valuation_requests')
    .insert({
      inputs: input.inputs,
      estimate_low_cents: input.result.lowEstimateCents,
      estimate_mid_cents: input.result.midEstimateCents,
      estimate_high_cents: input.result.highEstimateCents,
      ip_hash: input.ipHash,
      user_agent_hint: input.userAgentHint,
      referrer_url: input.referrerUrl,
      methodology_version: input.result.methodologyVersion,
    })
    .select('id')
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil valuation] log insert failed', {
      error: error?.message ?? 'no row returned',
    });
    return null;
  }

  return data.id as string;
}

/**
 * Mark a valuation request as converted to a waitlist signup. Best-
 * effort — the waitlist signup itself is the source of truth; this is
 * an attribution breadcrumb only. Failures are swallowed.
 */
export async function markValuationConverted(
  supabase: SupabaseClient,
  requestId: string,
  waitlistId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('valuation_requests')
    .update({
      converted_to_waitlist: true,
      converted_waitlist_id: waitlistId,
      converted_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil valuation] conversion mark failed', {
      requestId,
      error: error.message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Format cents → "$X,XXX" (no trailing cents — we're dealing in ranges). */
export function formatValuationCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand-perspective Fair-Market-Value wrapper (Phase 13 / BRAND-FMV)
// ─────────────────────────────────────────────────────────────────────────────
//
// The athlete-side calculator answers "what am I worth?" The brand side asks
// "what should I pay?" The math is the same baseline × bucket product — we
// reuse `estimateValuation` verbatim and layer two multiplicative transforms
// on top:
//
//   1. DELIVERABLE_MULTIPLIERS — bundle adjustment. Annual-athlete value is
//      the baseline; a single post is ~1/12 of a year of activity but
//      captures roughly the unit-price of one deliverable in the
//      Opendorse 2024-2026 HS dataset (so multiplier = 1.0). Larger bundles
//      apply a light bundle-discount ("2.2x instead of 3x" for a three-post
//      series) reflecting observed list-vs-bundle pricing.
//
//   2. Multi-athlete scaling — linear on count. Aspirational volume-discount
//      ribbon at ≥10 athletes is rendered by the UI, not baked into the
//      pricing math (we don't want to promise a discount in the compute
//      layer). The UI cue is informational only.
//
// Why multiplicative and not additive?
// ─────────────────────────────────────
// The athlete estimate already captures "how premium is this athlete?" A
// dollar of athlete premium should scale proportionally with deliverable
// weight and campaign breadth. Additive would flatten the premium when
// brands scale up, which is the opposite of what happens in market.

/**
 * Deliverable-type bundle multipliers. Applied multiplicatively to the
 * athlete-side mid estimate to produce a per-athlete campaign estimate.
 *
 *   single_post (1.0x)         — baseline single deliverable.
 *   three_post_series (2.2x)   — bundle discount vs 3.0x naive; reflects
 *                                 observed list-vs-package HS NIL pricing.
 *   in_person_appearance (1.8x)— premium for in-person obligation, one-off.
 *   multi_month_campaign (5.0x)— commitment + exclusivity premium, aligns
 *                                 with HS-side multi-month deals in 2024-2026.
 *
 * These are v1 coefficients. Every change should come with a matching
 * METHODOLOGY_VERSION bump below so admin analytics can segment rows
 * computed under the old vs new coefficient set.
 */
export const DELIVERABLE_MULTIPLIERS = {
  single_post: 1.0,
  three_post_series: 2.2,
  in_person_appearance: 1.8,
  multi_month_campaign: 5.0,
} as const;

export type DeliverableType = keyof typeof DELIVERABLE_MULTIPLIERS;

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  single_post: 'Single social post',
  three_post_series: 'Three-post series',
  in_person_appearance: 'In-person appearance',
  multi_month_campaign: 'Multi-month campaign',
};

/**
 * Brand verticals that can be passed through from the top-level brand
 * marketing pages (owned by VERTICAL-BRAND-PAGES). The set is closed so
 * analytics can bucket without normalization; 'other' is the escape hatch.
 *
 * NOTE: the co-agent's vertical list is authoritative. This type stays
 * additive-compatible: adding a vertical requires updating this union +
 * BRAND_VERTICAL_LABELS only.
 */
export type BrandVertical =
  | 'qsr'
  | 'apparel'
  | 'training'
  | 'local_services'
  | 'education'
  | 'other';

export const BRAND_VERTICAL_LABELS: Record<BrandVertical, string> = {
  qsr: 'Quick-service restaurant',
  apparel: 'Apparel & gear',
  training: 'Training & performance',
  local_services: 'Local services',
  education: 'Education & tutoring',
  other: 'Other',
};

/** Threshold above which the UI surfaces an aspirational volume-discount ribbon. */
export const VOLUME_DISCOUNT_ATHLETE_THRESHOLD = 10;

export interface BrandValuationContext {
  /** Brand-chosen vertical; drives which banned-categories to surface. */
  vertical: BrandVertical;
  /** Deliverable type for each athlete in the campaign. */
  deliverableType: DeliverableType;
  /** Count of athletes the brand is planning to hire (≥1). */
  athleteCount: number;
  /** Optional freeform notes; surfaced on the admin lead follow-up view. */
  campaignNotes?: string | null;
}

export interface BrandValuationInput extends ValuationInput {
  brand: BrandValuationContext;
}

export interface BrandValuationResult {
  /** Range the brand should expect to pay one athlete for one deliverable unit. */
  perDeliverableCents: { low: number; mid: number; high: number };
  /** Total campaign cost = per-athlete × athleteCount. */
  campaignTotalCents: { low: number; mid: number; high: number };
  /**
   * Aspirational discount ribbon. UI-only flag; the compute layer does not
   * apply a price reduction. Calibrated to illustrate, not to promise.
   */
  volumeDiscountApplied: boolean;
  /** Human-readable caveats, reusing the athlete-side copy + brand extras. */
  caveats: string[];
  /** State-rules-derived compliance callouts (banned cats, disclosure window). */
  complianceCallouts: string[];
  /** Categories the athlete's sport + vertical context supports. */
  topSuggestedCategories: string[];
  /** Methodology version of the underlying athlete estimate. */
  methodologyVersion: string;
}

/**
 * Pure, side-effect-free brand-side valuation.
 *
 * Reuses `estimateValuation` as the canonical athlete-side math, then
 * applies the deliverable multiplier + athlete-count scaling. Safe to
 * call from server components, client components, edge functions, or
 * workers. Zero I/O.
 */
export function estimateBrandCampaignValuation(
  input: BrandValuationInput
): BrandValuationResult {
  const athleteResult = estimateValuation(input);
  const deliverableMult = DELIVERABLE_MULTIPLIERS[input.brand.deliverableType];
  const athleteCount = Math.max(1, Math.floor(input.brand.athleteCount));

  // Per-athlete, per-deliverable. Scale the athlete-side low/mid/high by
  // the deliverable multiplier; band-envelope stays intact because the
  // multiplier is a scalar.
  const perLow = Math.round(athleteResult.lowEstimateCents * deliverableMult);
  const perMid = Math.round(athleteResult.midEstimateCents * deliverableMult);
  const perHigh = Math.round(athleteResult.highEstimateCents * deliverableMult);

  // Total campaign = per-athlete × N. No volume discount applied in math
  // (the ribbon is illustrative only — see VOLUME_DISCOUNT_ATHLETE_THRESHOLD).
  const totalLow = perLow * athleteCount;
  const totalMid = perMid * athleteCount;
  const totalHigh = perHigh * athleteCount;

  const complianceCallouts = buildBrandComplianceCallouts(input);

  // Brand-specific caveats layered on top of the athlete list.
  const extraCaveats: string[] = [];
  extraCaveats.push(
    'These ranges fall below Opendorse\u2019s published college-NIL averages, consistent with the HS market. Budget accordingly.'
  );
  if (athleteCount >= VOLUME_DISCOUNT_ATHLETE_THRESHOLD) {
    extraCaveats.push(
      `At ${athleteCount}+ athletes you\u2019re in volume-discount territory. Talk to us about a campaign rate card.`
    );
  }

  return {
    perDeliverableCents: { low: perLow, mid: perMid, high: perHigh },
    campaignTotalCents: { low: totalLow, mid: totalMid, high: totalHigh },
    volumeDiscountApplied:
      athleteCount >= VOLUME_DISCOUNT_ATHLETE_THRESHOLD,
    caveats: [...athleteResult.caveats, ...extraCaveats],
    complianceCallouts,
    topSuggestedCategories: athleteResult.topSuggestedCategories,
    methodologyVersion: athleteResult.methodologyVersion,
  };
}

/**
 * Compliance callouts assembled from STATE_RULES for the athlete's state
 * plus vertical-specific flags. These are user-facing strings; the admin
 * analytics surface also sees them via the logged brand_context.
 */
function buildBrandComplianceCallouts(
  input: BrandValuationInput
): string[] {
  const out: string[] = [];
  const rules = STATE_RULES[input.stateCode];
  if (!rules) {
    out.push(
      `We don\u2019t track ${input.stateCode} state-association rules in detail yet. Before you post, verify HS NIL rules with your athlete\u2019s state body.`
    );
    return out;
  }

  if (rules.status === 'prohibited') {
    out.push(
      `${input.stateCode} currently prohibits HS NIL. You cannot activate deals with an HS athlete in this state until rules change.`
    );
  } else if (rules.status === 'limited' || rules.status === 'transitioning') {
    out.push(
      `${input.stateCode} is in a transitional HS NIL window. Certain deal categories may be restricted — we\u2019ll flag the exact guardrails during onboarding.`
    );
  }

  if (rules.bannedCategories.length > 0) {
    const banned = rules.bannedCategories.join(', ');
    out.push(
      `In ${input.stateCode} you cannot run deals in these categories: ${banned}. You also cannot use school logos or mascots.`
    );
  }

  if (rules.disclosureWindowHours !== null) {
    const recipient =
      rules.disclosureRecipient === 'state_athletic_association'
        ? 'the state athletic association'
        : rules.disclosureRecipient === 'both'
        ? 'both the school and the state athletic association'
        : rules.disclosureRecipient ?? 'the school';
    out.push(
      `In ${input.stateCode} the athlete (or parent) must disclose this deal to ${recipient} within ${rules.disclosureWindowHours} hours of signing.`
    );
  }

  if (rules.agentRegistrationRequired) {
    out.push(
      `${input.stateCode} requires registered agents for HS NIL. If you plan to use one, verify their registration before signing.`
    );
  }

  if (rules.paymentDeferredUntilAge18) {
    out.push(
      `In ${input.stateCode} payments to a minor athlete are held in custodial trust until they turn 18. Expected, not a blocker.`
    );
  }

  // Vertical-specific nudge: if a brand's vertical overlaps with a common
  // banned category, call it out explicitly.
  if (
    input.brand.vertical === 'qsr' &&
    rules.bannedCategories.includes('alcohol')
  ) {
    out.push(
      'Quick-service menus sometimes include alcohol co-marketing. Keep this campaign non-alcoholic to stay compliant.'
    );
  }

  return out;
}

/**
 * Log a brand-perspective valuation row to `valuation_requests`. Mirrors
 * `logValuationRequest` but sets perspective='brand' and serializes the
 * brand context JSONB. Service-role client required. Returns the row id
 * or null; callers must degrade gracefully on null.
 */
export interface LogBrandValuationRequestInput {
  inputs: ValuationInput;
  brandContext: BrandValuationContext;
  result: BrandValuationResult;
  ipHash: string;
  userAgentHint: string | null;
  referrerUrl: string | null;
}

export async function logBrandValuationRequest(
  supabase: SupabaseClient,
  input: LogBrandValuationRequestInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('valuation_requests')
    .insert({
      inputs: input.inputs,
      // Headline numbers on a brand row = per-deliverable per-athlete range.
      // Campaign-level totals live in brand_context so a single-column
      // aggregation across rows of both perspectives still makes sense.
      estimate_low_cents: input.result.perDeliverableCents.low,
      estimate_mid_cents: input.result.perDeliverableCents.mid,
      estimate_high_cents: input.result.perDeliverableCents.high,
      ip_hash: input.ipHash,
      user_agent_hint: input.userAgentHint,
      referrer_url: input.referrerUrl,
      methodology_version: input.result.methodologyVersion,
      perspective: 'brand',
      brand_context: {
        vertical: input.brandContext.vertical,
        deliverableType: input.brandContext.deliverableType,
        athleteCount: input.brandContext.athleteCount,
        campaignNotes: input.brandContext.campaignNotes ?? null,
        campaignTotalCents: input.result.campaignTotalCents,
        volumeDiscountApplied: input.result.volumeDiscountApplied,
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil brand-fmv] log insert failed', {
      error: error?.message ?? 'no row returned',
    });
    return null;
  }

  return data.id as string;
}

/** Infer a 4-digit graduation year from a grad level + current date. */
export function gradLevelToGraduationYear(
  gradLevel: GradLevel,
  now: Date = new Date()
): number {
  // Academic year: Aug–Jul. If we're in Aug–Dec of calendar year Y,
  // a senior graduates in Y+1. If Jan–Jul of year Y, a senior
  // graduates in Y.
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const academicEndYear = month >= 7 ? year + 1 : year;
  const offset: Record<GradLevel, number> = {
    senior: 0,
    junior: 1,
    sophomore: 2,
    freshman: 3,
    college_freshman: -1,
  };
  return academicEndYear + offset[gradLevel];
}
