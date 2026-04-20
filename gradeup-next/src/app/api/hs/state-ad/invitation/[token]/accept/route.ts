/**
 * POST /api/hs/state-ad/invitation/[token]/accept
 *
 * Accept a state-AD invitation. Requires an authenticated user (they
 * signed up or logged in first — the /hs/state-ad-invite/[token]/accept
 * page handles that gate).
 *
 * Flow:
 *   1. Auth'd user posts with the token in the URL.
 *   2. acceptInvitation() validates token + creates the
 *      state_ad_assignments row.
 *   3. We also promote profiles.role to 'state_ad' (best-effort — the
 *      portal's pages use state_ad_assignments as the source of truth,
 *      but setting the role keeps downstream guards happy).
 *   4. Send the "invitation accepted" email to the inviting admin (best-
 *      effort; failure does not revert the acceptance).
 *
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { acceptInvitation } from '@/lib/hs-nil/state-ad-portal';
import { sendStateAdInvitationAccepted } from '@/lib/services/hs-nil/state-ad-emails';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(
  request: NextRequest,
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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const result = await acceptInvitation(token, user.id);
    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'expired' || result.code === 'revoked'
            ? 410
            : result.code === 'already_accepted'
              ? 409
              : 500;
      return NextResponse.json(
        { error: result.error, code: result.code ?? 'internal' },
        { status }
      );
    }

    // Best-effort: promote profiles.role to 'state_ad' so auth-client role
    // checks elsewhere can recognise the portal tier. Use service role
    // because the profiles table may have restrictive self-update policies.
    const sb = getServiceRoleClient();
    if (sb) {
      try {
        await sb
          .from('profiles')
          .update({ role: 'state_ad' })
          .eq('id', user.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs/state-ad/accept] profile role update failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Fire-and-forget admin notification. Pull the invitation + inviter
      // from the service client so we can include the admin email.
      try {
        const { data: inv } = await sb
          .from('state_ad_invitations')
          .select('invited_by_user_id, invited_email, state_code, organization_name')
          .eq('invitation_token', token)
          .maybeSingle();
        if (inv?.invited_by_user_id) {
          const { data: inviterUser } = await sb.auth.admin.getUserById(
            inv.invited_by_user_id as string
          );
          const adminEmail = inviterUser?.user?.email;
          if (adminEmail) {
            await sendStateAdInvitationAccepted({
              adminEmail,
              acceptedByEmail: user.email ?? (inv.invited_email as string),
              stateCode: inv.state_code as string,
              organizationName: inv.organization_name as string,
              acceptedAt: new Date(),
            });
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs/state-ad/accept] notify admin failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      stateCode: result.stateCode,
      organizationName: result.organizationName,
      assignmentId: result.assignmentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/state-ad/accept]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
