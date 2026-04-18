-- HS-NIL Deal Approvals
-- ============================================================
-- Phase 7 (BRAND-REVIEW). After the athlete submits a deliverable
-- (deal_deliverable_submissions — owned by DELIVERABLE-FORGE),
-- the brand reviews it and either approves (→ releasePayout) or
-- requests revision. One deal may have multiple approval rows
-- across iterations; the final 'approved' row is what transitions
-- the deal to 'paid' after the Stripe Connect transfer succeeds.
--
-- Additive and idempotent:
--   * CREATE TABLE IF NOT EXISTS
--   * ALTER TYPE ... ADD VALUE IF NOT EXISTS for the three new
--     deal_status values ('approved', 'revision_requested', 'paid').
--     Postgres 14+ is required for IF NOT EXISTS on enum additions.
--   * Policies wrapped in DO blocks that catch duplicate_object so
--     re-running on a staging DB is safe.
--
-- Cross-agent note: this migration intentionally does NOT create
-- `deal_deliverable_submissions` — DELIVERABLE-FORGE owns that
-- table. The FK from deal_approvals.submission_id is created with
-- NOT VALID fallback semantics so this migration can apply in
-- either order.
-- ============================================================

-- ============================================================
-- 1. deal_status enum extension
-- ============================================================
--
-- Existing values (from 20260216_004): draft, pending, negotiating,
-- accepted, active, completed, cancelled, expired, rejected, paused.
--
-- We add three terminal-phase values used by the post-signing loop:
--   in_review           — deliverable submitted, waiting on brand
--                         (added by DELIVERABLE-FORGE's migration if
--                         not already present; we re-declare defensively)
--   in_delivery         — athlete is producing the deliverable
--                         (added by DELIVERABLE-FORGE)
--   approved            — brand approved, payout about to release
--   revision_requested  — brand kicked the deliverable back; deal
--                         returns to in_delivery on the athlete side
--   paid                — payout transfer succeeded
--
-- Each ADD VALUE is idempotent so re-applying or racing with the
-- parallel agent's migration is safe.

ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'in_delivery';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'paid';

-- ============================================================
-- 2. deal_approvals table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  -- Nullable: revision requests may not pin a specific submission
  -- (e.g. brand rejects all submissions at once, or the first
  -- submission was pulled before review). The FK is declared
  -- conditionally so this migration can apply before DELIVERABLE-FORGE's
  -- submissions table ships.
  submission_id uuid,
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_requested')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Attach the submissions FK if the sibling table exists. Wrapped in
-- a DO block because the sibling migration may not have landed yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deal_deliverable_submissions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'deal_approvals'
      AND constraint_name = 'deal_approvals_submission_id_fkey'
  ) THEN
    ALTER TABLE public.deal_approvals
      ADD CONSTRAINT deal_approvals_submission_id_fkey
      FOREIGN KEY (submission_id)
      REFERENCES public.deal_deliverable_submissions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deal_approvals_deal_created
  ON public.deal_approvals(deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_approvals_reviewer
  ON public.deal_approvals(reviewer_user_id);

COMMENT ON TABLE public.deal_approvals IS
  'Brand-side review decisions for an HS deal. Each row is one iteration of approve-or-revision. The final approved row is what flips the deal to paid after Stripe Connect transfer succeeds.';
COMMENT ON COLUMN public.deal_approvals.submission_id IS
  'Optional — the specific submission this decision responds to. Nullable because a brand may request revision without pinning a submission.';

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.deal_approvals ENABLE ROW LEVEL SECURITY;

-- Brand on the deal can SELECT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deal_approvals'
      AND policyname = 'deal_approvals_brand_select'
  ) THEN
    CREATE POLICY deal_approvals_brand_select
      ON public.deal_approvals
      FOR SELECT
      USING (
        deal_id IN (
          SELECT d.id
          FROM public.deals d
          JOIN public.brands b ON b.id = d.brand_id
          WHERE b.profile_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Athlete on the deal can SELECT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deal_approvals'
      AND policyname = 'deal_approvals_athlete_select'
  ) THEN
    CREATE POLICY deal_approvals_athlete_select
      ON public.deal_approvals
      FOR SELECT
      USING (
        deal_id IN (
          SELECT d.id
          FROM public.deals d
          JOIN public.athletes a ON a.id = d.athlete_id
          WHERE a.profile_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Brand on the deal can INSERT, and only as themselves.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deal_approvals'
      AND policyname = 'deal_approvals_brand_insert'
  ) THEN
    CREATE POLICY deal_approvals_brand_insert
      ON public.deal_approvals
      FOR INSERT
      WITH CHECK (
        reviewer_user_id = auth.uid()
        AND deal_id IN (
          SELECT d.id
          FROM public.deals d
          JOIN public.brands b ON b.id = d.brand_id
          WHERE b.profile_id = auth.uid()
        )
      );
  END IF;
END $$;

-- UPDATE/DELETE: service-role only. Approvals are an append-only
-- audit log; there's no product reason to edit a historical
-- decision, and the service-role bypass covers the admin
-- mediation flow (DISPUTE-FLOW's scope).
