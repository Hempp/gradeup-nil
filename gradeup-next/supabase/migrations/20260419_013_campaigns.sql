-- HS-NIL Phase 12 — Multi-Athlete Campaigns
-- ============================================================
-- This migration adds the campaign surface that lets a single
-- brand deploy ONE sponsorship brief to N HS athletes in
-- parallel. It is the direct counter to NIL Club's "one brand →
-- 150+ athletes" pattern while keeping every HS-NIL compliance
-- mechanism (state rules, parental consent scope, disclosure
-- pipeline) intact on each individual downstream deal.
--
-- Model in one sentence:
--   hs_brand_campaigns (1) ← (N) campaign_participations
--                                        ↓ individual_deal_id
--                                     deals (1)
--
-- A participant with status='accepted' has a concrete deal row
-- spawned via the normal /api/deals insert path; deal is the
-- source of truth for contract/payout. The campaign is a
-- coordination layer on top.
--
-- Depends on:
--   public.brands                        (initial)
--   public.athletes                      (initial)
--   public.deals                         (initial + 20260418_008)
--   public.deal_share_events             (20260418_011)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. hs_brand_campaigns
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hs_brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  -- Single category per campaign — simplifies consent scope
  -- matching at apply time. Must be one of the ConsentScope
  -- categories so checkConsentScope() can gate directly.
  deal_category text NOT NULL CHECK (deal_category IN (
    'apparel',
    'food_beverage',
    'local_business',
    'training',
    'autograph',
    'social_media_promo'
  )),

  compensation_type text NOT NULL CHECK (compensation_type IN (
    'fixed_per_deliverable',
    'per_conversion',
    'tiered'
  )),
  base_compensation_cents integer NOT NULL CHECK (base_compensation_cents >= 0),

  max_athletes integer NOT NULL CHECK (max_athletes > 0 AND max_athletes <= 500),

  target_states text[] NOT NULL DEFAULT ARRAY[]::text[],

  athlete_selection text NOT NULL CHECK (athlete_selection IN (
    'open_to_apply',
    'invited_only',
    'hybrid'
  )),

  deliverables_template text,

  timeline_start date,
  timeline_end date,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'open',
    'closed',
    'completed',
    'cancelled'
  )),

  -- Computed lazily from the HS rule set. In the SELECT paths
  -- we re-derive via STATE_RULES — this column is a denormalized
  -- hint for the UI. Kept on the row so /campaigns list pages
  -- don't round-trip state_rules for the banner copy.
  requires_parental_consent boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hs_brand_campaigns IS
  'Multi-athlete HS NIL campaigns. One campaign fans out into N individual deals via campaign_participations. State-rule pre-evaluation at creation is done against the MOST RESTRICTIVE pilot state in target_states — if any target state would block the category / age / status, creation is rejected.';

CREATE INDEX IF NOT EXISTS idx_hs_brand_campaigns_brand_status
  ON public.hs_brand_campaigns (brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hs_brand_campaigns_open_target_states
  ON public.hs_brand_campaigns USING gin (target_states)
  WHERE status = 'open';

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.hs_brand_campaigns_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hs_brand_campaigns_touch ON public.hs_brand_campaigns;
CREATE TRIGGER trg_hs_brand_campaigns_touch
  BEFORE UPDATE ON public.hs_brand_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.hs_brand_campaigns_touch();

ALTER TABLE public.hs_brand_campaigns ENABLE ROW LEVEL SECURITY;

-- Brand CRUDs its own campaigns.
DROP POLICY IF EXISTS hs_brand_campaigns_select_own ON public.hs_brand_campaigns;
CREATE POLICY hs_brand_campaigns_select_own
  ON public.hs_brand_campaigns
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS hs_brand_campaigns_insert_own ON public.hs_brand_campaigns;
CREATE POLICY hs_brand_campaigns_insert_own
  ON public.hs_brand_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS hs_brand_campaigns_update_own ON public.hs_brand_campaigns;
CREATE POLICY hs_brand_campaigns_update_own
  ON public.hs_brand_campaigns
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid())
  )
  WITH CHECK (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS hs_brand_campaigns_delete_own ON public.hs_brand_campaigns;
CREATE POLICY hs_brand_campaigns_delete_own
  ON public.hs_brand_campaigns
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid())
    AND status = 'draft'
  );

-- Authenticated athletes see campaigns that are 'open' (RLS
-- ordering: both SELECT policies are ORed — match-own OR
-- is-open). Target-state + sport / consent-scope filtering is
-- done in the service layer so we don't fan out a gin index per
-- athlete here.
DROP POLICY IF EXISTS hs_brand_campaigns_select_open ON public.hs_brand_campaigns;
CREATE POLICY hs_brand_campaigns_select_open
  ON public.hs_brand_campaigns
  FOR SELECT
  TO authenticated
  USING (status = 'open');

-- ─────────────────────────────────────────────────────────────
-- 2. campaign_participations
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.hs_brand_campaigns(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'applied' CHECK (status IN (
    'applied',
    'accepted',
    'active',
    'delivered',
    'rejected',
    'withdrawn',
    'completed'
  )),

  -- Populated when brand accepts + we spawn a real deal row.
  -- Before acceptance this stays NULL; the participation is
  -- just a signed-up intent. After acceptance this points to a
  -- deals.id and the deal is the source of truth for payout.
  individual_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,

  applied_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,

  UNIQUE (campaign_id, athlete_id)
);

COMMENT ON TABLE public.campaign_participations IS
  'Join table between an HS campaign and a participating athlete. individual_deal_id is populated on brand acceptance — that deal row is the source of truth for compliance + payout. No double-payout risk because the deal is what pays.';

CREATE INDEX IF NOT EXISTS idx_campaign_participations_campaign_status
  ON public.campaign_participations (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_participations_athlete_status
  ON public.campaign_participations (athlete_user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_participations_individual_deal
  ON public.campaign_participations (individual_deal_id)
  WHERE individual_deal_id IS NOT NULL;

ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;

-- Athlete SELECTs their own participation.
DROP POLICY IF EXISTS campaign_participations_athlete_select_own
  ON public.campaign_participations;
CREATE POLICY campaign_participations_athlete_select_own
  ON public.campaign_participations
  FOR SELECT
  TO authenticated
  USING (athlete_user_id = auth.uid());

-- Brand that owns the campaign SELECTs all its participants.
DROP POLICY IF EXISTS campaign_participations_brand_select
  ON public.campaign_participations;
CREATE POLICY campaign_participations_brand_select
  ON public.campaign_participations
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM public.hs_brand_campaigns c
      JOIN public.brands b ON b.id = c.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- No authenticated INSERT / UPDATE policies — service role owns
-- the write path so we can keep the deal-spawn transactional
-- and reuse the full validateDealCreation gate before creating
-- the participation row.

-- ─────────────────────────────────────────────────────────────
-- 3. campaign_invitations
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.hs_brand_campaigns(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  response text CHECK (response IN ('accepted', 'declined', 'ignored')),

  UNIQUE (campaign_id, athlete_id)
);

COMMENT ON TABLE public.campaign_invitations IS
  'For invited_only and hybrid campaigns. Invited athletes see a pending invite on their dashboard; responding flips response + responded_at. "accepted" response spawns a campaign_participations row (service-role path).';

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_athlete_pending
  ON public.campaign_invitations (athlete_user_id)
  WHERE responded_at IS NULL;

ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_invitations_athlete_select_own
  ON public.campaign_invitations;
CREATE POLICY campaign_invitations_athlete_select_own
  ON public.campaign_invitations
  FOR SELECT
  TO authenticated
  USING (athlete_user_id = auth.uid());

DROP POLICY IF EXISTS campaign_invitations_brand_select
  ON public.campaign_invitations;
CREATE POLICY campaign_invitations_brand_select
  ON public.campaign_invitations
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM public.hs_brand_campaigns c
      JOIN public.brands b ON b.id = c.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. deals.hs_campaign_id — backlink from a deal to its campaign
-- ─────────────────────────────────────────────────────────────
-- Kept separate from the legacy college-world deals.campaign_id
-- column (which references the initial `campaigns` table).
-- `hs_campaign_id` exists only for HS-NIL campaigns and points
-- to hs_brand_campaigns.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS hs_campaign_id uuid
    REFERENCES public.hs_brand_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_hs_campaign_id
  ON public.deals(hs_campaign_id)
  WHERE hs_campaign_id IS NOT NULL;

COMMENT ON COLUMN public.deals.hs_campaign_id IS
  'HS-NIL campaign that spawned this deal. NULL for standalone single-athlete deals. One deal row per participant per campaign (guaranteed by campaign_participations.UNIQUE(campaign_id, athlete_id) + 1:1 individual_deal_id).';

-- ─────────────────────────────────────────────────────────────
-- 5. campaign_performance_summary (view)
-- ─────────────────────────────────────────────────────────────
-- Per-campaign totals:
--   participant_count    — every row in campaign_participations
--   completed_count      — status='completed'
--   total_shares         — count of deal_share_events across all
--                          individual deals spawned from this
--                          campaign
--   total_compensation_cents — sum of base_compensation_cents *
--                          count(status in active/delivered/completed)
--
-- Regular view chosen because cardinality is tiny (campaigns ×
-- distinct-participants) and brands want real-time stats as
-- shares / completions roll in.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.campaign_performance_summary AS
SELECT
  c.id AS campaign_id,
  c.brand_id,
  c.title,
  c.status,
  c.base_compensation_cents,
  COALESCE(p.participant_count, 0) AS participant_count,
  COALESCE(p.completed_count, 0) AS completed_count,
  COALESCE(p.active_count, 0) AS active_count,
  COALESCE(s.total_shares, 0) AS total_shares,
  (c.base_compensation_cents * COALESCE(p.paying_count, 0))::bigint
    AS total_compensation_cents
FROM public.hs_brand_campaigns c
LEFT JOIN (
  SELECT
    campaign_id,
    COUNT(*)::int AS participant_count,
    COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
    COUNT(*) FILTER (WHERE status IN ('active', 'delivered'))::int AS active_count,
    COUNT(*) FILTER (WHERE status IN ('active','delivered','completed'))::int AS paying_count
  FROM public.campaign_participations
  GROUP BY campaign_id
) p ON p.campaign_id = c.id
LEFT JOIN (
  SELECT
    cp.campaign_id,
    COUNT(ds.id)::int AS total_shares
  FROM public.campaign_participations cp
  JOIN public.deal_share_events ds ON ds.deal_id = cp.individual_deal_id
  GROUP BY cp.campaign_id
) s ON s.campaign_id = c.id;

COMMENT ON VIEW public.campaign_performance_summary IS
  'Aggregate stats per campaign: participants, completion count, share events (via deal_share_events join on individual_deal_id), total compensation. Regular view — freshness beats cache.';

GRANT SELECT ON public.campaign_performance_summary TO authenticated;
