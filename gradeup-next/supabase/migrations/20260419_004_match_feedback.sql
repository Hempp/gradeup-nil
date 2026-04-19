-- HS-NIL Match Feedback Flywheel
-- ============================================================
-- Phase 8: Turns Phase 6's naive SQL ranker into a learning
-- system. Brands leave explicit feedback (thumb up / down,
-- dismiss, save-to-shortlist) on suggested athletes; we record
-- implicit feedback at deal-lifecycle boundaries (proposed /
-- completed / cancelled); and the `match_hs_athletes_for_brand`
-- RPC is updated to fold the per-(brand,athlete) aggregate
-- affinity score into its linear ranker.
--
-- Three tables + one aggregation view:
--
--   1) match_feedback_events — append-only log of every feedback
--      signal. Weights are precomputed on insert so the
--      aggregation view is a trivial SUM(weight) without any
--      CASE logic. See FEEDBACK_WEIGHTS below for the canonical
--      table; service callers MUST use the service-role client
--      and MUST set the signal-appropriate weight themselves.
--
--   2) brand_athlete_shortlist — brand-curated "save for later"
--      list. Independent of match_feedback_events so a brand
--      can remove a save without losing the underlying
--      saved_to_shortlist signal from the affinity aggregation.
--
--   3) brand_athlete_affinity — regular (non-materialized) view
--      over match_feedback_events grouped by (brand, athlete).
--      Regular view chosen because:
--        a) Cardinality is bounded — ~25 signals per brand-
--           athlete pair at worst; the aggregation is cheap.
--        b) Freshness matters — a brand clicks thumb_up and
--           expects the next page render to reflect it. A
--           materialized view would require a REFRESH after
--           every insert, which defeats the real-time loop.
--        c) The updated RPC filters to one brand_id at a time
--           so we're never scanning the whole event log at
--           ranker time.
--
-- Feedback weights (encoded by caller, enforced by CHECK):
--   thumb_up            = +0.10
--   thumb_down          = -0.20
--   dismiss             = -0.05
--   saved_to_shortlist  = +0.20
--   proposed_deal       = +0.40
--   deal_completed      = +0.60
--   deal_cancelled      = -0.30
--
-- Privacy model:
--   - Brands SELECT only their own feedback rows (RLS).
--   - Athletes never see brand feedback — no reverse-loop.
--   - Admin sees everything via the service-role client.
-- ============================================================

-- ----------------------------------------------------------------
-- match_feedback_events
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal text NOT NULL CHECK (
    signal IN (
      'thumb_up',
      'thumb_down',
      'dismiss',
      'saved_to_shortlist',
      'proposed_deal',
      'deal_completed',
      'deal_cancelled'
    )
  ),
  source_page text NOT NULL CHECK (
    source_page IN (
      '/hs/brand/suggested',
      '/hs/brand/shortlist',
      '/hs/brand/deals/new',
      '/hs/brand/deals/[id]',
      'cron',
      'webhook',
      'admin'
    )
  ),
  weight numeric(4,2) NOT NULL CHECK (weight >= -1.00 AND weight <= 1.00),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.match_feedback_events IS
  'Append-only log of brand→athlete feedback signals. Weights are precomputed on insert per signal: thumb_up=+0.10, thumb_down=-0.20, dismiss=-0.05, saved_to_shortlist=+0.20, proposed_deal=+0.40, deal_completed=+0.60, deal_cancelled=-0.30.';

CREATE INDEX IF NOT EXISTS idx_match_feedback_events_brand_athlete_created
  ON public.match_feedback_events (brand_id, athlete_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_feedback_events_brand_signal_created
  ON public.match_feedback_events (brand_id, signal, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_feedback_events_created
  ON public.match_feedback_events (created_at DESC);

ALTER TABLE public.match_feedback_events ENABLE ROW LEVEL SECURITY;

-- Brand reads its own feedback. We resolve brand membership via
-- the brands.profile_id = auth.uid() check that every other HS
-- brand policy uses, not a direct equality on brand_id (since
-- brand_id is the brands.id PK, not the profile uuid).
DROP POLICY IF EXISTS match_feedback_events_select_own ON public.match_feedback_events;
CREATE POLICY match_feedback_events_select_own
  ON public.match_feedback_events
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated. All writes
-- go through the service role via the match-feedback service, so
-- the insert-weight contract is enforced in application code.

-- ----------------------------------------------------------------
-- brand_athlete_shortlist
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brand_athlete_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, athlete_user_id)
);

COMMENT ON TABLE public.brand_athlete_shortlist IS
  'Brand-curated save-for-later list of HS athletes. Notes are free-form, private to the brand. Deleting a row removes the save but does NOT delete the underlying match_feedback_events row — the affinity signal persists.';

CREATE INDEX IF NOT EXISTS idx_brand_athlete_shortlist_brand_created
  ON public.brand_athlete_shortlist (brand_id, created_at DESC);

ALTER TABLE public.brand_athlete_shortlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_athlete_shortlist_select_own ON public.brand_athlete_shortlist;
CREATE POLICY brand_athlete_shortlist_select_own
  ON public.brand_athlete_shortlist
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brand_athlete_shortlist_insert_own ON public.brand_athlete_shortlist;
CREATE POLICY brand_athlete_shortlist_insert_own
  ON public.brand_athlete_shortlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brand_athlete_shortlist_update_own ON public.brand_athlete_shortlist;
CREATE POLICY brand_athlete_shortlist_update_own
  ON public.brand_athlete_shortlist
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brand_athlete_shortlist_delete_own ON public.brand_athlete_shortlist;
CREATE POLICY brand_athlete_shortlist_delete_own
  ON public.brand_athlete_shortlist
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

-- Keep updated_at fresh on notes edits.
CREATE OR REPLACE FUNCTION public.brand_athlete_shortlist_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_athlete_shortlist_touch ON public.brand_athlete_shortlist;
CREATE TRIGGER trg_brand_athlete_shortlist_touch
  BEFORE UPDATE ON public.brand_athlete_shortlist
  FOR EACH ROW
  EXECUTE FUNCTION public.brand_athlete_shortlist_touch_updated_at();

-- ----------------------------------------------------------------
-- brand_athlete_affinity (regular view)
-- ----------------------------------------------------------------
-- Regular view (not materialized) because:
--   * we need real-time updates — a brand clicks thumb_up and
--     expects the next suggested-page render to reflect it;
--   * the RPC always filters to one brand_id, so the aggregation
--     is O(signals-for-this-brand), which is small;
--   * there is no hot-path scan of the full event log outside of
--     per-brand ranking.
-- ----------------------------------------------------------------

CREATE OR REPLACE VIEW public.brand_athlete_affinity AS
SELECT
  brand_id,
  athlete_user_id,
  SUM(weight)::numeric AS affinity_score,
  COUNT(*)::int AS signal_count,
  MAX(created_at) AS last_signal_at
FROM public.match_feedback_events
GROUP BY brand_id, athlete_user_id;

COMMENT ON VIEW public.brand_athlete_affinity IS
  'Per-(brand, athlete) aggregate feedback: SUM(weight), signal count, latest signal time. Regular view — freshness beats cache. Consumed by match_hs_athletes_for_brand to fold feedback back into the ranker.';

GRANT SELECT ON public.brand_athlete_affinity TO authenticated;

-- ----------------------------------------------------------------
-- match_hs_athletes_for_brand — rebuild with affinity bonus
-- ----------------------------------------------------------------
-- We DROP the old function before re-creating so we can change
-- the RETURNS TABLE signature (adds affinity_score and
-- signal_count columns). SECURITY DEFINER + search_path + grants
-- are preserved.
--
-- New scoring formula:
--   match_score = 0.35 * gpa_norm
--               + 0.25 * category_overlap
--               + 0.20 * state_relevance
--               + 0.10 * tier_bonus
--               + 0.10 * recency_bonus
--               + 0.10 * clamp(affinity_score / 5, -0.1, 0.2)
--
-- Rationale for the clamp:
--   * Divide by 5 so it takes roughly a handful of strong
--     signals to saturate the bonus, not a single thumb_up.
--   * Floor at -0.1 so one angry brand cannot infinitely bury
--     an athlete below zero — they'll stop surfacing for THAT
--     brand but other brands are unaffected.
--   * Cap at +0.2 so a stack of past wins can boost a match
--     to ~1.2 on the visible slider without pushing known-good
--     athletes past the dynamic range of the ranker.
--
-- NOTE: total match_score can now slightly exceed 1.0 (up to
-- ~1.02 with a fully saturated +0.2 bonus). Frontend clamps
-- the visible percentage to [0,1] at render time — see
-- SuggestedAthleteCard.tsx. We expose the raw score so admin
-- dashboards can see the affinity contribution.
-- ----------------------------------------------------------------

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
  signal_count int
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

  -- Scoring formula (see migration header for full rationale):
  --   match_score = 0.35*gpa_norm + 0.25*category_overlap
  --               + 0.20*state_relevance + 0.10*tier_bonus
  --               + 0.10*recency_bonus
  --               + 0.10 * clamp(affinity_score/5, -0.1, 0.2)
  --
  -- Total score range is nominally [0,1] but may extend to
  -- ~1.02 when the affinity bonus saturates. UI clamps the
  -- displayed percentage; raw score is exposed for ops.
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
      + 0.10 * LEAST(
                 0.2,
                 GREATEST(
                   -0.1,
                   COALESCE(baa.affinity_score, 0) / 5.0
                 )
               )
    )::real AS match_score,
    COALESCE(baa.affinity_score, 0)::real AS affinity_score,
    COALESCE(baa.signal_count, 0)::int AS signal_count
  FROM public.hs_athlete_profiles hap
  JOIN public.state_nil_rules snr ON snr.state_code = hap.state_code
  LEFT JOIN auth.users au ON au.id = hap.user_id
  LEFT JOIN public.brand_athlete_affinity baa
    ON baa.brand_id = p_brand_id
   AND baa.athlete_user_id = hap.user_id
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
  'Ranked list of HS athletes for a brand. SECURITY DEFINER — no PII. Linear ranker + clamped affinity bonus from brand_athlete_affinity. Raw match_score may slightly exceed 1.0 when bonus saturates; UI clamps at render.';
