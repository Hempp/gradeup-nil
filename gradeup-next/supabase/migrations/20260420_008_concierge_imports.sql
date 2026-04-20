-- HS-NIL Concierge Imports (Phase 16)
-- ============================================================
-- Bulk import path for hand-sourced pilot cohorts. The pilot's
-- first 20 CA parent+athlete pairs are the initial use case,
-- but the schema is generic enough to serve every future pilot
-- state we stand up.
--
-- Shape:
--   * concierge_import_batches — one row per CSV upload by an
--     admin. Acts as a container + audit envelope around the
--     per-row work.
--   * concierge_import_rows    — one row per CSV line.
--     raw_row preserves the original input verbatim (so we can
--     reproduce errors long after the CSV file is gone). The
--     `created_*` columns capture the side effects of a
--     successful apply; `apply_error` captures the failure so
--     an admin can retry a subset of rows without touching the
--     rest.
--
-- Idempotency model:
--   apply_* is driven by `applied_at` + `apply_error`:
--     row.applied_at IS NULL                    → never tried
--     row.applied_at IS NOT NULL, no apply_error → done, skip
--     row.applied_at IS NOT NULL, apply_error   → failed, retry
--   Re-running apply is safe — rows already done are skipped.
--
-- Per-row atomicity, NOT per-batch:
--   Row 5 failing does not roll back rows 1-4 or block rows
--   6-20. Partial failures bubble up through `failed_count`
--   and admin reviews the per-row apply_error afterwards.
--
-- Audit trail:
--   Every successful batch apply writes one admin_audit_log
--   row with action='concierge_import_applied' + metadata
--   { batchId, succeeded, failed }.
--
-- RLS posture:
--   * SELECT — admin role only. Non-admins can never see the
--     existence of a batch, let alone the parents in it.
--   * INSERT batches — admin auth-JWT only, via the authenticated
--     supabase client (the actor_user_id check ties the row to
--     the inserting admin).
--   * All row-level writes (concierge_import_rows mutation,
--     created_* columns, applied_at, apply_error, status
--     transitions) go through the service-role client in
--     src/lib/hs-nil/concierge-import.ts. No client-side
--     UPDATE / DELETE policy exists, so a compromised admin
--     session cannot forge a "row already applied" state.
--
-- CSV schema (documented here as the canonical reference):
--   athlete_first_name, athlete_last_name, athlete_email, athlete_dob,
--   athlete_sport, athlete_school, athlete_grade_year, athlete_claimed_gpa,
--   parent_first_name, parent_last_name, parent_email, parent_phone,
--   parent_relationship,
--   consent_scope_categories (comma-separated: apparel|food_beverage|
--     local_business|training|autograph|social_media_promo),
--   consent_max_deal_cents, consent_duration_months,
--   notes
--
-- Column semantics:
--   * *_dob: YYYY-MM-DD. Minor / adult inference is done in code.
--   * athlete_claimed_gpa: decimal 0..5. Stored as self-reported;
--     the existing transcript-review queue will verify it later.
--   * consent_scope_categories: comma-separated enum values. Code
--     maps these onto parental_consents.scope.deal_categories.
--   * consent_max_deal_cents: integer ≥ 1. 100 = $1.
--   * consent_duration_months: 1..24.
--   * parent_relationship: 'parent' OR 'legal_guardian'.
--   * notes: free-form per-row note surfaced to the admin in the
--     preview UI (e.g., "referred by Coach X").
-- ============================================================

-- ------------------------------------------------------------
-- concierge_import_batches
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.concierge_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  filename text NOT NULL,
  pilot_state_code text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'previewing',
    'applying',
    'completed',
    'partial_failure',
    'cancelled'
  )),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_concierge_import_batches_recent
  ON public.concierge_import_batches (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_concierge_import_batches_actor
  ON public.concierge_import_batches (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_concierge_import_batches_status
  ON public.concierge_import_batches (status)
  WHERE status IN ('pending', 'previewing', 'applying');

ALTER TABLE public.concierge_import_batches ENABLE ROW LEVEL SECURITY;

-- SELECT: admins only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'concierge_import_batches'
      AND policyname = 'concierge_import_batches_admin_read'
  ) THEN
    CREATE POLICY concierge_import_batches_admin_read
      ON public.concierge_import_batches
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- INSERT: an admin may insert a batch but only if actor_user_id is
-- themselves. All subsequent writes go through the service role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'concierge_import_batches'
      AND policyname = 'concierge_import_batches_admin_insert_self'
  ) THEN
    CREATE POLICY concierge_import_batches_admin_insert_self
      ON public.concierge_import_batches
      FOR INSERT
      WITH CHECK (
        actor_user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

COMMENT ON TABLE public.concierge_import_batches IS
  'Per-upload container for admin CSV concierge-import batches. Service-role writes row-level mutations; admins SELECT + INSERT their own envelopes via RLS.';
COMMENT ON COLUMN public.concierge_import_batches.pilot_state_code IS
  'USPS code for the pilot state this cohort targets. Enforced to a pilot state in code at validation time.';

-- ------------------------------------------------------------
-- concierge_import_rows
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.concierge_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.concierge_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_row jsonb NOT NULL,
  validation_errors text[] NOT NULL DEFAULT ARRAY[]::text[],
  validation_status text NOT NULL CHECK (validation_status IN ('valid', 'invalid')),
  created_athlete_user_id uuid REFERENCES auth.users(id),
  created_parent_user_id uuid REFERENCES auth.users(id),
  created_athlete_profile_id uuid,
  created_parent_profile_id uuid,
  created_link_id uuid,
  created_consent_id uuid,
  applied_at timestamptz,
  apply_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_concierge_import_rows_batch_rownum
  ON public.concierge_import_rows (batch_id, row_number);

CREATE INDEX IF NOT EXISTS idx_concierge_import_rows_pending
  ON public.concierge_import_rows (batch_id)
  WHERE applied_at IS NULL AND validation_status = 'valid';

ALTER TABLE public.concierge_import_rows ENABLE ROW LEVEL SECURITY;

-- SELECT: admins only. Mirrors the parent batch read policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'concierge_import_rows'
      AND policyname = 'concierge_import_rows_admin_read'
  ) THEN
    CREATE POLICY concierge_import_rows_admin_read
      ON public.concierge_import_rows
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- No INSERT / UPDATE / DELETE policy: service role only.

COMMENT ON TABLE public.concierge_import_rows IS
  'Per-CSV-row record within a concierge import batch. raw_row preserves the original input for audit; created_* columns capture applied side effects. Idempotent re-apply keyed on applied_at + apply_error.';
COMMENT ON COLUMN public.concierge_import_rows.raw_row IS
  'Original CSV row as a JSON object keyed by column name. Verbatim — do not mutate.';
COMMENT ON COLUMN public.concierge_import_rows.validation_errors IS
  'All per-row validation failures. Non-empty iff validation_status=invalid.';
COMMENT ON COLUMN public.concierge_import_rows.apply_error IS
  'Terminal error message if the apply step failed. NULL after a successful apply.';

-- ------------------------------------------------------------
-- admin_audit_log — extend action CHECK with concierge_import_applied
-- ------------------------------------------------------------
-- We follow the established pattern (see 20260419_003, 20260419_010,
-- 20260419_011, 20260420_003, 20260420_005): DROP + re-ADD the
-- closed CHECK constraint, preserving the full set of actions that
-- exists today and adding the new one on the end. Conservatively
-- preserve every action/target-kind that any prior migration added;
-- we do NOT want to silently demote a prior extension.
-- ------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'referral_tier_force_grant',
    'transition_verified',
    'transition_denied',
    'bulk_disclosure_retry',
    'bulk_payout_resolve',
    'bulk_link_verify',
    'bulk_consent_renewal',
    'regulatory_change_reviewed',
    'transcript_ocr_reprocessed',
    'deferred_release_forced',
    'concierge_import_applied'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'transition',
    'regulatory_change',
    'transcript_submission',
    'deferred_payout',
    'concierge_import_batch'
  ));
