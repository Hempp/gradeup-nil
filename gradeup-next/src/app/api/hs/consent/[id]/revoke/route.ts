/**
 * POST /api/hs/consent/[id]/revoke
 *
 * Athlete revokes one of their own active parental consents.
 *
 * Authorization model: we verify the row's athlete_user_id matches the
 * calling user before mutating. RLS on parental_consents only ships a SELECT
 * policy (`auth.uid() = athlete_user_id`) and an INSERT policy; there is NO
 * UPDATE policy, so the anon client cannot write. We use the service role
 * client for the update after the explicit ownership check.
 *
 * Idempotent: revoking an already-revoked consent returns ok=true with no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Accept only the exact UUID shape for the path param. Anything else is an
// obvious client bug or probe, so 400 early rather than hit the DB.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured for consent revocation.'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createServerClient();
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
        { error: 'Invalid consent id.' },
        { status: 400 }
      );
    }

    // Ownership check uses the authenticated (anon) client so it rides on the
    // SELECT RLS policy — a row belonging to another athlete simply won't
    // appear here, which is the correct "404" signal.
    const { data: consent, error: fetchErr } = await supabase
      .from('parental_consents')
      .select('id, athlete_user_id, parent_email, parent_full_name, revoked_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Could not look up consent.' },
        { status: 500 }
      );
    }

    if (!consent || consent.athlete_user_id !== user.id) {
      // Don't leak which IDs exist. Uniform 404 for "missing" and "not yours".
      return NextResponse.json(
        { error: 'Consent not found.' },
        { status: 404 }
      );
    }

    if (consent.revoked_at) {
      // Already revoked — treat as idempotent success. The UI will re-render
      // and the row will move to history either way.
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    const service = getServiceClient();
    const { error: updateErr } = await service
      .from('parental_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      // Belt-and-suspenders: re-assert ownership in the WHERE so a stolen
      // service-role call from this handler still can't touch another
      // athlete's row.
      .eq('athlete_user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'Could not revoke consent.' },
        { status: 500 }
      );
    }

    // TODO(hs-nil): notify the parent that the athlete revoked the consent.
    // The existing email service exposes sendParentConsentRequest /
    // sendParentConsentSigned but not a revocation-notice template — add one
    // there and wire a best-effort call here (try/catch, never throw). For
    // now we log so ops can follow up manually if needed.
    // eslint-disable-next-line no-console
    console.log('[hs-nil consent] revoked', {
      consentId: id,
      athleteUserId: user.id,
      parentEmail: consent.parent_email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
