/**
 * Per-state HS-NIL rules engine.
 *
 * Every permitting state has its own statute. This module encodes the three
 * pilot states (CA, FL, GA) in code for fast iteration, and defines the shape
 * for the rest. Production rules will migrate to the `state_nil_rules` DB
 * table so non-engineers (legal, ops) can update without a deploy.
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
    notes: 'GHSA permissive. No age minimum. Middle school included 2025.',
    lastReviewed: '2026-04-18',
  },
  TX: {
    state: 'TX',
    status: 'limited',
    minimumAge: 17,
    requiresParentalConsent: true,
    disclosureWindowHours: 336,
    disclosureRecipient: 'both',
    bannedCategories: UNIVERSAL_BANNED,
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: true,
    notes: 'UIL. 17+ minimum, escrow required until 18. Defer from pilot.',
    lastReviewed: '2026-04-18',
  },
  AL: { state: 'AL', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'AHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  HI: { state: 'HI', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'HHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  IN: { state: 'IN', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'IHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  MI: { state: 'MI', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'MHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
  WY: { state: 'WY', status: 'prohibited', minimumAge: null, requiresParentalConsent: false, disclosureWindowHours: null, disclosureRecipient: null, bannedCategories: UNIVERSAL_BANNED, agentRegistrationRequired: false, paymentDeferredUntilAge18: false, notes: 'WHSAA prohibits HS NIL.', lastReviewed: '2026-04-18' },
};

export const PILOT_STATES: USPSStateCode[] = ['CA', 'FL', 'GA'];

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
