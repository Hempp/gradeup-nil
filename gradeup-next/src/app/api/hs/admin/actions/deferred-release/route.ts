/**
 * POST /api/hs/admin/actions/deferred-release
 *
 * Admin action: force-release or forfeit a deferred payout hold. Body:
 *   {
 *     deferredId: uuid,
 *     decision: 'release' | 'forfeit',
 *     reason: string (min 10 chars)
 *   }
 *
 * Force-release skips the release_eligible_at gate and calls the same
 * releaseDeferred() service the cron uses. Forfeit marks the row as
 * forfeited (funds stay in the platform's custodial trust — reconciliation
 * path is out-of-band ops). Both paths write an admin_audit_log row.
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  releaseDeferred,
  forfeitDeferred,
} from '@/lib/hs-nil/deferred-payouts';

const schema = z
  .object({
    deferredId: z.string().uuid(),
    decision: z.enum(['release', 'forfeit']),
    reason: z.string().min(10).max(2000),
  })
  .strict();

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-admin/deferred-release] Supabase service role not configured.',
    );
  }
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
        { status: 400 },
      );
    }

    // Forfeit path — forfeitDeferred handles the audit log itself.
    if (v.data.decision === 'forfeit') {
      const result = await forfeitDeferred({
        deferredId: v.data.deferredId,
        reason: v.data.reason,
        actorUserId: user.id,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.reason, code: 'invalid_state' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        decision: 'forfeit',
        auditLogId: result.auditLogId,
      });
    }

    // Force-release path. Bypass the eligibility check and write our own
    // audit row (separate action name + target_kind so the audit trail
    // clearly distinguishes cron-released from admin-forced releases).
    const releaseResult = await releaseDeferred(v.data.deferredId, {
      bypassEligibilityCheck: true,
    });

    if (!releaseResult.ok) {
      return NextResponse.json(
        { error: releaseResult.reason, code: 'invalid_state' },
        { status: 400 },
      );
    }

    const sb = getServiceRoleClient();
    const { data: audit, error: auditErr } = await sb
      .from('admin_audit_log')
      .insert({
        actor_user_id: user.id,
        action: 'deferred_release_forced',
        target_kind: 'deferred_payout',
        target_id: v.data.deferredId,
        reason: v.data.reason.trim(),
        metadata: {
          transferId: releaseResult.transferId ?? null,
          alreadyReleased: releaseResult.alreadyReleased ?? false,
        },
      })
      .select('id')
      .single();

    if (auditErr || !audit) {
      // eslint-disable-next-line no-console
      console.error('[hs-admin/deferred-release] audit write failed', {
        deferredId: v.data.deferredId,
        error: auditErr?.message,
      });
      return NextResponse.json(
        {
          ok: true,
          decision: 'release',
          transferId: releaseResult.transferId ?? null,
          auditLogId: null,
          warning: 'audit_log_write_failed',
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      decision: 'release',
      transferId: releaseResult.transferId ?? null,
      auditLogId: audit.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/deferred-release]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 },
    );
  }
}
