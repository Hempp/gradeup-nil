-- HS-NIL Admin Audit Log
-- ============================================================
-- Compliance traceability for every admin write action taken
-- against the HS-NIL ops queues. Phase 6 introduces four new
-- admin write actions:
--
--   * disclosure_retry         — re-queues a failed disclosure
--   * payout_resolve           — manually marks a payout paid/refunded
--   * link_force_verify        — admin overrides normal athlete-confirms flow
--   * consent_renewal_nudge    — email reminder to parent (no record mutation)
--
-- Every one of these must land here as a row regardless of outcome.
-- The log outlives its targets (deal, payout, link, consent rows may
-- be deleted later — the audit trail keeps target_id as a bare uuid
-- with NO foreign key so orphaning is intentional).
--
-- RLS posture:
--   * SELECT — admin role only (via profiles.role = 'admin').
--   * INSERT — service-role only. Clients (even admins with an auth
--     JWT) CANNOT write here directly; every insert flows through
--     src/lib/hs-nil/admin-actions.ts which uses the service-role
--     client. That keeps the log tamper-evident from the browser.
--   * UPDATE / DELETE — no policy, forbidden by default. Audit rows
--     are immutable once written.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge'
  )),
  target_kind text NOT NULL CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent'
  )),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_recent
  ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON public.admin_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log (target_kind, target_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: admins only.
-- Uses a subquery against public.profiles so the policy doesn't
-- depend on JWT custom claims. Policy is defensive-only — all
-- app-level reads go through the SSR client which already
-- admin-gates at the route layer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_audit_log'
      AND policyname = 'admin_audit_log_admin_read'
  ) THEN
    CREATE POLICY admin_audit_log_admin_read ON public.admin_audit_log
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

-- No INSERT / UPDATE / DELETE policy — service role bypasses RLS,
-- which is the only legitimate writer. Clients writing directly
-- will be rejected.

COMMENT ON TABLE public.admin_audit_log IS
  'Compliance audit trail for admin write actions on HS-NIL ops queues. Insert via service-role only; select restricted to admin role.';

COMMENT ON COLUMN public.admin_audit_log.target_id IS
  'UUID of the target row. NO foreign key — the target may be deleted; audit rows must outlive their subjects.';

COMMENT ON COLUMN public.admin_audit_log.metadata IS
  'Action-specific JSON. Examples: payout_resolve => { decision, reference }; consent_renewal_nudge => { parent_email, delivery: { success, messageId, error } }.';
