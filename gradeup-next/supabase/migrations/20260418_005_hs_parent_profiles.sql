-- HS-NIL Parent Profiles + Athlete Linkage
-- ============================================================
-- Completes the parent-side data model for the high-school NIL
-- pilot. Parent signup currently writes only auth.users metadata;
-- this migration adds the durable parent profile + the join table
-- linking parents to the athlete(s) they manage.
--
-- Design notes:
--   * Parents are first-class: they own consent, deal approvals,
--     and payouts. Their profile lives in hs_parent_profiles
--     (one row per auth user, hence the UNIQUE(user_id)).
--   * Siblings are a real use case: one parent can manage multiple
--     athletes, so the link is a separate M:N table, not a FK on
--     the profile.
--   * Parent-athlete linkage is two-sided: the parent asserts the
--     relationship at signup (creating a pending row), but the
--     link is not "verified" until the athlete confirms (by
--     clicking an email invite, entering a shared code, or via
--     manual support). Until verified_at is set, the parent can
--     see the pending link but has no deal/consent authority.
--   * No public INSERT on the link table — clients use a service
--     role endpoint, or the parent creates pending rows via RLS.
-- ============================================================

-- ============================================================
-- hs_parent_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_parent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian')),
  phone text,
  identity_verified boolean NOT NULL DEFAULT false,
  identity_verification_provider text
    CHECK (identity_verification_provider IN ('stripe_identity', 'persona') OR identity_verification_provider IS NULL),
  identity_verification_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_hs_parent_profiles_user ON public.hs_parent_profiles(user_id);

ALTER TABLE public.hs_parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY hs_parent_profiles_read_own ON public.hs_parent_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY hs_parent_profiles_insert_own ON public.hs_parent_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY hs_parent_profiles_update_own ON public.hs_parent_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- hs_parent_athlete_links
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_parent_athlete_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id uuid NOT NULL REFERENCES public.hs_parent_profiles(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian')),
  verified_at timestamptz,
  verification_method text
    CHECK (verification_method IN ('email_invite_click', 'shared_code', 'manual_support')
           OR verification_method IS NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_profile_id, athlete_user_id)
);

CREATE INDEX IF NOT EXISTS idx_hs_parent_athlete_links_parent
  ON public.hs_parent_athlete_links(parent_profile_id);
CREATE INDEX IF NOT EXISTS idx_hs_parent_athlete_links_athlete
  ON public.hs_parent_athlete_links(athlete_user_id);
CREATE INDEX IF NOT EXISTS idx_hs_parent_athlete_links_pending
  ON public.hs_parent_athlete_links(parent_profile_id)
  WHERE verified_at IS NULL;

ALTER TABLE public.hs_parent_athlete_links ENABLE ROW LEVEL SECURITY;

-- Parent can read their own links (both pending and verified).
CREATE POLICY hs_parent_athlete_links_parent_read ON public.hs_parent_athlete_links
  FOR SELECT USING (
    parent_profile_id IN (
      SELECT id FROM public.hs_parent_profiles WHERE user_id = auth.uid()
    )
  );

-- Athlete can read any link where they're the athlete (so they
-- can see who has claimed to be their guardian and confirm).
CREATE POLICY hs_parent_athlete_links_athlete_read ON public.hs_parent_athlete_links
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- Parent can create a pending link for themselves. verified_at
-- MUST be null at insert — confirmation flips it via a service
-- role endpoint after the athlete proves the relationship.
CREATE POLICY hs_parent_athlete_links_parent_insert ON public.hs_parent_athlete_links
  FOR INSERT WITH CHECK (
    parent_profile_id IN (
      SELECT id FROM public.hs_parent_profiles WHERE user_id = auth.uid()
    )
    AND verified_at IS NULL
  );

-- No public UPDATE or DELETE — those transitions (verify, revoke)
-- go through the service role.

-- ============================================================
-- updated_at trigger (reuse shared function if present)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_hs_parent_profiles_updated_at
             BEFORE UPDATE ON public.hs_parent_profiles
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;
