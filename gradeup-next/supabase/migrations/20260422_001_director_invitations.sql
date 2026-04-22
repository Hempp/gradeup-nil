-- Athlete → Athletic Director Invite Flow
-- ============================================================
-- Athletes invite their athletic director (or head coach) to
-- GradeUp so the AD can verify the athlete's enrollment and
-- grades directly on the platform.
--
-- Mirrors the shape of state_ad_invitations (migration
-- 20260419_015) but scoped to athlete ↔ school AD relationships.

CREATE TABLE IF NOT EXISTS public.director_invitations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email         text        NOT NULL,
  invited_name          text        NOT NULL,
  invited_title         text,
  invited_by_athlete_id uuid        NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  school_id             uuid        NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  invitation_token      text        NOT NULL UNIQUE,
  invited_at            timestamptz NOT NULL DEFAULT now(),
  accepted_at           timestamptz,
  rejected_at           timestamptz,
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_by_user_id   uuid        REFERENCES auth.users(id),
  CHECK (expires_at > invited_at)
);

CREATE INDEX IF NOT EXISTS idx_director_invitations_token
  ON public.director_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_director_invitations_open
  ON public.director_invitations(school_id, invited_at DESC)
  WHERE accepted_at IS NULL AND rejected_at IS NULL;

COMMENT ON TABLE public.director_invitations IS
  'Athlete-issued invitations to athletic directors/coaches to verify enrollment/grades. 30-day expiry.';
COMMENT ON COLUMN public.director_invitations.invited_title IS
  'Optional display title: "Athletic Director", "Assistant AD", "Head Coach", etc.';

ALTER TABLE public.director_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY director_invitations_insert_own
  ON public.director_invitations
  FOR INSERT
  WITH CHECK (
    invited_by_athlete_id IN (
      SELECT id FROM public.athletes WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY director_invitations_read_own
  ON public.director_invitations
  FOR SELECT
  USING (
    invited_by_athlete_id IN (
      SELECT id FROM public.athletes WHERE profile_id = auth.uid()
    )
  );
