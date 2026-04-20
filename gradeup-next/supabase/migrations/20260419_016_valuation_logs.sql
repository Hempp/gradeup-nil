-- HS-NIL Phase 12 — Public Valuation Calculator: request logs
-- ============================================================
-- Stores anonymous valuation-calculator estimates for future
-- model calibration + funnel attribution to waitlist signups.
--
-- Privacy model
-- ─────────────
--   * No raw IP addresses. We hash (SHA-256 + salt) at the API
--     layer before insert.
--   * No precise user-agent fingerprints. The API coarsens to
--     "browser family / OS family" strings (e.g. "chrome / ios")
--     before insert.
--   * No user IDs — the calculator is unauthenticated.
--
-- RLS
-- ───
--   * SELECT: admins only (mirrors the admin_profile pattern
--     used across the HS-NIL admin surfaces).
--   * INSERT: service-role only. The public POST endpoint at
--     /api/hs/valuation/estimate uses the service-role key
--     because the row inserts bypass RLS (the user is
--     unauthenticated, and we never want anon read access to
--     this table).
--   * UPDATE: service-role only (for conversion attribution).
--
-- Retention
-- ─────────
--   * For now: retain indefinitely — volume is small and model
--     calibration benefits from long-tailed samples.
--   * TODO: once table exceeds ~100k rows, add a nightly cleanup
--     cron that prunes rows older than 180 days, keeping the
--     aggregate summary stats on a separate rolled-up table.
--
-- Depends on: public.hs_waitlist (20260418_003).

CREATE TABLE IF NOT EXISTS public.valuation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Full input payload. JSONB so the shape can evolve with
  -- methodology versions without forcing a schema migration
  -- every time we add a coefficient. Shape is documented in
  -- src/lib/hs-nil/valuation.ts::ValuationInput.
  inputs jsonb NOT NULL,

  -- Denormalized headline numbers for fast analytics roll-ups.
  -- These must match what we returned to the client; the API
  -- writes them in the same call so aggregation queries don't
  -- need to unpack the JSONB on every row.
  estimate_low_cents integer NOT NULL CHECK (estimate_low_cents >= 0),
  estimate_mid_cents integer NOT NULL CHECK (estimate_mid_cents >= 0),
  estimate_high_cents integer NOT NULL CHECK (estimate_high_cents >= 0),

  -- Methodology version — lets us filter analytics by "rows
  -- computed under v1.0.0" vs "v1.1.0" when we iterate.
  methodology_version text NOT NULL DEFAULT 'v1.0.0-2026-04-19',

  -- Privacy-preserving provenance. Hashed at API layer. Never raw.
  ip_hash text,
  user_agent_hint text,   -- coarse "chrome / ios" style, max ~40 chars
  referrer_url text,

  -- Conversion funnel. Flipped true when a post-result waitlist
  -- signup completes. Null waitlist_id means no conversion yet.
  converted_to_waitlist boolean NOT NULL DEFAULT false,
  converted_waitlist_id uuid REFERENCES public.hs_waitlist(id) ON DELETE SET NULL,
  converted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes supporting the admin analytics dashboard.
CREATE INDEX IF NOT EXISTS idx_valuation_requests_created_at
  ON public.valuation_requests(created_at DESC);

-- Partial index: only un-converted rows (rarer + queried together).
CREATE INDEX IF NOT EXISTS idx_valuation_requests_converted
  ON public.valuation_requests(converted_to_waitlist, created_at DESC);

-- Inputs gin index for trend analysis (which sports trending, etc.).
-- Operator-class jsonb_path_ops is smaller + faster for @> lookups.
CREATE INDEX IF NOT EXISTS idx_valuation_requests_inputs_gin
  ON public.valuation_requests USING gin (inputs jsonb_path_ops);

-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.valuation_requests ENABLE ROW LEVEL SECURITY;

-- Admin read. Service-role writes. Anon/authenticated: nothing.
CREATE POLICY valuation_requests_admin_select ON public.valuation_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Writes happen from the service-role client only. No public
-- INSERT / UPDATE / DELETE policies — service_role bypasses RLS.

COMMENT ON TABLE public.valuation_requests IS
  'Anonymous NIL valuation calculator requests. Privacy: hashed IP, coarse UA, no PII. Service-role writes; admin reads. Retention: indefinite for now; add TTL cleanup at ~100k rows.';
