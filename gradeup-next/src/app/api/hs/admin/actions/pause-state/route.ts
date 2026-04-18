/**
 * POST /api/hs/admin/actions/pause-state
 *
 * Admin action: pause a state's HS-NIL pilot. Stamps paused_at + pause_reason
 * on the state_pilot_activations row. The sequencer (and manual calls to
 * sequenceInvitesForState) will short-circuit on paused rows, so no new
 * invites go out. Existing invited rows are untouched — anyone holding a
 * live invitation_token can still click through.
 *
 * Auth: admin-gated.
 * Feature flag: FEATURE_HS_NIL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';

const PILOT_STATE_SET = new Set<USPSStateCode>(PILOT_STATES);

const bodySchema = z
  .object({
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .length(2, 'State code must be 2 letters'),
    reason: z.string().trim().max(500),
  })
  .strict();

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile || profile.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, userId: user.id };
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const rateLimited = await enforceRateLimit(request, 'mutation', gate.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(bodySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const { stateCode, reason } = validation.data;
    if (!PILOT_STATE_SET.has(stateCode as USPSStateCode)) {
      return NextResponse.json(
        { error: `State ${stateCode} is not in the current pilot set` },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase service role not configured' },
        { status: 500 }
      );
    }
    const serviceClient = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const { data, error } = await serviceClient
      .from('state_pilot_activations')
      .update({
        paused_at: nowIso,
        pause_reason: reason,
        updated_at: nowIso,
      })
      .eq('state_code', stateCode)
      .is('paused_at', null)
      .select('state_code');

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[pause-state] update failed', {
        stateCode,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Could not pause state pilot.' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `State ${stateCode} is not currently active.` },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, stateCode, pausedAt: nowIso });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
