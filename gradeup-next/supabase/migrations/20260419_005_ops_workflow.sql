-- HS-NIL Phase 9 — Ops Workflow: Bulk Operations, Retry Guards, Concierge Cohort
-- ============================================================================
-- Phase 6 shipped single-row admin write actions. Phase 9 adds:
--
--   1. admin_bulk_operations — audit record for fan-out bulk actions (one
--      row per "run" with a per-item result map in summary jsonb).
--   2. admin_retry_guards    — dedupe table; prevents the same target from
--      being retried within a cooldown window across single + bulk flows.
--   3. ALTER admin_audit_log — extend the action CHECK constraint with the
--      four new bulk action kinds so per-item audit rows can still be
--      written (the existing admin-actions.ts single-row writer continues
--      to write an audit row per target; bulk flows write one
--      admin_bulk_operations row with the aggregate).
--   4. ALTER hs_waitlist      — add is_concierge flag so the concierge-cohort
--      dashboard can filter without a separate junction table.
--
-- RLS posture mirrors admin_audit_log:
--   * SELECT — admin role only (profiles.role = 'admin').
--   * INSERT/UPDATE/DELETE — service-role only (bypasses RLS).
-- ============================================================================

-- -------------------------------------------------------------------------
-- 1. admin_bulk_operations
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  operation_type text NOT NULL CHECK (operation_type IN (
    'bulk_disclosure_retry',
    'bulk_payout_resolve',
    'bulk_link_force_verify',
    'bulk_consent_renewal_nudge'
  )),
  target_ids uuid[] NOT NULL,
  item_count int NOT NULL CHECK (item_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN (
    'running',
    'completed',
    'partial_failure',
    'failed'
  )) DEFAULT 'running',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_bulk_ops_recent
  ON public.admin_bulk_operations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_bulk_ops_actor
  ON public.admin_bulk_operations (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_bulk_ops_status
  ON public.admin_bulk_operations (status, created_at DESC);

ALTER TABLE public.admin_bulk_operations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_bulk_operations'
      AND policyname = 'admin_bulk_operations_admin_read'
  ) THEN
    CREATE POLICY admin_bulk_operations_admin_read ON public.admin_bulk_operations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

COMMENT ON TABLE public.admin_bulk_operations IS
  'Audit record for bulk admin ops (one row per fan-out run). summary.items is a map of targetId → { status: success | skipped_retry_guard | failed, ...details }.';

COMMENT ON COLUMN public.admin_bulk_operations.target_ids IS
  'All targets the operator asked us to act on. Count == cardinality. Whether we actually mutated each one is in summary.items[targetId].status.';

COMMENT ON COLUMN public.admin_bulk_operations.summary IS
  'JSON shape: { items: { <targetId>: { status, auditLogId?, error?, code?, skippedUntil? } }, counts: { ok, skipped, failed } }.';

-- -------------------------------------------------------------------------
-- 2. admin_retry_guards
-- -------------------------------------------------------------------------
-- Compound primary key on (target_kind, target_id). An upsert from either
-- single-row (admin-actions.ts) or bulk (bulk-actions.ts) writes the same
-- row, which is how we get cross-flow dedupe.
--
-- Age-out / cleanup is out of scope (cron for another pass). Row count
-- is naturally bounded by #(active targets); not a volume concern.
CREATE TABLE IF NOT EXISTS public.admin_retry_guards (
  target_kind text NOT NULL CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent'
  )),
  target_id uuid NOT NULL,
  last_retry_at timestamptz NOT NULL DEFAULT now(),
  last_actor_user_id uuid REFERENCES auth.users(id),
  last_action text,
  PRIMARY KEY (target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_retry_guards_recent
  ON public.admin_retry_guards (last_retry_at DESC);

ALTER TABLE public.admin_retry_guards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_retry_guards'
      AND policyname = 'admin_retry_guards_admin_read'
  ) THEN
    CREATE POLICY admin_retry_guards_admin_read ON public.admin_retry_guards
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

COMMENT ON TABLE public.admin_retry_guards IS
  'Cross-flow dedupe for admin retries. Upserted by single-row admin actions AND bulk actions before they mutate, checked by bulk actions to skip recently-acted-on targets. Service-role managed.';

-- -------------------------------------------------------------------------
-- 3. Extend admin_audit_log action CHECK to include new bulk kinds
-- -------------------------------------------------------------------------
-- The bulk flows write ONE admin_bulk_operations row AND per-item
-- admin_audit_log rows through the existing writeAudit helper. The
-- per-item rows reuse the original single-action names (disclosure_retry,
-- etc.), BUT the bulk fan-out record itself and any direct bulk-action
-- logging uses the new names. Extending the CHECK here covers both paths.
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'bulk_disclosure_retry',
    'bulk_payout_resolve',
    'bulk_link_force_verify',
    'bulk_consent_renewal_nudge'
  ));

-- -------------------------------------------------------------------------
-- 4. hs_waitlist — concierge cohort flag
-- -------------------------------------------------------------------------
-- The concierge cohort is the ~20 LA-parent pilot the operator personally
-- shepherds. Flagging directly on hs_waitlist (vs. a junction table) keeps
-- the single-pane dashboard query cheap and the cohort state visible at
-- the same layer the rest of the waitlist lives.
ALTER TABLE public.hs_waitlist
  ADD COLUMN IF NOT EXISTS is_concierge boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_hs_waitlist_concierge
  ON public.hs_waitlist (is_concierge)
  WHERE is_concierge = true;

COMMENT ON COLUMN public.hs_waitlist.is_concierge IS
  'Part of the human-concierge cohort (pilot ~20 LA parents). Flipped via /api/hs/admin/ops-tools/concierge/mark by admins only; selectable in the concierge-cohort dashboard.';
