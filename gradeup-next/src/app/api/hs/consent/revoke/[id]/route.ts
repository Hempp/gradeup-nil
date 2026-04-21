/**
 * POST /api/hs/consent/revoke/[id]
 *
 * Athlete revokes one of their own active parental consents.
 *
 * Authorization model: we verify the row's athlete_user_id matches the
 * calling user before mutating. RLS on parental_consents only ships a SELECT
 * policy (`auth.uid() = athlete_user_id`) and an INSERT policy; there is NO
 * UPDATE policy, so the anon client cannot write. We use the service role
 * client for the update after the explicit ownership check.
 *
 * Path shape note: this sits under `/revoke/[id]` rather than `/[id]/revoke`
 * so the sibling public `/[token]` magic-link route can coexist without a
 * positional slug-name collision.
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
      return NextResponse.json(
        { error: 'Consent not found.' },
        { status: 404 }
      );
    }

    if (consent.revoked_at) {
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    const service = getServiceClient();
    const { error: updateErr } = await service
      .from('parental_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('athlete_user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'Could not revoke consent.' },
        { status: 500 }
      );
    }

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
