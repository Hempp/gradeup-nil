-- HS-NIL Phase 1 — Waitlist Capture
-- ============================================================
-- Public-facing waitlist table for the HS-NIL beta. Anonymous
-- inserts are allowed by design (this is how we collect demand
-- signal before auth exists for the HS side). Reads are
-- server-only — no client should pull this list.
--
-- Depends on: 20260418_002_hs_nil_foundations.sql (state_nil_rules).

CREATE TABLE IF NOT EXISTS public.hs_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('athlete', 'parent', 'coach', 'brand')),
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  grad_year int CHECK (grad_year IS NULL OR (grad_year BETWEEN 2026 AND 2035)),
  sport text,
  school_name text,
  referred_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate signups (email+role pair is the uniqueness key —
-- a parent and their athlete can both sign up with the same email if
-- they choose different roles).
CREATE UNIQUE INDEX IF NOT EXISTS idx_hs_waitlist_email_role
  ON public.hs_waitlist (lower(email), role);

CREATE INDEX IF NOT EXISTS idx_hs_waitlist_state ON public.hs_waitlist(state_code);
CREATE INDEX IF NOT EXISTS idx_hs_waitlist_created_at ON public.hs_waitlist(created_at);

ALTER TABLE public.hs_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated inserts. This is intentional — the whole
-- point of a waitlist is to capture demand before the user has an
-- account. Validation and abuse prevention live at the API layer
-- (zod + rate limit + state gating).
CREATE POLICY hs_waitlist_insert_public ON public.hs_waitlist
  FOR INSERT WITH CHECK (true);

-- Nobody reads the waitlist via the anon/authenticated roles.
-- Admin dashboards must use the service_role key server-side.
CREATE POLICY hs_waitlist_read_none ON public.hs_waitlist
  FOR SELECT USING (false);
