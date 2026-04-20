-- HS-NIL Phase 15 — Post-Waitlist Nurture Sequences
-- ============================================================
-- The waitlist-to-invite gap can stretch weeks. Without a nurture
-- drip, signups go cold before their state pilot activates. This
-- migration adds the scaffolding for role-scoped email sequences
-- that fire on a daily cron and self-suppress on conversion.
--
-- Design:
--   * Sequence *definitions* are seeded rows with a jsonb `steps`
--     array. Subject/body templates in the migration are marketing
--     placeholders — the actual copy lives in code
--     (src/lib/services/hs-nil/nurture-emails.ts) so marketing can
--     iterate without a DB migration.
--   * Enrollments are keyed by an opaque `user_or_waitlist_ref`
--     text column: 'waitlist:<uuid>' for pre-signup, 'user:<uuid>'
--     once they convert. Lets us keep a single row across the
--     conversion transition.
--   * Conversion is the canonical suppression trigger — the
--     reconcileSignupToWaitlist hook calls suppressEnrollment so a
--     converted user never gets another nurture email.
--   * unsubscribe_token is opaque + unique; the public unsubscribe
--     page reads it once and sets status='unsubscribed' forever.
--
-- Depends on:
--   * 20260418_003_hs_waitlist.sql
--   * 20260418_013_waitlist_activation.sql

-- ─────────────────────────────────────────────────────────────────
-- 1. nurture_sequence_definitions
-- ─────────────────────────────────────────────────────────────────
-- text PK so sequence ids are human-readable across logs and code
-- references (e.g. 'athlete_intro_v1').

CREATE TABLE IF NOT EXISTS public.nurture_sequence_definitions (
  id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('hs_athlete','hs_parent','coach','brand')),
  version int NOT NULL DEFAULT 1,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nurture_sequence_definitions IS
  'Post-waitlist nurture sequence blueprints. steps is an array of { day_offset, template_key, subject_template, body_template }; the template_key is the canonical hook the nurture-emails module switches on.';

ALTER TABLE public.nurture_sequence_definitions ENABLE ROW LEVEL SECURITY;

-- Definitions are harmless to expose to authenticated users (admin
-- UI reads them). Anon cannot read.
DROP POLICY IF EXISTS nurture_sequence_definitions_read_auth
  ON public.nurture_sequence_definitions;
CREATE POLICY nurture_sequence_definitions_read_auth
  ON public.nurture_sequence_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Service-role writes only.

-- Seed definitions — copy-light placeholders; real body lives in code.
INSERT INTO public.nurture_sequence_definitions
  (id, role, version, steps, active, description)
VALUES
  (
    'athlete_intro_v1',
    'hs_athlete',
    1,
    '[
      {"day_offset":1,"template_key":"athlete_day1_welcome","subject_template":"You''re on the list — your scholar-athlete story is starting","body_template":"code"},
      {"day_offset":3,"template_key":"athlete_day3_how_nil_works","subject_template":"How NIL actually works for HS athletes","body_template":"code"},
      {"day_offset":7,"template_key":"athlete_day7_spotlight","subject_template":"Real athlete spotlight: first NIL deal signed","body_template":"code"},
      {"day_offset":14,"template_key":"athlete_day14_state_rules","subject_template":"Your state''s rules + what you can (and can''t) sign","body_template":"code"},
      {"day_offset":30,"template_key":"athlete_day30_pilot_live","subject_template":"Pilot is live — sign up now","body_template":"code"}
    ]'::jsonb,
    true,
    'Athlete onboarding nurture — welcome, education, spotlight, state rules, pilot activation.'
  ),
  (
    'parent_awareness_v1',
    'hs_parent',
    1,
    '[
      {"day_offset":1,"template_key":"parent_day1_welcome","subject_template":"Welcome to the GradeUp HS waitlist — here''s what''s next","body_template":"code"},
      {"day_offset":3,"template_key":"parent_day3_consent","subject_template":"What verified parental consent actually means","body_template":"code"},
      {"day_offset":7,"template_key":"parent_day7_case_study","subject_template":"How pilot-state parents prepare for NIL","body_template":"code"},
      {"day_offset":14,"template_key":"parent_day14_state_update","subject_template":"Your state''s rules — what applies to your athlete","body_template":"code"},
      {"day_offset":30,"template_key":"parent_day30_activation","subject_template":"Your pilot state is opening — your spot is ready","body_template":"code"}
    ]'::jsonb,
    true,
    'Parent/guardian nurture focused on safety, consent clarity, and state-specific rules.'
  ),
  (
    'coach_intro_v1',
    'coach',
    1,
    '[
      {"day_offset":1,"template_key":"coach_day1_welcome","subject_template":"Welcome — roster-level NIL visibility is coming","body_template":"code"},
      {"day_offset":3,"template_key":"coach_day3_compliance","subject_template":"How we keep your program NCAA- and state-compliant","body_template":"code"},
      {"day_offset":7,"template_key":"coach_day7_case_study","subject_template":"How one AD used GradeUp to monitor team NIL activity","body_template":"code"},
      {"day_offset":14,"template_key":"coach_day14_state_rules","subject_template":"Your state''s disclosure rules — what coaches need to know","body_template":"code"},
      {"day_offset":30,"template_key":"coach_day30_activation","subject_template":"Pilot is opening in your state — activate your coach seat","body_template":"code"}
    ]'::jsonb,
    true,
    'Coach nurture focused on team-level impact, compliance reassurance, and roster visibility.'
  ),
  (
    'brand_intro_v1',
    'brand',
    1,
    '[
      {"day_offset":1,"template_key":"brand_day1_welcome","subject_template":"Welcome — here''s how HS NIL inventory works","body_template":"code"},
      {"day_offset":3,"template_key":"brand_day3_roi","subject_template":"Why scholar-athlete campaigns outperform general HS influencer buys","body_template":"code"},
      {"day_offset":7,"template_key":"brand_day7_vertical","subject_template":"Vertical spotlight: how this category wins with HS athletes","body_template":"code"},
      {"day_offset":14,"template_key":"brand_day14_fmv","subject_template":"Your state''s rules + the FMV tool you''ll use to price deals","body_template":"code"},
      {"day_offset":30,"template_key":"brand_day30_activation","subject_template":"Your state is live — meet the athletes","body_template":"code"}
    ]'::jsonb,
    true,
    'Brand nurture focused on campaign ROI, per-vertical case studies, and pricing confidence.'
  )
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      version = EXCLUDED.version,
      steps = EXCLUDED.steps,
      active = EXCLUDED.active,
      description = EXCLUDED.description,
      updated_at = now();

-- ─────────────────────────────────────────────────────────────────
-- 2. nurture_sequence_enrollments
-- ─────────────────────────────────────────────────────────────────
-- One row per (ref, sequence). current_step is 0-indexed against
-- the sequence steps array. next_scheduled_at is the wake-up time
-- for the cron; NULL means "do not schedule" (terminal state).

CREATE TABLE IF NOT EXISTS public.nurture_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_or_waitlist_ref text NOT NULL,
  sequence_id text NOT NULL REFERENCES public.nurture_sequence_definitions(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  current_step int NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  next_scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','suppressed_converted','unsubscribed','failed')),
  suppressed_reason text,
  consecutive_failures int NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  unsubscribe_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  last_state_code text,
  last_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_or_waitlist_ref, sequence_id)
);

COMMENT ON TABLE public.nurture_sequence_enrollments IS
  'Per-(ref, sequence) enrollment row. ref is "waitlist:<uuid>" or "user:<uuid>". Idempotent via the UNIQUE constraint.';

-- Hot query: "give me active enrollments due now, oldest first."
CREATE INDEX IF NOT EXISTS idx_nurture_enroll_due
  ON public.nurture_sequence_enrollments (next_scheduled_at)
  WHERE status = 'active' AND next_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nurture_enroll_ref
  ON public.nurture_sequence_enrollments (user_or_waitlist_ref);

CREATE INDEX IF NOT EXISTS idx_nurture_enroll_status
  ON public.nurture_sequence_enrollments (status);

ALTER TABLE public.nurture_sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- A user can read their own enrollments (matches 'user:<own-uid>').
-- Handy for a future "manage my subscriptions" surface. The
-- waitlist-ref variant is not readable by end users.
DROP POLICY IF EXISTS nurture_enroll_read_own
  ON public.nurture_sequence_enrollments;
CREATE POLICY nurture_enroll_read_own
  ON public.nurture_sequence_enrollments
  FOR SELECT
  TO authenticated
  USING (user_or_waitlist_ref = ('user:' || auth.uid()::text));

-- Admins read all.
DROP POLICY IF EXISTS nurture_enroll_read_admin
  ON public.nurture_sequence_enrollments;
CREATE POLICY nurture_enroll_read_admin
  ON public.nurture_sequence_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service-role writes only (no INSERT/UPDATE/DELETE policies).

-- ─────────────────────────────────────────────────────────────────
-- 3. nurture_sequence_events
-- ─────────────────────────────────────────────────────────────────
-- Audit log of every step outcome. One row per state transition
-- per step so we can reconstruct the nurture timeline per ref.

CREATE TABLE IF NOT EXISTS public.nurture_sequence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.nurture_sequence_enrollments(id) ON DELETE CASCADE,
  step_index int NOT NULL CHECK (step_index >= 0),
  event_type text NOT NULL CHECK (event_type IN ('queued','sent','failed','clicked','unsubscribed')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_nurture_events_enroll_step
  ON public.nurture_sequence_events (enrollment_id, step_index);

CREATE INDEX IF NOT EXISTS idx_nurture_events_sent_at
  ON public.nurture_sequence_events (sent_at DESC);

ALTER TABLE public.nurture_sequence_events ENABLE ROW LEVEL SECURITY;

-- Admins read all events.
DROP POLICY IF EXISTS nurture_events_read_admin
  ON public.nurture_sequence_events;
CREATE POLICY nurture_events_read_admin
  ON public.nurture_sequence_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service-role writes only.
