-- HS-NIL Phase 17 — Twilio SMS fallback for parent consent
-- ============================================================
-- Parental consent currently relies entirely on Resend email delivery.
-- When Resend bounces (spam filter, typo domain, disposable inbox),
-- the consent flow stalls and the athlete is stuck. Twilio SMS is the
-- fallback: a short link message fires alongside (or after) the email.
--
-- Design notes:
--   * sms_messages is the authoritative audit log. Every outbound SMS,
--     successful or not, lands here. body_text is stored so ops can
--     see exactly what the parent received — admins see the first 80
--     chars in the UI, full body only via DB.
--   * recipient_user_id is nullable because the consent flow targets an
--     unauthenticated parent (the pending_consents row has parent_email
--     and a phone from hs_parent_profiles but the parent may not yet
--     have a user account).
--   * related_kind + related_id is a loose pointer — most rows point to
--     a pending_consents row. Future kinds: 'payout_alert', 'deal_offer'.
--   * sms_delivery_preferences is scoped to parent user_ids (where
--     available) so we can enforce 1 SMS per parent per hour by default.
--     For unauthenticated sends keyed off a pending_consent, we defer
--     rate-limiting to the service layer using phone + kind.
--   * RLS is strict: recipients SELECT their own rows when the user_id
--     is set, admins SELECT all, only the service role writes.
-- ============================================================

-- ============================================================
-- sms_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'consent_request',
    'consent_reminder',
    'consent_signed_receipt'
  )),
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'sending',
    'sent',
    'failed',
    'undeliverable'
  )),
  twilio_sid text,
  error_code text,
  error_message text,
  retries_remaining smallint NOT NULL DEFAULT 3,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  related_kind text,
  related_id uuid
);

-- Worker index: pick up queued/sending rows by scheduled_for asc.
CREATE INDEX IF NOT EXISTS idx_sms_messages_worker
  ON public.sms_messages (status, scheduled_for)
  WHERE status IN ('queued', 'sending');

-- Audit index: look up recent messages to a given phone.
CREATE INDEX IF NOT EXISTS idx_sms_messages_recipient_phone_recent
  ON public.sms_messages (recipient_phone, created_at DESC);

-- Related-kind lookup: "all SMS sent for this pending consent".
CREATE INDEX IF NOT EXISTS idx_sms_messages_related
  ON public.sms_messages (related_kind, related_id)
  WHERE related_kind IS NOT NULL;

-- Admin dashboard today-count scan.
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at
  ON public.sms_messages (created_at DESC);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- Recipient-visible: the parent can see SMS we sent them if we know
-- their user_id. Rows with a null user_id (pre-signup parent) are
-- invisible to everyone except admin / service role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_messages'
      AND policyname = 'sms_messages_recipient_read'
  ) THEN
    CREATE POLICY sms_messages_recipient_read ON public.sms_messages
      FOR SELECT
      USING (
        recipient_user_id IS NOT NULL
        AND recipient_user_id = auth.uid()
      );
  END IF;
END $$;

-- Admin read-all.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_messages'
      AND policyname = 'sms_messages_admin_read'
  ) THEN
    CREATE POLICY sms_messages_admin_read ON public.sms_messages
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

-- No public INSERT / UPDATE / DELETE. Service role writes only.

COMMENT ON TABLE public.sms_messages IS
  'HS-NIL Twilio SMS fallback audit log. Every outbound SMS lands here regardless of outcome. Writes via service role only.';

COMMENT ON COLUMN public.sms_messages.recipient_user_id IS
  'Nullable — consent SMS often targets a parent without a user account. When set, the recipient can read their own rows.';

COMMENT ON COLUMN public.sms_messages.related_id IS
  'Loose pointer to the business object that triggered this SMS (e.g. a pending_consents row). No foreign key — targets may be vacuumed.';

-- ============================================================
-- sms_delivery_preferences
-- ============================================================
-- Rate-limit + unsubscribe state, keyed on parent user_id. For
-- unauthenticated pre-signup sends, service-layer logic substitutes
-- phone-based throttling.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_delivery_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_enabled boolean NOT NULL DEFAULT true,
  last_sms_sent_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_delivery_preferences ENABLE ROW LEVEL SECURITY;

-- Parent reads own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_delivery_preferences'
      AND policyname = 'sms_prefs_read_own'
  ) THEN
    CREATE POLICY sms_prefs_read_own ON public.sms_delivery_preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Parent updates own row (mostly to toggle sms_enabled).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_delivery_preferences'
      AND policyname = 'sms_prefs_update_own'
  ) THEN
    CREATE POLICY sms_prefs_update_own ON public.sms_delivery_preferences
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Admin read-all (dashboard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_delivery_preferences'
      AND policyname = 'sms_prefs_admin_read'
  ) THEN
    CREATE POLICY sms_prefs_admin_read ON public.sms_delivery_preferences
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

-- updated_at trigger if the shared function exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_sms_prefs_updated_at
             BEFORE UPDATE ON public.sms_delivery_preferences
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

COMMENT ON TABLE public.sms_delivery_preferences IS
  'Per-parent SMS delivery state — rate limiting (last_sms_sent_at) + unsubscribe flag. Future-proofed for per-parent throttling.';

-- ============================================================
-- admin_audit_log — extend allowed action to include sms_force_send
-- ============================================================
-- The Phase 17 admin SMS panel exposes a "force resend" button that
-- writes to admin_audit_log. The check constraint on admin_audit_log
-- predates Phase 17 and needs to be widened.

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'disclosure_retry',
    'payout_resolve',
    'link_force_verify',
    'consent_renewal_nudge',
    'sms_force_send'
  ));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_kind_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_kind_check CHECK (target_kind IN (
    'disclosure',
    'payout',
    'link',
    'consent',
    'sms'
  ));
