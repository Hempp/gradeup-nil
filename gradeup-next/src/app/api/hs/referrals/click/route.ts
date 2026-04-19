/**
 * POST /api/hs/referrals/click
 *
 * Called by the <RefCapture /> client component when `?ref=CODE` is
 * seen on any /hs route. Resolves the code, records an attribution
 * row (referred_user_id NULL), writes a `code_clicked` funnel event,
 * and sets the httpOnly `hs_ref` cookie that persists through the
 * eventual signup.
 *
 * Security:
 *   - No auth required — most clicks are anonymous visitors (that's
 *     the whole point of viral referrals). We still resolve the
 *     viewer's session (if any) to filter self-clicks.
 *   - Code pattern is strictly validated before touching the DB.
 *   - httpOnly + Secure + SameSite=Lax on the cookie so a malicious
 *     page can't forge a pre-click state.
 *
 * Idempotency: cookie presence short-circuits the DB write — visitors
 * bouncing around /hs with the same `?ref=` value don't spam the
 * attributions table. A different code replaces the cookie
 * (first-touch-win happens at signup-time, not click-time).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { recordReferralClick } from '@/lib/hs-nil/referrals';

const REF_COOKIE = 'hs_ref';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

const bodySchema = z
  .object({
    code: z.string().regex(/^[A-Za-z0-9]{6,24}$/),
    path: z.string().max(512).optional(),
    utm: z
      .object({
        source: z.string().max(128).nullish(),
        medium: z.string().max(128).nullish(),
        campaign: z.string().max(128).nullish(),
      })
      .partial()
      .optional(),
  })
  .strict();

interface RefCookiePayload {
  code: string;
  clicked_at: string;
  attribution_id: string;
}

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

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { code } = parsed.data;

  // Short-circuit: same-code cookie already set this session.
  const jar = await cookies();
  const existing = parseCookie(jar.get(REF_COOKIE)?.value);
  if (existing && existing.code === code) {
    return NextResponse.json({ ok: true, reused: true });
  }

  // Resolve the viewer (if any) to suppress self-click pollution.
  let viewerUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerUserId = user?.id ?? null;
  } catch {
    // Anonymous — proceed.
  }

  const result = await recordReferralClick({
    code,
    viewerUserId,
    metadata: {
      source: 'ref_capture',
      path: parsed.data.path ?? null,
      utm: parsed.data.utm ?? null,
      viewer_authenticated: viewerUserId !== null,
    },
  });

  if (!result) {
    // Unknown code OR self-click. Don't set a cookie, but also don't
    // 4xx — we shouldn't expose "is this code real" as a probe.
    return NextResponse.json({ ok: true, tracked: false });
  }

  const payload: RefCookiePayload = {
    code: result.code,
    clicked_at: result.clickedAt,
    attribution_id: result.attributionId,
  };

  jar.set(REF_COOKIE, JSON.stringify(payload), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: THIRTY_DAYS_SECONDS,
  });

  return NextResponse.json({ ok: true, tracked: true });
}
