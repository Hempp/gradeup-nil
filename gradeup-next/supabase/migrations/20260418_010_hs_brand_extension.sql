-- HS-NIL Brand Extension
-- ============================================================
-- Adds the HS-NIL fields to the existing `brands` table so the
-- same brand row can carry both college and high-school supply.
-- Changes are additive and defaulted — existing college brands
-- keep behaving byte-identically:
--
--   brands.is_hs_enabled       defaults false (college-only)
--   brands.hs_target_states    NULL/empty (no HS targeting)
--   brands.hs_deal_categories  NULL/empty (no HS categories)
--
-- Schema strategy rationale:
--   We chose additive columns rather than a separate
--   `hs_brand_profiles` extension table (the pattern used for
--   hs_athlete_profiles / hs_parent_profiles). Parents and
--   athletes are fundamentally separate entities from the
--   college-side model — an HS athlete is NOT the same row as a
--   college athlete. A brand, by contrast, is the same business
--   whether it sponsors a college athlete or an HS athlete — the
--   only difference is three targeting flags. Additive columns
--   keep the supply-side unified and avoid a join on every
--   brand query.
--
--   The taxonomy for hs_deal_categories is free-text at the DB
--   layer (documented via COMMENT) but the application enforces
--   the controlled vocabulary at the form layer — these ids must
--   match the consent-scope categories in
--   ConsentRequestForm.DEAL_CATEGORIES and the mapper in
--   `src/lib/hs-nil/deal-validation.ts::mapDealTypeToConsentCategory`.
--
-- State validation strategy:
--   hs_target_states is a text[] with a CHECK constraint that
--   every code is exactly 2 uppercase letters. Cross-table FK
--   against state_nil_rules.state_code is intentionally enforced
--   at the application layer — array-element FKs in Postgres are
--   awkward and the app already validates against PILOT_STATES
--   before insert.
-- ============================================================

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS is_hs_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hs_target_states text[],
  ADD COLUMN IF NOT EXISTS hs_deal_categories text[];

-- CHECK: every entry in hs_target_states is a 2-letter code.
-- Uses a DO block so re-runs don't fail on the existing constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_hs_target_states_shape'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_hs_target_states_shape
      CHECK (
        hs_target_states IS NULL
        OR (
          array_length(hs_target_states, 1) IS NULL
          OR (
            -- every element matches ^[A-Z]{2}$
            (
              SELECT bool_and(code ~ '^[A-Z]{2}$')
              FROM unnest(hs_target_states) AS code
            )
          )
        )
      );
  END IF;
END $$;

-- Partial index for fast lookup of HS-enabled brands (supply-side
-- discovery queries from the ops dashboard and the athlete-side
-- "available brands" count).
CREATE INDEX IF NOT EXISTS idx_brands_hs_enabled
  ON public.brands(is_hs_enabled)
  WHERE is_hs_enabled = true;

-- GIN index so we can answer "which HS brands operate in my state?"
-- without a seq scan on every brand row.
CREATE INDEX IF NOT EXISTS idx_brands_hs_target_states
  ON public.brands USING gin(hs_target_states)
  WHERE is_hs_enabled = true;

COMMENT ON COLUMN public.brands.is_hs_enabled IS
  'True when this brand has opted into the HS-NIL supply side. Flipped at HS brand signup; college brands default false.';
COMMENT ON COLUMN public.brands.hs_target_states IS
  'USPS 2-letter codes for the pilot states this brand operates in. Validated against state_nil_rules.state_code at the app layer.';
COMMENT ON COLUMN public.brands.hs_deal_categories IS
  'Consent-scope category ids the brand is willing to post deals for. Expected vocabulary: apparel, food_beverage, local_business, training, autograph, social_media_promo. Must match ConsentRequestForm.DEAL_CATEGORIES so the deal-validation mapper accepts them.';

-- RLS on brands is unchanged: the existing policies continue to
-- gate read/write. The HS-enabled brand is still the same row.
