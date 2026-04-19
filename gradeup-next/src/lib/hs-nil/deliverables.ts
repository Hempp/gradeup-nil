/**
 * HS-NIL Phase 7 — Deliverable Submissions Service
 *
 * Thin service layer backing the athlete-side submit flow and (by
 * extension via GET) the brand-side review page. Owns the Supabase
 * Storage interactions with the `hs-deliverables` bucket and the
 * state transitions into and out of `deal_deliverable_submissions`.
 *
 * Authentication gating lives at the route layer. This module uses
 * the service role for writes so it can satisfy the RLS policies
 * even when an auth-scoped client would be blocked by the
 * INSERT-with-auth.uid() check (e.g., the deal-status transition
 * that isn't the athlete's write).
 *
 * Parallel-agent boundary:
 *   - BRAND-REVIEW owns status transitions out of 'submitted' and
 *     review_notes writes — we never touch those here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { moderateSubmission } from './moderation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DELIVERABLES_BUCKET = 'hs-deliverables';

export const MAX_DELIVERABLE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_DELIVERABLE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type DeliverableMimeType = (typeof ALLOWED_DELIVERABLE_MIME_TYPES)[number];

export type DeliverableSubmissionType =
  | 'social_post_url'
  | 'image_proof'
  | 'text_note'
  | 'external_link'
  | 'receipt';

export type DeliverablePlatform =
  | 'instagram'
  | 'tiktok'
  | 'twitter_x'
  | 'linkedin'
  | 'facebook'
  | 'youtube'
  | 'other';

export type DeliverableStatus =
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'superseded';

/**
 * Deal states in which an athlete may submit proof. Callers (the POST
 * route, the server page) share this constant so the gating stays
 * consistent.
 */
export const ALLOWED_SUBMIT_DEAL_STATES = [
  'fully_signed',
  'in_delivery',
  'in_review',
] as const;

export type AllowedSubmitDealState = (typeof ALLOWED_SUBMIT_DEAL_STATES)[number];

export interface DeliverableSubmissionRow {
  id: string;
  deal_id: string;
  submitted_by: string;
  submission_type: DeliverableSubmissionType;
  content_url: string | null;
  storage_path: string | null;
  note: string | null;
  platform: DeliverablePlatform | null;
  status: DeliverableStatus;
  review_notes: string | null;
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
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export interface SubmitDeliverableInput {
  dealId: string;
  athleteUserId: string;
  submissionType: DeliverableSubmissionType;
  contentUrl?: string | null;
  note?: string | null;
  platform?: DeliverablePlatform | null;
  /** Raw file bytes for submission_type = 'image_proof' or file-mode 'receipt'. */
  file?: Buffer | null;
  fileOriginalName?: string | null;
  fileMimeType?: DeliverableMimeType | null;
  fileSizeBytes?: number | null;
}

export interface SubmitDeliverableResult {
  submissionId: string;
  status: DeliverableStatus;
  storagePath: string | null;
}

/**
 * Insert a submission row (plus upload the file for image_proof).
 *
 * Payload rules (also enforced by the DB CHECK):
 *   - social_post_url / external_link / receipt (URL mode): contentUrl required.
 *   - image_proof / receipt (file mode): file + mime required.
 *   - text_note: note required.
 *
 * The generated storage path is `deal-<dealId>/<submissionId>/<sanitized-filename>`,
 * matching the first-segment pattern checked by the hs-deliverables RLS
 * policies in 20260418_015.
 */
export async function submitDeliverable(
  input: SubmitDeliverableInput
): Promise<SubmitDeliverableResult> {
  const {
    dealId,
    athleteUserId,
    submissionType,
    contentUrl,
    note,
    platform,
    file,
    fileOriginalName,
    fileMimeType,
    fileSizeBytes,
  } = input;

  if (file && fileSizeBytes != null) {
    if (fileSizeBytes <= 0 || fileSizeBytes > MAX_DELIVERABLE_BYTES) {
      throw new Error('Deliverable file size out of range.');
    }
  }
  if (file && fileMimeType && !ALLOWED_DELIVERABLE_MIME_TYPES.includes(fileMimeType)) {
    throw new Error('Deliverable mime type not allowed.');
  }

  const sb = getServiceRoleClient();

  // Reserve the row first so we can key the storage path by its id.
  // We insert with a placeholder storage_path (null) and patch it
  // after the upload completes. This keeps the deal-${dealId}/${submissionId}
  // shape stable regardless of retry behavior.
  const initialRow = {
    deal_id: dealId,
    submitted_by: athleteUserId,
    submission_type: submissionType,
    content_url: contentUrl ?? null,
    storage_path: null as string | null,
    note: note ?? null,
    platform: platform ?? null,
    status: 'submitted' as const,
  };

  const { data: inserted, error: insertErr } = await sb
    .from('deal_deliverable_submissions')
    .insert(initialRow)
    .select('id, status')
    .single();

  if (insertErr || !inserted) {
    throw new Error(
      `Failed to create deliverable submission: ${insertErr?.message ?? 'unknown error'}`
    );
  }

  const submissionId = inserted.id as string;
  let storagePath: string | null = null;

  if (file && fileMimeType) {
    const safeName =
      (fileOriginalName ?? 'proof').replace(/[^\w.\-]+/g, '_').slice(0, 120) ||
      'proof';
    storagePath = `deal-${dealId}/${submissionId}/${safeName}`;

    const { error: uploadErr } = await sb.storage
      .from(DELIVERABLES_BUCKET)
      .upload(storagePath, file, {
        contentType: fileMimeType,
        upsert: false,
        cacheControl: 'no-store',
      });

    if (uploadErr) {
      // Roll back the row so we don't leave a headless submission.
      await sb
        .from('deal_deliverable_submissions')
        .delete()
        .eq('id', submissionId)
        .then(() => undefined, () => undefined);
      throw new Error(`Deliverable upload failed: ${uploadErr.message}`);
    }

    const { error: patchErr } = await sb
      .from('deal_deliverable_submissions')
      .update({ storage_path: storagePath })
      .eq('id', submissionId);

    if (patchErr) {
      // Best-effort cleanup of the uploaded object; row stays so we
      // can triage manually. Re-throw with context.
      await sb.storage.from(DELIVERABLES_BUCKET).remove([storagePath]).catch(() => {});
      throw new Error(
        `Failed to attach storage path to submission: ${patchErr.message}`
      );
    }
  }

  // Fire moderation best-effort. A classifier failure must never block the
  // athlete's submit response — we already have the row, and the moderation
  // service can be rerun by ops. The service layer writes a pending row if
  // the classifier errors so the submission still shows up in the queue.
  moderateSubmission(submissionId).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil deliverables] moderation pass failed (non-fatal)', {
      submissionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return {
    submissionId,
    status: 'submitted',
    storagePath,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listSubmissionsForDeal(
  dealId: string,
  limit = 50
): Promise<DeliverableSubmissionRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deal_deliverable_submissions')
    .select(
      'id, deal_id, submitted_by, submission_type, content_url, storage_path, note, platform, status, review_notes, created_at'
    )
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load submissions: ${error.message}`);
  }
  return (data ?? []) as DeliverableSubmissionRow[];
}

export async function getLatestSubmission(
  dealId: string
): Promise<DeliverableSubmissionRow | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deal_deliverable_submissions')
    .select(
      'id, deal_id, submitted_by, submission_type, content_url, storage_path, note, platform, status, review_notes, created_at'
    )
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load latest submission: ${error.message}`);
  }
  return (data as DeliverableSubmissionRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Deal-status transition
// ---------------------------------------------------------------------------

/**
 * Idempotently flip a deal from fully_signed / in_delivery into in_review
 * when the athlete files their first submission. No-op if the deal is
 * already in_review, completed, cancelled, or in any other downstream
 * state — we never walk the status machine backwards.
 */
export async function transitionDealToInReview(
  dealId: string
): Promise<{ transitioned: boolean; previousStatus: string | null }> {
  const sb = getServiceRoleClient();
  const { data: deal, error: fetchErr } = await sb
    .from('deals')
    .select('id, status')
    .eq('id', dealId)
    .maybeSingle();

  if (fetchErr || !deal) {
    return { transitioned: false, previousStatus: null };
  }

  const prev = deal.status as string;
  if (prev !== 'fully_signed' && prev !== 'in_delivery') {
    return { transitioned: false, previousStatus: prev };
  }

  const { error: updateErr } = await sb
    .from('deals')
    .update({ status: 'in_review', updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .in('status', ['fully_signed', 'in_delivery']);

  if (updateErr) {
    // Surface as non-fatal — the caller decides whether to bail.
    return { transitioned: false, previousStatus: prev };
  }

  return { transitioned: true, previousStatus: prev };
}

// ---------------------------------------------------------------------------
// Signed URLs for image submissions
// ---------------------------------------------------------------------------

export async function getSignedDeliverableUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb.storage
    .from(DELIVERABLES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function deliverableSubmissionTypeLabel(
  t: DeliverableSubmissionType
): string {
  switch (t) {
    case 'social_post_url':
      return 'Social post';
    case 'image_proof':
      return 'Image proof';
    case 'text_note':
      return 'Text note';
    case 'external_link':
      return 'External link';
    case 'receipt':
      return 'Receipt';
  }
}

export function deliverableStatusLabel(s: DeliverableStatus): string {
  switch (s) {
    case 'submitted':
      return 'Submitted';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Needs revision';
    case 'superseded':
      return 'Superseded';
  }
}

/**
 * Short summary line used in dashboard cards and email bodies.
 */
export function summarizeSubmission(row: DeliverableSubmissionRow): string {
  switch (row.submission_type) {
    case 'social_post_url':
      return row.platform
        ? `${row.platform.replace('_', '/')} post`
        : 'Social post';
    case 'image_proof':
      return 'Image proof uploaded';
    case 'external_link':
      return 'External link';
    case 'receipt':
      return row.storage_path ? 'Receipt file' : 'Receipt link';
    case 'text_note':
      return 'Text note';
  }
}
