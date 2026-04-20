/**
 * HS-NIL Tier B — Transcript OCR Service
 * ----------------------------------------------------------------------------
 * Glue between the upload / admin-review flow and the provider adapters in
 * `ocr-provider.ts`. Two entry points matter:
 *
 *   runOcrForSubmission(submissionId)
 *     — Loads the submission, generates a signed URL for the stored file,
 *       calls the configured provider, and persists a transcript_ocr_results
 *       row. Idempotent per submission (partial UNIQUE on the DB side means
 *       we UPSERT current-row shape; see `writeResult`).
 *
 *   confidenceGatedAutoApproval(submissionId)
 *     — Post-OCR helper. If confidence >= 0.90 AND extracted_gpa matches the
 *       athlete's claimed_gpa within ±0.05 (after scale normalisation), flip
 *       the transcript to 'approved' and propagate the GPA onto
 *       hs_athlete_profiles. Otherwise leave the submission in the manual
 *       queue with the OCR metadata available to ops.
 *
 * Fail-soft: every helper returns a discriminated result. The upload route
 * treats all of these as best-effort — no OCR failure blocks the athlete's
 * "Submitted — under review" response.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { captureGpaSnapshot } from './trajectory';
import {
  GPA_MATCH_TOLERANCE,
  getOcrProvider,
  normaliseGpaTo4,
  type OcrProviderName,
  type OcrResult,
} from './ocr-provider';
import { TRANSCRIPT_BUCKET, type TranscriptStatus } from './transcripts';
import {
  sendOcrLowConfidenceNotification,
  sendTranscriptAutoApproved,
} from '@/lib/services/hs-nil/ocr-emails';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const OCR_AUTO_APPROVAL_CONFIDENCE = 0.9;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcrRunOutcome =
  | {
      ok: true;
      resultId: string;
      provider: OcrProviderName;
      confidence: number;
      extractedGpa: number | null;
      extractedGpaScale: number | null;
      matchesClaimed: boolean;
    }
  | {
      ok: false;
      reason: string;
    };

export type AutoApprovalOutcome =
  | {
      ok: true;
      autoApproved: true;
      reviewerNotes: string;
    }
  | {
      ok: true;
      autoApproved: false;
      reason: 'low_confidence' | 'gpa_mismatch' | 'ocr_missing' | 'already_reviewed';
    }
  | {
      ok: false;
      reason: string;
    };

export interface TranscriptOcrRow {
  id: string;
  submission_id: string;
  provider: OcrProviderName;
  extracted_gpa: number | null;
  extracted_gpa_scale: number | null;
  extracted_term: string | null;
  confidence: number | null;
  raw_extraction: Record<string, unknown>;
  processing_time_ms: number | null;
  error: string | null;
  superseded_at: string | null;
  processed_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil ocr] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// runOcrForSubmission
// ---------------------------------------------------------------------------

/**
 * Run the configured OCR provider for one submission and persist the result.
 *
 * Partial UNIQUE on (submission_id) WHERE superseded_at IS NULL means we can
 * safely INSERT here; if a prior active row exists we supersede it first
 * (this path fires on reprocess; on first-time OCR there's no prior row).
 */
export async function runOcrForSubmission(
  submissionId: string,
  providerOverride?: OcrProviderName
): Promise<OcrRunOutcome> {
  const sb = getServiceRoleClient();

  // Load submission — need storage_path + mime + claimed_gpa.
  const { data: sub, error: subErr } = await sb
    .from('transcript_submissions')
    .select('id, storage_path, mime_type, claimed_gpa, athlete_user_id')
    .eq('id', submissionId)
    .maybeSingle();

  if (subErr) {
    return { ok: false, reason: `submission lookup failed: ${subErr.message}` };
  }
  if (!sub) {
    return { ok: false, reason: 'submission not found' };
  }

  // Signed URL — providers prefer a URL they can fetch. 10 min is enough for
  // a single OCR call but short enough that the URL isn't useful if leaked.
  const { data: signed, error: signErr } = await sb.storage
    .from(TRANSCRIPT_BUCKET)
    .createSignedUrl(sub.storage_path as string, 600);
  if (signErr || !signed?.signedUrl) {
    return {
      ok: false,
      reason: `signed url failed: ${signErr?.message ?? 'unknown'}`,
    };
  }

  const provider = getOcrProvider(providerOverride);

  let result: OcrResult;
  try {
    result = await provider.extractTranscript({
      storageBucket: TRANSCRIPT_BUCKET,
      storagePath: sub.storage_path as string,
      mimeType: sub.mime_type as string,
      signedUrl: signed.signedUrl,
      claimedGpa: Number(sub.claimed_gpa),
    });
  } catch (err) {
    // Hard throw (e.g. prod stub, missing API key). Persist an error row so
    // ops can see the OCR attempt, then return not-ok so the caller knows.
    const message = err instanceof Error ? err.message : String(err);
    const persisted = await writeResult(sb, submissionId, {
      provider: provider.name,
      extracted_gpa: null,
      extracted_gpa_scale: null,
      extracted_term: null,
      confidence: null,
      raw: {},
      processingMs: 0,
      error: message.slice(0, 500),
    });
    return persisted.ok
      ? { ok: false, reason: message }
      : { ok: false, reason: `${message}; persist failed: ${persisted.reason}` };
  }

  const persisted = await writeResult(sb, submissionId, {
    provider: result.providerName,
    extracted_gpa: result.gpa,
    extracted_gpa_scale: result.gpaScale,
    extracted_term: result.term,
    confidence: result.confidence,
    raw: result.raw,
    processingMs: result.processingMs,
    error: result.error ?? null,
  });
  if (!persisted.ok) return { ok: false, reason: persisted.reason };

  return {
    ok: true,
    resultId: persisted.id,
    provider: result.providerName,
    confidence: result.confidence,
    extractedGpa: result.gpa,
    extractedGpaScale: result.gpaScale,
    matchesClaimed: result.matchesClaimed,
  };
}

/**
 * Persist a single OCR row. Supersedes any prior active row for the same
 * submission inside a best-effort sequence (no cross-row tx available
 * through PostgREST, but the partial unique index guarantees at most one
 * active row survives).
 */
async function writeResult(
  sb: SupabaseClient,
  submissionId: string,
  row: {
    provider: OcrProviderName;
    extracted_gpa: number | null;
    extracted_gpa_scale: number | null;
    extracted_term: string | null;
    confidence: number | null;
    raw: Record<string, unknown>;
    processingMs: number;
    error: string | null;
  }
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  // Supersede any existing active row. Idempotent: if none exists this
  // UPDATE affects 0 rows.
  const now = new Date().toISOString();
  await sb
    .from('transcript_ocr_results')
    .update({ superseded_at: now })
    .eq('submission_id', submissionId)
    .is('superseded_at', null)
    .then(undefined, () => undefined);

  const { data, error } = await sb
    .from('transcript_ocr_results')
    .insert({
      submission_id: submissionId,
      provider: row.provider,
      extracted_gpa: row.extracted_gpa,
      extracted_gpa_scale: row.extracted_gpa_scale,
      extracted_term: row.extracted_term,
      confidence: row.confidence,
      raw_extraction: row.raw ?? {},
      processing_time_ms: row.processingMs,
      error: row.error,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      reason: `persist failed: ${error?.message ?? 'no row returned'}`,
    };
  }
  return { ok: true, id: data.id as string };
}

// ---------------------------------------------------------------------------
// getOcrResultForSubmission
// ---------------------------------------------------------------------------

export async function getOcrResultForSubmission(
  submissionId: string
): Promise<TranscriptOcrRow | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('transcript_ocr_results')
    .select(
      'id, submission_id, provider, extracted_gpa, extracted_gpa_scale, extracted_term, confidence, raw_extraction, processing_time_ms, error, superseded_at, processed_at, created_at'
    )
    .eq('submission_id', submissionId)
    .is('superseded_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return data as TranscriptOcrRow;
}

export async function getOcrResultsForSubmissionIds(
  submissionIds: string[]
): Promise<Map<string, TranscriptOcrRow>> {
  const map = new Map<string, TranscriptOcrRow>();
  if (submissionIds.length === 0) return map;
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('transcript_ocr_results')
    .select(
      'id, submission_id, provider, extracted_gpa, extracted_gpa_scale, extracted_term, confidence, raw_extraction, processing_time_ms, error, superseded_at, processed_at, created_at'
    )
    .in('submission_id', submissionIds)
    .is('superseded_at', null);
  if (error || !data) return map;
  for (const row of data as TranscriptOcrRow[]) {
    map.set(row.submission_id, row);
  }
  return map;
}

// ---------------------------------------------------------------------------
// confidenceGatedAutoApproval
// ---------------------------------------------------------------------------

/**
 * Post-OCR gate. Auto-approve ONLY when both of these hold:
 *   1. confidence >= 0.90
 *   2. normalised extracted GPA is within ±0.05 of claimed GPA
 *
 * Either failure → leave in manual queue. On auto-approval we:
 *   - UPDATE transcript_submissions.status='approved' with reviewer_notes
 *     set to 'Auto-approved by OCR <provider> confidence <N>' so a
 *     three-months-later audit can reconstruct what happened.
 *   - Propagate GPA onto hs_athlete_profiles (mirrors the human-approve
 *     path in recordReviewDecision).
 *   - Fire trajectory snapshot + athlete email (best-effort).
 *
 * On low-confidence we fire the ops notification so the queue gets priority
 * attention — best-effort, never blocks the caller.
 */
export async function confidenceGatedAutoApproval(
  submissionId: string
): Promise<AutoApprovalOutcome> {
  const sb = getServiceRoleClient();

  const { data: sub, error: subErr } = await sb
    .from('transcript_submissions')
    .select('id, status, claimed_gpa, athlete_user_id')
    .eq('id', submissionId)
    .maybeSingle();
  if (subErr) return { ok: false, reason: subErr.message };
  if (!sub) return { ok: false, reason: 'submission not found' };
  if (sub.status !== 'pending_review') {
    return { ok: true, autoApproved: false, reason: 'already_reviewed' };
  }

  const ocr = await getOcrResultForSubmission(submissionId);
  if (!ocr) return { ok: true, autoApproved: false, reason: 'ocr_missing' };

  const confidence = ocr.confidence ?? 0;
  const claimed = Number(sub.claimed_gpa);
  const normalised = normaliseGpaTo4(ocr.extracted_gpa, ocr.extracted_gpa_scale);

  const lowConfidence = confidence < OCR_AUTO_APPROVAL_CONFIDENCE;
  const mismatch =
    normalised === null || Math.abs(normalised - claimed) > GPA_MATCH_TOLERANCE;

  if (lowConfidence || mismatch) {
    // Fire ops notification best-effort. Fail-soft.
    sendOcrLowConfidenceNotification({
      submissionId,
      provider: ocr.provider,
      confidence,
      extractedGpa: normalised,
      claimedGpa: claimed,
      reason: lowConfidence ? 'low_confidence' : 'gpa_mismatch',
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[hs-nil ocr] low-confidence notification failed', {
        submissionId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return {
      ok: true,
      autoApproved: false,
      reason: lowConfidence ? 'low_confidence' : 'gpa_mismatch',
    };
  }

  // Auto-approve.
  const approvedGpa = Number(normalised);
  const now = new Date().toISOString();
  const reviewerNotes = `Auto-approved by OCR ${ocr.provider} confidence ${confidence.toFixed(
    2
  )}`;

  // Guard against concurrent human approval by requiring status=pending_review.
  const { data: updated, error: updateErr } = await sb
    .from('transcript_submissions')
    .update({
      status: 'approved' as TranscriptStatus,
      reviewer_user_id: null, // system action — no human reviewer
      reviewed_at: now,
      reviewer_notes: reviewerNotes,
      athlete_visible_note: null,
      approved_gpa: approvedGpa,
    })
    .eq('id', submissionId)
    .eq('status', 'pending_review')
    .select('id, athlete_user_id')
    .maybeSingle();

  if (updateErr) return { ok: false, reason: updateErr.message };
  if (!updated) {
    // Race — a human got there first. Leave as-is.
    return { ok: true, autoApproved: false, reason: 'already_reviewed' };
  }

  // Propagate GPA onto the athlete profile (mirrors recordReviewDecision).
  const { error: profileErr } = await sb
    .from('hs_athlete_profiles')
    .update({
      gpa: approvedGpa,
      gpa_verification_tier: 'user_submitted',
      verified_at: now,
    })
    .eq('user_id', sub.athlete_user_id);
  if (profileErr) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil ocr] profile update failed after auto-approve', {
      submissionId,
      error: profileErr.message,
    });
  }

  // Trajectory snapshot — idempotent via sourceReferenceId.
  captureGpaSnapshot({
    athleteUserId: sub.athlete_user_id as string,
    gpa: approvedGpa,
    tier: 'user_submitted',
    source: 'transcript_approval',
    sourceReferenceId: submissionId,
  }).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil ocr] trajectory snapshot failed after auto-approve', {
      submissionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // Athlete notification (best-effort).
  lookupAthleteEmail(sb, sub.athlete_user_id as string)
    .then((athlete) => {
      if (!athlete?.email) return;
      return sendTranscriptAutoApproved({
        athleteEmail: athlete.email,
        athleteName: athlete.firstName ?? undefined,
        approvedGpa,
        provider: ocr.provider,
        confidence,
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[hs-nil ocr] auto-approved email failed', {
        submissionId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return { ok: true, autoApproved: true, reviewerNotes };
}

// ---------------------------------------------------------------------------
// reprocessSubmission — admin-only
// ---------------------------------------------------------------------------

export async function reprocessSubmission(
  submissionId: string,
  providerOverride?: OcrProviderName
): Promise<OcrRunOutcome> {
  // `runOcrForSubmission` already supersedes the active row before inserting
  // the new one; we just re-call here. Keeping a separate function name
  // makes callsites (admin route) read cleanly.
  return runOcrForSubmission(submissionId, providerOverride);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function lookupAthleteEmail(
  sb: SupabaseClient,
  athleteUserId: string
): Promise<{ email: string | null; firstName: string | null } | null> {
  const { data } = await sb
    .from('profiles')
    .select('email, first_name')
    .eq('id', athleteUserId)
    .maybeSingle();
  if (!data) return null;
  return {
    email: (data.email as string | null) ?? null,
    firstName: (data.first_name as string | null) ?? null,
  };
}
