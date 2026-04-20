/**
 * HS-NIL Phase 17 — Twilio SMS Provider Interface + Implementations
 * ----------------------------------------------------------------------------
 * Provider-agnostic SMS delivery for the parental consent fallback path.
 * Mirrors the structure of `src/lib/hs-nil/ocr-provider.ts` and
 * `src/lib/hs-nil/payouts.ts` — one interface, one stub, one real
 * implementation, a selector, and fail-closed semantics in production.
 *
 * Fail-closed in production:
 *   - StubSmsProvider returns a deterministic success in dev/test so
 *     the consent flow can be exercised end-to-end without Twilio
 *     credentials.
 *   - In production the stub THROWS. If SMS_PROVIDER is unset in prod,
 *     the consent flow will surface a loud error instead of silently
 *     dropping a fallback the parent depended on.
 *
 * Selection (env-driven, see `getSmsProvider`):
 *   - SMS_PROVIDER=twilio → TwilioSmsProvider
 *       (requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_PHONE)
 *   - SMS_PROVIDER=stub or unset → StubSmsProvider (throws in prod)
 *
 * Network posture:
 *   - `fetch` with a 10s timeout via AbortController.
 *   - Up to 3 retries for transient failures (5xx, network errors).
 *   - 4xx responses are terminal — those indicate a real problem
 *     (invalid number, body too long, undeliverable) that a retry
 *     won't fix.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SmsProviderName = 'stub' | 'twilio';

/** Delivery attempt status as reported by the provider. */
export type SmsSendStatus = 'queued' | 'sent' | 'failed';

export interface SendSmsInput {
  /** E.164-formatted recipient phone (e.g. "+14155551234"). */
  to: string;
  /** Full SMS body, UTF-8, ≤ 1600 chars (Twilio hard limit). */
  body: string;
  /**
   * Upstream id (our sms_messages.id) so logs can correlate. Twilio
   * accepts this via `StatusCallback` params; we just echo it into
   * structured logs today.
   */
  messageId: string;
}

export interface SendSmsResult {
  /**
   * Provider-side message id. Twilio SIDs look like `SMxxxxxxxx`; the
   * stub returns `SM_stub_<messageId-prefix>`. Always set, even on
   * failure (caller can persist it for correlation).
   */
  sid: string;
  status: SmsSendStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface SmsProvider {
  name: SmsProviderName;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
}

// ---------------------------------------------------------------------------
// Phone normalization (E.164)
// ---------------------------------------------------------------------------

/**
 * Normalise a raw phone string to E.164. U.S.-only for the pilot — any
 * number that isn't clearly a 10-digit US number or an 11-digit number
 * starting with 1 returns null (caller treats as undeliverable).
 *
 * Examples:
 *   "(415) 555-1234"   → "+14155551234"
 *   "415-555-1234"     → "+14155551234"
 *   "1 415 555 1234"   → "+14155551234"
 *   "+14155551234"     → "+14155551234"
 *   "+441632960961"    → null  (non-US, rejected for pilot)
 */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already E.164 for US?
  if (/^\+1\d{10}$/.test(trimmed)) return trimmed;

  // Any other "+" prefix is non-US; rejected for pilot.
  if (trimmed.startsWith('+')) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// ---------------------------------------------------------------------------
// Stub provider
// ---------------------------------------------------------------------------

/**
 * Stub implementation — deterministic dev/test echo. Returns
 * `{ status: 'sent', sid: 'SM_stub_<prefix>' }`.
 *
 * In production (NODE_ENV === 'production') this THROWS so a missing
 * SMS_PROVIDER env var surfaces loudly instead of silently dropping the
 * fallback delivery the consent flow depends on.
 */
export class StubSmsProvider implements SmsProvider {
  readonly name: SmsProviderName = 'stub';

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[hs-nil sms] sms provider not configured (production). ' +
          'Refusing to run the stub — set SMS_PROVIDER=twilio and ' +
          'TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_PHONE.'
      );
    }

    const suffix = input.messageId.replace(/-/g, '').slice(0, 10) || 'dev';
    return {
      sid: `SM_stub_${suffix}`,
      status: 'sent',
    };
  }
}

// ---------------------------------------------------------------------------
// Twilio provider
// ---------------------------------------------------------------------------

const TWILIO_REST_HOST = 'https://api.twilio.com';
const TWILIO_TIMEOUT_MS = 10_000;
const TWILIO_MAX_RETRIES = 3;

interface TwilioSendResponse {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
  code?: number;
  message?: string;
}

/**
 * Twilio REST adapter. Posts to `/2010-04-01/Accounts/{sid}/Messages.json`
 * using the account SID + auth token as basic auth credentials (Twilio
 * accepts both basic-auth and header-auth; basic is simpler).
 *
 * We deliberately avoid adding the `twilio` npm package — the surface
 * area we need is one authenticated POST and the dep adds ~1 MB that we
 * don't need to ship on the server bundle.
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name: SmsProviderName = 'twilio';

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;

    if (!accountSid || !authToken || !fromPhone) {
      throw new Error(
        '[hs-nil sms] TwilioSmsProvider misconfigured — ' +
          'TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_PHONE are all required.'
      );
    }

    const url = `${TWILIO_REST_HOST}/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
    const body = new URLSearchParams({
      To: input.to,
      From: fromPhone,
      Body: input.body,
    }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    let lastError: { code: string; message: string } | null = null;
    for (let attempt = 1; attempt <= TWILIO_MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TWILIO_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            authorization: `Basic ${auth}`,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const json = (await res.json().catch(() => ({}))) as TwilioSendResponse;

        if (!res.ok) {
          // 4xx — terminal. 5xx — retriable.
          const errCode = String(json.code ?? res.status);
          const errMsg =
            json.message ?? `Twilio ${res.status}: ${res.statusText}`;
          lastError = { code: errCode, message: errMsg };
          if (res.status >= 500 && attempt < TWILIO_MAX_RETRIES) {
            continue;
          }
          return {
            sid: json.sid ?? '',
            status: 'failed',
            errorCode: errCode,
            errorMessage: errMsg.slice(0, 500),
          };
        }

        // Twilio returns statuses: 'queued' | 'sending' | 'sent' | ... We
        // normalise to our own enum. Anything pre-'sent' becomes 'queued'
        // for our purposes (the cron worker re-checks later).
        const twilioStatus = (json.status ?? 'queued').toLowerCase();
        const mapped: SmsSendStatus =
          twilioStatus === 'sent' || twilioStatus === 'delivered'
            ? 'sent'
            : 'queued';

        return {
          sid: json.sid ?? '',
          status: mapped,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        const message = err instanceof Error ? err.message : String(err);
        lastError = { code: 'network', message };
        if (attempt < TWILIO_MAX_RETRIES) {
          continue;
        }
      }
    }

    return {
      sid: '',
      status: 'failed',
      errorCode: lastError?.code ?? 'unknown',
      errorMessage: (lastError?.message ?? 'SMS send failed').slice(0, 500),
    };
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Resolve the SMS provider from env. Fail-closed: defaults to the stub,
 * which itself throws in production so a missing env var surfaces loudly.
 */
export function getSmsProvider(override?: SmsProviderName): SmsProvider {
  const raw =
    override ?? (process.env.SMS_PROVIDER as string | undefined) ?? 'stub';
  switch (raw) {
    case 'twilio':
      return new TwilioSmsProvider();
    case 'stub':
    default:
      return new StubSmsProvider();
  }
}
