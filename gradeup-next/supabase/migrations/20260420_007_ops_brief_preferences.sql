-- HS-NIL Phase 15 — Ops Brief Preferences (OPS-BRIEF)
-- ============================================================
-- Per-admin subscription + idempotency for the daily ops digest
-- cron (`/api/cron/hs-ops-brief`).
--
-- Two columns on `public.profiles`:
--   * ops_brief_enabled    — opt-out flag. Default true, but the
--                            cron only ever emails rows with
--                            role='admin' so non-admin rows are a
--                            harmless noop.
--   * ops_brief_sent_at    — last-delivery timestamp. The cron
--                            skips recipients whose value is newer
--                            than (now() - 18h) so a retry tick
--                            doesn't double-send.
--
-- RLS posture: unchanged. The existing `profiles` policies
-- continue to govern access. The cron writes via the service
-- role, and the ops-brief page exposes a toggle that updates
-- the authenticated user's OWN row (RLS already allows that).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ops_brief_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ops_brief_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.ops_brief_enabled IS
  'Opt-in flag for the daily HS-NIL ops brief email. Default true, only honored for role=''admin''. Non-admin rows are ignored by the cron.';

COMMENT ON COLUMN public.profiles.ops_brief_sent_at IS
  'Timestamp of the most recent ops-brief email delivery. The cron uses (now() - 18h) as the idempotency window so a re-run does not double-send.';

-- Partial index: admins with the opt-in still on. The cron filter
-- is the hot path; keep it cheap even as the profiles table grows.
CREATE INDEX IF NOT EXISTS idx_profiles_ops_brief_admin_enabled
  ON public.profiles (id)
  WHERE role = 'admin' AND ops_brief_enabled = true;
