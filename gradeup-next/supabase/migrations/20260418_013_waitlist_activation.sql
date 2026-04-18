-- HS-NIL Phase 6 — Waitlist Activation Sequencing
-- ============================================================
-- Adds the activation lifecycle onto hs_waitlist plus a new
-- state_pilot_activations table that gates which states the
-- sequencer is allowed to touch.
--
-- Lifecycle (activation_state):
--   waiting    — default for fresh rows from /api/hs/waitlist
--   invited    — sequencer sent the invite email; token is live
--   converted  — recipient hit /hs/invite/[token] and finished signup
--   bounced    — email send returned a hard bounce; do not retry
--   opted_out  — recipient clicked the opt-out link in the invite
--
-- The sequencer picks (state_code, activation_state='waiting') rows
-- in FIFO order — whoever joined the waitlist first gets invited first.
--
-- Depends on: 20260418_003_hs_waitlist.sql and 20260418_002_hs_nil_foundations.sql.

-- ─────────────────────────────────────────────────────────────────
-- 1. Activation columns on hs_waitlist
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.hs_waitlist
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_state text NOT NULL DEFAULT 'waiting'
    CHECK (activation_state IN ('waiting','invited','converted','bounced','opted_out')),
  ADD COLUMN IF NOT EXISTS bounce_reason text;

-- Partial index — this is the hot query: "give me N waiting rows for
-- a specific state, oldest first." Partial indexes on `activation_state
-- = 'waiting'` stay tiny as the list drains.
CREATE INDEX IF NOT EXISTS idx_hs_waitlist_waiting
  ON public.hs_waitlist (state_code, created_at)
  WHERE activation_state = 'waiting';

-- Secondary index — lookup by token during invite click-through. The
-- UNIQUE constraint already indexes it, but we want a predictable
-- explain plan on the invite route.
CREATE INDEX IF NOT EXISTS idx_hs_waitlist_token
  ON public.hs_waitlist (invitation_token)
  WHERE invitation_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 2. state_pilot_activations — the gating mechanism
-- ─────────────────────────────────────────────────────────────────
-- A state is "active" (sequencer will touch it) only when there is
-- a row here AND paused_at IS NULL. Admin action creates/updates
-- these rows. Writes are service-role only; reads are open to any
-- authenticated user because the signal is harmless (it's already
-- surfaced via the waitlist form copy once we launch a state).

CREATE TABLE IF NOT EXISTS public.state_pilot_activations (
  state_code   text PRIMARY KEY REFERENCES public.state_nil_rules(state_code),
  activated_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paused_at    timestamptz,
  pause_reason text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_pilot_activations_active
  ON public.state_pilot_activations (state_code)
  WHERE paused_at IS NULL;

ALTER TABLE public.state_pilot_activations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read which states are active — it's
-- a UI affordance signal, not secret data. Anon cannot read
-- (default-deny under RLS without a policy).
CREATE POLICY state_pilot_activations_read_auth
  ON public.state_pilot_activations
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy — service_role bypasses RLS, so
-- the admin action routes (using the service-role client) are the
-- only writers by design.
