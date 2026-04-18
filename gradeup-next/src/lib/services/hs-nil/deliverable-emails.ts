/**
 * HS-NIL Phase 7 — Deliverable email notifications
 *
 * Separate from the core hs-nil/emails.ts module by design:
 *   - Deliverable workflow has its own cadence and tone.
 *   - Keeps parallel agents (BRAND-REVIEW, DISPUTE-FLOW,
 *     COMPLETION-METRICS) from fighting over edits to a single
 *     file.
 *   - emails.ts is APPEND-ONLY per the team contract, so new
 *     templates live alongside the workflow they support.
 *
 * All sends are best-effort. The underlying transport no-ops
 * cleanly when RESEND_API_KEY is missing, returning
 * { success: false, error: 'Email not configured' } — the caller
 * MUST never block its DB write on the outcome of this send.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ---------------------------------------------------------------------------
// Shared helpers — kept in this module so we don't reach into emails.ts.
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapPlain(args: {
  title: string;
  preview: string;
  bodyHtml: string;
}): string {
  const { title, preview, bodyHtml } = args;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
<span style="display:none;visibility:hidden;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E4E7;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E4E4E7;">
            <div style="font-size:14px;font-weight:700;letter-spacing:1.5px;color:#111;">GRADEUP NIL</div>
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Deal delivery</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#18181B;font-size:16px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            Questions? Reply to this email or write to
            <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0070F3;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            <br>GradeUp NIL &middot; <a href="${APP_URL}/privacy" style="color:#52525B;">Privacy</a> &middot; <a href="${APP_URL}/terms" style="color:#52525B;">Terms</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function primaryButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:#0070F3;border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;">${escapeHtml(text)}</a>
</td></tr></table>`;
}

function logSend(
  template: string,
  recipient: string,
  result: EmailResult,
  context: Record<string, unknown> = {}
): void {
  const payload = {
    scope: 'hs-nil-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ---------------------------------------------------------------------------
// Deliverable submitted -> brand
// ---------------------------------------------------------------------------

export interface DeliverableSubmittedToBrandInput {
  brandEmail: string;
  athleteFirstName: string;
  dealTitle: string;
  /** Short human summary of what was submitted. */
  submissionSummary: string;
  /** Absolute URL to the brand's review page for this deal. */
  reviewUrl: string;
}

export async function sendDeliverableSubmittedToBrand(
  input: DeliverableSubmittedToBrandInput
): Promise<EmailResult> {
  const {
    brandEmail,
    athleteFirstName,
    dealTitle,
    submissionSummary,
    reviewUrl,
  } = input;

  const subject = `${athleteFirstName} submitted a deliverable for "${dealTitle}"`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New deliverable submission</h1>
<p style="margin:0 0 16px;"><strong>${escapeHtml(athleteFirstName)}</strong> just submitted proof of work for your deal <strong>${escapeHtml(dealTitle)}</strong>.</p>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;">${escapeHtml(submissionSummary)}</p>
<p style="margin:0 0 16px;">Review the submission and release the payout, or send it back with notes if it needs another pass.</p>
${primaryButton('Review submission', reviewUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Once you accept the submission, payout release runs automatically. No further action from the athlete is required.</p>
`;

  const result = await sendEmail({
    to: brandEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Deliverable submitted',
      preview: `${athleteFirstName} submitted proof of work for "${dealTitle}".`,
      bodyHtml,
    }),
  });

  logSend('deliverable_submitted_to_brand', brandEmail, result, {
    dealTitle,
    athleteFirstName,
  });
  return result;
}
