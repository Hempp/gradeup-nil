-- HS-NIL Phase 14 — "NIL at 1" Annual Report Snapshots
-- ============================================================
-- Frozen data+narrative dumps for each published annual report
-- ("HS NIL at 1" for 2026, "HS NIL at 2" for 2027, etc.). A
-- snapshot is the report-ready JSON blob produced by
-- src/lib/hs-nil/annual-report.ts::collectAnnualReportData PLUS
-- the finalized narrative text the founder publishes.
--
-- Why snapshot instead of recomputing at render time?
-- ───────────────────────────────────────────────────
-- The public report is cited by journalists and investors. If
-- underlying data later changes (a disputed deal flips status, a
-- backfill corrects a state code) the published numbers must NOT
-- silently shift — journalists re-read the same link and find
-- different figures. Snapshots freeze the numbers at publish
-- time. Future "corrections" get a new snapshot row with a new
-- published_at and the old row flips to status='archived'.
--
-- State machine
-- ─────────────
--   draft     → admin is iterating on numbers + narrative
--   review    → founder + reviewer(s) reading; no new data pulls
--   published → public-facing; immutable except status→archived
--   archived  → superseded by a newer published snapshot
--
-- Exactly one 'published' row is allowed per report_year. The
-- partial UNIQUE index enforces that server-side; admin UI
-- enforces it optimistically before calling the API.
--
-- RLS
-- ───
--   * admin full CRUD (mirrors valuation_requests_admin_select
--     pattern in 20260419_016).
--   * authenticated + anon SELECT where status='published' so a
--     future public /hs/reports/[year] page can render without a
--     privileged key. Not wired in this phase — the page ships
--     admin-preview-only until the first report drops — but the
--     policy is in place so we don't need a follow-up migration.
--
-- Depends on: public.profiles (role column) from 20260216_001.

CREATE TABLE IF NOT EXISTS public.annual_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The calendar year this report represents (2026 = "HS NIL at 1").
  -- Report window doesn't have to be a full calendar year (concierge
  -- MVP runs 30 days); range_start/range_end capture actual window.
  report_year integer NOT NULL CHECK (report_year BETWEEN 2025 AND 2100),

  -- Actual window the data was collected over. For the first report
  -- this is likely the concierge window (e.g. 2026-04-20 → 2026-05-20),
  -- NOT Jan 1 → Dec 31. Stored separately so admin can regenerate an
  -- equivalent snapshot against the same window later.
  range_start date NOT NULL,
  range_end date NOT NULL,
  CHECK (range_end >= range_start),

  -- Frozen JSON — AnnualReportData shape from
  -- src/lib/hs-nil/annual-report.ts::AnnualReportData.
  -- NOT nullable: a snapshot without data has no reason to exist.
  data_jsonb jsonb NOT NULL,

  -- Final narrative. Written by the founder with help of the
  -- programmatic draft from annual-report-narrative.ts. Markdown.
  -- Nullable in draft/review; required conceptually before publish
  -- (enforced at API layer, not DB — we allow publishing a numbers-
  -- only report if the narrative is truly not ready).
  narrative_text text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),

  -- Attribution for audit trail.
  author_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Set only when status transitions to 'published'.
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Query support: admin list page orders by published_at desc then
-- created_at desc. Covering both with a single composite index.
CREATE INDEX IF NOT EXISTS idx_annual_report_snapshots_year_status
  ON public.annual_report_snapshots(report_year DESC, status, created_at DESC);

-- Partial UNIQUE: only one published row per report_year.
-- This is the snapshot-discipline guarantee — the public archive
-- always resolves (year → single canonical report).
CREATE UNIQUE INDEX IF NOT EXISTS ux_annual_report_snapshots_published_year
  ON public.annual_report_snapshots(report_year)
  WHERE status = 'published';

-- Trigger: maintain updated_at.
CREATE OR REPLACE FUNCTION public.annual_report_snapshots_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  -- Stamp published_at exactly once when transitioning to published.
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annual_report_snapshots_updated_at
  ON public.annual_report_snapshots;
CREATE TRIGGER trg_annual_report_snapshots_updated_at
  BEFORE UPDATE ON public.annual_report_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.annual_report_snapshots_set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.annual_report_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin read: full visibility including drafts.
CREATE POLICY annual_report_snapshots_admin_select
  ON public.annual_report_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin insert.
CREATE POLICY annual_report_snapshots_admin_insert
  ON public.annual_report_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin update.
CREATE POLICY annual_report_snapshots_admin_update
  ON public.annual_report_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin delete (soft deletes via status='archived' preferred; hard
-- delete path retained for mistaken-draft cleanup).
CREATE POLICY annual_report_snapshots_admin_delete
  ON public.annual_report_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Public read of published snapshots — safe because data_jsonb
-- and narrative_text are the journalist-facing record by design.
-- Not wired into a public page yet; policy is in place to enable
-- /hs/reports/[year] without a follow-up migration.
CREATE POLICY annual_report_snapshots_public_published_select
  ON public.annual_report_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

COMMENT ON TABLE public.annual_report_snapshots IS
  'Frozen snapshots of the "HS NIL at N" annual report. One published row per report_year (partial unique index). Admin CRUD; public reads only published rows. Data shape: src/lib/hs-nil/annual-report.ts::AnnualReportData.';
COMMENT ON COLUMN public.annual_report_snapshots.data_jsonb IS
  'AnnualReportData JSON blob frozen at snapshot time. Mutation is allowed (status=draft) but once status=published the admin UI blocks edits to this column.';
COMMENT ON COLUMN public.annual_report_snapshots.narrative_text IS
  'Final founder-edited Markdown narrative. Seeded by annual-report-narrative.ts::generateExecutiveSummary + generateKeyFindings; finalized by hand.';
