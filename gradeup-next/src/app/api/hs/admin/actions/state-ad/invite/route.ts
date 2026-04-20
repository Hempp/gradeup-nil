/**
 * POST /api/hs/admin/actions/state-ad/invite
 *
 * Admin action: invite a state athletic-association AD to the compliance
 * portal. Body:
 *   { email: string, stateCode: 2-letter, organizationName: string }
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { inviteStateAd } from '@/lib/hs-nil/state-ad-portal';
import { sendStateAdInvitation } from '@/lib/services/hs-nil/state-ad-emails';
import type { USPSStateCode } from '@/lib/hs-nil/state-rules';

const schema = z
  .object({
    email: z.string().email().max(320),
    stateCode: z.string().regex(/^[A-Z]{2}$/),
    organizationName: z.string().min(2).max(200),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await inviteStateAd({
      email: v.data.email,
      stateCode: v.data.stateCode as USPSStateCode,
      organizationName: v.data.organizationName,
      invitedByUserId: user.id,
    });
    if (!result.ok || !result.invitation) {
      return NextResponse.json(
        { error: result.error ?? 'invite failed', code: 'internal' },
        { status: 500 }
      );
    }

    // Best-effort email — the invitation is already durable.
    await sendStateAdInvitation({
      email: result.invitation.invitedEmail,
      stateCode: result.invitation.stateCode,
      organizationName: result.invitation.organizationName,
      invitationToken: result.invitation.invitationToken,
      expiresAt: new Date(result.invitation.expiresAt),
    });

    return NextResponse.json({
      ok: true,
      invitation: {
        id: result.invitation.id,
        invitedEmail: result.invitation.invitedEmail,
        stateCode: result.invitation.stateCode,
        organizationName: result.invitation.organizationName,
        expiresAt: result.invitation.expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/state-ad/invite]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
