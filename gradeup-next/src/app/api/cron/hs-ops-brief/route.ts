/**
 * GET /api/cron/hs-ops-brief
 *
 * Daily at 08:30 UTC (3:30am ET — slightly after the nurture sequencer
 * so the morning ingest has already settled). Runs the ops-brief
 * aggregator, sends one email per opted-in admin, and stamps
 * profiles.ops_brief_sent_at for idempotency.
 *
 * Auth: Bearer CRON_SECRET (same as the other HS crons).
 *
 * Feature flag: no-op when FEATURE_HS_NIL is off.
 *
 * Idempotency: listEligibleAdminRecipients filters out admins whose
 * ops_brief_sent_at is within the last 18 hours, so a double-fired
 * cron (or a manual hit) doesn't double-send.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  collectDailyOpsBrief,
  listEligibleAdminRecipients,
  markBriefSent,
} from '@/lib/hs-nil/ops-brief';
import { sendDailyOpsBrief } from '@/lib/services/hs-nil/ops-brief-emails';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn('[hs-ops-brief cron] FEATURE_HS_NIL is disabled — skipping.');
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      admins_emailed: 0,
      signals_collected: 0,
      failures: 0,
    });
  }

  const now = new Date();
  const rangeEnd = now.toISOString();
  const rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let brief;
  try {
    brief = await collectDailyOpsBrief(rangeStart, rangeEnd);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs-ops-brief cron] brief collection failed', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Brief collection failed',
      },
      { status: 500 }
    );
  }

  const signalsCollected = Object.values(brief.domains).filter(
    (d) => !d.unavailable
  ).length;

  let recipients;
  try {
    recipients = await listEligibleAdminRecipients(18);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs-ops-brief cron] recipient load failed', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Recipient load failed',
        signals_collected: signalsCollected,
      },
      { status: 500 }
    );
  }

  let emailed = 0;
  let failures = 0;
  for (const recipient of recipients) {
    try {
      const result = await sendDailyOpsBrief({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        brief,
        sentAt: now,
      });
      if (result.success) {
        emailed += 1;
        await markBriefSent(recipient.userId);
      } else {
        failures += 1;
      }
    } catch (err) {
      failures += 1;
      // eslint-disable-next-line no-console
      console.error('[hs-ops-brief cron] send failed', {
        recipient: recipient.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    admins_emailed: emailed,
    signals_collected: signalsCollected,
    failures,
    recipients_considered: recipients.length,
    tally: brief.tally,
    generated_at: brief.generatedAt,
  });
}
