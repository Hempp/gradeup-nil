-- HS-NIL Phase 11 — TX Deferred Escrow (Escrow-Until-18)
-- ============================================================
-- Texas UIL permits HS NIL with two hard rules:
--   1. minimum_age = 17 on the deal itself (enforced at deal creation)
--   2. All athlete compensation held in custodial escrow until the
--      athlete's 18th birthday (enforced at deal approval / release)
--
-- Phase 10 left TX in state_nil_rules as status='limited' and OUT of
-- PILOT_STATES until this exact deferred-payout flow existed. This
-- migration + its sibling code promotes TX to 'permitted' + pilot.
--
-- Architecture (state-agnostic):
--   - hs_deferred_payouts is a NEW sibling table to hs_deal_parent_payouts.
--     It holds funds that cannot yet be transferred to the parent's
--     Connect account. The brand's inbound charge (hs_deal_brand_charges)
--     still captures + succeeds on contract sign — funds are parked in
--     the platform's designated custodial trust account. On the release-
--     eligible date, a cron moves the linked parent-payout row back into
--     the normal 'pending' path and releasePayout() fires the Connect
--     transfer.
--   - Only the shouldDefer() logic branches on state_code. The table,
--     cron, and release service are state-agnostic. Future states that
--     enact escrow-until-18 rules plug in without schema changes.
--   - trust_account_identifier captures the ops-reconcile reference.
--     A full multi-account sub-ledger is out of scope in this pass;
--     the concierge operational reality is a single shared interest-
--     bearing custodial account at a financial institution.
--
-- RLS posture:
--   - Athlete: SELECT own deferrals.
--   - Parent:  SELECT deferrals for their verified-linked athlete.
--   - Admin:   SELECT all (via profiles.role='admin').
--   - Writes:  service-role only. No INSERT/UPDATE policies for
--              authenticated — deferred-payouts.ts owns every write.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TX status flip — permitted + DB-side note refresh
-- ------------------------------------------------------------
-- Mirrors the in-code STATE_RULES.TX update. Idempotent — re-running
-- is safe, and `payment_deferred_until_age_18` stays true because the
-- statutory rule hasn't changed.
UPDATE public.state_nil_rules
   SET status = 'permitted',
       notes = 'UIL: permits HS NIL with minimum_age=17. Compensation is held in a custodial trust until the athlete turns 18. Handled automatically — parent''s Stripe Connect account receives the release on the 18th birthday.',
       last_reviewed = CURRENT_DATE
 WHERE state_code = 'TX';

-- ------------------------------------------------------------
-- 2. hs_deferred_payouts — the new escrow-hold table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hs_deferred_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id),
  parent_profile_id uuid NOT NULL REFERENCES public.hs_parent_profiles(id),
  brand_charge_id uuid REFERENCES public.hs_deal_brand_charges(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  deferral_reason text NOT NULL CHECK (deferral_reason IN (
    'minor_under_18_state_rule',
    'court_order',
    'custodial_dispute'
  )),
  release_eligible_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'holding' CHECK (status IN (
    'holding',
    'released',
    'forfeited',
    'refunded_to_brand'
  )),
  released_at timestamptz,
  released_transfer_id text,
  forfeiture_reason text,
  trust_account_identifier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hs_deferred_payouts IS
  'Parent-custodial payouts held in a shared trust account until release_eligible_at. State-agnostic (TX is first to hit this path); the defer decision lives in src/lib/hs-nil/deferred-payouts.ts::shouldDefer.';
COMMENT ON COLUMN public.hs_deferred_payouts.trust_account_identifier IS
  'Reference to the platform''s shared custodial trust account. Full multi-account sub-ledger is out of scope; this value lets ops reconcile.';
COMMENT ON COLUMN public.hs_deferred_payouts.release_eligible_at IS
  'For deferral_reason=minor_under_18_state_rule: the athlete''s 18th birthday at UTC midnight.';

-- Cron-friendly partial index: the daily sweep only cares about rows
-- still 'holding' whose release date has arrived.
CREATE INDEX IF NOT EXISTS idx_hs_deferred_payouts_release_window
  ON public.hs_deferred_payouts(release_eligible_at)
  WHERE status = 'holding';

CREATE INDEX IF NOT EXISTS idx_hs_deferred_payouts_athlete
  ON public.hs_deferred_payouts(athlete_user_id);

CREATE INDEX IF NOT EXISTS idx_hs_deferred_payouts_parent
  ON public.hs_deferred_payouts(parent_profile_id);

CREATE INDEX IF NOT EXISTS idx_hs_deferred_payouts_state
  ON public.hs_deferred_payouts(state_code);

-- updated_at trigger (reuse the repo's shared set_updated_at function)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hs_deferred_payouts_updated_at'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_hs_deferred_payouts_updated_at
               BEFORE UPDATE ON public.hs_deferred_payouts
               FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
ALTER TABLE public.hs_deferred_payouts ENABLE ROW LEVEL SECURITY;

-- Athlete reads their own deferrals.
DROP POLICY IF EXISTS hs_deferred_payouts_athlete_read ON public.hs_deferred_payouts;
CREATE POLICY hs_deferred_payouts_athlete_read ON public.hs_deferred_payouts
  FOR SELECT
  TO authenticated
  USING (athlete_user_id = auth.uid());

-- Parent reads deferrals for their verified-linked athlete (mirrors the
-- hs_deal_parent_payouts athlete-read path).
DROP POLICY IF EXISTS hs_deferred_payouts_parent_read ON public.hs_deferred_payouts;
CREATE POLICY hs_deferred_payouts_parent_read ON public.hs_deferred_payouts
  FOR SELECT
  TO authenticated
  USING (
    parent_profile_id IN (
      SELECT id FROM public.hs_parent_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Admin reads all (same pattern as admin_audit_log).
DROP POLICY IF EXISTS hs_deferred_payouts_admin_read ON public.hs_deferred_payouts;
CREATE POLICY hs_deferred_payouts_admin_read ON public.hs_deferred_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies — service-role only, via
-- src/lib/hs-nil/deferred-payouts.ts.

-- ------------------------------------------------------------
-- 4. hs_deal_parent_payouts — link to deferred_payout + 'deferred' status
-- ------------------------------------------------------------
-- A deferred deal still gets ONE hs_deal_parent_payouts row so joins
-- (and downstream UI) keep working uniformly. The row carries status
-- 'deferred' and deferred_payout_id points at its hold record. When
-- the release cron fires, the row is flipped back to 'pending' and
-- re-enters the normal release path via releasePayout().
ALTER TABLE public.hs_deal_parent_payouts
  ADD COLUMN IF NOT EXISTS deferred_payout_id uuid
    REFERENCES public.hs_deferred_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hs_deal_parent_payouts_deferred
  ON public.hs_deal_parent_payouts(deferred_payout_id)
  WHERE deferred_payout_id IS NOT NULL;

-- Extend the status CHECK to include 'deferred'. Postgres doesn't have
-- a clean way to alter a CHECK in place, so we drop + re-add under a
-- DO block to stay idempotent.
DO $$
DECLARE
  check_name text;
BEGIN
  SELECT conname INTO check_name
    FROM pg_constraint
   WHERE conrelid = 'public.hs_deal_parent_payouts'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%status%';

  IF check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hs_deal_parent_payouts DROP CONSTRAINT %I', check_name);
  END IF;

  ALTER TABLE public.hs_deal_parent_payouts
    ADD CONSTRAINT hs_deal_parent_payouts_status_check
    CHECK (status IN ('pending','authorized','paid','failed','refunded','deferred'));
END $$;

COMMENT ON COLUMN public.hs_deal_parent_payouts.deferred_payout_id IS
  'When set, this payout is held in hs_deferred_payouts until release_eligible_at. Status will be ''deferred'' until the cron releases it, at which point status flips to ''pending'' and the normal release path runs.';

-- ------------------------------------------------------------
-- 5. admin_audit_log — new actions + new target kind
-- ------------------------------------------------------------
-- Extend the CHECK constraints so the Phase 11 force-release /
-- forfeiture admin actions can be logged.
DO $$
DECLARE
  action_check text;
  kind_check text;
BEGIN
  SELECT conname INTO action_check
    FROM pg_constraint
   WHERE conrelid = 'public.admin_audit_log'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%action%';
  IF action_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.admin_audit_log DROP CONSTRAINT %I', action_check);
  END IF;
  ALTER TABLE public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
      'disclosure_retry',
      'payout_resolve',
      'link_force_verify',
      'consent_renewal_nudge',
      'deferred_release_forced',
      'deferred_release_forfeited'
    ));

  SELECT conname INTO kind_check
    FROM pg_constraint
   WHERE conrelid = 'public.admin_audit_log'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%target_kind%';
  IF kind_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.admin_audit_log DROP CONSTRAINT %I', kind_check);
  END IF;
  ALTER TABLE public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
      'disclosure',
      'payout',
      'link',
      'consent',
      'deferred_payout'
    ));
END $$;
