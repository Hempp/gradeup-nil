/**
 * HS-NIL Deal Validation — creation gate + acceptance consent-scope match.
 *
 * Two public entrypoints used by the deals API:
 *
 *   validateDealCreation({ deal, athlete })
 *     Called at POST /api/deals *before* insert. Routes college deals through
 *     untouched, blocks HS deals that violate the state rule set
 *     (evaluateDeal() in state-rules.ts), and surfaces the derived state_code
 *     + requires_disclosure flags back to the caller so they can be written on
 *     the deal row.
 *
 *   checkConsentScope({ athleteUserId, category, amount, durationMonths })
 *     Called at PATCH /api/deals/[id] when the athlete transitions the deal to
 *     'accepted'. Verifies there is at least one active parental_consents row
 *     whose scope covers the (category, amount, durationMonths) tuple. Returns
 *     the matching consent id so the caller can stamp deal.parental_consent_id.
 *
 * MODEL-EXTENDER is adding the `target_bracket`, `parental_consent_id`,
 * `state_code`, `requires_disclosure` columns to `deals`. This file references
 * them in the expected shape; local `tsc` will still pass because we read/write
 * through the generic supabase client (no generated typing on these columns
 * yet).
 *
 * Deal category → consent category is a thin mapping layer; see
 * mapDealTypeToConsentCategory() below for the taxonomy note.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateDeal,
  type BannedCategory,
  type USPSStateCode,
} from '@/lib/hs-nil/state-rules';
import type { ConsentScope } from '@/lib/hs-nil/consent-provider';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

/**
 * Minimum data the validator needs about the proposed deal. The real deal row
 * carries many more fields — we intentionally take a narrow shape so callers
 * can build this from either a zod-validated request body or a DB row.
 */
export interface ValidateDealCreationInput {
  deal: {
    target_bracket?: string | null;
    deal_type: string;
    compensation_amount: number;
    start_date?: string | null;
    end_date?: string | null;
    /** Optional free-form tags the UI may attach (e.g. ['apparel']). */
    tags?: string[] | null;
    /** Optional flags from the intake form. */
    involves_school_ip?: boolean;
    is_contingent_on_performance?: boolean;
  };
  athlete: {
    /** auth.users.id of the athlete, == athletes.profile_id. */
    user_id: string;
    /** 'high_school' | 'college' | null. MODEL-EXTENDER's column on athletes. */
    bracket?: string | null;
  };
  /** Service-role-or-RLS-OK Supabase client. */
  supabase: SupabaseClient;
}

export type ValidateDealCreationResult =
  | {
      ok: true;
      requires_disclosure: boolean;
      state_code: USPSStateCode | null;
      /**
       * Computed consent category for the deal. Surfaced so the insert payload
       * can stamp it on the deal row (avoids recomputing at accept time).
       * Null when the deal is college-bracket or category cannot be mapped.
       */
      consent_category: string | null;
    }
  | {
      ok: false;
      code: 'state_rule_violation' | 'bracket_mismatch';
      violations: string[];
    };

export interface CheckConsentScopeInput {
  athleteUserId: string;
  category: string;
  amount: number;
  durationMonths: number;
  supabase: SupabaseClient;
}

export type CheckConsentScopeResult =
  | { covered: true; consentId: string }
  | {
      covered: false;
      reason:
        | 'no_active_consent'
        | 'category_not_covered'
        | 'amount_exceeds_scope'
        | 'duration_exceeds_scope'
        | 'consent_expires_before_deal_end';
    };

// ----------------------------------------------------------------------------
// Category mapping
// ----------------------------------------------------------------------------

/**
 * Map the internal `deal_type` enum (and optional tags) to the consent-scope
 * category vocabulary used in parental_consents.scope.dealCategories (see
 * ConsentRequestForm DEAL_CATEGORIES).
 *
 * TODO(hs-nil ops): the two vocabularies were invented independently. We
 * should reconcile them on an ops dashboard (or collapse them into a single
 * enum in the DB) before scaling past the CA pilot. Today:
 *
 *   deal_type          → consent category
 *   'endorsement'      → apparel     (most common case in pilot)
 *   'social_post'      → social_media_promo
 *   'appearance'       → local_business
 *   'autograph'        → autograph
 *   'camp'             → training
 *   'merchandise'      → apparel
 *   'speaking'         → local_business
 *   'licensing'        → apparel
 *   'other'            → null (force explicit scope or broaden via tags)
 *
 * If `tags` contains one of the consent-category ids, it wins — this lets the
 * UI nudge ambiguous cases ("this endorsement is food & beverage") without a
 * schema change.
 */
export function mapDealTypeToConsentCategory(
  dealType: string,
  tags?: string[] | null,
): string | null {
  const CONSENT_CATEGORY_IDS = new Set([
    'apparel',
    'food_beverage',
    'local_business',
    'training',
    'autograph',
    'social_media_promo',
  ]);

  if (tags && tags.length > 0) {
    const hit = tags.find((t) => CONSENT_CATEGORY_IDS.has(t));
    if (hit) return hit;
  }

  const table: Record<string, string | null> = {
    endorsement: 'apparel',
    social_post: 'social_media_promo',
    appearance: 'local_business',
    autograph: 'autograph',
    camp: 'training',
    merchandise: 'apparel',
    speaking: 'local_business',
    licensing: 'apparel',
    other: null,
  };

  const key = dealType as keyof typeof table;
  return key in table ? table[key] : null;
}

/**
 * Best-effort mapping from a consent-category id to the evaluateDeal category
 * enum (which only enumerates *banned* categories plus 'other'). Most deal
 * categories are not banned anywhere, so this almost always returns 'other'
 * — the mapping exists to let us surface a rule-engine flag if someone tags a
 * deal as e.g. `tobacco` or `gambling` through tags.
 */
function mapConsentCategoryToRulesCategory(
  consentCategory: string | null,
  tags?: string[] | null,
): BannedCategory | 'other' {
  // Tags win — an ops/UI-assigned tag like 'alcohol' must short-circuit to a
  // banned category even if the base deal_type is benign.
  const BANNED: readonly BannedCategory[] = [
    'gambling',
    'alcohol',
    'tobacco',
    'cannabis',
    'adult',
    'weapons',
    'firearms',
    'vaping',
  ] as const;

  if (tags) {
    const hit = tags.find((t) => (BANNED as readonly string[]).includes(t));
    if (hit) return hit as BannedCategory;
  }

  if (consentCategory && (BANNED as readonly string[]).includes(consentCategory)) {
    return consentCategory as BannedCategory;
  }

  return 'other';
}

// ----------------------------------------------------------------------------
// Duration helpers
// ----------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute whole-month duration from an ISO start/end pair. Missing dates
 * default to 1. We use a 30-day month approximation to match how
 * consent.scope.durationMonths is marketed to parents ("months" — not a
 * calendar arithmetic guarantee).
 */
export function computeDurationMonths(
  startDate?: string | null,
  endDate?: string | null,
): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  const days = (end - start) / MS_PER_DAY;
  return Math.max(1, Math.ceil(days / 30));
}

// ----------------------------------------------------------------------------
// Age helper
// ----------------------------------------------------------------------------

function yearsOldFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

// ----------------------------------------------------------------------------
// validateDealCreation
// ----------------------------------------------------------------------------

export async function validateDealCreation(
  input: ValidateDealCreationInput,
): Promise<ValidateDealCreationResult> {
  const { deal, athlete, supabase } = input;

  // College deals bypass HS-NIL validation entirely.
  if (deal.target_bracket === 'college') {
    return {
      ok: true,
      requires_disclosure: false,
      state_code: null,
      consent_category: null,
    };
  }

  // HS-bracket (or unspecified/HS-leaning) deal aimed at a college athlete is
  // a data-integrity error — don't let it through.
  if (
    deal.target_bracket &&
    deal.target_bracket !== 'college' &&
    athlete.bracket &&
    athlete.bracket !== 'high_school'
  ) {
    return {
      ok: false,
      code: 'bracket_mismatch',
      violations: [
        `Deal target_bracket=${deal.target_bracket} cannot be assigned to a ${athlete.bracket} athlete`,
      ],
    };
  }

  // If the athlete is not HS and no explicit HS bracket was requested, skip
  // HS checks. (A college athlete with target_bracket=undefined falls here.)
  if (athlete.bracket !== 'high_school') {
    return {
      ok: true,
      requires_disclosure: false,
      state_code: null,
      consent_category: null,
    };
  }

  // Load the athlete's HS profile for state + DOB.
  const { data: hsProfile, error: hsErr } = await supabase
    .from('hs_athlete_profiles')
    .select('state_code, date_of_birth')
    .eq('user_id', athlete.user_id)
    .maybeSingle();

  if (hsErr || !hsProfile) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: [
        'Athlete is flagged as high_school but no hs_athlete_profiles row was found',
      ],
    };
  }

  const stateCode = hsProfile.state_code as USPSStateCode;
  const age = yearsOldFromDob(hsProfile.date_of_birth as string);

  const consentCategory = mapDealTypeToConsentCategory(deal.deal_type, deal.tags ?? null);
  const rulesCategory = mapConsentCategoryToRulesCategory(consentCategory, deal.tags ?? null);

  const evalResult = evaluateDeal({
    state: stateCode,
    athleteAge: age,
    category: rulesCategory,
    involvesSchoolIP: Boolean(deal.involves_school_ip),
    isContingentOnPerformance: Boolean(deal.is_contingent_on_performance),
  });

  if (!evalResult.allowed) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: evalResult.violations,
    };
  }

  return {
    ok: true,
    requires_disclosure: evalResult.disclosureWindowHours !== null,
    state_code: stateCode,
    consent_category: consentCategory,
  };
}

// ----------------------------------------------------------------------------
// checkConsentScope
// ----------------------------------------------------------------------------

interface ConsentRow {
  id: string;
  scope: unknown;
  expires_at: string;
}

function isConsentScope(value: unknown): value is ConsentScope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.dealCategories) &&
    typeof v.maxDealAmount === 'number' &&
    typeof v.durationMonths === 'number'
  );
}

/**
 * Walk the athlete's active consents and return the *best* status:
 *
 *   covered: true on the first row that fully covers the (category, amount,
 *   duration) request.
 *
 *   covered: false with the most specific reason we can justify — preference
 *   order: 'no_active_consent' > 'category_not_covered' > 'amount_exceeds_scope'
 *   > 'duration_exceeds_scope' > 'consent_expires_before_deal_end'. In effect:
 *   the reason tells the UI what the athlete needs to ask the parent for.
 */
export async function checkConsentScope(
  input: CheckConsentScopeInput,
): Promise<CheckConsentScopeResult> {
  const { athleteUserId, category, amount, durationMonths, supabase } = input;

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('parental_consents')
    .select('id, scope, expires_at')
    .eq('athlete_user_id', athleteUserId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso);

  if (error) {
    return { covered: false, reason: 'no_active_consent' };
  }

  const rows = (data ?? []) as ConsentRow[];
  if (rows.length === 0) {
    return { covered: false, reason: 'no_active_consent' };
  }

  // Deal must end before any matching consent expires. We use signed_at + N
  // months as the expiry horizon, which is already baked into consent.expires_at.
  const dealEndsAt = Date.now() + durationMonths * 30 * MS_PER_DAY;

  // Track the "closest" failure so we can return the most actionable reason
  // when nothing matches.
  let closestReason: CheckConsentScopeResult['covered'] extends true
    ? never
    : Exclude<CheckConsentScopeResult, { covered: true }>['reason'] = 'category_not_covered';
  let reasonRank = 1;

  function bumpReason(
    reason: Exclude<CheckConsentScopeResult, { covered: true }>['reason'],
    rank: number,
  ) {
    if (rank > reasonRank) {
      closestReason = reason;
      reasonRank = rank;
    }
  }

  for (const row of rows) {
    if (!isConsentScope(row.scope)) continue;
    const scope = row.scope;

    if (!scope.dealCategories.includes(category)) {
      bumpReason('category_not_covered', 1);
      continue;
    }
    if (scope.maxDealAmount < amount) {
      bumpReason('amount_exceeds_scope', 2);
      continue;
    }
    if (scope.durationMonths < durationMonths) {
      bumpReason('duration_exceeds_scope', 3);
      continue;
    }
    if (new Date(row.expires_at).getTime() < dealEndsAt) {
      bumpReason('consent_expires_before_deal_end', 4);
      continue;
    }

    return { covered: true, consentId: row.id };
  }

  return { covered: false, reason: closestReason };
}

// ----------------------------------------------------------------------------
// buildConsentRequestSuggestion
// ----------------------------------------------------------------------------

/**
 * Produce a minimal consent scope that *would* cover this deal — used by the
 * athlete UI to pre-fill a new consent request when acceptance is blocked.
 *
 * We pad the amount by 10% (rounded up to $50) and add one month of duration
 * runway so the parent is not signing something razor-edge.
 */
export function buildConsentRequestSuggestion(params: {
  category: string | null;
  amount: number;
  durationMonths: number;
}): ConsentScope {
  const categories = params.category ? [params.category] : ['local_business'];
  const paddedAmount = Math.max(
    50,
    Math.ceil((params.amount * 1.1) / 50) * 50,
  );
  const paddedMonths = Math.min(24, Math.max(1, params.durationMonths + 1));

  return {
    dealCategories: categories,
    maxDealAmount: paddedAmount,
    durationMonths: paddedMonths,
  };
}
