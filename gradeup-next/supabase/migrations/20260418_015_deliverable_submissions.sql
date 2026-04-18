-- HS-NIL Phase 7 — Athlete Deliverable Submissions
-- ============================================================
-- Owns the athlete side of the post-signing lifecycle. Once a
-- deal's contract is fully signed and the deal moves into the
-- delivery phase, the athlete submits proof of the work — a
-- social post URL, an image of the event, a text note, an
-- external link, or a receipt.
--
-- Scope for this migration:
--   1. deal_status enum extensions: 'fully_signed', 'in_delivery',
--      'in_review' (additive; guarded against duplicate adds).
--   2. deal_deliverable_submissions table + RLS.
--   3. hs-deliverables private storage bucket + storage.objects
--      policies so the athlete can upload and the brand can read.
--
-- Out of scope (owned by parallel agents):
--   * deal_approvals / brand review decisioning (BRAND-REVIEW)
--   * deal_disputes (DISPUTE-FLOW)
--   * completion metrics (COMPLETION-METRICS)
-- ============================================================

-- ============================================================
-- 1. Extend deal_status enum
-- ============================================================
-- The baseline enum from 20260216_004 has:
--   draft, pending, negotiating, accepted, active, completed,
--   cancelled, expired, rejected, paused
-- The post-signing lifecycle needs three new values. We guard
-- each with a lookup so this migration is idempotent and safe
-- to re-run. ADD VALUE IF NOT EXISTS is Postgres 14+; the DO
-- block below is portable back to 12.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'fully_signed'
      AND enumtypid = 'deal_status'::regtype
  ) THEN
    ALTER TYPE deal_status ADD VALUE 'fully_signed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'in_delivery'
      AND enumtypid = 'deal_status'::regtype
  ) THEN
    ALTER TYPE deal_status ADD VALUE 'in_delivery';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'in_review'
      AND enumtypid = 'deal_status'::regtype
  ) THEN
    ALTER TYPE deal_status ADD VALUE 'in_review';
  END IF;
END $$;

-- ============================================================
-- 2. deal_deliverable_submissions
-- ============================================================
-- One row per athlete proof upload. Multiple submissions per deal
-- are expected (initial + any re-submissions after a brand
-- revision request). Status is a plain text column with a CHECK;
-- we don't burn another enum because BRAND-REVIEW still needs
-- to evolve these values and shared enums make cross-agent
-- migration coordination messy.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deal_deliverable_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  submission_type text NOT NULL
    CHECK (submission_type IN (
      'social_post_url',
      'image_proof',
      'text_note',
      'external_link',
      'receipt'
    )),

  -- Exactly one of the three payload columns carries the proof.
  -- Images live in storage; everything else is a URL or text note.
  content_url  text,
  storage_path text,
  note         text,

  -- Optional social-post metadata. Only meaningful when
  -- submission_type = 'social_post_url'.
  platform text
    CHECK (platform IS NULL OR platform IN (
      'instagram','tiktok','twitter_x','linkedin','facebook','youtube','other'
    )),

  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','accepted','rejected','superseded')),

  -- Filled by the brand through BRAND-REVIEW's update endpoint.
  -- Readable by the athlete so a rejection comes with context.
  review_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- At least one payload column must be present.
  CONSTRAINT deal_deliverable_submissions_has_payload
    CHECK (content_url IS NOT NULL OR storage_path IS NOT NULL OR note IS NOT NULL)
);

-- Main listing query: deal-scoped, newest first.
CREATE INDEX IF NOT EXISTS idx_deal_deliverable_submissions_deal
  ON public.deal_deliverable_submissions(deal_id, created_at DESC);

-- Per-athlete lookup (e.g., "my submissions across all deals").
CREATE INDEX IF NOT EXISTS idx_deal_deliverable_submissions_submitter
  ON public.deal_deliverable_submissions(submitted_by, created_at DESC);

COMMENT ON TABLE public.deal_deliverable_submissions IS
  'Athlete-submitted proof that a deal deliverable has been completed. Brand reviews these via BRAND-REVIEW APIs to release payout.';
COMMENT ON COLUMN public.deal_deliverable_submissions.storage_path IS
  'Object key inside the private hs-deliverables bucket, shape deal-{deal_id}/{submission_id}/{filename}.';
COMMENT ON COLUMN public.deal_deliverable_submissions.review_notes IS
  'Brand-authored notes visible to the athlete when a submission is rejected.';

-- ============================================================
-- 3. Row Level Security
-- ============================================================

ALTER TABLE public.deal_deliverable_submissions ENABLE ROW LEVEL SECURITY;

-- Athlete on the deal can SELECT their own deal's submissions.
-- Join path: deal_deliverable_submissions.deal_id -> deals.athlete_id
-- -> athletes.profile_id = auth.uid().
CREATE POLICY deal_deliverable_submissions_athlete_read
  ON public.deal_deliverable_submissions
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- Brand on the deal can SELECT (for the brand review page).
-- Join path: deal -> brand -> profile_id.
CREATE POLICY deal_deliverable_submissions_brand_read
  ON public.deal_deliverable_submissions
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- Athlete can INSERT a submission for a deal they're the athlete on.
-- Status must be 'submitted' and review fields must be empty at
-- insert time — brand-authored review state is service-role only.
CREATE POLICY deal_deliverable_submissions_athlete_insert
  ON public.deal_deliverable_submissions
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND status = 'submitted'
    AND review_notes IS NULL
    AND deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- No public UPDATE / DELETE policies. Status transitions, review
-- notes, and supersede flips flow through BRAND-REVIEW's
-- service-role endpoint.

-- ============================================================
-- 4. Storage bucket: hs-deliverables (private)
-- ============================================================
-- Private bucket. Uploads go through the server route (auth
-- verified there); reads use signed URLs minted server-side.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hs-deliverables', 'hs-deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies. Path convention: deal-{deal_id}/{submission_id}/{filename}
-- The first path segment is "deal-<uuid>"; we parse that to the deal id
-- and join through deals/athletes/brands to authorize.

-- Athlete can INSERT (upload) objects into their deal's prefix.
CREATE POLICY hs_deliverables_athlete_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hs-deliverables'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT 'deal-' || d.id::text
        FROM public.deals d
        JOIN public.athletes a ON a.id = d.athlete_id
        WHERE a.profile_id = auth.uid()
      )
    )
  );

-- Athlete can SELECT their own deal's objects (for preview).
CREATE POLICY hs_deliverables_athlete_read
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hs-deliverables'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT 'deal-' || d.id::text
        FROM public.deals d
        JOIN public.athletes a ON a.id = d.athlete_id
        WHERE a.profile_id = auth.uid()
      )
    )
  );

-- Brand can SELECT their deal's objects (for review). Reads go
-- through signed URLs server-side in practice, but the policy
-- still locks out cross-brand snooping at the RLS layer.
CREATE POLICY hs_deliverables_brand_read
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hs-deliverables'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT 'deal-' || d.id::text
        FROM public.deals d
        JOIN public.brands b ON b.id = d.brand_id
        WHERE b.profile_id = auth.uid()
      )
    )
  );

-- No UPDATE/DELETE storage policies: supersede semantics are
-- row-level, not object-level. Service role retains full access.
