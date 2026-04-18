-- HS-NIL Deals Schema Extension
-- ============================================================
-- Extends the existing `athletes` + `deals` tables so the same
-- deal pipeline can carry both college and high-school flows.
--
-- All changes are additive and defaulted so existing college
-- rows keep behaving byte-identically:
--   - athletes.bracket       defaults 'college'
--   - deals.target_bracket   defaults 'college'
--   - deals.requires_disclosure defaults false
--   - deals.parental_consent_id / state_code / disclosure_id  NULL
--
-- Also adds `hs_deal_parent_payouts` as a scaffold for the
-- parent-custodial Stripe Connect payout flow. The actual
-- Stripe integration is handled by a separate agent; this
-- migration just gives them a table with the right shape and
-- RLS semantics.
--
-- Backfill block at the bottom ensures every existing
-- `hs_athlete_profiles` row gets a matching `athletes` row so
-- HS athletes can be parties to deals without waiting for a
-- new signup.
-- ============================================================

-- ============================================================
-- 1. athletes.bracket
-- ============================================================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS bracket text NOT NULL DEFAULT 'college'
    CHECK (bracket IN ('college', 'high_school'));

CREATE INDEX IF NOT EXISTS idx_athletes_bracket
  ON public.athletes(bracket);

COMMENT ON COLUMN public.athletes.bracket IS
  'Which NIL bracket this athlete belongs to. Drives deal gating, disclosure flow, and consent requirements.';

-- ============================================================
-- 2. deals — HS-specific columns (all nullable / defaulted)
-- ============================================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS target_bracket text NOT NULL DEFAULT 'college'
    CHECK (target_bracket IN ('college', 'high_school', 'both')),
  ADD COLUMN IF NOT EXISTS parental_consent_id uuid
    REFERENCES public.parental_consents(id),
  ADD COLUMN IF NOT EXISTS state_code text
    REFERENCES public.state_nil_rules(state_code),
  ADD COLUMN IF NOT EXISTS requires_disclosure boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disclosure_id uuid
    REFERENCES public.hs_deal_disclosures(id);

CREATE INDEX IF NOT EXISTS idx_deals_target_bracket
  ON public.deals(target_bracket)
  WHERE target_bracket != 'college';

CREATE INDEX IF NOT EXISTS idx_deals_state_code
  ON public.deals(state_code)
  WHERE state_code IS NOT NULL;

COMMENT ON COLUMN public.deals.target_bracket IS
  'Who this deal is targeted at: college only, high-school only, or both.';
COMMENT ON COLUMN public.deals.parental_consent_id IS
  'Parental consent record gating this deal (HS only).';
COMMENT ON COLUMN public.deals.state_code IS
  'State whose NIL rules govern this deal (HS only).';
COMMENT ON COLUMN public.deals.requires_disclosure IS
  'Whether this deal must file an outbound disclosure (HS only).';
COMMENT ON COLUMN public.deals.disclosure_id IS
  'Filed disclosure record for this deal (HS only).';

-- ============================================================
-- 3. hs_deal_parent_payouts (scaffold for Stripe Connect)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_deal_parent_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  parent_profile_id uuid NOT NULL REFERENCES public.hs_parent_profiles(id),
  stripe_connect_account_id text,
  payout_amount numeric(10, 2) NOT NULL,
  payout_currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  authorized_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  stripe_transfer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id)
);

CREATE INDEX IF NOT EXISTS idx_hs_deal_parent_payouts_deal
  ON public.hs_deal_parent_payouts(deal_id);
CREATE INDEX IF NOT EXISTS idx_hs_deal_parent_payouts_parent
  ON public.hs_deal_parent_payouts(parent_profile_id);
CREATE INDEX IF NOT EXISTS idx_hs_deal_parent_payouts_pending
  ON public.hs_deal_parent_payouts(status)
  WHERE status = 'pending';

ALTER TABLE public.hs_deal_parent_payouts ENABLE ROW LEVEL SECURITY;

-- Parent sees their own payouts (join through hs_parent_profiles).
CREATE POLICY hs_deal_parent_payouts_parent_read
  ON public.hs_deal_parent_payouts
  FOR SELECT USING (
    parent_profile_id IN (
      SELECT id FROM public.hs_parent_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Athlete sees payouts for deals they're a party to. Join path:
-- hs_deal_parent_payouts.deal_id -> deals.athlete_id -> athletes.profile_id = auth.uid().
CREATE POLICY hs_deal_parent_payouts_athlete_read
  ON public.hs_deal_parent_payouts
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- No public INSERT/UPDATE — the Stripe integration runs with the
-- service role. RLS blocks all writes from the browser by default
-- once RLS is enabled and no permissive write policies exist.

COMMENT ON TABLE public.hs_deal_parent_payouts IS
  'Parent-custodial payout records for HS NIL deals. Populated by the Stripe Connect service (separate agent scope).';

-- ============================================================
-- 4. Backfill: one athletes row per hs_athlete_profiles row
-- ============================================================
--
-- HS signup currently only writes hs_athlete_profiles. That
-- means existing HS users can't be referenced from deals.athlete_id.
-- We create matching athletes rows for every HS profile that
-- doesn't already have one, keyed via the shared user id:
--
--   profiles.id === auth.users.id === hs_athlete_profiles.user_id
--                                 === athletes.profile_id
--
-- first_name / last_name / email come from auth.users.raw_user_meta_data
-- when present, falling back to the local-part of the email.
-- school_id and sport_id stay NULL — HS signup collects free-text
-- school_name/sport on hs_athlete_profiles, and we don't want to
-- force a lookup or create placeholder rows here.
-- ============================================================

DO $$
BEGIN
  -- Guard: the backfill only runs once the FK target (profiles) has
  -- rows for every HS user. hs_athlete_profiles doesn't FK profiles,
  -- so we must create a profiles row first when missing (profiles.id
  -- FKs auth.users.id with ON DELETE CASCADE — same lifecycle).
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  SELECT
    u.id,
    COALESCE(u.email, ''),
    'athlete'::user_role,
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'first_name', ''),
             split_part(COALESCE(u.email, ''), '@', 1)),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'last_name', ''), '')
  FROM public.hs_athlete_profiles hap
  JOIN auth.users u ON u.id = hap.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );

  -- Now the athletes rows. Skip any user that already has one.
  INSERT INTO public.athletes (
    profile_id,
    first_name,
    last_name,
    email,
    bracket,
    is_searchable
  )
  SELECT
    u.id,
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'first_name', ''),
             split_part(COALESCE(u.email, 'unknown@unknown'), '@', 1)),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'last_name', ''), 'Unknown'),
    COALESCE(u.email, ''),
    'high_school',
    false
  FROM public.hs_athlete_profiles hap
  JOIN auth.users u ON u.id = hap.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.profile_id = u.id
  );
END $$;
