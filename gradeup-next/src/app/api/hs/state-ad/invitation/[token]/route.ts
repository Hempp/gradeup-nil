/**
 * GET /api/hs/state-ad/invitation/[token]
 *
 * Unauthenticated invitation landing endpoint. Returns a minimal, safe
 * projection of the invitation (state + organization name + status) so
 * the /hs/state-ad-invite/[token] landing page can render without
 * requiring a session.
 *
 * We intentionally do NOT echo the email, inviter, or token back — the
 * token is already in the URL, and the email is PII. Anyone who holds
 * the token is effectively the addressee until acceptance.
 *
 * Feature-flag gated via FEATURE_HS_NIL — pre-acceptance the invitee
 * also does not yet have the flag, but gating here ensures the route
 * stays hidden when the whole subsystem is off.
 */

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { token } = await params;
    if (!token || typeof token !== 'string' || token.length > 200) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sb = getServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: 'Service unavailable', code: 'internal' },
        { status: 500 }
      );
    }

    const { data } = await sb
      .from('state_ad_invitations')
      .select('state_code, organization_name, accepted_at, rejected_at, expires_at')
      .eq('invitation_token', token)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = Date.now();
    let status: 'pending' | 'expired' | 'accepted' | 'revoked' = 'pending';
    if (data.accepted_at) status = 'accepted';
    else if (data.rejected_at) status = 'revoked';
    else if (new Date(data.expires_at as string).getTime() < now) status = 'expired';

    return NextResponse.json({
      ok: true,
      invitation: {
        stateCode: data.state_code,
        organizationName: data.organization_name,
        status,
        expiresAt: data.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/state-ad/invitation GET]', message);
    return NextResponse.json(
      { error: 'Internal error', code: 'internal' },
      { status: 500 }
    );
  }
}
