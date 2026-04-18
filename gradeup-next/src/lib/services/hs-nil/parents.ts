/**
 * HS-NIL Parent Profiles — Service Layer
 *
 * Thin, client-callable helpers for the parent side of the HS-NIL data
 * model. All reads/writes go through the authenticated browser client,
 * so RLS is the authoritative enforcement layer (see
 * `supabase/migrations/20260418_005_hs_parent_profiles.sql`).
 *
 * Responsibilities covered here:
 *   1. createParentProfile — called on signup success to persist the
 *      durable parent profile row (one-to-one with auth.users).
 *   2. linkAthlete — pending-verification link from a parent to an
 *      athlete account matched by email. Two-sided verification means
 *      we intentionally create an UNVERIFIED row (verified_at is null)
 *      and let the athlete confirm later.
 *   3. getAthletesForParent — returns every athlete (verified or
 *      pending) associated with a parent profile for dashboard use.
 *
 * Deliberately OUT of scope for this module:
 *   - Sending the "please confirm" email/SMS to the athlete. That lives
 *     in `@/lib/services/hs-nil/emails` and is wired from API routes.
 *   - Inviting an athlete who does not yet have an auth.users row. The
 *     happy path for the pilot is "athlete signs up first, then the
 *     parent, and we auto-link at signup." For the edge case where the
 *     parent signs up first, linkAthlete returns status
 *     `'pending_invitation'` so the caller can stash the intent and
 *     trigger an invite email via a separate service. A TODO below
 *     points at where that expansion lives.
 */

import { getSupabaseClient } from '@/lib/supabase/client';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type ParentRelationship = 'parent' | 'legal_guardian';

export interface CreateParentProfileInput {
  userId: string;
  fullName: string;
  relationship: ParentRelationship;
  phone?: string | null;
}

export interface CreateParentProfileResult {
  id: string;
}

export interface LinkAthleteInput {
  parentProfileId: string;
  athleteEmail: string;
  /** Defaults to the parent's own relationship if omitted. */
  relationship?: ParentRelationship;
}

export type LinkAthleteStatus = 'pending_verification' | 'pending_invitation';

export interface LinkAthleteResult {
  linkId: string | null;
  status: LinkAthleteStatus;
}

export interface ParentAthleteSummary {
  athleteUserId: string;
  fullName: string | null;
  status: 'verified' | 'pending';
}

// ----------------------------------------------------------------------------
// createParentProfile
// ----------------------------------------------------------------------------

/**
 * Insert a new `hs_parent_profiles` row for the just-signed-up parent.
 * RLS requires `auth.uid() = user_id`, so this must be called from a
 * context where the user is authenticated as `userId`.
 *
 * Idempotent on the `(user_id)` unique constraint — if a profile
 * already exists we surface a typed error rather than silently
 * ignoring to keep the signup flow's failure modes explicit.
 */
export async function createParentProfile(
  input: CreateParentProfileInput
): Promise<CreateParentProfileResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('hs_parent_profiles')
    .insert({
      user_id: input.userId,
      full_name: input.fullName.trim(),
      relationship: input.relationship,
      phone: input.phone?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`createParentProfile failed: ${error.message}`);
  }
  if (!data) {
    throw new Error('createParentProfile failed: no row returned');
  }

  return { id: data.id };
}

// ----------------------------------------------------------------------------
// linkAthlete
// ----------------------------------------------------------------------------

/**
 * Pending-verification link from a parent profile to an athlete.
 *
 * Resolution flow:
 *   1. Look up the athlete's auth user by email. We can't SELECT
 *      auth.users directly from the browser, so we look up through
 *      `hs_athlete_profiles`, which is RLS-restricted to the owning
 *      athlete. If the athlete row exists but belongs to someone else,
 *      the query returns zero rows (RLS hides it). That's the same
 *      observable as "athlete doesn't exist yet" — handled by a
 *      service-role RPC in a follow-up; for now the pilot assumes the
 *      athlete's profile is readable or we degrade to invitation.
 *   2. If an athlete is found, INSERT a pending link (verified_at is
 *      null by default + enforced by RLS policy).
 *   3. If no athlete is found, return status 'pending_invitation'.
 *      Caller is responsible for dispatching an invite email.
 *
 * TODO: add a server-side RPC `find_hs_athlete_by_email(email)` that
 *       runs with security definer so parents can link athletes that
 *       are not yet in their visible scope. Until then, the UI must be
 *       clear that the linkage is best-effort at signup.
 */
export async function linkAthlete(
  input: LinkAthleteInput
): Promise<LinkAthleteResult> {
  const supabase = getSupabaseClient();
  const email = input.athleteEmail.trim().toLowerCase();

  if (!email) {
    throw new Error('linkAthlete: athleteEmail is required');
  }

  // Resolve athlete auth user. We query via the v_hs_athletes_by_email
  // view if it exists; for now, fall through to "pending_invitation"
  // on any non-result because the browser client cannot inspect
  // auth.users directly.
  //
  // NOTE: this block uses a narrow, typed RPC-ish pattern that returns
  // `null` when the athlete cannot be resolved. It does NOT throw.
  const athleteUserId = await resolveAthleteByEmail(email);

  if (!athleteUserId) {
    // Parent signed up before athlete — stash the intent on the
    // profile-side and surface the status so the caller can trigger
    // an invitation email. Row is NOT created in the link table
    // because we don't have an auth.users id to FK against.
    return { linkId: null, status: 'pending_invitation' };
  }

  // Fetch relationship from the parent profile so the link inherits
  // the same level of authority declared at signup.
  const relationship =
    input.relationship ??
    (await fetchParentRelationship(input.parentProfileId));

  const { data, error } = await supabase
    .from('hs_parent_athlete_links')
    .insert({
      parent_profile_id: input.parentProfileId,
      athlete_user_id: athleteUserId,
      relationship,
      // verified_at intentionally omitted — RLS enforces null on INSERT
    })
    .select('id')
    .single();

  if (error) {
    // Unique-violation means the link already exists — treat as
    // already-pending rather than an error.
    if (error.code === '23505') {
      return { linkId: null, status: 'pending_verification' };
    }
    throw new Error(`linkAthlete failed: ${error.message}`);
  }

  return {
    linkId: data?.id ?? null,
    status: 'pending_verification',
  };
}

// ----------------------------------------------------------------------------
// getAthletesForParent
// ----------------------------------------------------------------------------

/**
 * Return every athlete linked to the given parent profile, regardless
 * of verification state, with a `status` of 'verified' or 'pending'.
 *
 * `fullName` is best-effort: it comes from the matching
 * `hs_athlete_profiles` row when visible to the caller. If RLS hides
 * the athlete row (verified link to an athlete whose profile the
 * parent cannot yet see), `fullName` is null and the UI should fall
 * back to the invite email.
 */
export async function getAthletesForParent(
  parentProfileId: string
): Promise<ParentAthleteSummary[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('hs_parent_athlete_links')
    .select('athlete_user_id, verified_at')
    .eq('parent_profile_id', parentProfileId);

  if (error) {
    throw new Error(`getAthletesForParent failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return [];
  }

  // Best-effort name lookup. Any miss (RLS hides the athlete row from
  // the parent) degrades to `fullName: null`.
  const athleteIds = data.map((row) => row.athlete_user_id);
  const { data: profiles } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id, school_name')
    .in('user_id', athleteIds);

  // hs_athlete_profiles doesn't store full_name directly (see migration
  // 20260418_002); the display name lives in auth metadata. For now we
  // surface null and let the caller fall back to the auth user's
  // pending_athlete_name from signup metadata. A follow-up migration
  // can add a denormalized `full_name` column to hs_athlete_profiles.
  void profiles;

  return data.map((row) => ({
    athleteUserId: row.athlete_user_id,
    fullName: null,
    status: row.verified_at ? ('verified' as const) : ('pending' as const),
  }));
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Resolve an athlete's auth user id by email. Returns null if the
 * athlete has no account yet, or if the caller cannot see the row.
 *
 * Implementation note: the browser client cannot query auth.users.
 * This helper currently returns null for all inputs (degrading to
 * 'pending_invitation'), and will be replaced by a server-side RPC in
 * a follow-up. The shape of this function is stable — callers should
 * not inline the lookup.
 */
async function resolveAthleteByEmail(
  email: string
): Promise<string | null> {
  // TODO: implement via a security-definer RPC once the athlete-side
  // profile has a canonical email column. Until then, every email
  // degrades to the invitation path.
  void email;
  return null;
}

/**
 * Fetch the relationship stored on the parent's profile, so links
 * inherit the declared authority. Defaults to 'parent' if, for any
 * reason, the profile row isn't visible to the caller.
 */
async function fetchParentRelationship(
  parentProfileId: string
): Promise<ParentRelationship> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('hs_parent_profiles')
    .select('relationship')
    .eq('id', parentProfileId)
    .maybeSingle();

  const value = data?.relationship;
  return value === 'legal_guardian' ? 'legal_guardian' : 'parent';
}
