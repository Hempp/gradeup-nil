/**
 * POST /api/hs/invite/reconcile
 *
 * Signup-path hook for the waitlist activation loop. Called by the
 * HS athlete / parent / brand signup pages immediately after a
 * successful signUp so we can:
 *   1. Read the `hs_invite` cookie (dropped by /hs/invite/[token]).
 *   2. Match it against the authed user + role.
 *   3. Flip the matching hs_waitlist row to activation_state='converted'.
 *   4. Clear the cookie.
 *
 * Why a server route (not inline in the client signup): the service-role
 * client required to write activation state must never reach the browser.
 *
 * Idempotent: safe to call multiple times — the underlying reconciler
 * short-circuits if the row is already converted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { reconcileSignupToWaitlist } from '@/lib/hs-nil/waitlist-activation';

const bodySchema = z
  .object({
    role: z.enum(['athlete', 'parent', 'coach', 'brand']),
  })
  .strict();

interface InviteCookiePayload {
  role: 'athlete' | 'parent' | 'coach' | 'brand';
  state_code: string;
  token: string;
}

function parseCookie(raw: string | undefined): InviteCookiePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InviteCookiePayload;
    if (
      typeof parsed === 'object' &&
      parsed &&
      typeof parsed.token === 'string' &&
      typeof parsed.role === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const jar = await cookies();
    const cookie = parseCookie(jar.get('hs_invite')?.value);

    const matched = await reconcileSignupToWaitlist({
      userId: user.id,
      email: user.email ?? '',
      role: parsed.data.role,
      inviteToken: cookie?.token ?? null,
    });

    // Always clear the cookie once the signup has completed — whether
    // or not we matched. Leaving it around risks matching a future
    // login session to a stale waitlist row.
    jar.set('hs_invite', '', { path: '/', maxAge: 0 });

    return NextResponse.json({ ok: true, matched });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reconcile failed';
    // eslint-disable-next-line no-console
    console.warn('[hs/invite/reconcile]', { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
