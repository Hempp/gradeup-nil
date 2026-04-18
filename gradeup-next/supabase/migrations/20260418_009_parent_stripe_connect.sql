-- HS-NIL Parent Stripe Connect Columns
-- ============================================================
-- Extends `hs_parent_profiles` with columns owned by the
-- Stripe Connect onboarding + custodial payout flow.
--
-- Parents (custodians) onboard via Stripe Connect Express
-- accounts. Their Stripe-assigned account id, onboarding
-- completion state, and any outstanding Stripe requirements
-- need to round-trip between the app, the /api/hs/payouts/*
-- routes, and the webhook handler.
--
-- Design notes:
--   * `stripe_connect_account_id` is UNIQUE — one Connect
--     account per parent profile. Stripe already enforces
--     account-id uniqueness on their side; this mirrors that
--     invariant locally so a duplicate row can't sneak in.
--   * `stripe_connect_onboarding_complete` is the single bit
--     the rest of the app reads to gate payouts. It's
--     recomputed from Stripe (details_submitted AND
--     payouts_enabled) via `provider.refreshDestination` and
--     the `account.updated` webhook.
--   * `stripe_connect_requirements_due` mirrors
--     Stripe's `requirements.currently_due` array so the UI
--     can prompt the parent for specific missing data without
--     another round trip.
--   * `stripe_connect_updated_at` isn't a trigger — it's
--     written explicitly whenever the Stripe-side status is
--     refreshed, so it means "last time we heard from Stripe"
--     rather than "last time this row was touched".
--
-- All changes are additive and nullable/defaulted so
-- unaffected parent rows keep behaving byte-identically.
-- ============================================================

ALTER TABLE public.hs_parent_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_requirements_due text[],
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at timestamptz;

-- Enforce one-to-one between a parent profile and a Stripe
-- Connect account id (when present). A dedicated constraint
-- (rather than an inline UNIQUE) lets IF NOT EXISTS semantics
-- stay safe on re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hs_parent_profiles_stripe_connect_account_id_key'
  ) THEN
    ALTER TABLE public.hs_parent_profiles
      ADD CONSTRAINT hs_parent_profiles_stripe_connect_account_id_key
      UNIQUE (stripe_connect_account_id);
  END IF;
END $$;

-- Partial index to accelerate webhook lookup by account id
-- (the webhook's primary join key). Partial because the vast
-- majority of rows will have NULL here until parents onboard.
CREATE INDEX IF NOT EXISTS idx_hs_parent_profiles_stripe_connect_account
  ON public.hs_parent_profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN public.hs_parent_profiles.stripe_connect_account_id IS
  'Stripe Connect Express account id (acct_...) for the custodial parent. Null until they start onboarding.';
COMMENT ON COLUMN public.hs_parent_profiles.stripe_connect_onboarding_complete IS
  'Mirror of Stripe (details_submitted AND payouts_enabled). Source of truth for "can we release a payout to this parent".';
COMMENT ON COLUMN public.hs_parent_profiles.stripe_connect_requirements_due IS
  'Stripe requirements.currently_due array. Used by the UI to prompt parents for specific missing info.';
COMMENT ON COLUMN public.hs_parent_profiles.stripe_connect_updated_at IS
  'Last time we refreshed Connect state from Stripe (via API call or webhook).';
