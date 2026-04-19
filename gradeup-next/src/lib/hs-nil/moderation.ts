/**
 * HS-NIL Phase 10 — Deliverable Moderation Service
 * ----------------------------------------------------------------------------
 * Gate every athlete deliverable through a classifier pass before the brand
 * sees it. Writes a `deliverable_moderation_results` row via service role so
 * the classifier can evaluate on behalf of the submitting athlete without
 * tripping on RLS.
 *
 * Status lifecycle:
 *   pending
 *     → auto_approved   (confidence >= 0.85, no flagged categories,
 *                        not requiresHumanReview)
 *     → flagged         (everything else)
 *   flagged / ops_reviewing
 *     → human_approved | human_rejected  (via humanDecide)
 *   any
 *     → pending         (via rerun — resets and re-auto-decides)
 *
 * The route layer never calls the classifier directly. Every write path goes
 * through this module so the audit story stays coherent.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DefaultClassifier,
  getClassifier,
  type Classifier,
  type ClassifierResult,
} from './moderation-classifier';
import type { USPSStateCode } from './state-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModerationStatus =
  | 'pending'
  | 'auto_approved'
  | 'flagged'
  | 'ops_reviewing'
  | 'human_approved'
  | 'human_rejected';

export interface ModerationResultRow {
  id: string;
  submission_id: string;
  status: ModerationStatus;
  auto_confidence: number | null;
  auto_categories: string[];
  auto_reasons: string[];
  reviewer_user_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModeratedSubmissionView extends ModerationResultRow {
  submission: {
    id: string;
    deal_id: string;
    submitted_by: string;
    submission_type: string;
    content_url: string | null;
    storage_path: string | null;
    note: string | null;
    platform: string | null;
    created_at: string;
  };
  deal_title: string | null;
  athlete_first_name: string | null;
}

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil moderation] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Auto-approve threshold. Tune carefully — see moderation-classifier.ts.
// ---------------------------------------------------------------------------

const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.85;

function decideStatus(result: ClassifierResult): ModerationStatus {
  if (result.requiresHumanReview) return 'flagged';
  if (result.categories.length > 0) return 'flagged';
  if (result.confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD) return 'auto_approved';
  return 'flagged';
}

// ---------------------------------------------------------------------------
// Submission loader (service-role)
// ---------------------------------------------------------------------------

interface SubmissionForClassify {
  id: string;
  deal_id: string;
  submitted_by: string;
  submission_type:
    | 'social_post_url'
    | 'image_proof'
    | 'text_note'
    | 'external_link'
    | 'receipt';
  content_url: string | null;
  storage_path: string | null;
  note: string | null;
  platform: string | null;
  state_code: USPSStateCode | null;
}

async function loadSubmissionForClassify(
  sb: SupabaseClient,
  submissionId: string
): Promise<SubmissionForClassify | null> {
  const { data, error } = await sb
    .from('deal_deliverable_submissions')
    .select(
      'id, deal_id, submitted_by, submission_type, content_url, storage_path, note, platform'
    )
    .eq('id', submissionId)
    .maybeSingle();

  if (error || !data) return null;

  // Best-effort state lookup — used only to narrow per-state banned list.
  // If this fails we fall through to the universal banned list.
  let stateCode: USPSStateCode | null = null;
  try {
    const { data: ap } = await sb
      .from('hs_athlete_profiles')
      .select('state_code')
      .eq('user_id', data.submitted_by as string)
      .maybeSingle();
    if (ap?.state_code) stateCode = ap.state_code as USPSStateCode;
  } catch {
    // non-fatal
  }

  return {
    id: data.id as string,
    deal_id: data.deal_id as string,
    submitted_by: data.submitted_by as string,
    submission_type:
      data.submission_type as SubmissionForClassify['submission_type'],
    content_url: (data.content_url as string | null) ?? null,
    storage_path: (data.storage_path as string | null) ?? null,
    note: (data.note as string | null) ?? null,
    platform: (data.platform as string | null) ?? null,
    state_code: stateCode,
  };
}

// ---------------------------------------------------------------------------
// moderateSubmission — main entry
// ---------------------------------------------------------------------------

export interface ModerateSubmissionOutcome {
  status: ModerationStatus;
  confidence: number;
  categories: string[];
  reasons: string[];
  moderationId: string;
}

/**
 * Run the classifier for one submission and persist the result. Idempotent
 * via UPSERT on submission_id. Safe to call best-effort from the submit
 * path — callers that don't want to block the athlete response can
 * `.catch(() => undefined)` on the returned promise.
 */
export async function moderateSubmission(
  submissionId: string,
  classifierOverride?: Classifier
): Promise<ModerateSubmissionOutcome> {
  const sb = getServiceRoleClient();
  const submission = await loadSubmissionForClassify(sb, submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found for moderation.`);
  }

  const classifier = classifierOverride ?? getClassifier();
  let result: ClassifierResult;
  try {
    result = await classifier.classify({
      text: submission.note,
      contentUrl: submission.content_url,
      storagePath: submission.storage_path,
      submissionType: submission.submission_type,
      stateCode: submission.state_code,
    });
  } catch (err) {
    // Fail-soft: if the classifier throws, we flag for human review so the
    // brand never sees unmoderated content.
    // eslint-disable-next-line no-console
    console.warn('[hs-nil moderation] classifier threw; defaulting to flagged', {
      submissionId,
      error: err instanceof Error ? err.message : String(err),
    });
    result = {
      confidence: 0.5,
      categories: ['needs_human_review'],
      reasons: [
        `Classifier error: ${err instanceof Error ? err.message : 'unknown'}`,
      ],
      requiresHumanReview: true,
    };
  }

  const status = decideStatus(result);

  const { data, error } = await sb
    .from('deliverable_moderation_results')
    .upsert(
      {
        submission_id: submissionId,
        status,
        auto_confidence: result.confidence,
        auto_categories: result.categories,
        auto_reasons: result.reasons,
        reviewer_user_id: null,
        reviewer_notes: null,
        reviewed_at: null,
      },
      { onConflict: 'submission_id' }
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to persist moderation result for ${submissionId}: ${error?.message ?? 'unknown'}`
    );
  }

  return {
    status,
    confidence: result.confidence,
    categories: result.categories,
    reasons: result.reasons,
    moderationId: data.id as string,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getModerationForSubmission(
  submissionId: string
): Promise<ModerationResultRow | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deliverable_moderation_results')
    .select(
      'id, submission_id, status, auto_confidence, auto_categories, auto_reasons, reviewer_user_id, reviewer_notes, reviewed_at, created_at, updated_at'
    )
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load moderation: ${error.message}`);
  }
  return (data as ModerationResultRow | null) ?? null;
}

interface ModerationRowWithSubmission {
  id: string;
  submission_id: string;
  status: ModerationStatus;
  auto_confidence: number | null;
  auto_categories: string[];
  auto_reasons: string[];
  reviewer_user_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  submission: {
    id: string;
    deal_id: string;
    submitted_by: string;
    submission_type: string;
    content_url: string | null;
    storage_path: string | null;
    note: string | null;
    platform: string | null;
    created_at: string;
  };
}

async function enrichWithDealAndAthlete(
  sb: SupabaseClient,
  rows: ModerationRowWithSubmission[]
): Promise<ModeratedSubmissionView[]> {
  if (rows.length === 0) return [];

  const dealIds = Array.from(new Set(rows.map((r) => r.submission.deal_id)));
  const dealTitles = new Map<string, string | null>();

  try {
    const { data: deals } = await sb
      .from('deals')
      .select('id, title')
      .in('id', dealIds);
    for (const d of deals ?? []) {
      dealTitles.set(d.id as string, (d.title as string | null) ?? null);
    }
  } catch {
    // non-fatal
  }

  const athleteIds = Array.from(
    new Set(rows.map((r) => r.submission.submitted_by))
  );
  const athleteFirstNames = new Map<string, string | null>();

  try {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, first_name')
      .in('id', athleteIds);
    for (const p of profiles ?? []) {
      athleteFirstNames.set(
        p.id as string,
        (p.first_name as string | null) ?? null
      );
    }
  } catch {
    // non-fatal
  }

  return rows.map((row) => ({
    id: row.id,
    submission_id: row.submission_id,
    status: row.status,
    auto_confidence: row.auto_confidence,
    auto_categories: row.auto_categories,
    auto_reasons: row.auto_reasons,
    reviewer_user_id: row.reviewer_user_id,
    reviewer_notes: row.reviewer_notes,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    submission: {
      id: row.submission.id,
      deal_id: row.submission.deal_id,
      submitted_by: row.submission.submitted_by,
      submission_type: row.submission.submission_type,
      content_url: row.submission.content_url,
      storage_path: row.submission.storage_path,
      note: row.submission.note,
      platform: row.submission.platform,
      created_at: row.submission.created_at,
    },
    deal_title: dealTitles.get(row.submission.deal_id) ?? null,
    athlete_first_name:
      athleteFirstNames.get(row.submission.submitted_by) ?? null,
  }));
}

export async function listFlaggedForOps(
  limit = 50,
  offset = 0
): Promise<ModeratedSubmissionView[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deliverable_moderation_results')
    .select(
      `id, submission_id, status, auto_confidence, auto_categories, auto_reasons,
       reviewer_user_id, reviewer_notes, reviewed_at, created_at, updated_at,
       submission:deal_deliverable_submissions!inner(
         id, deal_id, submitted_by, submission_type, content_url, storage_path,
         note, platform, created_at
       )`
    )
    .in('status', ['flagged', 'ops_reviewing'])
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list flagged moderation rows: ${error.message}`);
  }

  const rows = (data as unknown as ModerationRowWithSubmission[]) ?? [];
  return enrichWithDealAndAthlete(sb, rows);
}

export async function countFlaggedForOps(): Promise<number> {
  const sb = getServiceRoleClient();
  const { count, error } = await sb
    .from('deliverable_moderation_results')
    .select('id', { count: 'exact', head: true })
    .in('status', ['flagged', 'ops_reviewing']);

  if (error) {
    throw new Error(`Failed to count flagged moderation rows: ${error.message}`);
  }
  return count ?? 0;
}

export async function getModerationById(
  moderationId: string
): Promise<ModeratedSubmissionView | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deliverable_moderation_results')
    .select(
      `id, submission_id, status, auto_confidence, auto_categories, auto_reasons,
       reviewer_user_id, reviewer_notes, reviewed_at, created_at, updated_at,
       submission:deal_deliverable_submissions!inner(
         id, deal_id, submitted_by, submission_type, content_url, storage_path,
         note, platform, created_at
       )`
    )
    .eq('id', moderationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load moderation row: ${error.message}`);
  }
  if (!data) return null;

  const enriched = await enrichWithDealAndAthlete(sb, [
    data as unknown as ModerationRowWithSubmission,
  ]);
  return enriched[0] ?? null;
}

// ---------------------------------------------------------------------------
// Human decide
// ---------------------------------------------------------------------------

export interface HumanDecideInput {
  moderationId: string;
  decision: 'approve' | 'reject';
  reviewerNotes: string | null;
  reviewerId: string;
}

export interface HumanDecideOk {
  ok: true;
  status: ModerationStatus;
}
export interface HumanDecideErr {
  ok: false;
  error: string;
  code: 'not_found' | 'invalid_state' | 'db_error';
}
export type HumanDecideResult = HumanDecideOk | HumanDecideErr;

export async function humanDecide(
  input: HumanDecideInput
): Promise<HumanDecideResult> {
  const notes = (input.reviewerNotes ?? '').trim();
  if (input.decision === 'reject' && notes.length < 10) {
    return {
      ok: false,
      error: 'Reviewer notes must be at least 10 characters on reject.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  const { data: existing, error: fetchErr } = await sb
    .from('deliverable_moderation_results')
    .select('id, status')
    .eq('id', input.moderationId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!existing) {
    return { ok: false, error: 'Moderation row not found.', code: 'not_found' };
  }

  // Only flagged / ops_reviewing / auto_approved rows can be human-decided.
  // human_approved / human_rejected rows are terminal until a rerun.
  const validFrom: ModerationStatus[] = [
    'flagged',
    'ops_reviewing',
    'auto_approved',
    'pending',
  ];
  if (!validFrom.includes(existing.status as ModerationStatus)) {
    return {
      ok: false,
      error: `Cannot decide on a row in status ${existing.status}.`,
      code: 'invalid_state',
    };
  }

  const nextStatus: ModerationStatus =
    input.decision === 'approve' ? 'human_approved' : 'human_rejected';

  const { error: updateErr } = await sb
    .from('deliverable_moderation_results')
    .update({
      status: nextStatus,
      reviewer_user_id: input.reviewerId,
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.moderationId);

  if (updateErr) {
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }

  return { ok: true, status: nextStatus };
}

// ---------------------------------------------------------------------------
// Rerun classifier
// ---------------------------------------------------------------------------

export interface RerunResult {
  ok: true;
  outcome: ModerateSubmissionOutcome;
}

export async function rerunForModeration(
  moderationId: string
): Promise<RerunResult> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deliverable_moderation_results')
    .select('id, submission_id')
    .eq('id', moderationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Moderation row not found for rerun.');
  }

  // Reset to pending before re-classifying so concurrent readers see the
  // transitional state.
  await sb
    .from('deliverable_moderation_results')
    .update({
      status: 'pending',
      reviewer_user_id: null,
      reviewer_notes: null,
      reviewed_at: null,
    })
    .eq('id', moderationId);

  const outcome = await moderateSubmission(data.submission_id as string);
  return { ok: true, outcome };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function moderationStatusLabel(status: ModerationStatus): string {
  switch (status) {
    case 'pending':
      return 'Reviewing…';
    case 'auto_approved':
      return 'Reviewed automatically';
    case 'flagged':
      return 'Under moderation review';
    case 'ops_reviewing':
      return 'Ops reviewing';
    case 'human_approved':
      return 'Approved by moderator';
    case 'human_rejected':
      return 'Rejected by moderator';
  }
}

/**
 * Role-aware label for the DeliverableItemCard badge. Athletes and brands see
 * a simplified story; ops sees the full machine state.
 */
export function moderationBadgeForRole(
  status: ModerationStatus,
  role: 'athlete' | 'brand' | 'admin'
): string {
  if (role === 'admin') return moderationStatusLabel(status);
  switch (status) {
    case 'pending':
      return 'Reviewing…';
    case 'auto_approved':
      return 'Reviewed automatically';
    case 'human_approved':
      return 'Reviewed';
    case 'flagged':
    case 'ops_reviewing':
      return 'Under moderation review';
    case 'human_rejected':
      return role === 'brand' ? 'Blocked by moderation' : 'Needs revision';
  }
}
