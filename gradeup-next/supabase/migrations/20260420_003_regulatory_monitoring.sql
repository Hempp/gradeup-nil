-- HS-NIL Phase 14 — Regulatory change monitor (REGULATORY-MONITOR)
-- ============================================================
-- State athletic association rules shift. The per-state rules engine in
-- src/lib/hs-nil/state-rules.ts + public.state_nil_rules is accurate today;
-- in 60 days it won't be unless *someone tracks changes*. This migration
-- stands up the persistence layer for a best-effort, weekly content-hash
-- monitor against state-athletic-association announcement pages.
--
-- The automation DETECTS that something changed on a page we track. It does
-- NOT auto-update STATE_RULES. Every detected change is admin-reviewed.
--
-- Two tables:
--   1. regulatory_monitor_sources  — what to poll + last-seen fingerprint
--   2. regulatory_change_events    — detected-change audit log + admin review
--
-- Plus: extend admin_audit_log CHECK to accept 'regulatory_change_reviewed'.
--
-- RLS posture:
--   * SELECT — admins (all) + state_ad (scoped to own state)
--   * INSERT/UPDATE — service-role only (cron + admin-actions service)
--   * Seeded rows are BEST-GUESS URLs; every one carries a `-- TODO` comment
--     indicating the URL needs human confirmation before going to production.
-- ============================================================

-- ------------------------------------------------------------
-- 1. regulatory_monitor_sources
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.regulatory_monitor_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  source_type text NOT NULL CHECK (source_type IN (
    'web_page',
    'rss_feed',
    'announcement_api'
  )),
  source_url text NOT NULL,
  last_content_hash text,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  check_interval_hours int NOT NULL DEFAULT 168, -- weekly
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, source_url)
);

CREATE INDEX IF NOT EXISTS idx_reg_sources_state_active
  ON public.regulatory_monitor_sources (state_code, active);

CREATE INDEX IF NOT EXISTS idx_reg_sources_due
  ON public.regulatory_monitor_sources (last_checked_at ASC NULLS FIRST)
  WHERE active;

COMMENT ON TABLE public.regulatory_monitor_sources IS
  'Per-state athletic-association pages to poll weekly for content changes. Hashes only; no page text stored.';

COMMENT ON COLUMN public.regulatory_monitor_sources.last_content_hash IS
  'SHA-256 of last fetched response body. Hash-only — no page text persisted.';

COMMENT ON COLUMN public.regulatory_monitor_sources.check_interval_hours IS
  'Default 168 (weekly). State associations do not change rules often; higher-frequency polls risk rate-limiting.';

-- ------------------------------------------------------------
-- 2. regulatory_change_events
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.regulatory_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.regulatory_monitor_sources(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  old_hash text,
  new_hash text,
  diff_summary text,
  reviewed_by_admin_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_outcome text CHECK (review_outcome IN (
    'no_change',
    'minor_update',
    'rule_change',
    'unable_to_parse'
  )),
  review_notes text
);

CREATE INDEX IF NOT EXISTS idx_reg_events_detected
  ON public.regulatory_change_events (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_reg_events_unreviewed
  ON public.regulatory_change_events (detected_at DESC)
  WHERE reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reg_events_source
  ON public.regulatory_change_events (source_id, detected_at DESC);

COMMENT ON TABLE public.regulatory_change_events IS
  'One row per detected content-hash change (or fetch failure). Admin reviews each and records outcome.';

COMMENT ON COLUMN public.regulatory_change_events.diff_summary IS
  'Best-effort structured summary: length delta + NIL-rule keyword hits. Full page text is NEVER stored.';

COMMENT ON COLUMN public.regulatory_change_events.review_outcome IS
  'no_change: cosmetic churn (nav/footer). minor_update: page edit but no rules shift. rule_change: STATE_RULES needs an update. unable_to_parse: fetch/parse failure to investigate.';

-- ------------------------------------------------------------
-- 3. Extend admin_audit_log CHECK
-- ------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'regulatory_change_reviewed'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'regulatory_change_event'
  ));

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------

ALTER TABLE public.regulatory_monitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_change_events ENABLE ROW LEVEL SECURITY;

-- SELECT on sources: admins (all) + state_ad assigned to the same state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'regulatory_monitor_sources'
      AND policyname = 'reg_sources_admin_read'
  ) THEN
    CREATE POLICY reg_sources_admin_read ON public.regulatory_monitor_sources
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'regulatory_monitor_sources'
      AND policyname = 'reg_sources_state_ad_read'
  ) THEN
    CREATE POLICY reg_sources_state_ad_read ON public.regulatory_monitor_sources
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.state_ad_assignments
          WHERE state_ad_assignments.user_id = auth.uid()
            AND state_ad_assignments.state_code = regulatory_monitor_sources.state_code
            AND state_ad_assignments.deactivated_at IS NULL
        )
      );
  END IF;
END $$;

-- SELECT on events: admins (all) + state_ad scoped via source join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'regulatory_change_events'
      AND policyname = 'reg_events_admin_read'
  ) THEN
    CREATE POLICY reg_events_admin_read ON public.regulatory_change_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'regulatory_change_events'
      AND policyname = 'reg_events_state_ad_read'
  ) THEN
    CREATE POLICY reg_events_state_ad_read ON public.regulatory_change_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
            FROM public.regulatory_monitor_sources s
            JOIN public.state_ad_assignments a
              ON a.state_code = s.state_code
             AND a.deactivated_at IS NULL
          WHERE s.id = regulatory_change_events.source_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE policies — service-role only.

-- ------------------------------------------------------------
-- 5. Seed rows: pilot states + one prohibited example (AL)
--
-- Every URL below is BEST-GUESS. The admin console surfaces
-- "sources needing real URLs" as a signal — each row needs a
-- human-verified announcement or rules page before this is
-- trusted in production. Inline TODOs flag what to confirm.
-- ------------------------------------------------------------

INSERT INTO public.regulatory_monitor_sources
  (state_code, source_type, source_url, check_interval_hours, notes)
VALUES
  -- TODO(REGULATORY-MONITOR): Confirm CIF NIL rules page. Alternate: https://www.cifstate.org/governance/nil/index
  ('CA', 'web_page', 'https://www.cifstate.org/governance/nil/', 168,
    'CIF (California Interscholastic Federation) — NIL governance landing. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm FHSAA NIL/amateur-status announcements URL.
  ('FL', 'web_page', 'https://www.fhsaa.org/sports/nil', 168,
    'FHSAA (Florida High School Athletic Association) — NIL policy page. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm GHSA NIL rule URL. GHSA rulebook PDFs may be a better anchor.
  ('GA', 'web_page', 'https://www.ghsa.net/nil-policy', 168,
    'GHSA (Georgia High School Association) — NIL policy page. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm IHSA NIL bulletin URL.
  ('IL', 'web_page', 'https://www.ihsa.org/Resources/NIL.aspx', 168,
    'IHSA (Illinois High School Association) — NIL resource page. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm NJSIAA NIL guidance URL.
  ('NJ', 'web_page', 'https://www.njsiaa.org/nil', 168,
    'NJSIAA (New Jersey State Interscholastic Athletic Association) — NIL guidance. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm NYSPHSAA NIL policy URL.
  ('NY', 'web_page', 'https://www.nysphsaa.org/nil', 168,
    'NYSPHSAA (New York State Public High School Athletic Association) — NIL policy page. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm UIL NIL-and-amateur-status page. UIL publishes an annual constitution — that may be the better target.
  ('TX', 'web_page', 'https://www.uiltexas.org/policy/nil', 168,
    'UIL (University Interscholastic League, Texas) — NIL policy page. Placeholder URL pending human verification.'),
  -- TODO(REGULATORY-MONITOR): Confirm AHSAA NIL-prohibition source. AHSAA is currently prohibited; watch for status change.
  ('AL', 'web_page', 'https://www.ahsaa.com/governance/nil', 168,
    'AHSAA (Alabama High School Athletic Association) — monitored because AL currently PROHIBITS HS NIL; this is the page to watch for a status change. Placeholder URL pending human verification.')
ON CONFLICT (state_code, source_url) DO NOTHING;

COMMENT ON COLUMN public.regulatory_monitor_sources.source_url IS
  'Best-guess URL at seed time. All pilot-state URLs are marked TODO in the migration and surface as "needing real URLs" on /hs/admin/regulatory-monitor until admin confirms.';
