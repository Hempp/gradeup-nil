/**
 * GET/POST /api/hs/nurture/unsubscribe/[token]
 *
 * Public, unauthenticated. Reads the opaque unsubscribe_token from
 * a nurture enrollment row and marks every active sequence for the
 * owning ref as 'unsubscribed'. No re-enrollment is possible without
 * a fresh waitlist signup.
 *
 * Both verbs are supported — some mail clients fetch GET on link
 * click (preview / one-click unsubscribe compliant), others POST from
 * the landing page button.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/hs-nil/nurture-sequences';

interface RouteContext {
  params: Promise<{ token: string }>;
}

async function handle(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { matched } = await unsubscribeByToken(token);
    if (!matched) {
      return NextResponse.json(
        { error: 'Token not recognised — already opted out or never existed.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unsubscribe_failed';
    // eslint-disable-next-line no-console
    console.error('[hs-nurture unsubscribe] fatal', message);
    return NextResponse.json({ error: 'unsubscribe_failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
