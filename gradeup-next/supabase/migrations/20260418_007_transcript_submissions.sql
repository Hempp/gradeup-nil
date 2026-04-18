-- HS-NIL Tier B — User-Submitted Transcript Submissions
-- ============================================================
-- Adds the review queue table for the second GPA verification
-- tier. Athletes upload a transcript PDF/image; the submission
-- sits in 'pending_review' until ops (service role) approves,
-- rejects, or requests a resubmission. On approval, the
-- reviewer writes approved_gpa into hs_athlete_profiles and
-- bumps the verification tier from 'self_reported' to
-- 'user_submitted'.
--
-- Design notes:
--   * `storage_path` points at the `hs-transcripts` bucket
--     (created below). The bucket is private; downloads go
--     through a signed-URL service-role endpoint.
--   * RLS: the athlete can read + insert their own rows.
--     They CANNOT update. State transitions happen only via
--     the service role (ops review API).
--   * File size is capped at 10MB in the column check; the
--     upload route enforces the same limit before the row
--     is inserted. MIME type is similarly constrained.
--   * Optional `athlete_visible_note` lives alongside the
--     private `reviewer_notes` so ops can ship a short,
--     athlete-safe message on rejection without exposing
--     internal review text.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transcript_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  file_size_bytes int NOT NULL
    CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  mime_type text NOT NULL
    CHECK (mime_type IN ('application/pdf','image/png','image/jpeg')),
  claimed_gpa numeric(3,2) NOT NULL
    CHECK (claimed_gpa >= 0 AND claimed_gpa <= 5.0),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','resubmission_requested')),
  reviewer_user_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  athlete_visible_note text,
  approved_gpa numeric(3,2)
    CHECK (approved_gpa IS NULL OR (approved_gpa >= 0 AND approved_gpa <= 5.0)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ops queue index: newest-first list of pending submissions.
-- Partial index keeps it tight — only the rows ops needs to act on.
CREATE INDEX IF NOT EXISTS idx_transcript_submissions_pending_queue
  ON public.transcript_submissions(status, created_at DESC)
  WHERE status = 'pending_review';

-- Athlete-lookup index: per-user history of submissions.
CREATE INDEX IF NOT EXISTS idx_transcript_submissions_athlete
  ON public.transcript_submissions(athlete_user_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.transcript_submissions ENABLE ROW LEVEL SECURITY;

-- Athlete can read their own submissions (to surface status in UI).
CREATE POLICY transcript_submissions_read_own ON public.transcript_submissions
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- Athlete can insert a new submission for themselves. The API
-- layer sets status='pending_review' and leaves reviewer fields
-- null; RLS enforces they can't claim to be reviewers either.
CREATE POLICY transcript_submissions_insert_own ON public.transcript_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = athlete_user_id
    AND status = 'pending_review'
    AND reviewer_user_id IS NULL
    AND reviewed_at IS NULL
    AND approved_gpa IS NULL
  );

-- No public UPDATE or DELETE — review state transitions happen
-- only via the service role (ops review API).

-- ============================================================
-- Storage bucket for transcripts
-- ============================================================
-- Private bucket. Anyone uploading goes through the server
-- route (service role); anyone reading goes through a signed
-- URL. We do NOT want athlete transcripts publicly readable.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hs-transcripts', 'hs-transcripts', false)
ON CONFLICT (id) DO NOTHING;
