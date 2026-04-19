/**
 * GET /api/push/vapid-public-key
 *
 * Returns the VAPID public key so the browser can pass it to
 * pushManager.subscribe({ applicationServerKey }). Public information
 * by design — the whole point is for anyone to be able to subscribe.
 *
 * In dev without VAPID configured, returns 503 with a clear body so
 * PushSubscribeButton can render its "unsupported" state without
 * exploding.
 */

import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push/client';

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return NextResponse.json(
        {
          error: 'Push notifications are not configured on this environment.',
          code: 'vapid_not_configured',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ publicKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
