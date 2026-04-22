-- Supporter Payments (Option B — NIL, not a donation)
-- ============================================================
-- A regular fan ("supporter") pays an athlete directly for a
-- deliverable: a shoutout post, personalized message, or short
-- video. This is taxable NIL income to the athlete and NOT a
-- charitable donation — no 501(c)(3) involvement, no deduction
-- claim, no tax receipt. Supporter just gets the shoutout.
--
-- Legal positioning is enforced at the UI/copy level; this
-- schema is the minimum we need to process the transaction
-- and later pay out the athlete.

CREATE TABLE IF NOT EXISTS public.supporter_payments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  supporter_email       text        NOT NULL,
  supporter_name        text,
  supporter_message     text        CHECK (char_length(coalesce(supporter_message, '')) <= 500),

  amount_cents          integer     NOT NULL CHECK (amount_cents >= 100),
  currency              text        NOT NULL DEFAULT 'usd',

  status                text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'failed', 'expired')),

  stripe_session_id     text        UNIQUE,
  stripe_payment_intent text        UNIQUE,
  stripe_customer_id    text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  paid_at               timestamptz,
  refunded_at           timestamptz,

  -- Athletes pay out once compliance checks (parent consent for minors,
  -- state NIL rules, etc.) are satisfied. Until then the funds sit in
  -- the platform Stripe account; payout_at is stamped when a payout
  -- transfer succeeds.
  payout_at             timestamptz,
  payout_transfer_id    text
);

CREATE INDEX IF NOT EXISTS idx_supporter_payments_athlete
  ON public.supporter_payments(athlete_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supporter_payments_status
  ON public.supporter_payments(status, created_at DESC)
  WHERE status IN ('pending', 'paid');

CREATE INDEX IF NOT EXISTS idx_supporter_payments_session
  ON public.supporter_payments(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

COMMENT ON TABLE public.supporter_payments IS
  'Direct fan-to-athlete NIL payments. Taxable NIL income to the athlete; not tax-deductible to the supporter. IRS AM-2023-004 compliant by construction — no donation framing.';

ALTER TABLE public.supporter_payments ENABLE ROW LEVEL SECURITY;

-- Athlete can read their own payments.
CREATE POLICY supporter_payments_read_own_athlete
  ON public.supporter_payments
  FOR SELECT
  USING (athlete_user_id = auth.uid());

-- No direct INSERT/UPDATE via anon key — writes happen via service-role
-- from the checkout endpoint and webhook handler only.
