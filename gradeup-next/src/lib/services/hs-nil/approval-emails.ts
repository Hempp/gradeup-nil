/**
 * HS-NIL — Approval & Revision Transactional Emails
 * ----------------------------------------------------------------------------
 * Phase 7 (BRAND-REVIEW). Sends the two mails that close the post-signing
 * loop:
 *
 *   sendDeliverableApproved   — athlete (+ linked parents) learn their deal is
 *                               complete and payout is on its way.
 *   sendRevisionRequested     — athlete learns the brand needs changes;
 *                               brand's notes are reprinted verbatim with a
 *                               CTA back to the deliver page.
 *
 * This module is deliberately NEW (not an edit to emails.ts) — BRAND-REVIEW's
 * scope forbids touching the shared email module. Styling mirrors emails.ts
 * wrapPlain() closely but is locally defined so a future refactor can unify.
 *
 * Fail-closed semantics match the rest of hs-nil email: if the transport
 * returns { success: false }, we log-and-return. Callers must never let
 * an email failure block the DB write (approval has already happened).
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers (local copies — do NOT import private helpers from emails.ts)
// ─────────────────────────────────────────────────────────────────────────────

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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">High School Pilot</div>
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
  context: Record<string, unknown> = {},
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
    payload,
  );
}

function formatMoney(amountUsd: number): string {
  return `$${Math.round(amountUsd).toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deliverable approved (to athlete and/or linked parent)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliverableApprovedInput {
  recipientEmail: string;
  /** First name of the athlete — used even when the recipient is a parent
   *  so the mail frames the win around the athlete's work. */
  athleteFirstName: string;
  brandName: string;
  dealTitle: string;
  /** Whole USD — matches deals.compensation_amount. */
  amount: number;
  /** 'releasing' | 'already_paid' | 'pending_retry' — informs the copy. */
  payoutStatus: 'releasing' | 'already_paid' | 'pending_retry';
  /** Absolute URL to the athlete's celebrate page. Defaults to /hs/deals/[id]/celebrate. */
  celebrateUrl?: string;
  /** Absolute URL to the earnings page (COMPLETION-METRICS surface). */
  earningsUrl?: string;
}

export async function sendDeliverableApproved(
  input: DeliverableApprovedInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    athleteFirstName,
    brandName,
    dealTitle,
    amount,
    payoutStatus,
  } = input;

  const celebrateUrl = input.celebrateUrl ?? `${APP_URL}/hs/athlete/earnings`;
  const earningsUrl = input.earningsUrl ?? `${APP_URL}/hs/athlete/earnings`;
  const safeAthlete = escapeHtml(athleteFirstName);
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const amountStr = formatMoney(amount);

  const payoutLine =
    payoutStatus === 'already_paid'
      ? `The payout for <strong>${amountStr}</strong> is already on its way to the parent custodian account on file.`
      : payoutStatus === 'pending_retry'
        ? `The payout of <strong>${amountStr}</strong> is queued — it will be released to the parent custodian account shortly. We'll email again if anything delays it.`
        : `The payout for <strong>${amountStr}</strong> is now releasing to the parent custodian account on file. It typically lands within 1–2 business days.`;

  const subject = `Your deal with ${brandName} is complete`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Great news — your deal with ${safeBrand} is complete.</h1>
<p style="margin:0 0 16px;">Hi ${safeAthlete},</p>
<p style="margin:0 0 16px;"><strong>${safeBrand}</strong> just approved your deliverable for <strong>${safeTitle}</strong>.</p>
<p style="margin:0 0 16px;">${payoutLine}</p>
${primaryButton('See the win', celebrateUrl)}
<p style="margin:24px 0 8px;font-size:14px;color:#18181B;">Track this and past earnings anytime on your <a href="${earningsUrl}" style="color:#0070F3;">earnings page</a>.</p>
<p style="margin:16px 0 0;font-size:13px;color:#52525B;">Proud of you. Keep the momentum — share the win and brands will come faster next time.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Deliverable Approved',
      preview: `${brandName} approved your deliverable.`,
      bodyHtml,
    }),
  });

  logSend('deliverable_approved', recipientEmail, result, {
    athleteFirstName,
    brandName,
    dealTitle,
    amount,
    payoutStatus,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Revision requested (to athlete)
// ─────────────────────────────────────────────────────────────────────────────

export interface RevisionRequestedInput {
  recipientEmail: string;
  athleteFirstName: string;
  brandName: string;
  dealTitle: string;
  /** Brand's notes on what to change. Reprinted verbatim (escaped). */
  reviewNotes: string;
  /** Absolute URL back to the deliver page so the athlete can resubmit. */
  resubmitUrl: string;
}

export async function sendRevisionRequested(
  input: RevisionRequestedInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    athleteFirstName,
    brandName,
    dealTitle,
    reviewNotes,
    resubmitUrl,
  } = input;

  const safeAthlete = escapeHtml(athleteFirstName);
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const safeNotes = escapeHtml(reviewNotes);

  const subject = `${brandName} has notes on ${dealTitle}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeBrand} has a few notes.</h1>
<p style="margin:0 0 16px;">Hi ${safeAthlete},</p>
<p style="margin:0 0 16px;">This is a normal part of the process — brands often send back one round of notes before they approve. Nothing has been lost, and the deal hasn't been charged yet.</p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What ${safeBrand} said about <em>${safeTitle}</em></h2>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-line;">${safeNotes}</p>

<p style="margin:0 0 16px;">When you're ready, open the deal, make the changes, and resubmit. The brand will be notified automatically.</p>

${primaryButton('Open the deal and resubmit', resubmitUrl)}

<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Questions or stuck? Reply to this email — a real human from our ops team will help.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Revision Requested',
      preview: `${brandName} needs a small change on your deliverable.`,
      bodyHtml,
    }),
  });

  logSend('revision_requested', recipientEmail, result, {
    athleteFirstName,
    brandName,
    dealTitle,
    notesLength: reviewNotes.length,
  });
  return result;
}
