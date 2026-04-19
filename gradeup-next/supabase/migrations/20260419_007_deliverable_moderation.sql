-- HS-NIL Phase 10 — Deliverable Moderation Results
-- ============================================================
-- Every athlete deliverable (image proof, social URL, text note,
-- external link, receipt) must clear a moderation pass before the
-- brand gets notified. The moderation pass catches school-IP
-- infringements (logos, mascots, uniforms), banned-category
-- associations (gambling, alcohol, tobacco, cannabis, weapons,
-- adult content), and obvious NCAA/state-association violations.
--
-- Flow:
--   1. Athlete submits deliverable → deal_deliverable_submissions row.
--   2. Service fires `moderateSubmission(id)` best-effort. Classifier
--      writes a deliverable_moderation_results row — 'auto_approved'
--      on clean high-confidence text, 'flagged' on any match or on
--      image submissions (human review default).
--   3. Ops reviews flagged items in /hs/admin/moderation and decides
--      approve / reject via the admin-actions API.
--
-- This migration is additive. The existing deliverable submission
-- flow in 20260418_015 is untouched.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deliverable_moderation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE
    REFERENCES public.deal_deliverable_submissions(id) ON DELETE CASCADE,

  -- Lifecycle status. See src/lib/hs-nil/moderation.ts for transitions.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'auto_approved',
      'flagged',
      'ops_reviewing',
      'human_approved',
      'human_rejected'
    )),

  -- 0.0 .. 1.0 confidence that the content is clean. Lower = more
  -- suspicious. Writes are service-role only so we don't constrain
  -- the range beyond the column type.
  auto_confidence numeric,

  -- What the classifier found. Both arrays are human-readable.
  --   auto_categories e.g. {'gambling','school_ip'}
  --   auto_reasons    e.g. {"Matched term 'Bears' (school mascot) in note"}
  auto_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  auto_reasons    text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Set when a human (ops) decides.
  reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes   text,
  reviewed_at      timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deliverable_moderation_results IS
  'One row per deal_deliverable_submissions row. Classifier writes on submit; ops overrides via admin actions.';
COMMENT ON COLUMN public.deliverable_moderation_results.auto_confidence IS
  'Classifier-reported confidence in range [0,1] that the content is clean. Null until classifier runs.';
COMMENT ON COLUMN public.deliverable_moderation_results.auto_categories IS
  'Triggered banned-categories or school_ip/school_mascot/etc. Free-form labels from the classifier.';

-- Ops queue index — only flagged / ops_reviewing rows are hot.
CREATE INDEX IF NOT EXISTS idx_deliverable_moderation_ops_queue
  ON public.deliverable_moderation_results(status, created_at DESC)
  WHERE status IN ('flagged','ops_reviewing');

-- submission_id already UNIQUE; an explicit index speeds joins from
-- the submission side (athlete/brand views).
CREATE INDEX IF NOT EXISTS idx_deliverable_moderation_submission
  ON public.deliverable_moderation_results(submission_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.deliverable_moderation_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deliverable_moderation_set_updated_at
  ON public.deliverable_moderation_results;
CREATE TRIGGER deliverable_moderation_set_updated_at
  BEFORE UPDATE ON public.deliverable_moderation_results
  FOR EACH ROW
  EXECUTE FUNCTION public.deliverable_moderation_touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.deliverable_moderation_results ENABLE ROW LEVEL SECURITY;

-- The submission's athlete can read their own row (via submitted_by).
CREATE POLICY deliverable_moderation_athlete_read
  ON public.deliverable_moderation_results
  FOR SELECT USING (
    submission_id IN (
      SELECT s.id
      FROM public.deal_deliverable_submissions s
      JOIN public.deals d ON d.id = s.deal_id
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- The deal's brand can read their submissions' moderation.
CREATE POLICY deliverable_moderation_brand_read
  ON public.deliverable_moderation_results
  FOR SELECT USING (
    submission_id IN (
      SELECT s.id
      FROM public.deal_deliverable_submissions s
      JOIN public.deals d ON d.id = s.deal_id
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- Admins see everything.
CREATE POLICY deliverable_moderation_admin_read
  ON public.deliverable_moderation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- No public INSERT / UPDATE / DELETE — service role owns writes.
