-- HS-NIL Tier B — Transcript OCR Results
-- ============================================================
-- Provider-agnostic OCR results for user-submitted transcripts.
-- Phase 3 shipped the Tier B upload + ops-review queue with a
-- human-eyeball approval flow. This migration adds the storage
-- layer real OCR writes land in so we can confidence-gate auto
-- approval when the extracted GPA matches the athlete's claim.
--
-- Flow:
--   1. Athlete uploads transcript → transcript_submissions row.
--   2. Service fires runOcrForSubmission(id) best-effort. The
--      OCR provider (openai_vision / google_vision / stub) writes
--      a transcript_ocr_results row. On failure, `error` is set
--      and the row still lands — ops can see the OCR attempt.
--   3. confidenceGatedAutoApproval(id) reads the row. If
--      confidence >= 0.90 AND extracted_gpa is within ±0.05 of
--      claimed_gpa (after scale normalisation), the submission
--      auto-approves. Otherwise it stays in the manual queue with
--      OCR metadata visible to ops.
--   4. Admin-triggered reprocess marks the old row superseded_at
--      and inserts a fresh row. `submission_id` is UNIQUE on the
--      subset of rows where superseded_at IS NULL — enforces the
--      "one active OCR pass per submission" invariant without
--      blocking re-runs.
--
-- RLS:
--   * athlete SELECT — via submission join (own submissions).
--   * admin SELECT   — all rows.
--   * service-role   — bypasses RLS for writes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transcript_ocr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL
    REFERENCES public.transcript_submissions(id) ON DELETE CASCADE,

  -- Which adapter produced this result.
  provider text NOT NULL
    CHECK (provider IN ('stub','openai_vision','google_vision')),

  -- Extracted values. All nullable so a failed OCR still records
  -- an audit row with `error` set and the extractions blank.
  extracted_gpa numeric(3,2)
    CHECK (extracted_gpa IS NULL OR (extracted_gpa >= 0 AND extracted_gpa <= 5.0)),
  extracted_gpa_scale numeric(3,2)
    CHECK (extracted_gpa_scale IS NULL OR extracted_gpa_scale IN (4.0, 5.0)),
  extracted_term text,

  -- Provider-reported confidence in [0, 1]. Writes are service-role
  -- only so we don't constrain range beyond column type + CHECK.
  confidence numeric
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Full provider response for audit + future tuning of parsing.
  raw_extraction jsonb NOT NULL DEFAULT '{}'::jsonb,

  processing_time_ms int
    CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),

  -- Populated only when the OCR pass failed. If set, extracted_*
  -- and confidence are all NULL and raw_extraction may be empty.
  error text,

  -- Supersession lets admin reprocess without losing history. The
  -- unique partial index below keeps the invariant that exactly
  -- one non-superseded row exists per submission.
  superseded_at timestamptz,

  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Exactly one active (non-superseded) OCR row per submission.
-- Partial unique index accomplishes the "UNIQUE on submission_id
-- when current" invariant while permitting history rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transcript_ocr_active_unique
  ON public.transcript_ocr_results (submission_id)
  WHERE superseded_at IS NULL;

-- Lookup by submission (covers superseded history reads too).
CREATE INDEX IF NOT EXISTS idx_transcript_ocr_by_submission
  ON public.transcript_ocr_results (submission_id, processed_at DESC);

-- Low-confidence triage — hot path for ops dashboards / cron.
CREATE INDEX IF NOT EXISTS idx_transcript_ocr_low_confidence
  ON public.transcript_ocr_results (confidence, processed_at DESC)
  WHERE superseded_at IS NULL AND confidence IS NOT NULL AND confidence < 0.90;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.transcript_ocr_results ENABLE ROW LEVEL SECURITY;

-- Athlete can read OCR results for their own submissions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transcript_ocr_results'
      AND policyname = 'transcript_ocr_results_athlete_read'
  ) THEN
    CREATE POLICY transcript_ocr_results_athlete_read
      ON public.transcript_ocr_results
      FOR SELECT USING (
        submission_id IN (
          SELECT id FROM public.transcript_submissions
          WHERE athlete_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admins see everything.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transcript_ocr_results'
      AND policyname = 'transcript_ocr_results_admin_read'
  ) THEN
    CREATE POLICY transcript_ocr_results_admin_read
      ON public.transcript_ocr_results
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- No INSERT / UPDATE / DELETE policies — service role bypasses RLS
-- and is the only legitimate writer.

COMMENT ON TABLE public.transcript_ocr_results IS
  'Provider-agnostic OCR results for transcript_submissions. One active row per submission (partial unique index on submission_id where superseded_at IS NULL).';
COMMENT ON COLUMN public.transcript_ocr_results.provider IS
  'Which adapter produced this row: stub | openai_vision | google_vision.';
COMMENT ON COLUMN public.transcript_ocr_results.extracted_gpa_scale IS
  'Detected scale: 4.0 (unweighted) or 5.0 (weighted). Used to normalise to 4.0 before comparing to claimed_gpa.';
COMMENT ON COLUMN public.transcript_ocr_results.raw_extraction IS
  'Full provider response blob for audit + future prompt/parse tuning.';
COMMENT ON COLUMN public.transcript_ocr_results.superseded_at IS
  'Set when a newer OCR row is written for the same submission (admin reprocess). NULL = current row.';

-- ============================================================
-- admin_audit_log — extend action + target_kind CHECKs
-- ============================================================
-- The admin transcript-reprocess action writes to admin_audit_log.
-- Extend the (closed) CHECK constraint to allow the new action
-- name and target_kind. Each migration that adds actions follows
-- this drop+re-add pattern (see 20260419_003_bracket_transitions
-- and 20260420_003_regulatory_monitoring).
-- ============================================================

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'transcript_ocr_reprocessed'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'transcript_submission'
  ));
