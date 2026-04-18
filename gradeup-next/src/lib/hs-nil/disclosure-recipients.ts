/**
 * HS-NIL Disclosure Recipients
 * ----------------------------------------------------------------------------
 * Per-state contact addresses (and future API endpoints) where post-signature
 * deal disclosures are sent. The recipient scope (state association vs school
 * vs both) is defined in `state-rules.ts` / the `state_nil_rules` table;
 * this file maps each permitting state to the concrete destination.
 *
 * TODO(hs-nil, legal/ops): Replace all placeholder addresses with verified
 * recipient contacts BEFORE PRODUCTION LAUNCH. These addresses are
 * educated guesses based on public domains and have NOT been confirmed
 * with the respective state athletic associations. Sending real disclosures
 * to an unverified endpoint is a compliance risk.
 *
 * When a state moves to API-based disclosure (e.g. a portal / webhook),
 * add an `endpoint` field alongside the email and switch the drain function
 * to dispatch JSON payloads for that state.
 */
import type { USPSStateCode } from './state-rules';

export interface DisclosureRecipient {
  /** Human label shown in ops tools. */
  label: string;
  /** Where to email the disclosure. MUST be verified before prod. */
  email: string;
  /** Optional future: HTTPS endpoint that accepts a JSON payload. */
  endpoint?: string;
  /** Free-form internal note (e.g. "via FHSAA compliance intake form"). */
  note?: string;
  /**
   * True once legal/ops has confirmed this destination with the receiving
   * body. Placeholders default to false.
   */
  verified: boolean;
}

/**
 * Placeholder directory. DO NOT treat these as authoritative.
 */
export const DISCLOSURE_RECIPIENTS: Partial<Record<USPSStateCode, DisclosureRecipient>> = {
  CA: {
    label: 'California Interscholastic Federation (CIF) — Compliance',
    email: 'compliance+ca@cifstate.org',
    note: 'PLACEHOLDER. CIF state office; no published intake address at build time.',
    verified: false,
  },
  FL: {
    label: 'Florida High School Athletic Association (FHSAA) — Compliance',
    email: 'compliance+fl@fhsaa.org',
    note: 'PLACEHOLDER. FL also requires DBPR agent registration separately.',
    verified: false,
  },
  GA: {
    label: 'Georgia High School Association (GHSA) — Compliance',
    email: 'compliance+ga@ghsa.net',
    note: 'PLACEHOLDER. GHSA has school-level disclosure; may need to also CC school AD.',
    verified: false,
  },
};

export function getDisclosureRecipient(state: USPSStateCode): DisclosureRecipient | null {
  return DISCLOSURE_RECIPIENTS[state] ?? null;
}
