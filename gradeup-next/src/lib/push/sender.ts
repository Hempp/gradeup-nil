/**
 * Push sender — fans a notification out to all of a user's active
 * subscriptions, respecting per-type preferences, and writes audit
 * rows to push_deliveries.
 *
 * Fail-closed semantics:
 *   - Missing VAPID env in prod → getWebPushClient() throws, and so
 *     does this sender. Better to surface the failure at the call
 *     site than drop silently.
 *   - Missing VAPID env in dev → getWebPushClient() returns null,
 *     this sender logs "no-op" and records each would-be delivery
 *     as status='failed' with a clear failure_reason so the audit
 *     trail isn't misleading.
 *
 * Hard-failure handling:
 *   - 404 / 410 from the push service means the endpoint is
 *     permanently dead (user uninstalled the PWA, browser wiped
 *     its subscription, etc.). We set disabled_at and mark the
 *     delivery 'unsubscribed' so we never retry.
 *   - Other failures (5xx, network) → status='failed', no disable.
 *
 * Privacy note: payload persisted to push_deliveries strips query
 * tokens from URLs — we store pathname + search-less URL only.
 *
 * Server-only.
 *
 * ─── Future wiring (deferred, handled in a later phase) ───
 *
 * Notification hooks should be called at these points. They are NOT
 * called here to avoid merge conflicts with SIGNAL-WIRING agent.
 *
 *   consent_request
 *     src/lib/hs-nil/consent-provider.ts — after createSigningToken
 *     returns a new pending-consent row, fan out to the parent-user
 *     if they already have an account (otherwise email is the only
 *     channel).
 *
 *   deal_review_needed
 *     src/lib/hs-nil/approvals.ts — inside recordApproval after
 *     the athlete submits a deliverable; notify the brand reviewer.
 *
 *   deal_completed
 *     src/lib/hs-nil/completion-hooks.ts — inside the post-payout
 *     hook (afterDealPaid equivalent); notify the athlete and any
 *     custodial parent.
 *
 *   referral_milestone
 *     src/lib/hs-nil/referrals.ts — inside attributeSignup after
 *     a new parent activates via a referral; notify the referrer.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { getWebPushClient, type WebPushError } from './client';

// ─── Types ────────────────────────────────────────────────────────

export type PushNotificationType =
  | 'consent_request'
  | 'consent_signed'
  | 'deal_review_needed'
  | 'deal_completed'
  | 'referral_milestone'
  | 'test';

/**
 * Preference column name on push_preferences that governs this type.
 * Multiple notification types can share one preference column
 * (e.g. consent_request and consent_signed both gate on
 * consent_requests).
 */
const PREFERENCE_COLUMN: Record<PushNotificationType, string | null> = {
  consent_request: 'consent_requests',
  consent_signed: 'consent_requests',
  deal_review_needed: 'deal_review',
  deal_completed: 'deal_completed',
  referral_milestone: 'referral_milestones',
  test: null, // never gated by preference
};

export interface SendPushToUserInput {
  userId: string;
  notificationType: PushNotificationType;
  title: string;
  body: string;
  url: string;
  data?: Record<string, unknown>;
}

export interface SendPushResult {
  ok: boolean;
  attempted: number;
  sent: number;
  failed: number;
  unsubscribed: number;
  reason?: 'no_subscriptions' | 'preference_off' | 'no_vapid' | 'error';
}

// ─── Service client ──────────────────────────────────────────────

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[push/sender] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Strip query + hash from a URL so we never persist signing tokens,
 * ref codes, or other session-bound identifiers into push_deliveries.
 * Accepts absolute OR path-only URLs; returns the pathname for the
 * latter.
 */
function truncateUrl(url: string): string {
  try {
    // Support path-only URLs ("/hs/deals/123") by providing a base.
    const u = new URL(url, 'https://gradeupnil.com');
    return u.pathname;
  } catch {
    return '/';
  }
}

function isHardFailure(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

// ─── sendPushToUser ──────────────────────────────────────────────

export async function sendPushToUser(
  input: SendPushToUserInput
): Promise<SendPushResult> {
  const { userId, notificationType, title, body, url, data } = input;
  const client = getWebPushClient();
  const supabase = getServiceRoleClient();

  // Preference gate.
  const prefColumn = PREFERENCE_COLUMN[notificationType];
  if (prefColumn) {
    const { data: pref } = await supabase
      .from('push_preferences')
      .select(prefColumn)
      .eq('user_id', userId)
      .maybeSingle();
    // Row missing = default opt-in (matches DB defaults).
    const enabled = pref
      ? Boolean((pref as unknown as Record<string, unknown>)[prefColumn])
      : true;
    if (!enabled) {
      return {
        ok: true,
        attempted: 0,
        sent: 0,
        failed: 0,
        unsubscribed: 0,
        reason: 'preference_off',
      };
    }
  }

  // Load active subscriptions for the user.
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', userId)
    .is('disabled_at', null);

  if (subErr) {
    // eslint-disable-next-line no-console
    console.error('[push/sender] failed to load subscriptions', subErr);
    return {
      ok: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      unsubscribed: 0,
      reason: 'error',
    };
  }

  if (!subs || subs.length === 0) {
    return {
      ok: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      unsubscribed: 0,
      reason: 'no_subscriptions',
    };
  }

  const truncatedUrl = truncateUrl(url);
  const persistedPayload = {
    title,
    body,
    url: truncatedUrl,
    type: notificationType,
  };
  // The payload we send to the browser keeps the full url — the SW
  // needs the query string to navigate correctly. Only the audit
  // trail is truncated.
  const wirePayload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: {
      url,
      type: notificationType,
      meta: data ?? null,
    },
  });

  // Dev no-op: record each would-be send as failed with a clear reason.
  if (!client) {
    const rows = subs.map((s) => ({
      subscription_id: s.id,
      notification_type: notificationType,
      payload: persistedPayload,
      status: 'failed',
      failure_reason: 'vapid_not_configured',
    }));
    await supabase.from('push_deliveries').insert(rows);
    return {
      ok: true,
      attempted: subs.length,
      sent: 0,
      failed: subs.length,
      unsubscribed: 0,
      reason: 'no_vapid',
    };
  }

  let sent = 0;
  let failed = 0;
  let unsubscribed = 0;

  const deliveryRows: Array<{
    subscription_id: string;
    notification_type: PushNotificationType;
    payload: typeof persistedPayload;
    status: 'sent' | 'failed' | 'unsubscribed';
    failure_reason: string | null;
    sent_at: string | null;
  }> = [];

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
    };
    try {
      await client.sendNotification(subscription, wirePayload);
      sent += 1;
      deliveryRows.push({
        subscription_id: sub.id,
        notification_type: notificationType,
        payload: persistedPayload,
        status: 'sent',
        failure_reason: null,
        sent_at: new Date().toISOString(),
      });
    } catch (err) {
      const e = err as WebPushError;
      const statusCode = typeof e.statusCode === 'number' ? e.statusCode : undefined;
      if (isHardFailure(statusCode)) {
        unsubscribed += 1;
        await supabase
          .from('push_subscriptions')
          .update({ disabled_at: new Date().toISOString() })
          .eq('id', sub.id);
        deliveryRows.push({
          subscription_id: sub.id,
          notification_type: notificationType,
          payload: persistedPayload,
          status: 'unsubscribed',
          failure_reason: `hard_failure_${statusCode}`,
          sent_at: null,
        });
      } else {
        failed += 1;
        deliveryRows.push({
          subscription_id: sub.id,
          notification_type: notificationType,
          payload: persistedPayload,
          status: 'failed',
          failure_reason:
            e instanceof Error ? e.message.slice(0, 500) : 'unknown_error',
          sent_at: null,
        });
      }
    }
  }

  if (deliveryRows.length > 0) {
    await supabase.from('push_deliveries').insert(deliveryRows);
  }

  // Touch last_notified_at for subs that actually received something.
  if (sent > 0) {
    const sentSubIds = deliveryRows
      .filter((r) => r.status === 'sent')
      .map((r) => r.subscription_id);
    if (sentSubIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ last_notified_at: new Date().toISOString() })
        .in('id', sentSubIds);
    }
  }

  return {
    ok: failed === 0,
    attempted: subs.length,
    sent,
    failed,
    unsubscribed,
  };
}

// ─── sendPushToUsers (batch) ────────────────────────────────────

export interface SendPushToUsersInput {
  userIds: string[];
  notificationType: PushNotificationType;
  title: string;
  body: string;
  url: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUsers(
  input: SendPushToUsersInput
): Promise<SendPushResult> {
  const totals: SendPushResult = {
    ok: true,
    attempted: 0,
    sent: 0,
    failed: 0,
    unsubscribed: 0,
  };

  for (const userId of input.userIds) {
    const r = await sendPushToUser({
      userId,
      notificationType: input.notificationType,
      title: input.title,
      body: input.body,
      url: input.url,
      data: input.data,
    });
    totals.attempted += r.attempted;
    totals.sent += r.sent;
    totals.failed += r.failed;
    totals.unsubscribed += r.unsubscribed;
    if (!r.ok) totals.ok = false;
  }

  return totals;
}
