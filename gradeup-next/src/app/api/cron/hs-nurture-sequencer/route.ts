/**
 * GET /api/cron/hs-nurture-sequencer
 *
 * Daily at 08:00 UTC (03:00 ET). Fires post-waitlist nurture
 * sequences for every active enrollment whose next_scheduled_at has
 * come due. Separate from /api/cron/hs-waitlist-sequencer — that one
 * sends the state-activation invite once per row; this one sends the
 * multi-week drip leading up to it.
 *
 * Flow per enrollment:
 *   1. Resolve the due step from the sequence definition.
 *   2. Validate we have a template function for the template_key. If
 *      not, mark failed (suppresses after 3 consecutive misses).
 *   3. Render + send via sendNurtureEmail (fails closed — Resend key
 *      missing returns { success: false } without throwing).
 *   4. markStepFired advances the enrollment or applies failure
 *      backoff.
 *
 * Auth: Bearer CRON_SECRET.
 * Feature flag: no-op when FEATURE_HS_NIL is off.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  listDueEnrollments,
  markStepFired,
  isKnownTemplate,
  type NurtureRef,
} from '@/lib/hs-nil/nurture-sequences';
import { sendNurtureEmail } from '@/lib/services/hs-nil/nurture-emails';

interface RunSummary {
  processed: number;
  sent: number;
  failed: number;
  skipped_no_recipient: number;
  skipped_unknown_template: number;
  suppressed: number;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[hs-nurture-sequencer cron] FEATURE_HS_NIL disabled — skipping.'
    );
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
    });
  }

  const summary: RunSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped_no_recipient: 0,
    skipped_unknown_template: 0,
    suppressed: 0,
  };

  try {
    const due = await listDueEnrollments();
    summary.processed = due.length;

    for (const row of due) {
      const step = row.sequence.steps[row.current_step];
      if (!step) {
        // Walked past the last step — treat as a successful completion.
        try {
          await markStepFired(row.id, row.current_step, { kind: 'sent' });
        } catch {
          /* ignore — sweep will catch it next run */
        }
        continue;
      }

      if (!isKnownTemplate(step.template_key)) {
        summary.skipped_unknown_template++;
        try {
          await markStepFired(row.id, row.current_step, {
            kind: 'failed',
            reason: `unknown_template:${step.template_key}`,
          });
        } catch {
          /* ignore */
        }
        continue;
      }

      const email = row.last_email;
      if (!email) {
        summary.skipped_no_recipient++;
        try {
          await markStepFired(row.id, row.current_step, {
            kind: 'failed',
            reason: 'missing_recipient_email',
          });
        } catch {
          /* ignore */
        }
        continue;
      }

      const ref = row.user_or_waitlist_ref as NurtureRef;
      void ref;

      try {
        const result = await sendNurtureEmail({
          user: {
            email,
            firstName: null,
            stateCode: row.last_state_code ?? null,
          },
          unsubscribeToken: row.unsubscribe_token,
          stepIndex: row.current_step,
          templateKey: step.template_key,
          subjectHint: step.subject_template ?? null,
        });

        if (result.success) {
          summary.sent++;
          await markStepFired(row.id, row.current_step, {
            kind: 'sent',
            metadata: { message_id: result.data?.id ?? null },
          });
        } else {
          summary.failed++;
          await markStepFired(row.id, row.current_step, {
            kind: 'failed',
            reason: result.error ?? 'unknown_send_failure',
          });
        }
      } catch (err) {
        summary.failed++;
        try {
          await markStepFired(row.id, row.current_step, {
            kind: 'failed',
            reason:
              err instanceof Error
                ? err.message.slice(0, 240)
                : String(err).slice(0, 240),
          });
        } catch {
          /* ignore */
        }
      }
    }

    // Count how many rows we just moved to terminal suppression states
    // by re-reading is expensive; the `failed` increments above are the
    // useful observability signal. Keep summary.suppressed == 0 for now.

    return NextResponse.json({
      ok: true,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sequencer failed';
    // eslint-disable-next-line no-console
    console.error('[hs-nurture-sequencer cron] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
