/**
 * POST /api/hs/admin/actions/activate-state
 *
 * Admin action: activate (or un-pause) a state's HS-NIL pilot and
 * kick off the first waitlist invite batch synchronously so the admin
 * sees immediate feedback. Subsequent batches drain via the
 * hs-waitlist-sequencer cron.
 *
 * Auth: admin-gated via `profiles.role = 'admin'`. Matches the pattern
 * from src/app/api/hs/admin/transcripts/route.ts.
 *
 * Feature flag: FEATURE_HS_NIL.
 *
 * State contract: upsert into state_pilot_activations. If a row exists
 * and was previously paused, the paused_at / pause_reason fields are
 * cleared. activated_by is stamped with the current admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  sequenceInvitesForState,
  type SequenceResult,
} from '@/lib/hs-nil/waitlist-activation';

const PILOT_STATE_SET = new Set<USPSStateCode>(PILOT_STATES);

const bodySchema = z
  .object({
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .length(2, 'State code must be 2 letters'),
    reason: z.string().trim().max(500).optional(),
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

    // Upsert the activation. If a paused row exists we clear paused_at
    // and bump activated_at so the "activated on" timestamp reflects
    // the most recent un-pause / activation.
    const nowIso = new Date().toISOString();
    const { error: upsertErr } = await serviceClient
      .from('state_pilot_activations')
      .upsert(
        {
          state_code: stateCode,
          activated_at: nowIso,
          activated_by: gate.userId,
          paused_at: null,
          pause_reason: reason ?? null,
          updated_at: nowIso,
        },
        { onConflict: 'state_code' }
      );

    if (upsertErr) {
      // eslint-disable-next-line no-console
      console.error('[activate-state] upsert failed', {
        stateCode,
        error: upsertErr.message,
      });
      return NextResponse.json(
        { error: 'Could not activate state pilot.' },
        { status: 500 }
      );
    }

    // First batch — small, synchronous, so the admin UI sees results.
    // The cron picks up the rest every 4 hours.
    let firstBatch: SequenceResult;
    try {
      firstBatch = await sequenceInvitesForState(stateCode, { batchLimit: 10 });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[activate-state] first batch failed', {
        stateCode,
        error: err instanceof Error ? err.message : String(err),
      });
      firstBatch = { stateCode, processed: 0, sent: 0, failed: 0 };
    }

    return NextResponse.json({ ok: true, firstBatch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
