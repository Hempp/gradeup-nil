-- HS-NIL Phase 16 — State-AD Weekly Digest Preferences
-- ============================================================
-- Extends state_ad_assignments with per-assignment digest
-- preferences for the weekly compliance summary email sent by
-- /api/cron/hs-state-ad-digest.
--
-- Columns added:
--   * digest_enabled       boolean DEFAULT true
--                          Opt-out flag. Default on so every newly-invited
--                          AD receives the first digest and can opt out
--                          via /hs/ad-portal/settings.
--   * digest_last_sent_at  timestamptz
--                          Last successful delivery timestamp. The cron
--                          filters (now() - 6 days) so a double-fired
--                          tick (manual or retry) never double-sends.
--   * digest_day_of_week   int CHECK (digest_day_of_week IN (0..6))
--                          DEFAULT 1 (Monday).
--                          Postgres extract(dow from now()) convention:
--                          0=Sunday, 1=Monday, ..., 6=Saturday. Each
--                          AD picks their preferred delivery day via
--                          the portal settings page. The cron runs
--                          once daily and fans out to assignments whose
--                          digest_day_of_week matches today.
--
-- Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS. Existing
-- state_ad_assignments rows default-fill (true, NULL, 1) so the
-- first cron tick after deploy will catch every active AD whose
-- preference matches the current day-of-week.
--
-- RLS posture: unchanged. The existing state_ad_assignments_read_own
-- policy governs the AD's own-read; cron writes via service role;
-- admin-side force-send writes via service role.
-- ============================================================

ALTER TABLE public.state_ad_assignments
  ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS digest_day_of_week int NOT NULL DEFAULT 1;

-- Attach the CHECK constraint as a named, idempotent addition so
-- re-running the migration is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'state_ad_assignments_digest_dow_check'
      AND conrelid = 'public.state_ad_assignments'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.state_ad_assignments
      ADD CONSTRAINT state_ad_assignments_digest_dow_check
      CHECK (digest_day_of_week IN (0,1,2,3,4,5,6))';
  END IF;
END $$;

COMMENT ON COLUMN public.state_ad_assignments.digest_enabled IS
  'Opt-in flag for the weekly state-AD compliance digest. Default true. Toggleable via /hs/ad-portal/settings or admin-side force-actions.';

COMMENT ON COLUMN public.state_ad_assignments.digest_last_sent_at IS
  'Last successful weekly-digest delivery timestamp. Cron uses (now() - 6 days) as the idempotency window so a re-run does not double-send.';

COMMENT ON COLUMN public.state_ad_assignments.digest_day_of_week IS
  'Preferred digest delivery weekday. Postgres DOW convention (0=Sun, 1=Mon, ..., 6=Sat). Default 1 (Monday).';

-- Partial index: active assignments with digest on, keyed by
-- preferred day-of-week. Cron filter is the hot path.
CREATE INDEX IF NOT EXISTS idx_state_ad_assignments_digest_due
  ON public.state_ad_assignments(digest_day_of_week)
  WHERE deactivated_at IS NULL AND digest_enabled = true;

-- ============================================================
-- admin_audit_log — extend action + target_kind CHECKs
-- ============================================================
-- Admin force-send (/api/hs/admin/actions/state-ad-digest-send)
-- writes 'state_ad_digest_force_sent' rows to admin_audit_log
-- with target_kind='state_ad_assignment'. Each migration that
-- adds actions follows this drop+re-add pattern (see
-- 20260420_005_transcript_ocr_results.sql and
-- 20260420_003_regulatory_monitoring.sql).

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'transcript_ocr_reprocessed',
    'regulatory_change_reviewed',
    'referral_tier_force_grant',
    'referral_perk_force_activate',
    'transition_verified',
    'transition_denied',
    'state_ad_digest_force_sent'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'transcript_submission',
    'regulatory_change_event',
    'referral_tier',
    'referral_perk',
    'athlete_transition',
    'state_ad_assignment'
  ));
