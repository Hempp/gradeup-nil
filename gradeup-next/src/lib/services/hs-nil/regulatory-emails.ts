/**
 * Regulatory change — admin alert email.
 *
 * Fired from the /api/cron/regulatory-monitor cron after a run produces ≥ 1
 * new regulatory_change_events. We group multiple changes into ONE email per
 * cron run so a quiet week sends zero mail, a noisy week sends one.
 *
 * Recipient: compliance admin (EMAIL_REGULATORY_ADMIN || EMAIL_SUPPORT_ADDRESS).
 *
 * No page text is included — only the structured diff summary that the
 * monitor has already computed. That keeps this mail cheap to read and
 * decouples email content from whatever the source page actually said.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

const REGULATORY_ADMIN_EMAIL =
  process.env.EMAIL_REGULATORY_ADMIN || SUPPORT_EMAIL;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RegulatoryChangeAlertItem {
  eventId: string;
  stateCode: string;
  sourceUrl: string;
  detectedAt: string;
  diffSummary: string | null;
  outcome: 'changed' | 'first_seen' | 'fetch_failed';
}

export interface SendRegulatoryChangeAlertInput {
  items: RegulatoryChangeAlertItem[];
  /** Totals from the cron run. */
  totals: {
    checked: number;
    changesDetected: number;
    failures: number;
  };
  /** Optional override; defaults to EMAIL_REGULATORY_ADMIN or support. */
  recipientOverride?: string;
}

function renderItem(item: RegulatoryChangeAlertItem): string {
  const outcomeBadge =
    item.outcome === 'fetch_failed'
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#FEF2F2;color:#991B1B;font-size:12px;font-weight:600;">fetch failed</span>`
      : item.outcome === 'first_seen'
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#EFF6FF;color:#1E40AF;font-size:12px;font-weight:600;">first seen</span>`
      : `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:600;">changed</span>`;

  const reviewUrl = `${APP_URL}/hs/admin/regulatory-monitor/events/${encodeURIComponent(
    item.eventId
  )}`;

  const detectedDate = new Date(item.detectedAt);
  const detectedStr = Number.isNaN(detectedDate.getTime())
    ? item.detectedAt
    : detectedDate.toUTCString();

  return `
    <tr>
      <td style="padding:16px;border:1px solid #E4E4E7;border-radius:8px;background:#FAFAFA;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
          <div style="font-weight:700;font-size:14px;color:#111;">
            ${escapeHtml(item.stateCode)} &middot; ${outcomeBadge}
          </div>
          <div style="font-size:11px;color:#71717A;">${escapeHtml(detectedStr)}</div>
        </div>
        <div style="margin-top:6px;font-size:12px;color:#52525B;word-break:break-all;">
          ${escapeHtml(item.sourceUrl)}
        </div>
        <div style="margin-top:10px;font-size:13px;line-height:1.5;color:#18181B;">
          ${escapeHtml(item.diffSummary ?? '(no diff summary)')}
        </div>
        <div style="margin-top:12px;">
          <a href="${reviewUrl}"
             style="display:inline-block;padding:8px 14px;background:#0070F3;color:#FFFFFF;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
            Review in admin console →
          </a>
        </div>
      </td>
    </tr>
    <tr><td style="height:12px;"></td></tr>
  `;
}

export async function sendRegulatoryChangeAlertToAdmin(
  input: SendRegulatoryChangeAlertInput
): Promise<EmailResult> {
  const { items, totals, recipientOverride } = input;
  const recipient = recipientOverride ?? REGULATORY_ADMIN_EMAIL;

  if (items.length === 0) {
    return {
      success: false,
      error: 'No items to alert on.',
    };
  }

  const changedCount = items.filter((i) => i.outcome !== 'fetch_failed').length;
  const failedCount = items.filter((i) => i.outcome === 'fetch_failed').length;

  const subject = `[GradeUp HS-NIL] ${changedCount} regulatory change${
    changedCount === 1 ? '' : 's'
  }${failedCount > 0 ? ` + ${failedCount} fetch failure${failedCount === 1 ? '' : 's'}` : ''} detected`;

  const preview = `Weekly monitor: ${changedCount} change${
    changedCount === 1 ? '' : 's'
  }, ${failedCount} fetch failure${failedCount === 1 ? '' : 's'}. Open the admin queue to review.`;

  const rowsHtml = items.map(renderItem).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
<span style="display:none;visibility:hidden;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E4E7;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E4E4E7;">
            <div style="font-size:14px;font-weight:700;letter-spacing:1.5px;color:#111;">GRADEUP NIL</div>
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Regulatory change monitor</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;font-size:14px;color:#18181B;line-height:1.6;">
            <p style="margin:0 0 8px 0;">
              The weekly regulatory monitor detected activity on one or more state
              athletic association pages. These are <strong>best-effort</strong>
              signals, not verified rule changes — each needs a human review before
              we touch the per-state rules engine.
            </p>
            <p style="margin:0;color:#52525B;font-size:13px;">
              Checked ${totals.checked} source${totals.checked === 1 ? '' : 's'} ·
              ${totals.changesDetected} change${totals.changesDetected === 1 ? '' : 's'} detected ·
              ${totals.failures} fetch failure${totals.failures === 1 ? '' : 's'}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${rowsHtml}
            </table>
            <p style="margin:8px 0 0 0;font-size:13px;color:#52525B;">
              Or open the full queue:
              <a href="${APP_URL}/hs/admin/regulatory-monitor" style="color:#0070F3;">
                ${APP_URL}/hs/admin/regulatory-monitor
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            This email is generated by the /api/cron/regulatory-monitor job (Monday 9am ET).
            If these alerts are noisy, mark the events as <em>no_change</em> or
            <em>minor_update</em> in the admin console — those outcomes don't trigger
            STATE_RULES updates.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const textLines: string[] = [];
  textLines.push(
    `[GradeUp HS-NIL] ${changedCount} regulatory changes + ${failedCount} fetch failures`
  );
  textLines.push(
    `Checked ${totals.checked} sources · ${totals.changesDetected} detected · ${totals.failures} failures`
  );
  textLines.push('');
  for (const item of items) {
    textLines.push(
      `- [${item.stateCode}] ${item.outcome.toUpperCase()} · ${item.sourceUrl}`
    );
    textLines.push(`  ${item.diffSummary ?? '(no diff summary)'}`);
    textLines.push(
      `  Review: ${APP_URL}/hs/admin/regulatory-monitor/events/${item.eventId}`
    );
  }
  textLines.push('');
  textLines.push(`Full queue: ${APP_URL}/hs/admin/regulatory-monitor`);

  return sendEmail({
    to: recipient,
    subject,
    html,
    text: textLines.join('\n'),
  });
}
