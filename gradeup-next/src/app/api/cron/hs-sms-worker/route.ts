import { NextRequest, NextResponse } from 'next/server';
import { dequeuePending } from '@/lib/hs-nil/sms';
import { isFeatureEnabled } from '@/lib/feature-flags';

// ═══════════════════════════════════════════════════════════════════════════
// HS-NIL SMS RETRY WORKER
// ---------------------------------------------------------------------------
// Backstop cron for the Phase 17 Twilio SMS fallback. Called every 15 min
// (see vercel.json). Picks up to 20 `failed` rows that still have retries
// remaining and re-attempts the provider call.
//
// Auth: `Authorization: Bearer <CRON_SECRET>` (matches /api/cron/digest).
// Feature flag: no-op when FEATURE_HS_NIL is off.
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[hs-sms-worker] FEATURE_HS_NIL is disabled — skipping retry pass.'
    );
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      picked: 0,
      sent: 0,
      failed: 0,
    });
  }

  try {
    const result = await dequeuePending(20);
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'retry pass failed';
    // eslint-disable-next-line no-console
    console.error('[hs-sms-worker] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
