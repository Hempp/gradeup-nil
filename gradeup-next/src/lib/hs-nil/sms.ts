/**
 * HS-NIL Phase 17 — SMS Service Layer
 * ----------------------------------------------------------------------------
 * Owns the service-role writes to `sms_messages` and `sms_delivery_preferences`
 * plus the orchestration between the DB row and the provider call.
 *
 * Usage patterns:
 *   - `enqueueConsentSms` — fired alongside the parent-consent email from
 *     `consent-provider.ts`. BELT-AND-SUSPENDERS: both channels attempt
 *     delivery to maximise the chance the parent sees it.
 *   - `enqueueConsentReminderSms` — called by a future email-bounce hook or
 *     renewal nudge; same plumbing, different `kind`.
 *   - `fireConsentSmsFallback` — convenience entry that resolves the parent
 *     phone from `pending_consents → athlete → hs_parent_athlete_links →
 *     hs_parent_profiles.phone` and enqueues a fresh SMS.
 *   - `dequeuePending` — cron/worker function. Picks up `failed` rows with
 *     retries remaining and re-attempts the provider call.
 *   - `countSmsSentToday` — admin dashboard signal.
 *
 * Rate limit contract:
 *   - We enforce 1 consent SMS per parent per hour by default. For
 *     unauthenticated consent flows (no user_id on record) we fall back
 *     to a phone-based check against sms_messages.created_at.
 *   - Callers that MUST bypass this (admin force-send) use the
 *     `skipRateLimit: true` escape hatch; skipping is captured in the
 *     admin audit log.
 *
 * SMS body templates live here so all channels use identical copy and
 * length budgets. The consent-request template MUST stay under the 160-char
 * single-segment limit when the short URL is 35 chars or fewer.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  getSmsProvider,
  normalizePhoneE164,
  type SmsProvider,
} from './sms-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SmsKind =
  | 'consent_request'
  | 'consent_reminder'
  | 'consent_signed_receipt';

export type SmsStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'undeliverable';

export interface SmsMessageRow {
  id: string;
  recipient_phone: string;
  recipient_user_id: string | null;
  kind: SmsKind;
  body_text: string;
  status: SmsStatus;
  twilio_sid: string | null;
  error_code: string | null;
  error_message: string | null;
  retries_remaining: number;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
  related_kind: string | null;
  related_id: string | null;
}

export interface EnqueueSmsOk {
  ok: true;
  messageId: string;
  status: SmsStatus;
  sid: string | null;
}

export interface EnqueueSmsErr {
  ok: false;
  reason:
    | 'no_phone'
    | 'invalid_phone'
    | 'unsubscribed'
    | 'rate_limited'
    | 'db_error'
    | 'provider_error'
    | 'not_found';
  detail?: string;
}

export type EnqueueSmsResult = EnqueueSmsOk | EnqueueSmsErr;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour per parent

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com'
  );
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil sms] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// SMS body templates
// ---------------------------------------------------------------------------

/**
 * Consent-request body. Target: ≤ 160 chars when the signing URL is
 * ≤ 35 chars. The fixed prefix + suffix is 125 chars, leaving up to
 * 35 for the URL (our signing URLs are typically 70+, so some real
 * messages WILL span two SMS segments — Twilio bills per segment).
 *
 * Regulators (FCC / CTIA) require STOP instruction language. Twilio
 * also auto-handles the STOP keyword at the carrier level, but we
 * include it in-copy for human visibility.
 */
export function buildConsentRequestBody(signingUrl: string): string {
  return `GradeUp HS: Your child's parental consent is needed. Tap to review: ${signingUrl} — Reply STOP to unsubscribe. This is a one-time message.`;
}

export function buildConsentReminderBody(signingUrl: string): string {
  return `GradeUp HS reminder: Parental consent still needed for your child. Review here: ${signingUrl} — Reply STOP to unsubscribe.`;
}

export function buildConsentSignedReceiptBody(athleteFirstName: string): string {
  const name = athleteFirstName.trim().split(/\s+/)[0] || 'your child';
  return `GradeUp HS: Parental consent for ${name} is signed. Thanks for approving — Reply STOP to unsubscribe.`;
}

// ---------------------------------------------------------------------------
// Rate-limit helpers
// ---------------------------------------------------------------------------

/**
 * Has this parent already received an SMS of the same kind in the
 * rate-limit window? Prefers user_id lookup; falls back to phone-only
 * when the parent doesn't yet have an account.
 *
 * Returns `true` if another send should be suppressed.
 */
async function isRateLimited(
  sb: SupabaseClient,
  args: {
    userId: string | null;
    phone: string;
    kind: SmsKind;
    windowMs?: number;
  }
): Promise<boolean> {
  const windowMs = args.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const since = new Date(Date.now() - windowMs).toISOString();

  if (args.userId) {
    const { data } = await sb
      .from('sms_delivery_preferences')
      .select('last_sms_sent_at')
      .eq('user_id', args.userId)
      .maybeSingle();
    const last = data?.last_sms_sent_at;
    if (last && new Date(last).getTime() > Date.now() - windowMs) {
      return true;
    }
  }

  // Phone-based fallback: any SMS of the same kind to this phone inside
  // the window suppresses another send. Bounds the search for perf.
  const { data } = await sb
    .from('sms_messages')
    .select('id')
    .eq('recipient_phone', args.phone)
    .eq('kind', args.kind)
    .in('status', ['queued', 'sending', 'sent'])
    .gte('created_at', since)
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Has this parent explicitly unsubscribed? Only meaningful when we have a
 * user_id. Pre-signup parents can only "opt out" via the STOP keyword,
 * which Twilio enforces at the carrier.
 */
async function isUnsubscribed(
  sb: SupabaseClient,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await sb
    .from('sms_delivery_preferences')
    .select('sms_enabled, unsubscribed_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  return data.sms_enabled === false || data.unsubscribed_at !== null;
}

/**
 * Upsert the parent's preference row and stamp `last_sms_sent_at`.
 * Non-fatal on failure — the send itself is the source of truth.
 */
async function markSent(
  sb: SupabaseClient,
  userId: string | null
): Promise<void> {
  if (!userId) return;
  try {
    await sb.from('sms_delivery_preferences').upsert(
      {
        user_id: userId,
        last_sms_sent_at: new Date().toISOString(),
        sms_enabled: true,
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil sms] preference upsert failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Core enqueue path
// ---------------------------------------------------------------------------

interface EnqueueCoreInput {
  parentPhone: string;
  parentUserId?: string | null;
  kind: SmsKind;
  body: string;
  relatedKind?: string | null;
  relatedId?: string | null;
  /** Admin force-send bypasses rate + preference checks. Default false. */
  skipRateLimit?: boolean;
  /** Optional provider injection for tests. */
  provider?: SmsProvider;
}

async function enqueueAndSend(
  input: EnqueueCoreInput
): Promise<EnqueueSmsResult> {
  const normalized = normalizePhoneE164(input.parentPhone);
  if (!normalized) {
    return { ok: false, reason: 'invalid_phone', detail: input.parentPhone };
  }

  const sb = getServiceRoleClient();

  if (!input.skipRateLimit) {
    if (await isUnsubscribed(sb, input.parentUserId ?? null)) {
      return { ok: false, reason: 'unsubscribed' };
    }
    if (
      await isRateLimited(sb, {
        userId: input.parentUserId ?? null,
        phone: normalized,
        kind: input.kind,
      })
    ) {
      return { ok: false, reason: 'rate_limited' };
    }
  }

  // Insert row as 'queued' first so the attempt is auditable even if
  // the provider call throws.
  const { data: inserted, error: insertErr } = await sb
    .from('sms_messages')
    .insert({
      recipient_phone: normalized,
      recipient_user_id: input.parentUserId ?? null,
      kind: input.kind,
      body_text: input.body,
      status: 'queued' as SmsStatus,
      retries_remaining: 3,
      related_kind: input.relatedKind ?? null,
      related_id: input.relatedId ?? null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      reason: 'db_error',
      detail: insertErr?.message ?? 'failed to insert sms_messages row',
    };
  }

  const messageId = inserted.id as string;
  const provider = input.provider ?? getSmsProvider();

  let result;
  try {
    result = await provider.sendSms({
      to: normalized,
      body: input.body,
      messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from('sms_messages')
      .update({
        status: 'failed' as SmsStatus,
        error_code: 'exception',
        error_message: message.slice(0, 500),
        retries_remaining: 2, // already consumed one attempt
      })
      .eq('id', messageId);
    return { ok: false, reason: 'provider_error', detail: message };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await sb
    .from('sms_messages')
    .update({
      status: result.status === 'sent' ? 'sent' : result.status === 'queued' ? 'sending' : 'failed',
      twilio_sid: result.sid || null,
      error_code: result.errorCode ?? null,
      error_message: result.errorMessage ?? null,
      sent_at: result.status === 'sent' ? now : null,
      retries_remaining: result.status === 'failed' ? 2 : 3,
    })
    .eq('id', messageId);

  if (updateErr) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil sms] post-send update failed', {
      messageId,
      error: updateErr.message,
    });
  }

  if (result.status !== 'failed') {
    await markSent(sb, input.parentUserId ?? null);
  }

  return {
    ok: result.status !== 'failed',
    messageId,
    status:
      result.status === 'sent'
        ? 'sent'
        : result.status === 'queued'
          ? 'sending'
          : 'failed',
    sid: result.sid || null,
  } as EnqueueSmsOk;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export interface EnqueueConsentSmsInput {
  pendingConsentId: string;
  parentPhone: string;
  parentUserId?: string | null;
  signingUrl: string;
  skipRateLimit?: boolean;
  provider?: SmsProvider;
}

/**
 * Fire a consent-request SMS tied to an existing pending_consents row.
 * Called from `consent-provider.ts#createSigningToken` alongside the
 * email send — belt-and-suspenders dual-channel delivery.
 *
 * Future optimization: gate this behind "email not confirmed delivered
 * after 30 min" once Resend bounce + delivered webhooks land. For
 * Phase 17 we fire both channels in parallel.
 */
export async function enqueueConsentSms(
  input: EnqueueConsentSmsInput
): Promise<EnqueueSmsResult> {
  return enqueueAndSend({
    parentPhone: input.parentPhone,
    parentUserId: input.parentUserId ?? null,
    kind: 'consent_request',
    body: buildConsentRequestBody(input.signingUrl),
    relatedKind: 'pending_consent',
    relatedId: input.pendingConsentId,
    skipRateLimit: input.skipRateLimit,
    provider: input.provider,
  });
}

export interface EnqueueConsentReminderSmsInput {
  pendingConsentId: string;
  parentPhone: string;
  parentUserId?: string | null;
  signingUrl: string;
  skipRateLimit?: boolean;
  provider?: SmsProvider;
}

export async function enqueueConsentReminderSms(
  input: EnqueueConsentReminderSmsInput
): Promise<EnqueueSmsResult> {
  return enqueueAndSend({
    parentPhone: input.parentPhone,
    parentUserId: input.parentUserId ?? null,
    kind: 'consent_reminder',
    body: buildConsentReminderBody(input.signingUrl),
    relatedKind: 'pending_consent',
    relatedId: input.pendingConsentId,
    skipRateLimit: input.skipRateLimit,
    provider: input.provider,
  });
}

// ---------------------------------------------------------------------------
// fireConsentSmsFallback
// ---------------------------------------------------------------------------

export interface FireConsentSmsFallbackInput {
  pendingConsentId: string;
  skipRateLimit?: boolean;
  provider?: SmsProvider;
}

/**
 * Resolve the parent phone for a pending_consents row and enqueue a
 * consent-request SMS. Used by ops cron + email-bounce handlers.
 *
 * Resolution path:
 *   pending_consents (athlete_user_id, token)
 *   → hs_parent_athlete_links (athlete_user_id, parent_profile_id)
 *   → hs_parent_profiles.phone
 *
 * Edge cases:
 *   - pending_consents.consumed_at set → refuse, consent already signed.
 *   - No linked parent profile → return { ok: false, reason: 'no_phone' }.
 *   - Multiple linked parents → pick the most recently verified one.
 */
export async function fireConsentSmsFallback(
  input: FireConsentSmsFallbackInput
): Promise<EnqueueSmsResult> {
  const sb = getServiceRoleClient();

  const { data: pending, error: pendingErr } = await sb
    .from('pending_consents')
    .select('id, token, athlete_user_id, consumed_at, expires_at')
    .eq('id', input.pendingConsentId)
    .maybeSingle();

  if (pendingErr || !pending) {
    return {
      ok: false,
      reason: 'not_found',
      detail: 'pending_consents row not found',
    };
  }
  if (pending.consumed_at) {
    return {
      ok: false,
      reason: 'not_found',
      detail: 'consent already signed',
    };
  }
  if (new Date(pending.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      reason: 'not_found',
      detail: 'signing token expired',
    };
  }

  // Find a parent profile linked to this athlete. Prefer verified links;
  // fall back to any link if none are verified yet.
  const { data: links, error: linksErr } = await sb
    .from('hs_parent_athlete_links')
    .select('parent_profile_id, verified_at, created_at')
    .eq('athlete_user_id', pending.athlete_user_id)
    .order('verified_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (linksErr) {
    return { ok: false, reason: 'db_error', detail: linksErr.message };
  }
  if (!links || links.length === 0) {
    return {
      ok: false,
      reason: 'no_phone',
      detail: 'no linked parent profile',
    };
  }

  const profileIds = links.map((l) => l.parent_profile_id as string);
  const { data: profiles, error: profilesErr } = await sb
    .from('hs_parent_profiles')
    .select('id, user_id, phone')
    .in('id', profileIds);

  if (profilesErr) {
    return { ok: false, reason: 'db_error', detail: profilesErr.message };
  }

  const firstWithPhone = (profiles ?? []).find(
    (p) => typeof p.phone === 'string' && p.phone.trim().length > 0
  );
  if (!firstWithPhone) {
    return { ok: false, reason: 'no_phone', detail: 'parent has no phone on file' };
  }

  const signingUrl = `${getAppUrl()}/hs/consent/${pending.token}`;
  return enqueueConsentSms({
    pendingConsentId: pending.id as string,
    parentPhone: firstWithPhone.phone as string,
    parentUserId: (firstWithPhone.user_id as string) ?? null,
    signingUrl,
    skipRateLimit: input.skipRateLimit,
    provider: input.provider,
  });
}

// ---------------------------------------------------------------------------
// Worker + admin helpers
// ---------------------------------------------------------------------------

export interface DequeueResult {
  picked: number;
  sent: number;
  failed: number;
}

/**
 * Retry up to `limit` SMS rows that failed but still have retries
 * remaining. Intended for the /api/cron/hs-sms-worker backstop.
 */
export async function dequeuePending(
  limit = 20,
  provider: SmsProvider = getSmsProvider()
): Promise<DequeueResult> {
  const sb = getServiceRoleClient();
  const { data: rows, error } = await sb
    .from('sms_messages')
    .select(
      'id, recipient_phone, body_text, retries_remaining, status'
    )
    .eq('status', 'failed')
    .gt('retries_remaining', 0)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !rows) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil sms] dequeue failed', error?.message);
    return { picked: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const remaining = (row.retries_remaining as number) - 1;
    try {
      const result = await provider.sendSms({
        to: row.recipient_phone as string,
        body: row.body_text as string,
        messageId: row.id as string,
      });
      const now = new Date().toISOString();
      const nextStatus: SmsStatus =
        result.status === 'sent'
          ? 'sent'
          : result.status === 'queued'
            ? 'sending'
            : remaining > 0
              ? 'failed'
              : 'undeliverable';
      await sb
        .from('sms_messages')
        .update({
          status: nextStatus,
          twilio_sid: result.sid || null,
          error_code: result.errorCode ?? null,
          error_message: result.errorMessage ?? null,
          sent_at: result.status === 'sent' ? now : null,
          retries_remaining: remaining,
        })
        .eq('id', row.id);
      if (result.status === 'failed') {
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await sb
        .from('sms_messages')
        .update({
          status: (remaining > 0 ? 'failed' : 'undeliverable') as SmsStatus,
          error_code: 'exception',
          error_message: message.slice(0, 500),
          retries_remaining: remaining,
        })
        .eq('id', row.id);
      failed += 1;
    }
  }

  return { picked: rows.length, sent, failed };
}

/**
 * Admin dashboard signal — how many SMS rows were CREATED today
 * (UTC-floor), across all statuses. We deliberately count by
 * created_at so a slow-sending message still shows up.
 */
export async function countSmsSentToday(): Promise<{
  sent: number;
  failed: number;
  undeliverable: number;
  total: number;
}> {
  const sb = getServiceRoleClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const counts = { sent: 0, failed: 0, undeliverable: 0, total: 0 };
  try {
    const { data, error } = await sb
      .from('sms_messages')
      .select('status')
      .gte('created_at', sinceIso);
    if (error) throw error;
    for (const row of data ?? []) {
      counts.total += 1;
      const s = row.status as SmsStatus;
      if (s === 'sent' || s === 'sending') counts.sent += 1;
      else if (s === 'failed') counts.failed += 1;
      else if (s === 'undeliverable') counts.undeliverable += 1;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil sms] countSmsSentToday failed', err);
  }
  return counts;
}

/**
 * Paginated list for the admin dashboard. `limit` default 50; body_text
 * is returned verbatim — the UI truncates for privacy (first 80 chars).
 */
export async function listRecentSmsMessages(
  limit = 50
): Promise<SmsMessageRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('sms_messages')
    .select(
      'id, recipient_phone, recipient_user_id, kind, body_text, status, twilio_sid, error_code, error_message, retries_remaining, scheduled_for, sent_at, created_at, related_kind, related_id'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil sms] listRecentSmsMessages failed', error.message);
    return [];
  }
  return (data ?? []) as SmsMessageRow[];
}

// ---------------------------------------------------------------------------
// Unsubscribe token helpers
// ---------------------------------------------------------------------------

/**
 * Mark a user as SMS-unsubscribed. Called from the tokenized
 * unsubscribe endpoint AND from any admin tooling. Idempotent.
 */
export async function markUserUnsubscribed(
  userId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb.from('sms_delivery_preferences').upsert(
    {
      user_id: userId,
      sms_enabled: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason.slice(0, 500),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Try to find a parent profile from a phone number — used by the
 * anonymous unsubscribe endpoint when the parent doesn't have a user
 * account yet. Returns the first matching profile's user_id or null.
 */
export async function findUserIdByPhone(
  rawPhone: string
): Promise<string | null> {
  const normalized = normalizePhoneE164(rawPhone);
  if (!normalized) return null;
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('hs_parent_profiles')
    .select('user_id')
    .eq('phone', normalized)
    .maybeSingle();
  return (data?.user_id as string) ?? null;
}
