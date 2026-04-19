/**
 * HS-NIL Deferred-Escrow Release Cron — `/api/cron/hs-deferred-releases`
 * ----------------------------------------------------------------------------
 * Daily sweep that releases custodial-trust holds as they come due. Today this
 * means: athletes in TX whose 18th birthday has landed, so the held funds can
 * flow through the normal Stripe Connect parent-custodial transfer path.
 *
 * Schedule: `0 10 * * *` (10:00 UTC / 5:00 AM ET). Early enough that a
 * birthday-day release fires within the first few hours of the calendar date
 * in the athlete's timezone (Eastern-most US = UTC-5 in winter). We don't
 * need sub-day precision — the parent is not waiting for a specific hour.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (matches /api/cron/digest +
 * hs-disclosures). Feature-flag gated on FEATURE_HS_NIL.
 *
 * Throttle: limit 100 rows per invocation. The partial index
 * `idx_hs_deferred_payouts_release_window` makes the query O(N-eligible) so
 * even a large backlog works in under 100ms. If we ever see a backlog > 100
 * we'll loop — not a real concern given the population size in the pilot.
 */

import { NextRequest, NextResponse } from 'next/server';

import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  releaseDeferred,
  type DeferredPayoutRow,
} from '@/lib/hs-nil/deferred-payouts';
import { createClient } from '@supabase/supabase-js';

const BATCH_LIMIT = 100;

interface FailureDetail {
  deferredId: string;
  dealId: string;
  reason: string;
}

interface CronResult {
  eligible_count: number;
  released_count: number;
  failed_count: number;
  failures: FailureDetail[];
  skipped?: boolean;
  reason?: string;
  timestamp: string;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[cron hs-deferred-releases] Supabase service role not configured.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    const payload: CronResult = {
      eligible_count: 0,
      released_count: 0,
      failed_count: 0,
      failures: [],
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  }

  try {
    const sb = getServiceRoleClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await sb
      .from('hs_deferred_payouts')
      .select(
        'id, deal_id, athlete_user_id, parent_profile_id, amount_cents, state_code, release_eligible_at, status',
      )
      .eq('status', 'holding')
      .lte('release_eligible_at', nowIso)
      .order('release_eligible_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[cron hs-deferred-releases] query failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as unknown as DeferredPayoutRow[] | null) ?? [];
    const failures: FailureDetail[] = [];
    let released = 0;

    for (const row of rows) {
      try {
        const result = await releaseDeferred(row.id);
        if (result.ok) {
          released += 1;
          // eslint-disable-next-line no-console
          console.log('[cron hs-deferred-releases] released', {
            deferredId: row.id,
            dealId: row.deal_id,
            transferId: result.transferId ?? null,
          });
        } else {
          failures.push({
            deferredId: row.id,
            dealId: row.deal_id,
            reason: result.reason ?? 'unknown',
          });
          // eslint-disable-next-line no-console
          console.warn('[cron hs-deferred-releases] release failed', {
            deferredId: row.id,
            dealId: row.deal_id,
            reason: result.reason,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push({
          deferredId: row.id,
          dealId: row.deal_id,
          reason: message,
        });
        // eslint-disable-next-line no-console
        console.error('[cron hs-deferred-releases] release threw', {
          deferredId: row.id,
          error: message,
        });
      }
    }

    const payload: CronResult = {
      eligible_count: rows.length,
      released_count: released,
      failed_count: failures.length,
      failures,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cron failed';
    // eslint-disable-next-line no-console
    console.error('[cron hs-deferred-releases] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
