import { NextRequest, NextResponse } from 'next/server';
import { drainPendingDisclosures } from '@/lib/hs-nil/disclosures';
import { isFeatureEnabled } from '@/lib/feature-flags';

// ═══════════════════════════════════════════════════════════════════════════
// HS-NIL POST-SIGNATURE DISCLOSURE CRON
// Called hourly by Vercel Cron (see vercel.json). Drains up to 50 pending
// disclosure rows from `hs_deal_disclosures` whose `scheduled_for` has passed
// and sends each to the state-specific recipient over email.
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
    console.warn('[hs-nil disclosures cron] FEATURE_HS_NIL is disabled — skipping drain.');
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      processed: 0,
      sent: 0,
      failed: 0,
    });
  }

  try {
    const result = await drainPendingDisclosures();
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'drain failed';
    // eslint-disable-next-line no-console
    console.error('[hs-nil disclosures cron] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
