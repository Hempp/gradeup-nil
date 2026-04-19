/**
 * POST /api/hs/referrals/attribute
 *
 * Signup hook — called by the HS athlete / parent / brand signup
 * pages right after auth.signUp() succeeds. Reads the hs_ref cookie
 * set by RefCapture on the visitor's earlier landing at
 * `/hs?ref=CODE`, ties the attributions row to the newly-created
 * user, writes a `signup_completed` funnel event, fires the
 * confirmation email to the referrer, and clears the cookie.
 *
 * Why a separate route (not inline in the signup page):
 *   - Attributions must be written via service-role (RLS blocks
 *     client inserts by design). The service-role key must never
 *     leave the server.
 *   - Cookies should only be read server-side; a client-side read
 *     can be tampered with.
 *
 * Idempotent: safe to call multiple times. If the cookie is missing
 * or already claimed, returns { matched: false } and a 200.
 *
 * Body (all optional):
 *   { role: 'hs_parent' | 'hs_athlete' | 'hs_brand' }
 *     Defaults to deriving from user_metadata.role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  attributeSignup,
  type ReferralSignupRole,
} from '@/lib/hs-nil/referrals';
import { sendReferralSignupConfirmation } from '@/lib/services/hs-nil/referral-emails';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const REF_COOKIE = 'hs_ref';

interface RefCookiePayload {
  code: string;
  clicked_at: string;
  attribution_id: string;
}

const bodySchema = z
  .object({
    role: z.enum(['hs_parent', 'hs_athlete', 'hs_brand']).optional(),
  })
  .strict();

function parseCookie(raw: string | undefined): RefCookiePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RefCookiePayload;
    if (
      typeof parsed === 'object' &&
      parsed &&
      typeof parsed.code === 'string' &&
      typeof parsed.attribution_id === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyRaw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(bodyRaw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const meta = (user.user_metadata ?? {}) as {
    role?: string;
    first_name?: string;
    last_name?: string;
  };
  const role: ReferralSignupRole =
    parsed.data.role ??
    ((meta.role === 'hs_parent' || meta.role === 'hs_athlete'
      ? meta.role
      : meta.role === 'brand'
        ? 'hs_brand'
        : null) as ReferralSignupRole | null) ??
    'hs_parent';

  const jar = await cookies();
  const cookie = parseCookie(jar.get(REF_COOKIE)?.value);

  // Clear the cookie regardless of match — we never want a signup to
  // attribute twice (same browser, different role, stale cookie).
  jar.set(REF_COOKIE, '', { path: '/', maxAge: 0 });

  if (!cookie) {
    return NextResponse.json({ matched: false, reason: 'no_cookie' });
  }

  try {
    const result = await attributeSignup({
      attributionId: cookie.attribution_id,
      referredUserId: user.id,
      referredEmail: user.email ?? null,
      roleSignedUpAs: role,
    });

    if (!result) {
      return NextResponse.json({ matched: false, reason: 'no_match' });
    }

    // Fire the referrer-confirmation email best-effort. This is the
    // moment where the referrer sees their viral loop pay off — we
    // don't want to miss it, but failing to send must not 500 the
    // attribute call (the DB is already updated).
    try {
      const svc = serviceRoleClient();
      if (svc) {
        const [referrerProfile, referrerAuth] = await Promise.all([
          svc
            .from('profiles')
            .select('first_name, email')
            .eq('id', result.referringUserId)
            .maybeSingle(),
          svc.auth.admin.getUserById(result.referringUserId),
        ]);
        const referrerEmail =
          referrerProfile.data?.email ??
          referrerAuth.data.user?.email ??
          null;
        const referrerFirstName =
          referrerProfile.data?.first_name ??
          (referrerAuth.data.user?.user_metadata as { first_name?: string } | null)
            ?.first_name ??
          null;
        const referredName =
          [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() ||
          user.email?.split('@')[0] ||
          'Someone';

        if (referrerEmail) {
          await sendReferralSignupConfirmation({
            referrerEmail,
            referrerFirstName,
            referredName,
            referredRole: role,
          });
        }
      }
    } catch (emailErr) {
      // eslint-disable-next-line no-console
      console.warn('[hs-referrals-attribute] email send failed', emailErr);
    }

    return NextResponse.json({
      matched: true,
      attributionId: result.attributionId,
      role,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Attribution write failed';
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-attribute] failure', { message });
    // Still 200 — signup must not fail on referral plumbing errors.
    return NextResponse.json({ matched: false, error: message });
  }
}
