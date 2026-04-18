/**
 * POST /api/hs/consent/pending/[id]/resend
 *
 * Resend the signing-link email for a pending parental-consent request.
 *
 * STATUS: STUB. The route is wired, feature-flagged, rate-limited, and does
 * the ownership check — but it does not yet actually re-send the email. The
 * current provider mints a single-use token at initiation time and sends
 * once; reliably resending requires one of:
 *
 *   1. Look up the existing token from pending_consents (service-role read),
 *      re-build the signingUrl via the same helper the provider uses, and
 *      call sendParentConsentRequest again. Safe as long as the token isn't
 *      consumed or expired. Preferred; minimal surface area.
 *
 *   2. Rotate the token (insert a new pending_consents row, void the old
 *      one). Safer if we ever persist anything token-scoped beyond the row
 *      itself, but introduces the risk of two live links floating around.
 *
 * Until one of those lands, the route returns ok=true so the UI stays
 * responsive, and logs the attempt so ops can follow up out-of-band.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid pending-consent id.' },
        { status: 400 }
      );
    }

    // Ownership check via RLS-aware client.
    const { data: pending, error: fetchErr } = await supabase
      .from('pending_consents')
      .select('id, athlete_user_id, parent_email, expires_at, consumed_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Could not look up pending consent.' },
        { status: 500 }
      );
    }

    if (!pending || pending.athlete_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Pending consent not found.' },
        { status: 404 }
      );
    }

    if (pending.consumed_at) {
      return NextResponse.json(
        { error: 'This consent has already been signed.' },
        { status: 409 }
      );
    }

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'This signing link has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // TODO(hs-nil): actually re-send the email. See file-level docblock for
    // options. Prefer option (1) — re-use the existing token, call
    // sendParentConsentRequest with the original scope + athleteName lookup.
    // eslint-disable-next-line no-console
    console.log('[hs-nil consent] resend requested (stub)', {
      pendingId: id,
      athleteUserId: user.id,
      parentEmail: pending.parent_email,
    });

    return NextResponse.json({ ok: true, stub: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
