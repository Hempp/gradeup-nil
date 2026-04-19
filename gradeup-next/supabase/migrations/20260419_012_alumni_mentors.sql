-- HS-NIL Alumni Mentor Network
-- ============================================================
-- Phase 11. The most valuable mentors for HS athletes are
-- alumni who just completed the HS-to-college jump — they know
-- the exact academic-athletic calendar pressure, the recruiting
-- timeline, and the NIL deal-flow reality. They also validate
-- the platform's dual-audience narrative: "your story doesn't
-- reset at graduation — it follows you AND fuels the next class."
--
-- Eligibility: only athletes whose `athlete_bracket_transitions`
-- row is status='verified' can create a mentor profile. This is
-- enforced via a constraint trigger so the gate is tamper-evident
-- at the DB layer (service-role writes still pass through the
-- trigger — there is no bypass short of dropping the trigger).
--
-- Session model: two-sided. An HS athlete ("requester") opens a
-- `mentor_session_requests` row; the mentor accepts or declines.
-- On accept, both parties exchange messages in the
-- `mentor_messages` table — a simple append-only thread per
-- session request. Sync scheduling (calendar integrations, live
-- video) is deferred to Phase 12+. Until then "video_call" just
-- means "we'll arrange it in the message thread."
--
-- Privacy posture:
--   * mentor profiles are intentionally public-within-platform —
--     the value of the network depends on HS athletes being able
--     to browse and filter. Bio, college, sport, specialties are
--     discoverable. Email + contact info are NOT — all contact
--     flows through in-platform messaging until a session opens.
--   * session requests + messages are read-only to the two
--     parties. Admin (service-role) can read everything for
--     moderation if needed.
-- ============================================================

-- ============================================================
-- 1. alumni_mentor_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alumni_mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_name text NOT NULL CHECK (char_length(college_name) BETWEEN 2 AND 200),
  college_state text NOT NULL CHECK (char_length(college_state) = 2),
  ncaa_division text NOT NULL
    CHECK (ncaa_division IN ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other')),
  current_sport text NOT NULL CHECK (char_length(current_sport) BETWEEN 1 AND 80),
  bio text NOT NULL CHECK (char_length(bio) BETWEEN 1 AND 2000),
  availability text NOT NULL DEFAULT 'monthly'
    CHECK (availability IN ('weekly', 'biweekly', 'monthly', 'paused')),
  specialties text[] NOT NULL DEFAULT ARRAY[]::text[],
  accepts_message_only boolean NOT NULL DEFAULT true,
  accepts_video_call boolean NOT NULL DEFAULT false,
  hourly_rate_cents integer
    CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
  verified_at timestamptz,
  visible_to_hs boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_mentor_profiles_visibility
  ON public.alumni_mentor_profiles(visible_to_hs, current_sport, college_state)
  WHERE visible_to_hs = true;

CREATE INDEX IF NOT EXISTS idx_alumni_mentor_profiles_user
  ON public.alumni_mentor_profiles(user_id);

COMMENT ON TABLE public.alumni_mentor_profiles IS
  'Mentor profiles for verified HS-to-college transition alumni. Eligibility enforced via alumni_mentor_profiles_eligibility_check trigger.';
COMMENT ON COLUMN public.alumni_mentor_profiles.verified_at IS
  'Set by service role once the mentor passes the eligibility + content review. Not the same as the transition verified_at.';

-- ============================================================
-- 2. Eligibility trigger
-- ============================================================
-- A mentor profile can only exist for a user with a VERIFIED
-- athlete_bracket_transitions row. Fires BEFORE INSERT + UPDATE
-- of user_id. Uses SECURITY DEFINER because service-role writes
-- bypass RLS but NOT triggers — the check stays in force even
-- for the ops path. If an athlete's transition were later
-- overturned (a policy fix that doesn't currently exist), we'd
-- want this row to remain rejected on next write, not silently
-- persist.

CREATE OR REPLACE FUNCTION public.alumni_mentor_eligibility_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.athlete_bracket_transitions
    WHERE athlete_user_id = NEW.user_id
      AND status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Alumni mentor profile requires a verified HS-to-college transition for user %', NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.alumni_mentor_eligibility_check() IS
  'Enforces that only athletes with athlete_bracket_transitions.status=verified can have a mentor profile. Raises check_violation otherwise.';

DROP TRIGGER IF EXISTS trg_alumni_mentor_eligibility
  ON public.alumni_mentor_profiles;

CREATE TRIGGER trg_alumni_mentor_eligibility
  BEFORE INSERT OR UPDATE OF user_id
  ON public.alumni_mentor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.alumni_mentor_eligibility_check();

-- ============================================================
-- 3. alumni_mentor_profiles RLS
-- ============================================================

ALTER TABLE public.alumni_mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Public-within-platform read: any authenticated user can browse
-- visible mentors. Invisible / paused profiles are hidden from
-- the listing path.
CREATE POLICY alumni_mentor_profiles_public_read
  ON public.alumni_mentor_profiles
  FOR SELECT
  TO authenticated
  USING (visible_to_hs = true);

-- Mentor reads their own row regardless of visibility.
CREATE POLICY alumni_mentor_profiles_self_read
  ON public.alumni_mentor_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Mentor creates their own row. The eligibility trigger still
-- runs and will reject if the transition is not verified.
CREATE POLICY alumni_mentor_profiles_self_insert
  ON public.alumni_mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Mentor updates their own row. verified_at is not restricted
-- at RLS; the service layer is expected not to expose it to the
-- client. If it ever does get written via client it still must
-- match the owning user, which is the worst-case semantic.
CREATE POLICY alumni_mentor_profiles_self_update
  ON public.alumni_mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — profiles toggle visible_to_hs=false instead.

-- ============================================================
-- 4. mentor_session_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mentor_session_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_profile_id uuid NOT NULL REFERENCES public.alumni_mentor_profiles(id) ON DELETE CASCADE,
  mentor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_topic text NOT NULL CHECK (char_length(requested_topic) BETWEEN 1 AND 200),
  requested_format text NOT NULL CHECK (requested_format IN ('message', 'video_call')),
  athlete_note text CHECK (athlete_note IS NULL OR char_length(athlete_note) <= 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled', 'expired')),
  declined_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_mentor
  ON public.mentor_session_requests(mentor_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_requester
  ON public.mentor_session_requests(requester_user_id, status, created_at DESC);

COMMENT ON TABLE public.mentor_session_requests IS
  'Requests from HS athletes to alumni mentors. Two parties: requester (HS) and mentor. mentor_user_id is denormalized from alumni_mentor_profiles for RLS convenience.';

ALTER TABLE public.mentor_session_requests ENABLE ROW LEVEL SECURITY;

-- Requester reads own requests.
CREATE POLICY mentor_session_requests_requester_read
  ON public.mentor_session_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_user_id);

-- Mentor reads requests addressed to them.
CREATE POLICY mentor_session_requests_mentor_read
  ON public.mentor_session_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = mentor_user_id);

-- Requester creates their own requests. mentor_user_id must be
-- consistent with the referenced profile — the service layer
-- populates it; if an anon client tried it would still be
-- constrained to auth.uid() for requester_user_id.
CREATE POLICY mentor_session_requests_requester_insert
  ON public.mentor_session_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

-- Mentor updates (to accept/decline/complete) — only rows they
-- are the mentor on.
CREATE POLICY mentor_session_requests_mentor_update
  ON public.mentor_session_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_user_id)
  WITH CHECK (auth.uid() = mentor_user_id);

-- Requester updates (for cancel / complete) — only own rows.
CREATE POLICY mentor_session_requests_requester_update
  ON public.mentor_session_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_user_id)
  WITH CHECK (auth.uid() = requester_user_id);

-- ============================================================
-- 5. mentor_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mentor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_request_id uuid NOT NULL REFERENCES public.mentor_session_requests(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('mentor', 'athlete')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_messages_session
  ON public.mentor_messages(session_request_id, created_at ASC);

COMMENT ON TABLE public.mentor_messages IS
  'Append-only DM thread per session request. SELECT RLS allows either party on the parent session.';

ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

-- Either party on the parent session can SELECT. We check via
-- subquery against mentor_session_requests.
CREATE POLICY mentor_messages_party_read
  ON public.mentor_messages
  FOR SELECT
  TO authenticated
  USING (
    session_request_id IN (
      SELECT id FROM public.mentor_session_requests
      WHERE requester_user_id = auth.uid()
         OR mentor_user_id = auth.uid()
    )
  );

-- Either party can INSERT into their own thread. sender_user_id
-- must be the caller.
CREATE POLICY mentor_messages_party_insert
  ON public.mentor_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_user_id
    AND session_request_id IN (
      SELECT id FROM public.mentor_session_requests
      WHERE requester_user_id = auth.uid()
         OR mentor_user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE — messages are immutable.

-- ============================================================
-- 6. updated_at trigger for alumni_mentor_profiles
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_alumni_mentor_profiles_updated_at
             BEFORE UPDATE ON public.alumni_mentor_profiles
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;
