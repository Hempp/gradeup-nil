-- HS-to-College Bracket Transitions
-- ============================================================
-- Phase 8 / HS-to-college bridge.
--
-- Records an athlete's matriculation from high-school to college
-- and flips `athletes.bracket` from 'high_school' to 'college'
-- once an admin has verified the enrollment proof.
--
-- The `hs_athlete_profiles` row is NEVER deleted. It is the
-- historical source of truth for the athlete's pre-matriculation
-- academic narrative (verified GPA, school, sport, trajectory).
-- Post-transition the athletes row carries the current state
-- ('college'), while hs_athlete_profiles carries the story that
-- got them there. College-side features can read both.
--
-- Transition is one-way: no college -> HS reverse flow.
--
-- Existing HS deals are NOT re-bracketed. A deal signed under
-- target_bracket='high_school' stays HS for its entire lifecycle,
-- subject to parental-consent + state-disclosure + parent-custodial
-- payout rules that were in force at signing. Only NEW deals
-- created after the athletes row flips to 'college' are college-era.
--
-- TODO (not in this migration): automated enrollment verification
-- via National Student Clearinghouse / Parchment. This migration
-- creates the manual-review pipeline only.
-- ============================================================

-- ============================================================
-- 1. athlete_bracket_transitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.athlete_bracket_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  from_bracket text NOT NULL DEFAULT 'high_school'
    CHECK (from_bracket IN ('high_school')),
  to_bracket text NOT NULL DEFAULT 'college'
    CHECK (to_bracket IN ('college')),

  college_name text NOT NULL CHECK (char_length(college_name) BETWEEN 2 AND 200),
  college_state text NOT NULL CHECK (char_length(college_state) = 2),
  ncaa_division text NOT NULL
    CHECK (ncaa_division IN ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other')),
  matriculation_date date NOT NULL,
  sport_continued boolean NOT NULL DEFAULT true,

  enrollment_proof_storage_path text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'denied', 'cancelled')),
  denial_reason text,

  reviewer_user_id uuid REFERENCES auth.users(id),

  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- denial_reason must accompany a denial
  CHECK (
    status <> 'denied'
    OR (denial_reason IS NOT NULL AND char_length(denial_reason) >= 20)
  ),

  -- confirmed_at only set for terminal states
  CHECK (
    (status IN ('pending', 'cancelled') AND confirmed_at IS NULL)
    OR (status IN ('verified', 'denied') AND confirmed_at IS NOT NULL)
  )
);

-- One active transition per athlete — partial unique index covers both
-- pending and verified rows. Cancelled / denied rows are historical and
-- can coexist so an athlete can retry after a denial.
CREATE UNIQUE INDEX IF NOT EXISTS uq_athlete_bracket_transitions_active
  ON public.athlete_bracket_transitions (athlete_user_id)
  WHERE status IN ('pending', 'verified');

-- Ops queue index: newest first, pending only.
CREATE INDEX IF NOT EXISTS idx_athlete_bracket_transitions_pending
  ON public.athlete_bracket_transitions (requested_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_athlete_bracket_transitions_athlete
  ON public.athlete_bracket_transitions (athlete_user_id, requested_at DESC);

COMMENT ON TABLE public.athlete_bracket_transitions IS
  'HS-to-college matriculation records. hs_athlete_profiles row is preserved on verify; athletes.bracket flips to college.';
COMMENT ON COLUMN public.athlete_bracket_transitions.enrollment_proof_storage_path IS
  'Path inside the private `hs-enrollment-proofs` bucket. NULL until the athlete uploads proof.';

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.athlete_bracket_transitions ENABLE ROW LEVEL SECURITY;

-- Athlete: read own rows.
CREATE POLICY athlete_bracket_transitions_read_own
  ON public.athlete_bracket_transitions
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- Admin: read all. Mirrors the pattern used by admin_audit_log.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'athlete_bracket_transitions'
      AND policyname = 'athlete_bracket_transitions_admin_read'
  ) THEN
    CREATE POLICY athlete_bracket_transitions_admin_read
      ON public.athlete_bracket_transitions
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

-- No INSERT/UPDATE/DELETE policies for the anon/auth roles.
-- All writes flow through the service role (transitions.ts service
-- layer) which bypasses RLS. This keeps the bracket-flip path
-- tamper-evident from the browser.

-- ============================================================
-- 3. Private Storage bucket: hs-enrollment-proofs
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hs-enrollment-proofs', 'hs-enrollment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket RLS: athletes can INSERT/SELECT objects scoped to their own
-- user id prefix (`<user_id>/...`). Admins can SELECT any object.
-- Service role bypasses RLS for verification + deletion.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'hs_enrollment_proofs_athlete_insert'
  ) THEN
    CREATE POLICY hs_enrollment_proofs_athlete_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'hs-enrollment-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'hs_enrollment_proofs_athlete_select'
  ) THEN
    CREATE POLICY hs_enrollment_proofs_athlete_select
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'hs-enrollment-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'hs_enrollment_proofs_admin_select'
  ) THEN
    CREATE POLICY hs_enrollment_proofs_admin_select
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'hs-enrollment-proofs'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. admin_audit_log — extend action + target_kind CHECKs
-- ============================================================
--
-- The transition verify/deny admin actions need to log to the shared
-- audit trail. admin_audit_log was created in 20260418_012 with a
-- closed CHECK constraint; we drop + re-add to include the two new
-- action names and a new target_kind='athlete_transition'.
-- ============================================================

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'transition_verified',
    'transition_denied'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'athlete_transition'
  ));
