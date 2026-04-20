-- HS-NIL Phase 13 (BRAND-FMV) — Brand-perspective valuation logs
-- ============================================================
-- Extends `valuation_requests` (20260419_016) to log BRAND-side
-- Fair-Market-Value calculator submissions alongside the existing
-- athlete-side rows. Same table, additive columns, existing RLS
-- applies unchanged.
--
-- Why not a new table?
-- ────────────────────
-- The same admin analytics page should surface both funnels side-
-- by-side. A `perspective` discriminator keeps the storage + query
-- model simple and lets us reuse all existing indexes, the
-- hashed-IP privacy model, and the service-role-only insert path.
--
-- Additive contract
-- ─────────────────
--   1. `perspective` defaults to 'athlete' so every existing row
--      backfills cleanly without an UPDATE statement.
--   2. `brand_context` is nullable JSONB; athlete rows leave it
--      NULL, brand rows serialize vertical, deliverable type,
--      athlete count, and campaign notes into it.
--
-- Scope bounded to this migration:
--   * Column additions + CHECK constraint + supporting index.
--   * Column + table comments.
--
-- Out of scope (intentionally not touched):
--   * RLS policies — existing `valuation_requests_admin_select`
--     still governs reads. Service-role bypasses RLS for inserts.
--   * Rollups or aggregation views — admin-analytics page slices
--     live on the base table for now; if volume grows we'll add
--     a materialized view later.
-- ============================================================

ALTER TABLE public.valuation_requests
  ADD COLUMN IF NOT EXISTS perspective text NOT NULL DEFAULT 'athlete';

-- CHECK is wrapped in a DO block so the migration is idempotent
-- (ADD CONSTRAINT IF NOT EXISTS exists only from Postgres 16+).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valuation_requests_perspective_chk'
      AND conrelid = 'public.valuation_requests'::regclass
  ) THEN
    ALTER TABLE public.valuation_requests
      ADD CONSTRAINT valuation_requests_perspective_chk
      CHECK (perspective IN ('athlete', 'brand'));
  END IF;
END $$;

ALTER TABLE public.valuation_requests
  ADD COLUMN IF NOT EXISTS brand_context jsonb;

-- Admin analytics queries always filter by perspective before
-- aggregating. A partial index on the brand half keeps the
-- "brand lead list" query fast even once athlete-side volume
-- dominates the table.
CREATE INDEX IF NOT EXISTS idx_valuation_requests_brand_created
  ON public.valuation_requests (created_at DESC)
  WHERE perspective = 'brand';

COMMENT ON COLUMN public.valuation_requests.perspective IS
  'Which side submitted the calculator: ''athlete'' (public /hs/valuation) or ''brand'' (public /solutions/brands/fmv). Existing rows default to ''athlete''.';
COMMENT ON COLUMN public.valuation_requests.brand_context IS
  'Brand-perspective-only JSONB. Shape documented in src/lib/hs-nil/valuation.ts::BrandValuationContext — vertical, deliverable type, athlete count, optional campaign notes. Null for athlete rows.';
