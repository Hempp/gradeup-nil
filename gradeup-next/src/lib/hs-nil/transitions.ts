/**
 * HS-to-College Bracket Transitions — Service Layer
 * ----------------------------------------------------------------------------
 * Phase 8 bridge that moves a matriculating athlete from the HS-NIL bracket
 * to the college-NIL bracket without wiping their academic history.
 *
 * Durable contracts (every caller in the app must rely on these):
 *
 *   1. hs_athlete_profiles rows are NEVER deleted. They are the source of
 *      truth for the pre-matriculation narrative (GPA tier, school, sport,
 *      trajectory) and continue to be readable after the bracket flips.
 *
 *   2. The bracket flip is a single-table mutation:
 *        UPDATE athletes
 *           SET bracket = 'college'
 *         WHERE id = (SELECT id FROM athletes WHERE profile_id = <user>)
 *      No deal rows are touched. Existing HS deals stay HS (their
 *      target_bracket='high_school' carries parental-consent + disclosure
 *      + parent-custodial-payout gating forever).
 *
 *   3. Only one active transition per athlete at any given time. A partial
 *      UNIQUE index on the table enforces this at the DB layer too
 *      (WHERE status IN ('pending', 'verified')).
 *
 *   4. Verification is a one-way door. There is no college -> HS reverse
 *      path. If an athlete is verified in error, remediation is a DB-side
 *      fix + manual audit log entry, not a new status.
 *
 * All writes go through the service-role client. Route handlers do their
 * own auth gating before calling this module. RLS on the table still
 * allows the athlete / admin to SELECT their own rows via the normal
 * SSR client; mutation simply isn't allowed from a user JWT.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const ENROLLMENT_PROOF_BUCKET = 'hs-enrollment-proofs';

export const MAX_ENROLLMENT_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ENROLLMENT_PROOF_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type EnrollmentProofMimeType =
  (typeof ALLOWED_ENROLLMENT_PROOF_MIME_TYPES)[number];

export type NcaaDivision = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'other';

export type TransitionStatus =
  | 'pending'
  | 'verified'
  | 'denied'
  | 'cancelled';

export interface TransitionRow {
  id: string;
  athlete_user_id: string;
  from_bracket: 'high_school';
  to_bracket: 'college';
  college_name: string;
  college_state: string;
  ncaa_division: NcaaDivision;
  matriculation_date: string;
  sport_continued: boolean;
  enrollment_proof_storage_path: string | null;
  status: TransitionStatus;
  denial_reason: string | null;
  reviewer_user_id: string | null;
  requested_at: string;
  confirmed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil transitions] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Result envelopes
// ----------------------------------------------------------------------------

export interface OkResult<T> {
  ok: true;
  data: T;
}

export interface ErrResult {
  ok: false;
  error: string;
  code:
    | 'not_found'
    | 'not_eligible'
    | 'invalid_state'
    | 'already_active'
    | 'db_error'
    | 'storage_error'
    | 'internal';
}

export type ServiceResult<T> = OkResult<T> | ErrResult;

// ----------------------------------------------------------------------------
// Eligibility
// ----------------------------------------------------------------------------

/**
 * Eligibility gate for initiating a transition:
 *   - Must have an hs_athlete_profiles row.
 *   - graduation_year must be within [current_year, current_year + 1]
 *     (rising senior OR recent grad). Tune later.
 *   - No existing pending or verified transition.
 *   - Must have an athletes row (backfilled in 20260418_008).
 */
export async function checkTransitionEligibility(
  athleteUserId: string
): Promise<
  | { eligible: true }
  | { eligible: false; reason: string; code: ErrResult['code'] }
> {
  const sb = getServiceRoleClient();

  const { data: profile, error: profErr } = await sb
    .from('hs_athlete_profiles')
    .select('graduation_year')
    .eq('user_id', athleteUserId)
    .maybeSingle();
  if (profErr) {
    return {
      eligible: false,
      reason: profErr.message,
      code: 'db_error',
    };
  }
  if (!profile) {
    return {
      eligible: false,
      reason: 'No HS athlete profile on file.',
      code: 'not_eligible',
    };
  }
  const gradYear = profile.graduation_year as number;
  const nowYear = new Date().getUTCFullYear();
  if (gradYear < nowYear || gradYear > nowYear + 1) {
    return {
      eligible: false,
      reason:
        'Transition initiation is open only to current-year graduates and rising seniors.',
      code: 'not_eligible',
    };
  }

  const { data: athlete, error: athErr } = await sb
    .from('athletes')
    .select('id')
    .eq('profile_id', athleteUserId)
    .maybeSingle();
  if (athErr) {
    return {
      eligible: false,
      reason: athErr.message,
      code: 'db_error',
    };
  }
  if (!athlete) {
    return {
      eligible: false,
      reason: 'Athlete record is still being provisioned. Try again shortly.',
      code: 'not_eligible',
    };
  }

  const { data: active, error: actErr } = await sb
    .from('athlete_bracket_transitions')
    .select('id, status')
    .eq('athlete_user_id', athleteUserId)
    .in('status', ['pending', 'verified'])
    .maybeSingle();
  if (actErr) {
    return { eligible: false, reason: actErr.message, code: 'db_error' };
  }
  if (active) {
    return {
      eligible: false,
      reason:
        active.status === 'verified'
          ? 'You have already completed your transition to college.'
          : 'You already have a transition in review.',
      code: 'already_active',
    };
  }

  return { eligible: true };
}

// ----------------------------------------------------------------------------
// initiateTransition
// ----------------------------------------------------------------------------

export interface InitiateTransitionInput {
  athleteUserId: string;
  collegeName: string;
  collegeState: string;
  ncaaDivision: NcaaDivision;
  matriculationDate: string; // ISO yyyy-mm-dd
  sportContinued: boolean;
  /** Optional — proof can also be uploaded in a follow-up call. */
  proofStoragePath?: string | null;
}

export async function initiateTransition(
  input: InitiateTransitionInput
): Promise<ServiceResult<{ transitionId: string; status: TransitionStatus }>> {
  const {
    athleteUserId,
    collegeName,
    collegeState,
    ncaaDivision,
    matriculationDate,
    sportContinued,
    proofStoragePath,
  } = input;

  // Basic shape validation — route layer already applied zod, but this
  // guards against direct service-layer callers.
  if (!athleteUserId) {
    return { ok: false, error: 'athleteUserId required.', code: 'invalid_state' };
  }
  if (!collegeName || collegeName.trim().length < 2) {
    return { ok: false, error: 'College name required.', code: 'invalid_state' };
  }
  if (!/^[A-Z]{2}$/.test(collegeState)) {
    return {
      ok: false,
      error: 'College state must be a 2-letter USPS code.',
      code: 'invalid_state',
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matriculationDate)) {
    return {
      ok: false,
      error: 'matriculationDate must be yyyy-mm-dd.',
      code: 'invalid_state',
    };
  }

  const eligibility = await checkTransitionEligibility(athleteUserId);
  if (!eligibility.eligible) {
    return {
      ok: false,
      error: eligibility.reason,
      code: eligibility.code,
    };
  }

  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('athlete_bracket_transitions')
    .insert({
      athlete_user_id: athleteUserId,
      from_bracket: 'high_school',
      to_bracket: 'college',
      college_name: collegeName.trim().slice(0, 200),
      college_state: collegeState.toUpperCase(),
      ncaa_division: ncaaDivision,
      matriculation_date: matriculationDate,
      sport_continued: sportContinued,
      enrollment_proof_storage_path: proofStoragePath ?? null,
      status: 'pending',
    })
    .select('id, status')
    .single();

  if (error || !data) {
    // Unique-violation race: someone beat us to the insert.
    if (error?.code === '23505') {
      return {
        ok: false,
        error: 'You already have a transition in review.',
        code: 'already_active',
      };
    }
    return {
      ok: false,
      error: error?.message ?? 'Failed to record transition.',
      code: 'db_error',
    };
  }

  return {
    ok: true,
    data: {
      transitionId: data.id as string,
      status: data.status as TransitionStatus,
    },
  };
}

// ----------------------------------------------------------------------------
// submitTransitionProof
// ----------------------------------------------------------------------------

function extensionFromMime(
  mime: EnrollmentProofMimeType,
  originalFilename: string
): string {
  const fromName = originalFilename.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

function buildProofPath(
  athleteUserId: string,
  mime: EnrollmentProofMimeType,
  originalFilename: string
): string {
  const stamp = Date.now();
  const rand = randomBytes(6).toString('hex');
  const ext = extensionFromMime(mime, originalFilename);
  return `${athleteUserId}/${stamp}-${rand}.${ext}`;
}

export interface SubmitTransitionProofInput {
  transitionId: string;
  athleteUserId: string;
  file: Buffer;
  originalFilename: string;
  mimeType: EnrollmentProofMimeType;
  fileSizeBytes: number;
}

export async function submitTransitionProof(
  input: SubmitTransitionProofInput
): Promise<ServiceResult<{ storagePath: string }>> {
  if (
    input.fileSizeBytes <= 0 ||
    input.fileSizeBytes > MAX_ENROLLMENT_PROOF_BYTES
  ) {
    return {
      ok: false,
      error: 'Enrollment proof file size out of range.',
      code: 'invalid_state',
    };
  }
  if (!ALLOWED_ENROLLMENT_PROOF_MIME_TYPES.includes(input.mimeType)) {
    return {
      ok: false,
      error: 'Enrollment proof mime type not allowed.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  // Confirm the transition exists, belongs to the caller, and is still pending.
  const { data: row, error: fetchErr } = await sb
    .from('athlete_bracket_transitions')
    .select('id, athlete_user_id, status, enrollment_proof_storage_path')
    .eq('id', input.transitionId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!row) {
    return { ok: false, error: 'Transition not found.', code: 'not_found' };
  }
  if (row.athlete_user_id !== input.athleteUserId) {
    return {
      ok: false,
      error: 'Transition belongs to a different athlete.',
      code: 'invalid_state',
    };
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: 'Proof can only be uploaded while the transition is pending.',
      code: 'invalid_state',
    };
  }

  const storagePath = buildProofPath(
    input.athleteUserId,
    input.mimeType,
    input.originalFilename
  );

  const { error: uploadErr } = await sb.storage
    .from(ENROLLMENT_PROOF_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.mimeType,
      upsert: false,
      cacheControl: 'no-store',
    });
  if (uploadErr) {
    return {
      ok: false,
      error: `Enrollment proof upload failed: ${uploadErr.message}`,
      code: 'storage_error',
    };
  }

  const { error: updateErr } = await sb
    .from('athlete_bracket_transitions')
    .update({ enrollment_proof_storage_path: storagePath })
    .eq('id', input.transitionId);

  if (updateErr) {
    // Best-effort cleanup so the bucket doesn't accumulate orphans.
    await sb.storage
      .from(ENROLLMENT_PROOF_BUCKET)
      .remove([storagePath])
      .catch(() => {});
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }

  // If the transition row already had a proof path, blow it away — the
  // fresh upload supersedes it. Best-effort.
  const prior = row.enrollment_proof_storage_path as string | null;
  if (prior && prior !== storagePath) {
    await sb.storage
      .from(ENROLLMENT_PROOF_BUCKET)
      .remove([prior])
      .catch(() => {});
  }

  return { ok: true, data: { storagePath } };
}

// ----------------------------------------------------------------------------
// verifyTransition
// ----------------------------------------------------------------------------

/**
 * Admin verify. Flips athletes.bracket to 'college' and stamps the
 * transition row verified. Writes an admin_audit_log entry for the
 * compliance trail.
 *
 * hs_athlete_profiles is deliberately NOT modified. It remains the
 * pre-matriculation source of truth forever.
 */
export async function verifyTransition(
  transitionId: string,
  reviewerUserId: string
): Promise<ServiceResult<{ athleteUserId: string; bracketFlipped: boolean }>> {
  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('athlete_bracket_transitions')
    .select('id, athlete_user_id, status, enrollment_proof_storage_path')
    .eq('id', transitionId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!row) {
    return { ok: false, error: 'Transition not found.', code: 'not_found' };
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: `Transition is ${row.status}; only pending transitions can be verified.`,
      code: 'invalid_state',
    };
  }
  if (!row.enrollment_proof_storage_path) {
    return {
      ok: false,
      error:
        'Enrollment proof has not been uploaded. Athlete must submit proof before verify.',
      code: 'invalid_state',
    };
  }

  const now = new Date().toISOString();

  // 1. Stamp the transition row.
  const { error: updTransitionErr } = await sb
    .from('athlete_bracket_transitions')
    .update({
      status: 'verified',
      confirmed_at: now,
      reviewer_user_id: reviewerUserId,
    })
    .eq('id', transitionId)
    .eq('status', 'pending');
  if (updTransitionErr) {
    return { ok: false, error: updTransitionErr.message, code: 'db_error' };
  }

  // 2. Flip the bracket. Single-table UPDATE keyed on profile_id.
  //    hs_athlete_profiles stays untouched — see module docblock.
  const { data: updatedAthlete, error: updAthleteErr } = await sb
    .from('athletes')
    .update({ bracket: 'college' })
    .eq('profile_id', row.athlete_user_id)
    .select('id')
    .maybeSingle();

  const bracketFlipped = Boolean(updatedAthlete?.id && !updAthleteErr);
  if (updAthleteErr) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] bracket flip failed', {
      transitionId,
      athleteUserId: row.athlete_user_id,
      error: updAthleteErr.message,
    });
  }

  // 3. Audit log.
  const { error: auditErr } = await sb.from('admin_audit_log').insert({
    actor_user_id: reviewerUserId,
    action: 'transition_verified',
    target_kind: 'athlete_transition',
    target_id: transitionId,
    reason:
      'Enrollment proof reviewed; matriculation confirmed. Athletes row bracket flipped to college.',
    metadata: {
      athleteUserId: row.athlete_user_id,
      bracketFlipped,
    },
  });
  if (auditErr) {
    // Non-fatal for the user-visible flow; surface internally.
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] audit write failed on verify', auditErr);
  }

  return {
    ok: true,
    data: { athleteUserId: row.athlete_user_id, bracketFlipped },
  };
}

// ----------------------------------------------------------------------------
// denyTransition
// ----------------------------------------------------------------------------

export async function denyTransition(
  transitionId: string,
  reviewerUserId: string,
  denialReason: string
): Promise<ServiceResult<{ athleteUserId: string }>> {
  if (!denialReason || denialReason.trim().length < 20) {
    return {
      ok: false,
      error: 'Denial reason must be at least 20 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();
  const now = new Date().toISOString();
  const trimmed = denialReason.trim();

  const { data: row, error: fetchErr } = await sb
    .from('athlete_bracket_transitions')
    .select('id, athlete_user_id, status')
    .eq('id', transitionId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!row) {
    return { ok: false, error: 'Transition not found.', code: 'not_found' };
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: `Transition is ${row.status}; only pending transitions can be denied.`,
      code: 'invalid_state',
    };
  }

  const { error: updErr } = await sb
    .from('athlete_bracket_transitions')
    .update({
      status: 'denied',
      confirmed_at: now,
      reviewer_user_id: reviewerUserId,
      denial_reason: trimmed,
    })
    .eq('id', transitionId)
    .eq('status', 'pending');
  if (updErr) {
    return { ok: false, error: updErr.message, code: 'db_error' };
  }

  const { error: auditErr } = await sb.from('admin_audit_log').insert({
    actor_user_id: reviewerUserId,
    action: 'transition_denied',
    target_kind: 'athlete_transition',
    target_id: transitionId,
    reason: trimmed,
    metadata: {
      athleteUserId: row.athlete_user_id,
    },
  });
  if (auditErr) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] audit write failed on deny', auditErr);
  }

  return { ok: true, data: { athleteUserId: row.athlete_user_id } };
}

// ----------------------------------------------------------------------------
// cancelOwnTransition
// ----------------------------------------------------------------------------

/**
 * Athlete cancels their own pending transition. Any uploaded proof is
 * purged from storage as a best-effort courtesy; the DB row stays so
 * the audit trail is intact.
 */
export async function cancelOwnTransition(
  transitionId: string,
  athleteUserId: string
): Promise<ServiceResult<{ transitionId: string }>> {
  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('athlete_bracket_transitions')
    .select('id, athlete_user_id, status, enrollment_proof_storage_path')
    .eq('id', transitionId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!row) {
    return { ok: false, error: 'Transition not found.', code: 'not_found' };
  }
  if (row.athlete_user_id !== athleteUserId) {
    return {
      ok: false,
      error: 'Transition belongs to a different athlete.',
      code: 'invalid_state',
    };
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: 'Only pending transitions can be cancelled.',
      code: 'invalid_state',
    };
  }

  const { error: updErr } = await sb
    .from('athlete_bracket_transitions')
    .update({ status: 'cancelled' })
    .eq('id', transitionId)
    .eq('status', 'pending');
  if (updErr) {
    return { ok: false, error: updErr.message, code: 'db_error' };
  }

  const storedPath = row.enrollment_proof_storage_path as string | null;
  if (storedPath) {
    await sb.storage
      .from(ENROLLMENT_PROOF_BUCKET)
      .remove([storedPath])
      .catch(() => {});
  }

  return { ok: true, data: { transitionId } };
}

// ----------------------------------------------------------------------------
// getTransitionForAthlete
// ----------------------------------------------------------------------------

/**
 * Returns the current (pending or verified) transition for the athlete,
 * or the most recent denied/cancelled row if none is active. Powers the
 * athlete-facing status card.
 */
export async function getTransitionForAthlete(
  athleteUserId: string
): Promise<TransitionRow | null> {
  const sb = getServiceRoleClient();

  // Active row first (pending or verified — unique by partial index).
  const { data: active, error: activeErr } = await sb
    .from('athlete_bracket_transitions')
    .select('*')
    .eq('athlete_user_id', athleteUserId)
    .in('status', ['pending', 'verified'])
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeErr) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] active fetch failed', activeErr);
    return null;
  }
  if (active) return active as TransitionRow;

  // Fall back to most recent terminal row.
  const { data: terminal, error: termErr } = await sb
    .from('athlete_bracket_transitions')
    .select('*')
    .eq('athlete_user_id', athleteUserId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (termErr) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] terminal fetch failed', termErr);
    return null;
  }
  return (terminal as TransitionRow | null) ?? null;
}

// ----------------------------------------------------------------------------
// listPendingTransitions (admin)
// ----------------------------------------------------------------------------

export async function listPendingTransitions(
  limit = 50
): Promise<TransitionRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('athlete_bracket_transitions')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`Failed to load pending transitions: ${error.message}`);
  }
  return (data ?? []) as TransitionRow[];
}

// ----------------------------------------------------------------------------
// getTransitionById (admin)
// ----------------------------------------------------------------------------

export async function getTransitionById(
  transitionId: string
): Promise<TransitionRow | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('athlete_bracket_transitions')
    .select('*')
    .eq('id', transitionId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil transitions] fetch by id failed', error);
    return null;
  }
  return (data as TransitionRow | null) ?? null;
}

// ----------------------------------------------------------------------------
// Signed-URL helper for admin review
// ----------------------------------------------------------------------------

export async function getEnrollmentProofSignedUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb.storage
    .from(ENROLLMENT_PROOF_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

// ----------------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------------

export function transitionStatusLabel(status: TransitionStatus): string {
  switch (status) {
    case 'pending':
      return 'Under review';
    case 'verified':
      return 'Verified';
    case 'denied':
      return 'Denied';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function ncaaDivisionLabel(div: NcaaDivision): string {
  switch (div) {
    case 'D1':
      return 'NCAA Division I';
    case 'D2':
      return 'NCAA Division II';
    case 'D3':
      return 'NCAA Division III';
    case 'NAIA':
      return 'NAIA';
    case 'JUCO':
      return 'Junior College';
    case 'other':
      return 'Other';
  }
}
