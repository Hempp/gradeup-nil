/**
 * GET /api/cron/hs-waitlist-sequencer
 *
 * Every 4 hours (Vercel Cron, see vercel.json). Iterates the active
 * state pilots and drains up to 25 waiting hs_waitlist rows per state
 * per tick, sending each a role-specific invite email.
 *
 * Throttle rationale: 25/state/tick at a 4-hour cadence = 150
 * invites/state/day max. This is the nurture-the-supply-side pace —
 * we don't want to blow up a state's waitlist in one blast, which
 * would overwhelm ops capacity for consent support, transcript review,
 * and parent hand-holding.
 *
 * Auth: Bearer CRON_SECRET (matches /api/cron/digest and
 * /api/cron/hs-disclosures).
 *
 * Feature flag: no-op when FEATURE_HS_NIL is off.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  getActivableStates,
  sequenceInvitesForState,
  type SequenceResult,
} from '@/lib/hs-nil/waitlist-activation';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[hs-waitlist-sequencer cron] FEATURE_HS_NIL is disabled — skipping.'
    );
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      states: [],
    });
  }

  try {
    const active = await getActivableStates();
    const results: SequenceResult[] = [];
    for (const row of active) {
      try {
        const result = await sequenceInvitesForState(row.state_code);
        results.push(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[hs-waitlist-sequencer cron] state failed', {
          stateCode: row.state_code,
          error: err instanceof Error ? err.message : String(err),
        });
        results.push({
          stateCode: row.state_code,
          processed: 0,
          sent: 0,
          failed: 0,
        });
      }
    }
    return NextResponse.json({
      ok: true,
      states: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sequencer failed';
    // eslint-disable-next-line no-console
    console.error('[hs-waitlist-sequencer cron] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
