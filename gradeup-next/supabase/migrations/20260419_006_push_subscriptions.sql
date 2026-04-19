-- HS-NIL Phase 9 — Web Push Subscriptions
-- ============================================================
-- Three tables power the PWA/push notification stack:
--
--   1) push_subscriptions — one row per (user, browser/device).
--      Stores the W3C PushSubscription fields we need to deliver
--      a notification: endpoint, p256dh_key, auth_key. Uniqueness
--      on (user_id, endpoint) so re-subscribing from the same
--      browser is idempotent. Hard failures (404 / 410 from the
--      push service) set disabled_at — we never hard-delete,
--      so the audit trail in push_deliveries stays joinable.
--
--   2) push_preferences — per-user on/off toggles for each
--      notification type. One row per user, keyed on user_id.
--      All booleans default true so subscribing implies opt-in;
--      users can narrow down after the fact.
--
--   3) push_deliveries — append-only audit log of every send
--      attempt. payload stores the title/body and path-only URL
--      (never query-token-bearing URLs — see the sender).
--      status ∈ (queued | sent | failed | unsubscribed).
--
-- Privacy model:
--   - Endpoints can contain an identifier issued by the push
--     service (FCM, Apple, Mozilla). Treat as sensitive: user
--     SELECTs their own rows only; no cross-user visibility.
--   - All writes are service-role. The subscribe/unsubscribe
--     routes call the service layer, which in turn uses the
--     service-role client.
-- ============================================================

-- ----------------------------------------------------------------
-- push_subscriptions
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  platform text NOT NULL DEFAULT 'web-push'
    CHECK (platform IN ('web-push', 'apns', 'fcm')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz,
  disabled_at timestamptz,
  UNIQUE (user_id, endpoint)
);

COMMENT ON TABLE public.push_subscriptions IS
  'W3C PushSubscription rows. One per (user, browser/device). disabled_at is set on hard-failure responses (404 / 410) from the push service — never hard-delete so push_deliveries stays joinable.';

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions (user_id)
  WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created
  ON public.push_subscriptions (created_at DESC);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- push_preferences
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_requests boolean NOT NULL DEFAULT true,
  deal_review boolean NOT NULL DEFAULT true,
  deal_completed boolean NOT NULL DEFAULT true,
  referral_milestones boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.push_preferences IS
  'Per-user on/off toggles for each push notification type. Opt-in-by-default at subscribe time; users narrow down after.';

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_preferences_select_own ON public.push_preferences;
CREATE POLICY push_preferences_select_own
  ON public.push_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_preferences_insert_own ON public.push_preferences;
CREATE POLICY push_preferences_insert_own
  ON public.push_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_preferences_update_own ON public.push_preferences;
CREATE POLICY push_preferences_update_own
  ON public.push_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Touch updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION public.push_preferences_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_preferences_touch ON public.push_preferences;
CREATE TRIGGER trg_push_preferences_touch
  BEFORE UPDATE ON public.push_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.push_preferences_touch_updated_at();

-- ----------------------------------------------------------------
-- push_deliveries
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (
    status IN ('queued', 'sent', 'failed', 'unsubscribed')
  ),
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.push_deliveries IS
  'Append-only audit trail for push sends. payload stores title/body and path-only URL (never query tokens) — see src/lib/push/sender.ts truncation.';

CREATE INDEX IF NOT EXISTS idx_push_deliveries_subscription
  ON public.push_deliveries (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_status_created
  ON public.push_deliveries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_type_created
  ON public.push_deliveries (notification_type, created_at DESC);

ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;

-- User can read their own delivery rows via the subscription join.
DROP POLICY IF EXISTS push_deliveries_select_own ON public.push_deliveries;
CREATE POLICY push_deliveries_select_own
  ON public.push_deliveries
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT s.id
      FROM public.push_subscriptions s
      WHERE s.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated — all writes
-- go through the service role via src/lib/push/sender.ts.
