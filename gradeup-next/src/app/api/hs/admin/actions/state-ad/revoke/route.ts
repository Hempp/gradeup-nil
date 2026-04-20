/**
 * POST /api/hs/admin/actions/state-ad/revoke
 *
 * Admin action: revoke a state-AD invitation (when not yet accepted) or
 * deactivate an active assignment (soft-delete via deactivated_at).
 * Body (one of two shapes):
 *   { invitationId: uuid }                 // revoke before acceptance
 *   { assignmentId: uuid }                 // deactivate after acceptance
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { revokeInvitation } from '@/lib/hs-nil/state-ad-portal';

const schema = z
  .object({
    invitationId: z.string().uuid().optional(),
    assignmentId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (v) => Boolean(v.invitationId) !== Boolean(v.assignmentId),
    'Provide exactly one of invitationId or assignmentId'
  );

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

    if (v.data.invitationId) {
      const result = await revokeInvitation(v.data.invitationId);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? 'revoke failed', code: 'internal' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Deactivate an active assignment. We write deactivated_at through the
    // service-role client — the auth-client RLS policy only allows the AD
    // themselves to SELECT, not the admin.
    const sb = getServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: 'Service role not configured', code: 'internal' },
        { status: 500 }
      );
    }
    const { error: updateErr } = await sb
      .from('state_ad_assignments')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('id', v.data.assignmentId!)
      .is('deactivated_at', null);
    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message, code: 'internal' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/state-ad/revoke]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
