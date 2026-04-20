/**
 * HS-NIL Tier B — Transcript Submission Service
 *
 * Thin service layer that backs the athlete upload and ops review
 * routes. Wraps Supabase Storage (`hs-transcripts` bucket) and the
 * `transcript_submissions` table so the API handlers stay small.
 *
 * All mutations use the service role. The athlete's auth session
 * is enforced at the route layer — this module trusts its caller
 * and focuses on correctness of the DB + storage transitions.
 *
 * Fail modes:
 *   - Storage upload failure: row is NOT inserted.
 *   - Row insert failure after storage upload: we best-effort delete
 *     the orphaned object so the bucket doesn't collect garbage.
 *   - Profile update failure on approval: the submission row is still
 *     updated to 'approved' and the error is surfaced — ops can retry
 *     the profile write via the manual path.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TRANSCRIPT_BUCKET = 'hs-transcripts';

export const MAX_TRANSCRIPT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_TRANSCRIPT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type TranscriptMimeType = (typeof ALLOWED_TRANSCRIPT_MIME_TYPES)[number];

export type TranscriptStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'resubmission_requested';

export interface TranscriptSubmissionRow {
  id: string;
  athlete_user_id: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: TranscriptMimeType;
  claimed_gpa: number;
  status: TranscriptStatus;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  athlete_visible_note: string | null;
  approved_gpa: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service-role client (bypasses RLS — routes do their own auth gating)
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extensionForMime(mime: TranscriptMimeType, filename: string): string {
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

/**
 * Build a storage path scoped under the athlete's user id so future
 * bucket-scoped RLS / object-owner policies stay trivial to add.
 */
function buildStoragePath(
  athleteUserId: string,
  mime: TranscriptMimeType,
  originalFilename: string
): string {
  const stamp = Date.now();
  const rand = randomBytes(6).toString('hex');
  const ext = extensionForMime(mime, originalFilename);
  return `${athleteUserId}/${stamp}-${rand}.${ext}`;
}

// ---------------------------------------------------------------------------
// Upload (athlete-initiated)
// ---------------------------------------------------------------------------

export interface CreateSubmissionInput {
  athleteUserId: string;
  file: Buffer;
  originalFilename: string;
  mimeType: TranscriptMimeType;
  fileSizeBytes: number;
  claimedGpa: number;
}

export interface CreateSubmissionResult {
  submissionId: string;
  status: TranscriptStatus;
  storagePath: string;
}

export async function createSubmission(
  input: CreateSubmissionInput
): Promise<CreateSubmissionResult> {
  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > MAX_TRANSCRIPT_BYTES) {
    throw new Error('Transcript file size out of range.');
  }
  if (!ALLOWED_TRANSCRIPT_MIME_TYPES.includes(input.mimeType)) {
    throw new Error('Transcript mime type not allowed.');
  }
  if (
    !Number.isFinite(input.claimedGpa) ||
    input.claimedGpa < 0 ||
    input.claimedGpa > 5
  ) {
    throw new Error('Claimed GPA out of range.');
  }

  const sb = getServiceRoleClient();
  const storagePath = buildStoragePath(
    input.athleteUserId,
    input.mimeType,
    input.originalFilename
  );

  const { error: uploadErr } = await sb.storage
    .from(TRANSCRIPT_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.mimeType,
      upsert: false,
      cacheControl: 'no-store',
    });

  if (uploadErr) {
    throw new Error(`Transcript upload failed: ${uploadErr.message}`);
  }

  const { data: row, error: insertErr } = await sb
    .from('transcript_submissions')
    .insert({
      athlete_user_id: input.athleteUserId,
      storage_path: storagePath,
      original_filename: input.originalFilename.slice(0, 255),
      file_size_bytes: input.fileSizeBytes,
      mime_type: input.mimeType,
      claimed_gpa: input.claimedGpa,
      status: 'pending_review',
    })
    .select('id, status')
    .single();

  if (insertErr || !row) {
    // Best-effort cleanup so the bucket doesn't orphan objects.
    await sb.storage.from(TRANSCRIPT_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(
      `Failed to record transcript submission: ${insertErr?.message ?? 'unknown error'}`
    );
  }

  // OCR + confidence-gated auto-approval. Fire-and-forget from the upload
  // path — failures (missing provider env, network blip, malformed
  // provider response) NEVER block the athlete's response. The queue still
  // shows the row under 'pending_review' for ops as a fallback.
  //
  // Dynamic import breaks the module cycle (ocr.ts imports from this
  // module for TRANSCRIPT_BUCKET / TranscriptStatus). Also keeps the cold-
  // start cost of the upload route minimal when OCR is disabled.
  void (async () => {
    try {
      const { runOcrForSubmission, confidenceGatedAutoApproval } = await import(
        './ocr'
      );
      const ocrOutcome = await runOcrForSubmission(row.id as string);
      if (ocrOutcome.ok) {
        await confidenceGatedAutoApproval(row.id as string);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[hs-nil transcripts] background OCR pass failed (non-fatal)',
        {
          submissionId: row.id,
          error: err instanceof Error ? err.message : String(err),
        }
      );
    }
  })();

  return {
    submissionId: row.id,
    status: row.status as TranscriptStatus,
    storagePath,
  };
}

/**
 * Back-compat alias used by the OCR brief. `submitTranscript` reads more
 * naturally at the call-site ("submit the transcript → fire OCR") while
 * `createSubmission` reads as the raw DB-row creator. Both point at the
 * same code path; prefer `submitTranscript` for new callers that also want
 * the OCR side-effects fired, and `createSubmission` when only the raw
 * row insert is needed.
 */
export const submitTranscript = createSubmission;

/**
 * After an approval — human or auto — propagate the approved GPA onto the
 * athlete profile. Exposed so the OCR auto-approval path and future
 * callers can share the same update shape. The main review path in
 * `recordReviewDecision` already inlines this write; this helper exists
 * so the auto-approval flow can re-use it without replicating the SQL.
 */
export async function updateAthleteGpaAfterApproval(
  athleteUserId: string,
  approvedGpa: number
): Promise<{ ok: boolean; reason?: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('hs_athlete_profiles')
    .update({
      gpa: approvedGpa,
      gpa_verification_tier: 'user_submitted',
      verified_at: new Date().toISOString(),
    })
    .eq('user_id', athleteUserId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Athlete-side read
// ---------------------------------------------------------------------------

export async function listSubmissionsForAthlete(
  athleteUserId: string,
  limit = 10
): Promise<TranscriptSubmissionRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('transcript_submissions')
    .select(
      'id, athlete_user_id, storage_path, original_filename, file_size_bytes, mime_type, claimed_gpa, status, reviewer_user_id, reviewed_at, reviewer_notes, athlete_visible_note, approved_gpa, created_at'
    )
    .eq('athlete_user_id', athleteUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load transcript submissions: ${error.message}`);
  }
  return (data ?? []) as TranscriptSubmissionRow[];
}

// ---------------------------------------------------------------------------
// Ops queue + review
// ---------------------------------------------------------------------------

export async function listPendingSubmissions(
  limit = 50
): Promise<TranscriptSubmissionRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('transcript_submissions')
    .select(
      'id, athlete_user_id, storage_path, original_filename, file_size_bytes, mime_type, claimed_gpa, status, reviewer_user_id, reviewed_at, reviewer_notes, athlete_visible_note, approved_gpa, created_at'
    )
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load pending queue: ${error.message}`);
  }
  return (data ?? []) as TranscriptSubmissionRow[];
}

/**
 * Generate a short-lived signed URL ops can click to view the file.
 * Falls back to a null URL if the storage backend rejects the path —
 * the queue UI renders "unavailable" rather than throwing.
 */
export async function getSignedViewUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb.storage
    .from(TRANSCRIPT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export interface ReviewDecisionInput {
  submissionId: string;
  reviewerUserId: string;
  decision: 'approve' | 'reject' | 'request_resubmission';
  approvedGpa?: number;
  reviewerNotes?: string;
  athleteVisibleNote?: string;
}

export interface ReviewDecisionResult {
  submissionId: string;
  newStatus: TranscriptStatus;
  profileUpdated: boolean;
  profileUpdateError: string | null;
}

export async function recordReviewDecision(
  input: ReviewDecisionInput
): Promise<ReviewDecisionResult> {
  const sb = getServiceRoleClient();

  // Fetch the row to validate + to grab the athlete_user_id for the
  // follow-up profile update. We rely on the caller to have performed
  // admin auth; the service role bypasses RLS here.
  const { data: current, error: fetchErr } = await sb
    .from('transcript_submissions')
    .select('id, athlete_user_id, status, claimed_gpa')
    .eq('id', input.submissionId)
    .maybeSingle();

  if (fetchErr || !current) {
    throw new Error('Submission not found.');
  }
  if (current.status !== 'pending_review') {
    throw new Error('Submission has already been reviewed.');
  }

  const now = new Date().toISOString();
  let newStatus: TranscriptStatus;
  let approvedGpa: number | null = null;

  switch (input.decision) {
    case 'approve': {
      if (
        input.approvedGpa === undefined ||
        !Number.isFinite(input.approvedGpa) ||
        input.approvedGpa < 0 ||
        input.approvedGpa > 5
      ) {
        throw new Error('approvedGpa is required for approvals and must be 0-5.');
      }
      newStatus = 'approved';
      approvedGpa = input.approvedGpa;
      break;
    }
    case 'reject':
      newStatus = 'rejected';
      break;
    case 'request_resubmission':
      newStatus = 'resubmission_requested';
      break;
    default:
      throw new Error('Unknown review decision.');
  }

  const { error: updateErr } = await sb
    .from('transcript_submissions')
    .update({
      status: newStatus,
      reviewer_user_id: input.reviewerUserId,
      reviewed_at: now,
      reviewer_notes: input.reviewerNotes ?? null,
      athlete_visible_note: input.athleteVisibleNote ?? null,
      approved_gpa: approvedGpa,
    })
    .eq('id', input.submissionId);

  if (updateErr) {
    throw new Error(`Failed to record review: ${updateErr.message}`);
  }

  // Propagate approved GPA onto the athlete profile. Treated as a
  // soft failure — the submission row is authoritative.
  let profileUpdated = false;
  let profileUpdateError: string | null = null;
  if (newStatus === 'approved' && approvedGpa !== null) {
    const { error: profileErr } = await sb
      .from('hs_athlete_profiles')
      .update({
        gpa: approvedGpa,
        gpa_verification_tier: 'user_submitted',
        verified_at: now,
      })
      .eq('user_id', current.athlete_user_id);
    if (profileErr) {
      profileUpdateError = profileErr.message;
    } else {
      profileUpdated = true;
    }
  }

  return {
    submissionId: input.submissionId,
    newStatus,
    profileUpdated,
    profileUpdateError,
  };
}

// ---------------------------------------------------------------------------
// Display helpers for the UI (status/label mapping lives here so the
// athlete page + ops page can share it).
// ---------------------------------------------------------------------------

export function transcriptStatusLabel(status: TranscriptStatus): string {
  switch (status) {
    case 'pending_review':
      return 'Under review';
    case 'approved':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    case 'resubmission_requested':
      return 'Needs resubmission';
  }
}
