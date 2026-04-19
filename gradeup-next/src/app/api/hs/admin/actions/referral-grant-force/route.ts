/**
 * POST /api/hs/admin/actions/referral-grant-force
 *
 * Admin action: force-grant a specific tier to a user. Used when
 * the automatic check-and-grant missed a case (backfill, manual
 * concierge rewards, founder's-discretion recognition).
 *
 * Body:
 *   { userId: uuid, tierId: 'bronze'|'silver'|'gold'|'platinum',
 *     reason: string (min 10 chars) }
 *
 * Behavior:
 *   - Inserts a grant row with awarded_by = actor user id.
 *   - Activates the tier's default perks.
 *   - Writes an admin_audit_log row for traceability.
 *   - Idempotent on (user_id, tier_id) UNIQUE — re-runs return 200
 *     without a new grant.
 *
 * Auth: admin only. Feature-flag gated. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  activatePerk,
  getRewardTierLadder,
  type RewardTierId,
} from '@/lib/hs-nil/referral-rewards';

const schema = z
  .object({
    userId: z.string().uuid(),
    tierId: z.enum(['bronze', 'silver', 'gold', 'platinum']),
    reason: z.string().min(10).max(2000),
  })
  .strict();

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Service role not configured.');
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
        { status: 400 }
      );
    }

    const { userId, tierId, reason } = v.data;
    const tier = getRewardTierLadder().find((t) => t.id === (tierId as RewardTierId));
    if (!tier) {
      return NextResponse.json(
        { error: 'Unknown tier', code: 'invalid_state' },
        { status: 400 }
      );
    }

    const sb = getServiceClient();

    // Insert-or-reuse grant row. Idempotent via UNIQUE (user_id, tier_id).
    const { data: existing } = await sb
      .from('referral_reward_grants')
      .select(
        'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award'
      )
      .eq('user_id', userId)
      .eq('tier_id', tierId)
      .maybeSingle();

    let grantId: string;
    let wasNew = false;
    if (existing) {
      grantId = existing.id as string;
    } else {
      // Snapshot conversion count from the events table at write time.
      const { data: attrs } = await sb
        .from('referral_attributions')
        .select('id')
        .eq('referring_user_id', userId)
        .not('referred_user_id', 'is', null);
      const attrIds = ((attrs as Array<{ id: string }> | null) ?? []).map(
        (r) => r.id
      );

      let convCount = 0;
      if (attrIds.length > 0) {
        const { count } = await sb
          .from('referral_conversion_events')
          .select('id', { count: 'exact', head: true })
          .in('referral_attribution_id', attrIds)
          .eq('event_type', 'signup_completed');
        convCount = count ?? 0;
      }

      const { data: inserted, error: insertErr } = await sb
        .from('referral_reward_grants')
        .insert({
          user_id: userId,
          tier_id: tierId,
          awarded_by: user.id,
          conversion_count_at_award: convCount,
          metadata: { forceGranted: true, reason },
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        return NextResponse.json(
          {
            error: insertErr?.message ?? 'Grant insert failed',
            code: 'db_error',
          },
          { status: 500 }
        );
      }
      grantId = inserted.id as string;
      wasNew = true;

      // Activate default perks for the tier.
      for (const perk of tier.perks) {
        await activatePerk({ grantId, perkName: perk });
      }
    }

    // Audit log entry — always, even for idempotent re-run, so the
    // operator's intent is recorded.
    const { data: auditRow, error: auditErr } = await sb
      .from('admin_audit_log')
      .insert({
        actor_user_id: user.id,
        action: 'referral_tier_force_grant',
        target_kind: 'referral_grant',
        target_id: grantId,
        reason,
        metadata: {
          tierId,
          targetUserId: userId,
          wasNew,
        },
      })
      .select('id')
      .single();

    if (auditErr || !auditRow) {
      return NextResponse.json(
        {
          error: `Grant complete (id=${grantId}) but audit write failed: ${auditErr?.message ?? 'unknown'}`,
          code: 'db_error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: auditRow.id,
      metadata: { grantId, tierId, wasNew },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/referral-grant-force]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
