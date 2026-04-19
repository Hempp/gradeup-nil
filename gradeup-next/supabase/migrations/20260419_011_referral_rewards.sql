-- HS-NIL Phase 11 — Referral Rewards
-- ============================================================
-- Phase 8 built the referral funnel. Phase 9 wired conversions.
-- This phase closes the loop with *structural* incentives so
-- parents keep sharing even after the first referral:
--
--   * Badge tiers keyed to verified-conversion count
--     (bronze @ 3, silver @ 10, gold @ 25, platinum @ 50).
--   * Per-tier perks (priority boost on match ranker, extended
--     trajectory-share TTL, waitlist-invite priority, concierge
--     direct line).
--   * match_hs_athletes_for_brand is extended to read a
--     referral_priority_boost derived from linked parents' active
--     perks, clamped at +0.05 of match_score so it sharpens
--     ordering without dominating the existing ranker terms.
--
-- Perk taxonomy (canonical reference — service layer enforces
-- the same names):
--   match_priority_boost_level_1  bronze    +0.3 boost, 90-day TTL
--   match_priority_boost_level_2  silver    +0.5 boost, permanent
--   match_priority_boost_level_3  gold      +0.8 boost, permanent
--   match_priority_boost_level_4  platinum  +1.0 boost, permanent
--   trajectory_extended_ttl       silver+   +60 days on active shares
--   waitlist_invite_priority      gold+     front of activation batch
--   concierge_direct_line         platinum  direct founder access
--
-- Design notes
-- ─────────────
--   * Grant rows are append-only + UNIQUE(user_id, tier_id) so
--     grantTiersIfEarned() is safe to call from any number of
--     paths. Promotions from bronze → silver happen as a new
--     grant for the silver tier; we never mutate the prior row.
--   * Perk activations live on their own table because a perk
--     may be toggled or renewed (extended TTL, permanent-but-
--     paused) without revoking the underlying tier grant.
--   * Priority-boost flows parent→linked athlete via
--     hs_parent_athlete_links(verified_at IS NOT NULL). A parent
--     with multiple kids boosts each of them; boost is per-
--     athlete-user_id, clamped, additive across parents.
--   * Admin force-grant uses the same table path; no shadow
--     flow. Every grant has a metadata jsonb capturing the
--     reason + actor.
--
-- Depends on:
--   auth.users
--   public.hs_parent_athlete_links          (20260418_005)
--   public.referral_conversion_events       (20260419_001)
--   public.match_hs_athletes_for_brand RPC  (20260419_004)
--   public.admin_audit_log                  (20260418_012)

-- ─────────────────────────────────────────────────────────────────
-- 0. Extend admin_audit_log CHECK for referral rewards actions
-- ─────────────────────────────────────────────────────────────────
-- admin force-grant + perk activations audit via admin_audit_log.

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'referral_tier_force_grant',
    'referral_perk_force_activate'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'referral_grant',
    'referral_perk'
  ));

-- ─────────────────────────────────────────────────────────────────
-- 1. referral_reward_tiers — seed data + tier config
-- ─────────────────────────────────────────────────────────────────
-- Stable enum-like PK (text) so callers can reference 'bronze' in
-- code without looking up a uuid. display_order drives UI sort.

CREATE TABLE IF NOT EXISTS public.referral_reward_tiers (
  id text PRIMARY KEY,
  tier_name text NOT NULL,
  min_conversions int NOT NULL CHECK (min_conversions >= 0),
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order int NOT NULL,
  badge_icon_hint text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_reward_tiers IS
  'Seeded tier definitions. perks is a text[] encoded as jsonb (e.g. ["match_priority_boost_level_1","trajectory_extended_ttl"]). Service layer resolves perk names to behavior.';

INSERT INTO public.referral_reward_tiers
  (id, tier_name, min_conversions, perks, display_order, badge_icon_hint, description)
VALUES
  (
    'bronze',
    'Bronze Referrer',
    3,
    '["match_priority_boost_level_1"]'::jsonb,
    1,
    'medal_bronze',
    '3 families joined with your code. Your linked athletes get a 90-day bump on brand match rankings.'
  ),
  (
    'silver',
    'Silver Referrer',
    10,
    '["match_priority_boost_level_2","trajectory_extended_ttl"]'::jsonb,
    2,
    'medal_silver',
    '10 families joined. Your athletes get a permanent boost on match rankings, plus +60 days on every trajectory share.'
  ),
  (
    'gold',
    'Gold Referrer',
    25,
    '["match_priority_boost_level_3","trajectory_extended_ttl","waitlist_invite_priority"]'::jsonb,
    3,
    'medal_gold',
    '25 families joined. Top-of-batch activation for new invites, stronger match-ranker boost, and extended trajectory shares.'
  ),
  (
    'platinum',
    'Platinum Referrer',
    50,
    '["match_priority_boost_level_4","trajectory_extended_ttl","waitlist_invite_priority","concierge_direct_line"]'::jsonb,
    4,
    'medal_platinum',
    '50 families joined. Maximum match-ranker boost, extended shares, priority activation, and direct access to the founder.'
  )
ON CONFLICT (id) DO UPDATE
  SET
    tier_name = EXCLUDED.tier_name,
    min_conversions = EXCLUDED.min_conversions,
    perks = EXCLUDED.perks,
    display_order = EXCLUDED.display_order,
    badge_icon_hint = EXCLUDED.badge_icon_hint,
    description = EXCLUDED.description;

ALTER TABLE public.referral_reward_tiers ENABLE ROW LEVEL SECURITY;

-- Public read so the parent UI can render the full tier ladder
-- without a service-role round trip.
DROP POLICY IF EXISTS referral_reward_tiers_read_all ON public.referral_reward_tiers;
CREATE POLICY referral_reward_tiers_read_all
  ON public.referral_reward_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────
-- 2. referral_reward_grants
-- ─────────────────────────────────────────────────────────────────
-- One row per (user, tier). Idempotent insert — service layer
-- calls grantTiersIfEarned() anywhere (signup attribution, cron,
-- admin force). UNIQUE constraint makes that safe.

CREATE TABLE IF NOT EXISTS public.referral_reward_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id text NOT NULL REFERENCES public.referral_reward_tiers(id),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  -- 'system' when the automatic check-and-grant path fires;
  -- admin user_id when force-granted; text column rather than a
  -- uuid so we can distinguish the two without nullability.
  awarded_by text NOT NULL DEFAULT 'system',
  conversion_count_at_award int NOT NULL CHECK (conversion_count_at_award >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_reward_grants_user
  ON public.referral_reward_grants (user_id, awarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_reward_grants_tier
  ON public.referral_reward_grants (tier_id, awarded_at DESC);

ALTER TABLE public.referral_reward_grants ENABLE ROW LEVEL SECURITY;

-- A user can read their own grants.
DROP POLICY IF EXISTS referral_reward_grants_read_own ON public.referral_reward_grants;
CREATE POLICY referral_reward_grants_read_own
  ON public.referral_reward_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins read all.
DROP POLICY IF EXISTS referral_reward_grants_read_admin ON public.referral_reward_grants;
CREATE POLICY referral_reward_grants_read_admin
  ON public.referral_reward_grants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service-role writes only — no INSERT/UPDATE/DELETE policy.

-- ─────────────────────────────────────────────────────────────────
-- 3. referral_perk_activations
-- ─────────────────────────────────────────────────────────────────
-- One row per active perk. A single grant can activate multiple
-- perks; we keep them independent because a perk may expire or be
-- toggled (renewed) without affecting the underlying grant.

CREATE TABLE IF NOT EXISTS public.referral_perk_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.referral_reward_grants(id) ON DELETE CASCADE,
  perk_name text NOT NULL CHECK (perk_name IN (
    'match_priority_boost_level_1',
    'match_priority_boost_level_2',
    'match_priority_boost_level_3',
    'match_priority_boost_level_4',
    'trajectory_extended_ttl',
    'waitlist_invite_priority',
    'concierge_direct_line'
  )),
  activated_at timestamptz NOT NULL DEFAULT now(),
  -- NULL = permanent. Service layer honours this when filtering
  -- for "active" perks.
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_referral_perk_activations_grant
  ON public.referral_perk_activations (grant_id, activated_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_perk_activations_perk_active
  ON public.referral_perk_activations (perk_name, expires_at)
  WHERE expires_at IS NULL OR expires_at > now();

ALTER TABLE public.referral_perk_activations ENABLE ROW LEVEL SECURITY;

-- A user can read perks attached to their own grants.
DROP POLICY IF EXISTS referral_perk_activations_read_own ON public.referral_perk_activations;
CREATE POLICY referral_perk_activations_read_own
  ON public.referral_perk_activations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_reward_grants g
      WHERE g.id = referral_perk_activations.grant_id
        AND g.user_id = auth.uid()
    )
  );

-- Admin reads all.
DROP POLICY IF EXISTS referral_perk_activations_read_admin ON public.referral_perk_activations;
CREATE POLICY referral_perk_activations_read_admin
  ON public.referral_perk_activations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service-role writes only.

-- ─────────────────────────────────────────────────────────────────
-- 4. athlete_referral_priority_boost — per-athlete boost view
-- ─────────────────────────────────────────────────────────────────
-- Resolves: linked parents (verified) → their active priority-boost
-- perks → sum per athlete, clamped via LEAST to keep the ranker
-- within its ±0.05 contribution budget. The match RPC LEFT JOINs
-- this view.
--
-- Boost magnitudes per perk (encoded in the view):
--   level_1 = 0.3, level_2 = 0.5, level_3 = 0.8, level_4 = 1.0

CREATE OR REPLACE VIEW public.athlete_referral_priority_boost AS
WITH perk_magnitude(perk_name, magnitude) AS (
  VALUES
    ('match_priority_boost_level_1'::text, 0.3::numeric),
    ('match_priority_boost_level_2', 0.5),
    ('match_priority_boost_level_3', 0.8),
    ('match_priority_boost_level_4', 1.0)
),
active_parent_boost AS (
  SELECT
    g.user_id AS parent_user_id,
    SUM(pm.magnitude)::numeric AS parent_boost
  FROM public.referral_perk_activations pa
  JOIN public.referral_reward_grants g ON g.id = pa.grant_id
  JOIN perk_magnitude pm ON pm.perk_name = pa.perk_name
  WHERE pa.expires_at IS NULL OR pa.expires_at > now()
  GROUP BY g.user_id
)
SELECT
  l.athlete_user_id,
  LEAST(1.0, SUM(apb.parent_boost))::numeric AS referral_priority_boost
FROM public.hs_parent_athlete_links l
JOIN public.hs_parent_profiles pp ON pp.id = l.parent_profile_id
JOIN active_parent_boost apb ON apb.parent_user_id = pp.user_id
WHERE l.verified_at IS NOT NULL
GROUP BY l.athlete_user_id;

COMMENT ON VIEW public.athlete_referral_priority_boost IS
  'Per-athlete referral priority boost resolved from linked parents'' active perks. Only verified links contribute. Clamped to 1.0 max at the view (the RPC re-clamps for belt-and-suspenders).';

GRANT SELECT ON public.athlete_referral_priority_boost TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 5. Extend match_hs_athletes_for_brand — add referral_priority_boost
-- ─────────────────────────────────────────────────────────────────
-- Additive change: new RETURN TABLE column + one new bonus term
-- in match_score:
--
--   + 0.05 * LEAST(1.0, coalesce(referral_priority_boost, 0))
--
-- The 0.05 ceiling keeps referral influence subordinate to GPA
-- (0.35), category (0.25), state (0.20), verification tier (0.10),
-- recency (0.10), and affinity (0.10). It can only move an
-- athlete up a slot or two among otherwise-equivalent peers —
-- it cannot buy visibility that the core filters haven't earned.

DROP FUNCTION IF EXISTS public.match_hs_athletes_for_brand(uuid, numeric, int);

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
  match_score real,
  affinity_score real,
  signal_count int,
  referral_priority_boost real
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

  RAISE LOG 'match_hs_athletes_for_brand brand=% states=% categories=% min_gpa=% limit=%',
    p_brand_id, v_brand_states, v_brand_categories, p_min_gpa, p_limit_count;

  -- Scoring formula (Phase 11 additive):
  --   match_score = 0.35*gpa_norm + 0.25*category_overlap
  --               + 0.20*state_relevance + 0.10*tier_bonus
  --               + 0.10*recency_bonus
  --               + 0.10 * clamp(affinity_score/5, -0.1, 0.2)
  --               + 0.05 * LEAST(1.0, coalesce(referral_priority_boost, 0))
  --
  -- The referral term is capped at +0.05 of match_score so it
  -- can never dominate the other ranker inputs. Parents with
  -- high tiers get their kids a nudge in tie-break order.
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
      + 0.25 * 0.5
      + 0.20 * 1.0
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
      + 0.10 * LEAST(
                 0.2,
                 GREATEST(
                   -0.1,
                   COALESCE(baa.affinity_score, 0) / 5.0
                 )
               )
      + 0.05 * LEAST(1.0, COALESCE(arpb.referral_priority_boost, 0))
    )::real AS match_score,
    COALESCE(baa.affinity_score, 0)::real AS affinity_score,
    COALESCE(baa.signal_count, 0)::int AS signal_count,
    COALESCE(arpb.referral_priority_boost, 0)::real AS referral_priority_boost
  FROM public.hs_athlete_profiles hap
  JOIN public.state_nil_rules snr ON snr.state_code = hap.state_code
  LEFT JOIN auth.users au ON au.id = hap.user_id
  LEFT JOIN public.brand_athlete_affinity baa
    ON baa.brand_id = p_brand_id
   AND baa.athlete_user_id = hap.user_id
  LEFT JOIN public.athlete_referral_priority_boost arpb
    ON arpb.athlete_user_id = hap.user_id
  WHERE hap.state_code = ANY(v_brand_states)
    AND hap.is_discoverable = true
    AND snr.status = 'permitted'
    AND COALESCE(hap.gpa, 0) >= COALESCE(p_min_gpa, 0)
  ORDER BY match_score DESC, hap.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit_count, 200));
END;
$$;

REVOKE ALL ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) TO authenticated;

COMMENT ON FUNCTION public.match_hs_athletes_for_brand(uuid, numeric, int) IS
  'Ranked list of HS athletes for a brand. SECURITY DEFINER — no PII. Linear ranker + clamped affinity bonus + +0.05-capped referral priority boost. Raw match_score may exceed 1.0; UI clamps at render.';
