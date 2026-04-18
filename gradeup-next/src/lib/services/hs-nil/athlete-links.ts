/**
 * HS-NIL Athlete-Side Parent Links — Service Layer
 *
 * Closes the symmetric-trust loop started by parents at signup. Where
 * `parents.ts` creates pending `hs_parent_athlete_links` rows, this
 * module serves the athlete's half of the verification contract:
 *
 *   1. getLinksForAthlete — list every parent that has claimed to be
 *      linked to this athlete (pending + verified) for the "Who
 *      manages me?" settings page.
 *   2. verifyLink         — flip a pending row to verified (athlete
 *      confirmed the link from the settings page or email invite).
 *   3. declineLink        — remove a pending row the athlete doesn't
 *      recognise. Row-level DELETE because the migration ships no
 *      `declined_at` column; absence IS the declined state.
 *   4. unlinkParent       — remove a previously verified row when the
 *      athlete wants to cut ties with a parent going forward. Same
 *      row-level DELETE as declineLink; the two are distinguished by
 *      the caller's intent and by audit-log wording.
 *
 * All mutations are called from an authenticated API route that has
 * already defensive-checked `athlete_user_id === authUser.id`. We pass
 * a service-role supabase client because the migration intentionally
 * ships NO public UPDATE/DELETE policy on hs_parent_athlete_links —
 * the row transitions are gated entirely at the service layer.
 *
 * Read path (`getLinksForAthlete`) uses the authenticated SSR client
 * and rides on the `hs_parent_athlete_links_athlete_read` RLS policy,
 * which restricts results to rows where `auth.uid() = athlete_user_id`.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type AthleteLinkRelationship = 'parent' | 'legal_guardian';

export type AthleteLinkVerificationMethod =
  | 'email_invite_click'
  | 'shared_code'
  | 'manual_support';

/**
 * Fully-normalized link row for the athlete settings page. Joins to
 * `hs_parent_profiles` so the UI can render the parent's name and
 * relationship without a second round-trip. Email is pulled from
 * `auth.users` via a service-role lookup (the browser client can't
 * see auth.users) and is masked before reaching this shape.
 */
export interface AthleteLinkRow {
  linkId: string;
  parentProfileId: string;
  parentFullName: string;
  /** Masked email, e.g. "ma***@ex*****.com". Never a raw address. */
  parentEmailMasked: string;
  relationship: AthleteLinkRelationship;
  createdAt: string; // ISO
  verifiedAt: string | null; // ISO or null for pending
  verificationMethod: AthleteLinkVerificationMethod | null;
}

export interface AthleteLinksResult {
  pending: AthleteLinkRow[];
  verified: AthleteLinkRow[];
}

// ----------------------------------------------------------------------------
// Service-role client helper
// ----------------------------------------------------------------------------

/**
 * Build a short-lived service-role Supabase client. Used only by the
 * mutation helpers (verify/decline/unlink) which bypass RLS after the
 * route has already verified ownership. The auth-email lookup in
 * `getLinksForAthlete` also uses this client because auth.users is
 * never readable from the anon key.
 */
function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured for athlete link operations.'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Email masking
// ----------------------------------------------------------------------------

/**
 * Mask an email for display in a shared surface the parent does NOT
 * control (the athlete's settings page). Preserves the first two
 * local-part characters and the first two domain characters so the
 * athlete can recognise the account ("that's mom's gmail"), while
 * keeping the full address out of the DOM / network transcript.
 *
 *   "maya.chen@example.com" -> "ma***@ex*****.com"
 *   "a@b.co"               -> "a***@b***.co"    (short inputs still mask)
 *   ""                     -> "(hidden)"        (defensive fallback)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '(hidden)';
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return '(hidden)';

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  const dot = domain.lastIndexOf('.');
  const domainRoot = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';

  const localVisible = local.slice(0, Math.min(2, local.length));
  const domainVisible = domainRoot.slice(0, Math.min(2, domainRoot.length));

  return `${localVisible}***@${domainVisible}***${tld}`;
}

// ----------------------------------------------------------------------------
// getLinksForAthlete
// ----------------------------------------------------------------------------

/**
 * Load every hs_parent_athlete_links row where the caller is the
 * athlete, joined with the parent's profile (name, relationship) and
 * masked email (from auth.users via service-role). Returned split
 * into `pending` (verified_at IS NULL) and `verified` so the settings
 * page can render each section directly.
 *
 * Uses the authenticated SSR supabase client for the link read — the
 * RLS policy restricts results to `auth.uid() = athlete_user_id`, so
 * this call is safe even if the caller is misidentified elsewhere.
 * Parent profile rows are fetched with the service client because the
 * `hs_parent_profiles_read_own` policy only permits the owning parent
 * to read them.
 */
export async function getLinksForAthlete(
  athleteUserId: string,
  authedClient: SupabaseClient
): Promise<AthleteLinksResult> {
  const { data: linkRows, error: linkErr } = await authedClient
    .from('hs_parent_athlete_links')
    .select(
      'id, parent_profile_id, relationship, verified_at, verification_method, created_at'
    )
    .eq('athlete_user_id', athleteUserId)
    .order('created_at', { ascending: false });

  if (linkErr) {
    throw new Error(`getLinksForAthlete: ${linkErr.message}`);
  }
  if (!linkRows || linkRows.length === 0) {
    return { pending: [], verified: [] };
  }

  const profileIds = linkRows.map((r) => r.parent_profile_id);
  const service = getServiceClient();

  const { data: profileRows, error: profileErr } = await service
    .from('hs_parent_profiles')
    .select('id, user_id, full_name')
    .in('id', profileIds);

  if (profileErr) {
    throw new Error(`getLinksForAthlete profiles: ${profileErr.message}`);
  }

  const profileById = new Map<
    string,
    { user_id: string; full_name: string }
  >();
  for (const p of profileRows ?? []) {
    profileById.set(p.id as string, {
      user_id: p.user_id as string,
      full_name: p.full_name as string,
    });
  }

  // Masked-email lookup. `auth.admin.getUserById` is available via the
  // service client. One call per parent isn't free, but the typical
  // athlete has 1-2 linked parents, so a tiny for-loop beats shipping
  // a new RPC.
  const emailByUser = new Map<string, string>();
  for (const p of profileRows ?? []) {
    const uid = p.user_id as string;
    if (!uid || emailByUser.has(uid)) continue;
    const { data: userRes } = await service.auth.admin.getUserById(uid);
    emailByUser.set(uid, userRes?.user?.email ?? '');
  }

  const normalized: AthleteLinkRow[] = linkRows.map((row) => {
    const profile = profileById.get(row.parent_profile_id as string);
    const rawEmail = profile ? emailByUser.get(profile.user_id) ?? '' : '';
    return {
      linkId: row.id as string,
      parentProfileId: row.parent_profile_id as string,
      parentFullName: profile?.full_name ?? 'Linked parent',
      parentEmailMasked: maskEmail(rawEmail),
      relationship: row.relationship as AthleteLinkRelationship,
      createdAt: row.created_at as string,
      verifiedAt: (row.verified_at as string | null) ?? null,
      verificationMethod:
        (row.verification_method as AthleteLinkVerificationMethod | null) ??
        null,
    };
  });

  return {
    pending: normalized.filter((r) => r.verifiedAt === null),
    verified: normalized.filter((r) => r.verifiedAt !== null),
  };
}

// ----------------------------------------------------------------------------
// verifyLink
// ----------------------------------------------------------------------------

export interface VerifyLinkResult {
  linkId: string;
  verifiedAt: string;
  verificationMethod: AthleteLinkVerificationMethod;
  /**
   * Auth user id of the parent that owns this link. Returned so the
   * caller can look up the parent's email to fire a confirmation
   * notification without re-querying.
   */
  parentUserId: string;
  parentFullName: string;
}

/**
 * Flip a pending link to verified. The caller MUST have already
 * checked that `athlete_user_id === authUser.id`; this function
 * trusts that gate and uses the service role to write because the
 * migration intentionally ships no public UPDATE policy.
 *
 * Belt-and-suspenders: the UPDATE re-asserts athlete_user_id in the
 * WHERE so a misused service client still can't cross-write.
 */
export async function verifyLink(
  linkId: string,
  athleteUserId: string,
  method: AthleteLinkVerificationMethod
): Promise<VerifyLinkResult> {
  const service = getServiceClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await service
    .from('hs_parent_athlete_links')
    .update({
      verified_at: nowIso,
      verification_method: method,
    })
    .eq('id', linkId)
    .eq('athlete_user_id', athleteUserId)
    .is('verified_at', null) // idempotent: already-verified stays untouched
    .select('id, parent_profile_id, verified_at, verification_method')
    .maybeSingle();

  if (error) {
    throw new Error(`verifyLink: ${error.message}`);
  }
  if (!data) {
    throw new Error('verifyLink: link not found or already verified');
  }

  // Resolve parent name + auth email for the confirmation notification.
  const { data: profile } = await service
    .from('hs_parent_profiles')
    .select('user_id, full_name')
    .eq('id', data.parent_profile_id as string)
    .maybeSingle();

  return {
    linkId: data.id as string,
    verifiedAt: data.verified_at as string,
    verificationMethod: data.verification_method as AthleteLinkVerificationMethod,
    parentUserId: (profile?.user_id as string) ?? '',
    parentFullName: (profile?.full_name as string) ?? 'your parent',
  };
}

// ----------------------------------------------------------------------------
// declineLink / unlinkParent (shared row-delete implementation)
// ----------------------------------------------------------------------------

/**
 * Core row-level deletion used by both `declineLink` (pending-row
 * rejection from the athlete) and `unlinkParent` (athlete cuts an
 * already-verified link going forward). The schema ships no
 * `declined_at` or soft-delete column, so absence is the only state
 * we model: the parent's dashboard will simply stop showing the link.
 *
 * Returns `true` when a row was deleted, `false` when nothing matched
 * (idempotent — repeat calls are safe and surface as no-op).
 */
async function deleteLinkRow(
  linkId: string,
  athleteUserId: string
): Promise<boolean> {
  const service = getServiceClient();
  const { data, error } = await service
    .from('hs_parent_athlete_links')
    .delete()
    .eq('id', linkId)
    .eq('athlete_user_id', athleteUserId)
    .select('id');

  if (error) {
    throw new Error(`deleteLinkRow: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Athlete declines a pending parent link. Decline semantics: the row
 * is deleted; the parent is NOT notified (per product spec so a bad-
 * faith claimer sees the link simply never complete instead of a
 * confirmation it's the wrong athlete).
 */
export async function declineLink(
  linkId: string,
  athleteUserId: string
): Promise<boolean> {
  return deleteLinkRow(linkId, athleteUserId);
}

/**
 * Athlete unlinks a previously verified parent. Same row-level DELETE
 * as `declineLink`, but the caller should log this with distinct
 * audit-log wording because the ops semantics differ:
 *
 *   - `decline` happened BEFORE any authority was granted — the
 *     parent never had consent-signing rights for this athlete.
 *   - `unlink` happens AFTER verification — any active parental
 *     consents this parent signed remain legally binding for the
 *     deals they cover; only FUTURE deal approvals are blocked by
 *     the missing link.
 */
export async function unlinkParent(
  linkId: string,
  athleteUserId: string
): Promise<boolean> {
  return deleteLinkRow(linkId, athleteUserId);
}
