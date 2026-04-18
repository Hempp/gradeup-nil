/**
 * HS-NIL Contract Helpers
 * ----------------------------------------------------------------------------
 * Small server-side utilities that sit between the generic contract engine
 * (`/api/contracts`) and the HS-specific data model. The contract engine
 * itself is bracket-agnostic; these helpers answer three questions it needs:
 *
 *   1. `isHsDeal(dealId)`        — should this deal be treated as HS?
 *                                    Keyed off `deals.target_bracket`.
 *   2. `getHsDealSigners(dealId)` — who needs to sign? Athlete always.
 *                                    Parent/guardian too if the athlete is a
 *                                    minor (age < 18 at signing time).
 *   3. `getParentProfileIdFromConsent(consentId)`
 *                                  — bridge parental_consents → hs_parent_profiles.
 *                                    Currently indirect (email join) because
 *                                    the consent row does NOT carry a direct
 *                                    parent_profile_id FK. Flagged as brittle.
 *
 * All DB access uses the service-role client so these helpers are safe to
 * call from server routes without tying behaviour to the caller's session.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface HsDealSigners {
  athleteUserId: string;
  /** Email of the parent who signed the active parental_consents row. */
  parentEmail?: string;
  /** hs_parent_profiles.id (if the parent has a profile). */
  parentProfileId?: string;
  /** Parent's display name (from consent record). */
  parentFullName?: string;
  /** True iff the athlete is under 18 at signing time. */
  requiresParentSignature: boolean;
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil contracts] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// isHsDeal
// ----------------------------------------------------------------------------

/**
 * Returns true when the deal's target_bracket is anything but 'college'.
 * Rationale: 'college' is the legacy default; 'high_school' and 'both' are
 * the HS-affected brackets that must route through HS-specific flows.
 * On missing deal / DB errors, returns false (fail-open for non-HS paths —
 * the caller will surface its own 'deal not found' error downstream).
 */
export async function isHsDeal(dealId: string): Promise<boolean> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deals')
    .select('target_bracket')
    .eq('id', dealId)
    .maybeSingle();

  if (error || !data) return false;
  const bracket = (data as { target_bracket?: string }).target_bracket;
  return bracket !== undefined && bracket !== 'college';
}

// ----------------------------------------------------------------------------
// Age math
// ----------------------------------------------------------------------------

function calcAgeInYears(dob: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

// ----------------------------------------------------------------------------
// getHsDealSigners
// ----------------------------------------------------------------------------

/**
 * Resolve the signer set for an HS deal's contract.
 *
 * Decision tree:
 *   1. Load deal -> athlete -> hs_athlete_profiles (for DOB).
 *   2. If DOB is missing or the athlete is >= 18, only the athlete signs.
 *   3. If the athlete is < 18, the contract ALSO requires a parent signer.
 *      The parent is pulled from the most recent non-revoked parental_consents
 *      row for that athlete, then resolved to an hs_parent_profiles.id via
 *      email match (see getParentProfileIdFromConsent for the caveat).
 *
 * Callers should forward the return value straight into the contract
 * creation's `parties` array (athlete + optional guardian) and set
 * `requires_guardian_signature` = requiresParentSignature.
 */
export async function getHsDealSigners(dealId: string): Promise<HsDealSigners> {
  const sb = getServiceRoleClient();

  // 1. Load deal -> athlete profile id.
  const { data: deal, error: dealErr } = await sb
    .from('deals')
    .select('id, athlete_id')
    .eq('id', dealId)
    .maybeSingle();

  if (dealErr || !deal) {
    throw new Error(
      `[hs-nil contracts] deal not found for signer resolution: ${dealId}`,
    );
  }

  const { data: athlete, error: athleteErr } = await sb
    .from('athletes')
    .select('id, profile_id')
    .eq('id', deal.athlete_id)
    .maybeSingle();

  if (athleteErr || !athlete) {
    throw new Error(
      `[hs-nil contracts] athlete row not found for deal ${dealId}`,
    );
  }

  const athleteUserId = athlete.profile_id as string;

  // 2. Pull DOB from hs_athlete_profiles (if the athlete is HS).
  const { data: hsProfile } = await sb
    .from('hs_athlete_profiles')
    .select('date_of_birth')
    .eq('user_id', athleteUserId)
    .maybeSingle();

  const dobRaw = (hsProfile as { date_of_birth?: string } | null)
    ?.date_of_birth;
  const dob = dobRaw ? new Date(dobRaw) : null;
  const age = dob ? calcAgeInYears(dob) : null;
  const requiresParentSignature = age !== null && age < 18;

  if (!requiresParentSignature) {
    return { athleteUserId, requiresParentSignature: false };
  }

  // 3. Find the active parental consent.
  const { data: consent } = await sb
    .from('parental_consents')
    .select('id, parent_email, parent_full_name')
    .eq('athlete_user_id', athleteUserId)
    .is('revoked_at', null)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!consent) {
    // Minor with no consent on file — caller should refuse to create the
    // contract. We still return requiresParentSignature=true so the caller
    // can emit a clear error.
    return { athleteUserId, requiresParentSignature: true };
  }

  const parentProfileId =
    (await getParentProfileIdFromConsent(consent.id as string)) ?? undefined;

  return {
    athleteUserId,
    parentEmail: consent.parent_email as string,
    parentFullName: consent.parent_full_name as string,
    parentProfileId,
    requiresParentSignature: true,
  };
}

// ----------------------------------------------------------------------------
// getParentProfileIdFromConsent
// ----------------------------------------------------------------------------

/**
 * Resolve parental_consents.id -> hs_parent_profiles.id.
 *
 * TODO(hs-nil): the current join is BRITTLE — parental_consents does NOT
 * store a parent_profile_id FK (see migration 20260418_002). We resolve
 * by matching `parental_consents.parent_email` against
 * `auth.users.email` (via hs_parent_profiles.user_id). This breaks if:
 *   - the parent hasn't signed up yet (consent exists, profile doesn't),
 *   - the parent signed up with a different email than the consent form,
 *   - two parents share an email (edge case: co-guardians).
 *
 * Long-term fix: add `parental_consents.parent_profile_id uuid` + backfill.
 * Until then this helper is best-effort and returns null on ambiguity so
 * callers can fall back to an email-only signer.
 */
export async function getParentProfileIdFromConsent(
  consentId: string,
): Promise<string | null> {
  const sb = getServiceRoleClient();

  const { data: consent } = await sb
    .from('parental_consents')
    .select('parent_email')
    .eq('id', consentId)
    .maybeSingle();

  const email = (consent as { parent_email?: string } | null)?.parent_email;
  if (!email) return null;

  // Service-role can read auth.users; join hs_parent_profiles via user_id.
  // We select via a PG text view if it exists — otherwise fall back to
  // two queries. Two-query path keeps this portable.
  const { data: authUser } = await sb
    .schema('auth')
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(2); // limit 2 so we can detect ambiguity

  if (!authUser || authUser.length !== 1) return null;

  const { data: parentProfile } = await sb
    .from('hs_parent_profiles')
    .select('id')
    .eq('user_id', authUser[0].id)
    .maybeSingle();

  return (parentProfile as { id?: string } | null)?.id ?? null;
}
