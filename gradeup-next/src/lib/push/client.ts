/**
 * web-push client — lazy singleton.
 *
 * Mirrors the Resend fail-soft pattern in src/lib/services/email.ts:
 *   - Missing VAPID env in dev → client getter returns null, senders
 *     log and no-op. PWA UX is preserved for local development.
 *   - Missing VAPID env in prod → client getter THROWS. We fail-closed
 *     so silent push-drop can't slip into production unnoticed.
 *
 * Reads the following env vars, all required in prod:
 *   VAPID_PUBLIC_KEY   — base64url-encoded public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded private key
 *   VAPID_SUBJECT      — mailto:... URL identifying the sender (RFC 8292)
 *
 * Never import this module from a client bundle. It's server-only.
 */

import webpush, { type PushSubscription, type WebPushError } from 'web-push';

// ─── Config ─────────────────────────────────────────────────────

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

function readVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

// ─── Singleton ──────────────────────────────────────────────────

let configured = false;

/**
 * Returns the web-push module with VAPID details set, or null if the
 * VAPID env is missing in a non-production environment.
 *
 * In production, missing VAPID env throws — push is a critical
 * distribution channel for parent consent and deal-completion alerts,
 * so we fail-closed rather than silently drop messages.
 */
export function getWebPushClient(): typeof webpush | null {
  const cfg = readVapidConfig();
  if (!cfg) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[push] VAPID env missing in production. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.'
      );
    }
    // Non-prod: warn once and no-op so local dev doesn't break.
    if (!configured) {
      // eslint-disable-next-line no-console
      console.info(
        '[push] VAPID env not configured — push sends will no-op. OK for local dev.'
      );
      configured = true;
    }
    return null;
  }

  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
  return webpush;
}

/**
 * Public key getter — used by /api/push/vapid-public-key so browsers
 * can pass it to pushManager.subscribe({ applicationServerKey }).
 *
 * Returns null in dev when unconfigured; throws in prod for the
 * same fail-closed reason as getWebPushClient.
 */
export function getVapidPublicKey(): string | null {
  const cfg = readVapidConfig();
  if (!cfg) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[push] VAPID_PUBLIC_KEY missing in production.');
    }
    return null;
  }
  return cfg.publicKey;
}

// ─── Types re-exported for the sender ──────────────────────────

export type { PushSubscription, WebPushError };
