-- HS-NIL Athlete Discoverability + Brand Matching RPC
-- ============================================================
-- Phase 6: Brand-to-athlete matching view. Replaces the founder's
-- manual concierge matching with a tool brands can use themselves.
--
-- Two design decisions documented here:
--
-- 1) OPT-OUT, not opt-in.
--    `hs_athlete_profiles.is_discoverable` defaults to TRUE. A high-
--    school athlete who has already signed the parental-consent flow
--    and been admitted to the pilot has implicitly agreed to be
--    matchable to brands — that's the whole point of the platform.
--    Defaulting to FALSE would stall brand supply waiting for every
--    athlete to flip a toggle, which contradicts the pilot's goal.
--    Athletes can opt out at any time from /hs/athlete/privacy, and
--    the discoverability flag filters the RPC at the SQL layer so
--    opted-out athletes are invisible system-wide.
--
-- 2) `last_match_alert_sent_at` lives on `brands`.
--    The daily match-alert cron needs a 24h throttle per brand.
--    Column is nullable; NULL means "never alerted" and the first
--    run after the cron starts counts the full history.
-- ============================================================

-- ----------------------------------------------------------------
-- Column additions
-- ----------------------------------------------------------------

ALTER TABLE public.hs_athlete_profiles
  ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discoverability_updated_at timestamptz;

COMMENT ON COLUMN public.hs_athlete_profiles.is_discoverable IS
  'Athlete opt-out flag for brand matching. Defaults true — opt-out, not opt-in. When false, excluded from match_hs_athletes_for_brand.';
COMMENT ON COLUMN public.hs_athlete_profiles.discoverability_updated_at IS
  'Last time the athlete flipped their discoverability flag. Null on existing rows until first toggle.';

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS last_match_alert_sent_at timestamptz;

COMMENT ON COLUMN public.brands.last_match_alert_sent_at IS
  'Throttles the daily /api/cron/hs-match-alerts run. NULL = never alerted. Cron updates to now() after a successful send.';

-- Partial index so the matching RPC can cheaply filter out opted-out rows.
CREATE INDEX IF NOT EXISTS idx_hs_athlete_profiles_discoverable
  ON public.hs_athlete_profiles(state_code)
  WHERE is_discoverable = true;

-- ----------------------------------------------------------------
-- RLS: athlete can flip their own flag.
-- The existing `hs_athlete_profiles_update_own` policy already
-- permits the owning athlete to UPDATE any column on their row
-- (see migration 20260418_002). No policy change needed.
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- match_hs_athletes_for_brand
-- ----------------------------------------------------------------
-- SECURITY DEFINER so brands can query a controlled projection of
-- athlete rows without being granted SELECT on hs_athlete_profiles
-- directly. Returns ONLY the fields brands need to decide whether
-- to propose a deal: first name, school, sport, state, GPA + tier,
-- graduation year, and a match score. Explicitly excludes email,
-- last name, DOB, phone, and address.
--
-- The scoring formula is a NAIVE FIRST PASS, documented inline so a
-- future ML pipeline knows where to plug in. The pilot does not need
-- probabilistic matching — it needs a sane linear ranker that
-- respects state + category + GPA.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_hs_athletes_for_brand(
  p_brand_id uuid,
  p_min_gpa numeric DEFAULT 0,
  p_limit_count int DEFAULT 25
)
RETURNS TABLE (
  athlete_id uuid,
  first_name text,
  school_name text,
  sport text,
  gpa numeric,
  gpa_verification_tier text,
  state_code text,
  graduation_year int,
  match_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_brand_states text[];
  v_brand_categories text[];
  v_is_hs_enabled boolean;
BEGIN
  -- Pull brand config. If the brand row is missing or not HS-enabled,
  -- return zero rows rather than leaking a SQL error.
  SELECT b.hs_target_states, b.hs_deal_categories, b.is_hs_enabled
  INTO v_brand_states, v_brand_categories, v_is_hs_enabled
  FROM public.brands b
  WHERE b.id = p_brand_id;

  IF NOT FOUND OR v_is_hs_enabled IS NOT TRUE THEN
    RETURN;
  END IF;

  IF v_brand_states IS NULL OR array_length(v_brand_states, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Log every invocation. grep this in the server logs to audit
  -- which brand ran matching and with what thresholds.
  RAISE LOG 'match_hs_athletes_for_brand brand=% states=% categories=% min_gpa=% limit=%',
    p_brand_id, v_brand_states, v_brand_categories, p_min_gpa, p_limit_count;

  -- Scoring formula (naive linear):
  --   match_score = 0.35 * gpa_normalized
  --               + 0.25 * category_overlap
  --               + 0.20 * state_relevance
  --               + 0.10 * tier_bonus
  --               + 0.10 * recency_bonus
  --
  -- - gpa_normalized:  gpa / 4.0, clamped to [0,1].
  -- - category_overlap: naive 0.5 placeholder today. Athletes do NOT
  --     carry a deal-category preference column, so we default to
  --     mid-relevance. TODO: once athletes can declare preferred
  --     categories, compute the array-intersection proportion here.
  -- - state_relevance: 1.0 (exact match is guaranteed by the WHERE).
  --     TODO: drop to 0.5 for neighboring states when we expand
  --     beyond in-state targeting.
  -- - tier_bonus:     self_reported=0, user_submitted=0.5,
  --                   institution_verified=1.0.
  -- - recency_bonus:  1.0 if created_at within 30d, 0.5 if 31-90d,
  --                   0 otherwise. Rewards newly-signed-up athletes
  --                   so the freshest supply surfaces first.
  RETURN QUERY
  SELECT
    hap.user_id AS athlete_id,
    COALESCE((au.raw_user_meta_data ->> 'first_name'), 'Athlete')::text AS first_name,
    hap.school_name,
    hap.sport,
    hap.gpa,
    hap.gpa_verification_tier,
    hap.state_code,
    hap.graduation_year,
    (
      0.35 * LEAST(1.0, GREATEST(0.0, COALESCE(hap.gpa, 0) / 4.0))
      + 0.25 * 0.5 -- category_overlap placeholder
      + 0.20 * 1.0 -- state_relevance (exact match)
      + 0.10 * CASE hap.gpa_verification_tier
                 WHEN 'institution_verified' THEN 1.0
                 WHEN 'user_submitted' THEN 0.5
                 ELSE 0.0
               END
      + 0.10 * CASE
                 WHEN hap.created_at > now() - interval '30 days' THEN 1.0
                 WHEN hap.created_at > now() - interval '90 days' THEN 0.5
                 ELSE 0.0
               END
    )::real AS match_score
  FROM public.hs_athlete_profiles hap
  JOIN public.state_nil_rules snr ON snr.state_code = hap.state_code
  LEFT JOIN auth.users au ON au.id = hap.user_id
  WHERE hap.state_code = ANY(v_brand_states)
    AND hap.is_discoverable = true
    AND snr.status = 'permitted'
    AND COALESCE(hap.gpa, 0) >= COALESCE(p_min_gpa, 0)
  ORDER BY match_score DESC, hap.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit_count, 200));
END;
$$;

-- Lock the function down to authenticated callers only. Brands hit
-- this via the SSR client, which is authenticated.
REVOKE ALL ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) TO authenticated;

COMMENT ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) IS
  'Ranked list of HS athletes matching a brand''s state + GPA filters. SECURITY DEFINER — returns NO email / DOB / last-name / phone / address. Naive linear scoring; future ML is out of scope.';
