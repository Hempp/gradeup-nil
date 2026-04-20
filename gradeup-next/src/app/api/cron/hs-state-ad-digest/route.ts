/**
 * GET /api/cron/hs-state-ad-digest
 *
 * Daily at 09:00 UTC. Fans out per-state weekly compliance digests to
 * every state_ad_assignments row whose digest_day_of_week matches today's
 * UTC day-of-week (0=Sun..6=Sat). Each AD picks their own day via
 * /hs/ad-portal/settings; default is Monday (1).
 *
 * Auth: Bearer CRON_SECRET (shared convention across HS crons).
 *
 * Feature flag: no-op when FEATURE_HS_NIL is off.
 *
 * Idempotency: listDueDigestRecipients() filters out rows with
 * digest_last_sent_at within the last 6 days — so a second tick in the
 * same week never double-sends. We mark the assignment sent only on a
 * successful email delivery.
 *
 * Empty-week suppression: if a state has zero new deals, zero disclosures
 * sent, zero failures, and zero unreviewed compliance events in the 7-day
 * window, we skip the send and count it as `skipped_no_data`. Nobody
 * wants "nothing happened" emails.
 *
 * Mirrors the ops-brief pattern (src/app/api/cron/hs-ops-brief/route.ts)
 * but operates per-state rather than admin-wide.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  collectWeeklyStateAdBrief,
  listDueDigestRecipients,
  markDigestSent,
  briefHasContent,
} from '@/lib/hs-nil/state-ad-digest';
import { sendWeeklyStateAdDigest } from '@/lib/services/hs-nil/state-ad-emails';
import { STATE_NAMES } from '@/lib/hs-nil/state-blog-content';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn('[hs-state-ad-digest cron] FEATURE_HS_NIL is disabled — skipping.');
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      processed: 0,
      sent: 0,
      failed: 0,
      skipped_no_data: 0,
    });
  }

  const now = new Date();

  let recipients;
  try {
    recipients = await listDueDigestRecipients(now);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs-state-ad-digest cron] recipient load failed', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Recipient load failed',
      },
      { status: 500 }
    );
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skippedNoData = 0;
  let skippedNoEmail = 0;

  for (const recipient of recipients) {
    processed += 1;

    if (!recipient.contactEmail) {
      // No email on file and no auth.users fallback — nothing we can do.
      skippedNoEmail += 1;
      // eslint-disable-next-line no-console
      console.warn('[hs-state-ad-digest cron] assignment has no email', {
        assignmentId: recipient.assignmentId,
        stateCode: recipient.stateCode,
      });
      continue;
    }

    try {
      const brief = await collectWeeklyStateAdBrief(recipient.stateCode, now);

      if (!briefHasContent(brief)) {
        skippedNoData += 1;
        continue;
      }

      const result = await sendWeeklyStateAdDigest({
        recipientEmail: recipient.contactEmail,
        stateCode: recipient.stateCode,
        stateName: STATE_NAMES[recipient.stateCode] ?? recipient.stateCode,
        organizationName: recipient.organizationName,
        rangeStart: new Date(brief.rangeStart),
        rangeEnd: new Date(brief.rangeEnd),
        newDealCount: brief.newDealCount,
        deals: brief.newDeals,
        totalCompensation: brief.totalCompensation,
        disclosuresEmitted: brief.disclosuresEmitted,
        disclosuresFailed: brief.disclosuresFailed,
        unreviewedComplianceEvents: brief.unreviewedComplianceEvents,
        complianceRate: brief.complianceRate,
        topSchools: brief.topSchools,
      });

      if (result.success) {
        sent += 1;
        await markDigestSent(recipient.assignmentId);
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error('[hs-state-ad-digest cron] send failed', {
        assignmentId: recipient.assignmentId,
        stateCode: recipient.stateCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    processed,
    sent,
    failed,
    skipped_no_data: skippedNoData,
    skipped_no_email: skippedNoEmail,
    recipients_considered: recipients.length,
    run_at: now.toISOString(),
    day_of_week_utc: now.getUTCDay(),
  });
}
