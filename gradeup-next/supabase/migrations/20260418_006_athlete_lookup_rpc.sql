-- HS-NIL Athlete Lookup RPC (security-definer)
-- ============================================================
-- Problem:
--   The parent-side flow `linkAthlete` needs to translate an
--   athlete's email address into their `auth.users.id` so a
--   pending row can be written into `hs_parent_athlete_links`.
--   Browser/authenticated clients cannot SELECT auth.users
--   across user boundaries (RLS hides rows owned by others) —
--   correctly so. We need a narrow, audited escape hatch.
--
-- Solution:
--   A SECURITY DEFINER function that is:
--     * Scoped ONLY to HS athletes (joins hs_athlete_profiles
--       — college-only users return nothing).
--     * Case-insensitive on email.
--     * Returns only the fields the parent UI needs to disambiguate
--       the match (first_name, school_name, state_code,
--       requires_parental_consent). No email, no DOB, no GPA.
--     * Granted to `authenticated` only — NEVER `anon` or PUBLIC.
--     * Logs every call via RAISE LOG for security observability
--       (NOT RAISE NOTICE, which leaks to client).
--     * Pins `search_path` to prevent schema-injection attacks
--       against SECURITY DEFINER.
--
-- Rate limiting:
--   This function does NOT implement rate limiting itself. Callers
--   MUST invoke it from a rate-limited route. The current caller is
--   the parent signup flow, which is gated by `enforceRateLimit` on
--   the signup route (sufficient for now). If this RPC is ever
--   exposed to an authenticated-search endpoint, add per-user
--   per-minute rate limiting at the API layer — NEVER remove the
--   `authenticated`-only grant to widen access.
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_hs_athlete_by_email(
  lookup_email text
)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  school_name text,
  state_code text,
  requires_parental_consent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Pin schema resolution so a malicious caller cannot shadow
-- `auth.users` or `public.hs_athlete_profiles` via a temp schema.
SET search_path = public, auth
AS $$
BEGIN
  -- Security observability: LOG (not NOTICE) so the message lands
  -- in Postgres logs but is never surfaced to the client.
  RAISE LOG 'find_hs_athlete_by_email called by uid=% for email_len=%',
    auth.uid(), char_length(coalesce(lookup_email, ''));

  IF lookup_email IS NULL OR length(trim(lookup_email)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id                                             AS user_id,
    (u.raw_user_meta_data ->> 'first_name')::text    AS first_name,
    hap.school_name                                  AS school_name,
    hap.state_code                                   AS state_code,
    COALESCE(snr.requires_parental_consent, true)    AS requires_parental_consent
  FROM auth.users u
  -- INNER JOIN enforces the HS-scope: non-athlete users and
  -- college-only athletes (no hs_athlete_profiles row) get zero rows.
  INNER JOIN public.hs_athlete_profiles hap
    ON hap.user_id = u.id
  LEFT JOIN public.state_nil_rules snr
    ON snr.state_code = hap.state_code
  WHERE LOWER(u.email) = LOWER(trim(lookup_email))
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.find_hs_athlete_by_email(text) IS
  'HS-NIL only: resolve an email to an HS athlete user_id + display fields. '
  'SECURITY DEFINER; authenticated-only; logs every call. '
  'Returns empty for non-athletes, college-only athletes, or unknown emails.';

-- Lock down execution: default PUBLIC EXECUTE on functions is a
-- common SECURITY DEFINER footgun, so revoke first then grant
-- only to authenticated sessions.
REVOKE ALL ON FUNCTION public.find_hs_athlete_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_hs_athlete_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_hs_athlete_by_email(text) TO authenticated;
