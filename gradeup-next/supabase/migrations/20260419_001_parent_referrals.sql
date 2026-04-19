-- HS-NIL Phase 8 — Parent-to-Parent Referrals
-- ============================================================
-- Measurement instrument for the concierge MVP success criterion:
-- "5 unprompted parent-to-parent referrals in 30 days". Without
-- attribution we can never tell which signups came from which
-- parent; this migration adds the three tables that close the loop.
--
-- Tables
-- ──────
--   user_referral_codes     1:1 with auth.users. Stable personal slug.
--   referral_attributions   append-only row per click. referred_user_id
--                           is NULL until the click converts to a signup.
--   referral_conversion_events  per-funnel-stage audit (click → signup →
--                               consent → first deal).
--
-- Attribution flow
-- ────────────────
--   1. Visitor clicks `/hs?ref=XYZ`. Server-side RefCapture reads the
--      code, writes an `attributions` row (referred_user_id NULL) and
--      a `code_clicked` event, sets httpOnly cookie.
--   2. Same browser finishes signup. Signup completion route reads the
--      cookie server-side, sets referred_user_id + converted_at on the
--      attributions row, writes a `signup_completed` event, clears the
--      cookie.
--   3. Later funnel steps (consent, first deal) write extra events
--      against the same attributions row. See the TODOs in
--      src/lib/hs-nil/referrals.ts for call-site wiring.
--
-- Privacy / RLS
-- ─────────────
--   - user_referral_codes: a user can SELECT/UPDATE their own code.
--     Service-role inserts (the service layer handles create-or-get).
--     Anonymous reads of "does this code exist?" go through a
--     SECURITY DEFINER RPC later if needed — for now, the service role
--     handles unauthenticated click tracking.
--   - referral_attributions: referrer + referred user can each SELECT
--     their own rows. Service-role writes.
--   - referral_conversion_events: referrer can SELECT via JOIN.
--     Service-role writes.
--
-- Depends on: auth.users (managed by Supabase).

-- ─────────────────────────────────────────────────────────────────
-- 1. user_referral_codes
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_referral_codes (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('hs_parent', 'hs_athlete')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  -- Defensive: codes must be short URL-safe slugs. The service layer
  -- enforces base62; the DB enforces length + charset as a belt-and-
  -- suspenders guard so a direct-INSERT by hand can't store garbage.
  CONSTRAINT user_referral_codes_code_shape
    CHECK (code ~ '^[A-Za-z0-9]{6,24}$')
);

CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code
  ON public.user_referral_codes (code)
  WHERE disabled_at IS NULL;

ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_referral_codes_read_own
  ON public.user_referral_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies — the service role handles writes.
-- Code generation must retry on unique-violation; pushing that logic
-- to clients would invite abuse (malicious parent claiming a vanity
-- code, mining 8-char space, etc.).

-- ─────────────────────────────────────────────────────────────────
-- 2. referral_attributions
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email      text,
  role_signed_up_as   text CHECK (role_signed_up_as IN ('hs_parent', 'hs_athlete', 'hs_brand')),
  referral_code       text NOT NULL,
  converted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- A given user can only be attributed to one referrer. If a second
  -- click happens, we let the service layer decide to keep first-touch.
  CONSTRAINT referral_attributions_unique_referred
    UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer
  ON public.referral_attributions (referring_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_code
  ON public.referral_attributions (referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_converted
  ON public.referral_attributions (referring_user_id)
  WHERE referred_user_id IS NOT NULL;

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

-- The referrer always sees their own attribution rows (including
-- unconverted clicks — that's their funnel data).
CREATE POLICY referral_attributions_read_referrer
  ON public.referral_attributions
  FOR SELECT
  TO authenticated
  USING (referring_user_id = auth.uid());

-- The referred user sees the row that points at them (once converted).
CREATE POLICY referral_attributions_read_referred
  ON public.referral_attributions
  FOR SELECT
  TO authenticated
  USING (referred_user_id = auth.uid());

-- Service-role only writes — no INSERT/UPDATE policy.

-- ─────────────────────────────────────────────────────────────────
-- 3. referral_conversion_events
-- ─────────────────────────────────────────────────────────────────
-- Append-only funnel log. One row per milestone crossed. Enables
-- reporting on:
--   clicked → signed_up → first_consent_signed → first_deal_signed
-- and the ratios between them, not just "raw signups".

CREATE TABLE IF NOT EXISTS public.referral_conversion_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_attribution_id  uuid NOT NULL REFERENCES public.referral_attributions(id) ON DELETE CASCADE,
  event_type               text NOT NULL CHECK (event_type IN (
    'code_clicked',
    'signup_started',
    'signup_completed',
    'first_consent_signed',
    'first_deal_signed'
  )),
  happened_at              timestamptz NOT NULL DEFAULT now(),
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_referral_conversion_events_attribution
  ON public.referral_conversion_events (referral_attribution_id, happened_at);

CREATE INDEX IF NOT EXISTS idx_referral_conversion_events_type
  ON public.referral_conversion_events (event_type, happened_at DESC);

ALTER TABLE public.referral_conversion_events ENABLE ROW LEVEL SECURITY;

-- Referrer can read events tied to their own attributions.
CREATE POLICY referral_conversion_events_read_referrer
  ON public.referral_conversion_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_attributions ra
      WHERE ra.id = referral_conversion_events.referral_attribution_id
        AND ra.referring_user_id = auth.uid()
    )
  );

-- Service-role only writes.
