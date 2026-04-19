/**
 * Per-state HS-NIL rules engine.
 *
 * Every permitting state has its own statute. This module encodes the pilot
 * states in code for fast iteration, and defines the shape for the rest.
 * Production rules will migrate to the `state_nil_rules` DB table so
 * non-engineers (legal, ops) can update without a deploy.
 *
 * MIRROR WITH SQL: The STATE_RULES entries below must stay in lockstep with
 * the seed rows in `supabase/migrations/20260418_002_hs_nil_foundations.sql`
 * and `supabase/migrations/20260419_009_state_expansion.sql`. Any value
 * change in one side requires the matching change in the other. Drift is a
 * bug — the DB is the legal source of truth at runtime, but the code copy
 * is what unit tests and `evaluateDeal` exercise.
 *
 * Source of truth for research: docs/HS-NIL-BRIEF.md and /tmp/hs-nil-regulatory.md.
 *
 * Universal guardrails encoded across all permitting states:
 *   - School IP (logos, mascots, uniforms) is never permitted.
 *   - Pay-for-play is never permitted.
 *   - Banned categories: gambling, alcohol, tobacco, cannabis, adult, weapons.
 *   - Parental consent required for minors.
 */

export type USPSStateCode =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'DC' | 'FL'
  | 'GA' | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME'
  | 'MD' | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH'
  | 'NJ' | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI'
  | 'SC' | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY';

export type PermissionStatus = 'permitted' | 'limited' | 'prohibited' | 'transitioning';

export type BannedCategory =
  | 'gambling'
  | 'alcohol'
  | 'tobacco'
  | 'cannabis'
  | 'adult'
  | 'weapons'
  | 'firearms'
  | 'vaping';

export interface StateNILRules {
  state: USPSStateCode;
  status: PermissionStatus;
  minimumAge: number | null;
  requiresParentalConsent: boolean;
  disclosureWindowHours: number | null;
  disclosureRecipient: 'state_athletic_association' | 'school' | 'both' | null;
  bannedCategories: BannedCategory[];
  agentRegistrationRequired: boolean;
  paymentDeferredUntilAge18: boolean;
  notes: string;
  lastReviewed: string;
}

const UNIVERSAL_BANNED: BannedCategory[] = [
  'gambling',
  'alcohol',
  'tobacco',
  'cannabis',
  'adult',
  'weapons',
];

export const STATE_RULES: Partial<Record<USPSStateCode, StateNILRules>> = {
  CA: {
    state: 'CA',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 72,
    disclosureRecipient: 'state_athletic_association',
    bannedCategories: [...UNIVERSAL_BANNED, 'vaping'],
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes: 'CIF (California Interscholastic Federation) governs. Clear rule set, largest TAM.',
    lastReviewed: '2026-04-18',
  },
  FL: {
    state: 'FL',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 168,
    disclosureRecipient: 'school',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: true,
    paymentDeferredUntilAge18: false,
    notes: 'FHSAA rules + FL DBPR agent registry. Legal review needed for onboarding flow.',
    lastReviewed: '2026-04-18',
  },
  GA: {
    state: 'GA',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 168,
    disclosureRecipient: 'school',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes:
      'GHSA permissive. No age minimum. Middle-school athletes (grades 6-8) eligible under GHSA 2025 guidance, subject to the same parental-consent + school-disclosure rules as HS athletes.',
    lastReviewed: '2026-04-19',
  },
  IL: {
    state: 'IL',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 336,
    disclosureRecipient: 'school',
    bannedCategories: [...UNIVERSAL_BANNED, 'vaping'],
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes: 'IHSA permits HS NIL with 14-day school disclosure window. No age floor. Vaping added to statewide bans.',
    lastReviewed: '2026-04-19',
  },
  NJ: {
    state: 'NJ',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 72,
    disclosureRecipient: 'state_athletic_association',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes: 'NJSIAA permits HS NIL with a 72-hour state-association disclosure. Standard banned categories. No agent registry requirement.',
    lastReviewed: '2026-04-19',
  },
  NY: {
    state: 'NY',
    status: 'permitted',
    minimumAge: null,
    requiresParentalConsent: true,
    disclosureWindowHours: 168,
    disclosureRecipient: 'both',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes: 'NYSPHSAA permits HS NIL. 7-day disclosure required to BOTH the state athletic association and the school. Standard banned categories.',
    lastReviewed: '2026-04-19',
  },
  TX: {
    state: 'TX',
    status: 'permitted',
    minimumAge: 17,
    requiresParentalConsent: true,
    disclosureWindowHours: 168,
    disclosureRecipient: 'school',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: true,
    notes:
      'UIL: permits HS NIL with minimum_age=17. Compensation is held in a custodial trust until the athlete turns 18. Handled automatically — parent\'s Stripe Connect account receives the release on the 18th birthday.',
    lastReviewed: '2026-04-19',
  },
  AL: { state: 'AL', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'AHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  HI: { state: 'HI', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'HHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  IN: { state: 'IN', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'IHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  MI: { state: 'MI', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'MHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  WY: { state: 'WY', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'WHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
};

/**
 * Pilot set currently accepting signups / running the full deal flow.
 *
 * Current pilot (7 states): CA, FL, GA, IL, NJ, NY, TX.
 *
 * TX is included as of Phase 11. TX's UIL rules require two guardrails
 * that the other pilot states do not:
 *   1. minimum_age=17 on the deal itself — enforced by evaluateDeal().
 *   2. Compensation held in a custodial trust until the athlete turns
 *      18 — enforced at approve-time in
 *      src/lib/hs-nil/deferred-payouts.ts::shouldDefer, which
 *      intercepts releaseEscrowToParent() and re-routes the payout
 *      into hs_deferred_payouts. A daily cron
 *      (/api/cron/hs-deferred-releases) releases eligible holds on
 *      the athlete's 18th birthday. The brand's inbound charge still
 *      captures at contract sign; only the outbound transfer is held.
 *
 * Other states may adopt similar escrow-until-18 rules in the future —
 * the deferred-payouts architecture is state-agnostic. Only the
 * shouldDefer() branch keys on state_code.
 */
export const PILOT_STATES: USPSStateCode[] = ['CA', 'FL', 'GA', 'IL', 'NJ', 'NY', 'TX'];

export interface DealEvaluation {
  allowed: boolean;
  violations: string[];
  disclosureWindowHours: number | null;
  parentalConsentRequired: boolean;
  rulesVersion: string;
}

export interface DealInput {
  state: USPSStateCode;
  athleteAge: number;
  category: BannedCategory | 'other';
  involvesSchoolIP: boolean;
  isContingentOnPerformance: boolean;
}

export function evaluateDeal(input: DealInput): DealEvaluation {
  const rules = STATE_RULES[input.state];
  const violations: string[] = [];

  if (!rules || rules.status === 'prohibited') {
    return {
      allowed: false,
      violations: [`State ${input.state} prohibits HS NIL`],
      disclosureWindowHours: null,
      parentalConsentRequired: false,
      rulesVersion: '2026-04-18',
    };
  }

  if (rules.minimumAge !== null && input.athleteAge < rules.minimumAge) {
    violations.push(`Athlete under minimum age of ${rules.minimumAge} for ${input.state}`);
  }

  if (input.involvesSchoolIP) {
    violations.push('Deal cannot use school IP (logos, mascots, uniforms)');
  }

  if (input.isContingentOnPerformance) {
    violations.push('Pay-for-play prohibited: deal cannot be contingent on athletic performance');
  }

  if (input.category !== 'other' && rules.bannedCategories.includes(input.category)) {
    violations.push(`Category "${input.category}" is banned in ${input.state}`);
  }

  return {
    allowed: violations.length === 0,
    violations,
    disclosureWindowHours: rules.disclosureWindowHours,
    parentalConsentRequired: rules.requiresParentalConsent && input.athleteAge < 18,
    rulesVersion: rules.lastReviewed,
  };
}

export function isPilotState(state: USPSStateCode): boolean {
  return PILOT_STATES.includes(state);
}
