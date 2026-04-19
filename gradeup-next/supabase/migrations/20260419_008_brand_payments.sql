-- HS-NIL Phase 10 — Brand Payments / Inbound Escrow
-- ============================================================
-- Close the money loop on HS NIL deals. Until this migration,
-- payouts flowed OUT to the parent custodian (via Stripe Connect)
-- but nothing flowed IN from the brand. This migration adds the
-- inbound side:
--
--   brands                     gets Stripe Customer columns so a
--                              brand's default payment method can
--                              be re-used across multiple deals.
--
--   hs_deal_brand_charges      per-deal PaymentIntent lifecycle
--                              row. One row per deal (UNIQUE),
--                              mirroring the shape of
--                              hs_deal_parent_payouts.
--
--   hs_deal_parent_payouts     gains a `brand_charge_id` FK so
--                              ops can audit the full inbound-to-
--                              outbound path for any deal without
--                              a two-sided join through deals.
--
-- Capture strategy (documented for future readers): we create the
-- PaymentIntent with capture_method='automatic' on contract sign
-- and release via a separate Transfer on brand approval. The
-- alternative (capture_method='manual' + capture at approval)
-- was rejected because the Stripe auth window (~7 days) can
-- expire between sign and approval for long-running deliverables.
-- Treating the charge and the payout as two independent events
-- also makes refunds and partial releases cleaner.
--
-- RLS:
--   * Brand sees own charges (join via brands.profile_id = auth.uid()).
--   * Athlete sees charges on their own deals (read-only status).
--   * All writes are service-role only (no INSERT/UPDATE policies
--     for authenticated) — the escrow module in
--     src/lib/hs-nil/escrow.ts owns every write.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. brands — Stripe Customer columns
-- ----------------------------------------------------------------
--
-- A brand may attach a payment method once and re-use it across
-- many deals. We persist the Stripe Customer id and the default
-- PaymentMethod id so every deal's PaymentIntent can reference
-- them without re-prompting the brand.
--
-- Additive + nullable — existing brand rows (including college
-- brands) are unaffected.
-- ----------------------------------------------------------------

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS default_payment_method_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brands_stripe_customer_id_key'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_stripe_customer_id_key
      UNIQUE (stripe_customer_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_brands_stripe_customer
  ON public.brands(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.brands.stripe_customer_id IS
  'Stripe Customer id (cus_...) created on first payment-method setup. Enables card re-use across deals.';
COMMENT ON COLUMN public.brands.default_payment_method_id IS
  'Stripe PaymentMethod id (pm_...) attached to the customer and set as the default for invoice/payment flows.';

-- ----------------------------------------------------------------
-- 2. hs_deal_brand_charges — inbound PaymentIntent lifecycle
-- ----------------------------------------------------------------
--
-- One row per deal (UNIQUE(deal_id)) — mirrors the shape of
-- hs_deal_parent_payouts so ops can reason about both sides of
-- the money path with the same mental model.
--
-- Status vocabulary maps onto Stripe PaymentIntent states
-- (requires_payment_method, requires_confirmation, processing,
-- requires_action, canceled, succeeded) with two platform-owned
-- terminal states:
--   released_to_parent — PaymentIntent succeeded AND the escrow
--                        release fired the Connect transfer.
--   refunded           — disputed or otherwise refunded back to
--                        the brand's card.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hs_deal_brand_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  platform_fee_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requires_payment_method'
    CHECK (status IN (
      'requires_payment_method',
      'requires_confirmation',
      'processing',
      'requires_action',
      'canceled',
      'succeeded',
      'released_to_parent',
      'refunded'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  failure_reason text,
  UNIQUE (deal_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hs_deal_brand_charges_pi_key'
  ) THEN
    ALTER TABLE public.hs_deal_brand_charges
      ADD CONSTRAINT hs_deal_brand_charges_pi_key
      UNIQUE (stripe_payment_intent_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hs_deal_brand_charges_deal
  ON public.hs_deal_brand_charges(deal_id);
CREATE INDEX IF NOT EXISTS idx_hs_deal_brand_charges_brand
  ON public.hs_deal_brand_charges(brand_id);
CREATE INDEX IF NOT EXISTS idx_hs_deal_brand_charges_status
  ON public.hs_deal_brand_charges(status);
CREATE INDEX IF NOT EXISTS idx_hs_deal_brand_charges_pi
  ON public.hs_deal_brand_charges(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.hs_deal_brand_charges IS
  'Inbound PaymentIntent lifecycle for HS NIL brand charges. One row per deal. Created at contract fully_signed; captured when Stripe reports succeeded; terminal when released to parent or refunded.';
COMMENT ON COLUMN public.hs_deal_brand_charges.platform_fee_cents IS
  'Platform fee retained on the inbound charge (informational — the actual split to parent happens on the outbound Transfer).';
COMMENT ON COLUMN public.hs_deal_brand_charges.status IS
  'Lifecycle: PaymentIntent states (requires_payment_method..succeeded) + platform-owned terminals (released_to_parent, refunded).';

-- RLS -----------------------------------------------------------

ALTER TABLE public.hs_deal_brand_charges ENABLE ROW LEVEL SECURITY;

-- Brand reads its own charges (via brands.profile_id = auth.uid()).
DROP POLICY IF EXISTS hs_deal_brand_charges_brand_read
  ON public.hs_deal_brand_charges;
CREATE POLICY hs_deal_brand_charges_brand_read
  ON public.hs_deal_brand_charges
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE profile_id = auth.uid()
    )
  );

-- Athlete reads charge status on deals they're a party to (read
-- status only — the RLS surface is the whole row, so the UI is
-- expected to whitelist the columns it renders; service helpers
-- in src/lib/hs-nil/escrow.ts::getBrandChargeForDeal elide the
-- stripe_payment_intent_id for non-brand callers).
DROP POLICY IF EXISTS hs_deal_brand_charges_athlete_read
  ON public.hs_deal_brand_charges;
CREATE POLICY hs_deal_brand_charges_athlete_read
  ON public.hs_deal_brand_charges
  FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- Parent reads charge status on their linked athlete's deals (same
-- path the parent dashboard uses for the payout row).
DROP POLICY IF EXISTS hs_deal_brand_charges_parent_read
  ON public.hs_deal_brand_charges;
CREATE POLICY hs_deal_brand_charges_parent_read
  ON public.hs_deal_brand_charges
  FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      JOIN public.hs_parent_athlete_links l
        ON l.athlete_user_id = a.profile_id
      JOIN public.hs_parent_profiles pp
        ON pp.id = l.parent_profile_id
      WHERE pp.user_id = auth.uid()
        AND l.verified_at IS NOT NULL
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated. All writes
-- go through src/lib/hs-nil/escrow.ts using the service-role client.

-- ----------------------------------------------------------------
-- 3. hs_deal_parent_payouts — link to inbound charge
-- ----------------------------------------------------------------

ALTER TABLE public.hs_deal_parent_payouts
  ADD COLUMN IF NOT EXISTS brand_charge_id uuid
    REFERENCES public.hs_deal_brand_charges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hs_deal_parent_payouts_brand_charge
  ON public.hs_deal_parent_payouts(brand_charge_id)
  WHERE brand_charge_id IS NOT NULL;

COMMENT ON COLUMN public.hs_deal_parent_payouts.brand_charge_id IS
  'Inbound charge that funded this payout. NULL for payouts created before this migration or funded out-of-band by ops.';
