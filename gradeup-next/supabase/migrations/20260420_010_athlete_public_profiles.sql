-- HS-NIL Athlete Public Profile Pages (Phase 17)
-- ================================================================
-- Extends hs_athlete_profiles with the fields that power the
-- PUBLIC bio-linkable profile page at /athletes/[username], and
-- adds a lightweight view-log table for coarsened analytics.
--
-- Design decisions documented inline:
--
-- 1) public_visibility is OPT-IN (defaults FALSE).
--    Distinct from the existing `is_discoverable` flag, which
--    controls brand-matching (defaults TRUE). `public_visibility`
--    controls whether an URL like /athletes/<username> is
--    reachable by an anonymous visitor at all. The two flags
--    serve different trust models and must move independently.
--
-- 2) username is CLAIM-ONCE.
--    `claimed_username_at` is set on first claim; freeing or
--    changing the username requires admin action (not exposed in
--    this migration — TODO admin tool). We enforce at the app
--    layer; the column itself is nullable until claim.
--
-- 3) Case-insensitive uniqueness via partial functional index.
--    `username` is stored as the athlete typed it (canonicalized
--    to lowercase on claim), but we also guarantee that no two
--    rows collide on lower(username) even if someone tries to
--    sneak an uppercase variant through a direct SQL path.
--
-- 4) is_reserved_username() is an IMMUTABLE function the API
--    layer mirrors in TypeScript. Two-layer defense: SQL prevents
--    insertion even if the API is bypassed; the API returns
--    friendly error messages.
--
-- 5) athlete_profile_view_log stores only coarsened telemetry:
--      - ip_hash (sha256 of raw IP + salt)
--      - user_agent_hint (one of: mobile / desktop / bot / other)
--      - referrer_hint (host-only, not full URL)
--    Never raw IP, never raw UA, never full referrer.
-- ================================================================

-- ----------------------------------------------------------------
-- Column additions on hs_athlete_profiles
-- ----------------------------------------------------------------

ALTER TABLE public.hs_athlete_profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS public_visibility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS public_bio_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_username_at timestamptz;

COMMENT ON COLUMN public.hs_athlete_profiles.username IS
  'URL-safe slug for /athletes/[username]. Lowercase alphanumeric + dashes, 3-30 chars. NULL until athlete claims. Claim-once.';
COMMENT ON COLUMN public.hs_athlete_profiles.public_visibility IS
  'Opt-in. When TRUE and username IS NOT NULL the /athletes/[username] page is reachable by anyone. Distinct from is_discoverable (brand-matching).';
COMMENT ON COLUMN public.hs_athlete_profiles.public_bio IS
  'Athlete-authored public bio. Max 280 chars. Rendered on /athletes/[username].';
COMMENT ON COLUMN public.hs_athlete_profiles.public_bio_updated_at IS
  'Last public_bio edit timestamp.';
COMMENT ON COLUMN public.hs_athlete_profiles.claimed_username_at IS
  'When the athlete first claimed a username. Null until claim. Claim-once: changing requires admin action.';

-- Length + character class constraint on username. Case-insensitive at the
-- index layer but we still reject obvious invalid characters at the column
-- level so a bad write never lands even through service-role paths.
ALTER TABLE public.hs_athlete_profiles
  DROP CONSTRAINT IF EXISTS hs_athlete_profiles_username_format_chk;
ALTER TABLE public.hs_athlete_profiles
  ADD CONSTRAINT hs_athlete_profiles_username_format_chk
  CHECK (
    username IS NULL
    OR (
      length(username) BETWEEN 3 AND 30
      AND username ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$'
    )
  );

-- Bio length cap — enforce at DB as backstop to the API-layer check.
ALTER TABLE public.hs_athlete_profiles
  DROP CONSTRAINT IF EXISTS hs_athlete_profiles_public_bio_len_chk;
ALTER TABLE public.hs_athlete_profiles
  ADD CONSTRAINT hs_athlete_profiles_public_bio_len_chk
  CHECK (public_bio IS NULL OR char_length(public_bio) <= 280);

-- Partial unique functional index: case-insensitive uniqueness, scoped to
-- claimed rows (username IS NOT NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_hs_athlete_profiles_username_lower
  ON public.hs_athlete_profiles (lower(username))
  WHERE username IS NOT NULL;

-- Fast lookup for the public page (username + visibility gate).
CREATE INDEX IF NOT EXISTS idx_hs_athlete_profiles_public_directory
  ON public.hs_athlete_profiles (public_visibility, graduation_year, state_code, sport)
  WHERE public_visibility = true AND username IS NOT NULL;

-- ----------------------------------------------------------------
-- is_reserved_username(text) — SQL-layer defense
-- ----------------------------------------------------------------
-- Reserved usernames block the platform from colliding with route
-- groups, handles, and reasonable admin names. Keep in lockstep
-- with RESERVED_USERNAMES in src/lib/hs-nil/athlete-profile.ts.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_username, '')) IN (
    'admin', 'administrator', 'api', 'app', 'auth', 'login', 'logout',
    'signup', 'signin', 'register', 'dashboard', 'settings', 'account',
    'hs', 'nil', 'gradeup', 'gradeup-nil', 'gradeupnil',
    'brand', 'brands', 'parent', 'parents', 'athlete', 'athletes',
    'business', 'solutions', 'blog', 'blogs', 'discover', 'opportunities',
    'pricing', 'compare', 'help', 'support', 'privacy', 'terms',
    'subscription', 'subscription-terms', 'cookies', 'legal',
    'about', 'contact', 'press', 'careers', 'jobs',
    'ad', 'ads', 'state-ads', 'state-ad-portal',
    'trajectory', 'case-studies', 'campaigns', 'deals',
    'sitemap', 'robots', 'favicon', 'manifest', 'sw',
    'null', 'undefined', 'true', 'false',
    'root', 'system', 'webmaster', 'postmaster', 'hostmaster',
    'hempp', 'founder', 'staff', 'team', 'mod', 'moderator',
    'public', 'private', 'anonymous', 'guest', 'user', 'me', 'my', 'self'
  );
$$;

COMMENT ON FUNCTION public.is_reserved_username(text) IS
  'Reserved-username guard. IMMUTABLE so it can appear in CHECK constraints. Mirror in src/lib/hs-nil/athlete-profile.ts.';

-- CHECK constraint using the reserved function. Runs on any write.
ALTER TABLE public.hs_athlete_profiles
  DROP CONSTRAINT IF EXISTS hs_athlete_profiles_username_reserved_chk;
ALTER TABLE public.hs_athlete_profiles
  ADD CONSTRAINT hs_athlete_profiles_username_reserved_chk
  CHECK (username IS NULL OR NOT public.is_reserved_username(username));

-- ----------------------------------------------------------------
-- athlete_profile_view_log — coarsened analytics
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.athlete_profile_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent_hint text CHECK (
    user_agent_hint IS NULL
    OR user_agent_hint IN ('mobile', 'desktop', 'tablet', 'bot', 'other')
  ),
  referrer_hint text,
  ip_hash text
);

COMMENT ON TABLE public.athlete_profile_view_log IS
  'Lightweight view-log for /athletes/[username]. No raw PII — ip_hash is sha256(raw_ip+salt), referrer_hint is host-only, user_agent_hint is a coarse bucket.';
COMMENT ON COLUMN public.athlete_profile_view_log.ip_hash IS
  'SHA256 hex of raw viewer IP + process salt. Non-reversible. Used for coarse de-dup only.';
COMMENT ON COLUMN public.athlete_profile_view_log.referrer_hint IS
  'Host-only referrer (e.g. "instagram.com"). Never the full URL. Null if omitted.';

CREATE INDEX IF NOT EXISTS idx_athlete_profile_view_log_athlete
  ON public.athlete_profile_view_log (athlete_user_id, viewed_at DESC);

ALTER TABLE public.athlete_profile_view_log ENABLE ROW LEVEL SECURITY;

-- Athlete can read own rollups; anything else goes through service role.
CREATE POLICY athlete_profile_view_log_read_own ON public.athlete_profile_view_log
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- No INSERT policy for anon/authenticated — writes come from service role.
-- No UPDATE / DELETE policy — the log is append-only.

-- ----------------------------------------------------------------
-- RLS on hs_athlete_profiles: permit anonymous SELECT when
-- public_visibility = true AND username IS NOT NULL.
-- ----------------------------------------------------------------
-- Existing policies (from 20260418_002) only allow the owner to
-- read their own row. We add a PUBLIC read policy scoped tightly:
-- only the visibility-on, claimed-username rows are exposed, and
-- getPublicProfileByUsername still uses a service-role client
-- that bypasses this anyway. The policy is here so a future code
-- path that reads via the anon client also sees the same scope.
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS hs_athlete_profiles_read_public ON public.hs_athlete_profiles;
CREATE POLICY hs_athlete_profiles_read_public ON public.hs_athlete_profiles
  FOR SELECT
  USING (public_visibility = true AND username IS NOT NULL);

-- ----------------------------------------------------------------
-- End of migration
-- ----------------------------------------------------------------
