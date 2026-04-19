/**
 * HS-NIL — Brand Payment / Escrow Transactional Emails
 * ----------------------------------------------------------------------------
 * Phase 10 (BRAND-PAYMENTS). Sends the three mails that close the inbound
 * money loop:
 *
 *   sendPaymentCaptured       — brand. "We authorized your card for this deal.
 *                                Funds are held in escrow and will be released
 *                                when you approve the deliverable."
 *   sendPaymentFailedToBrand  — brand. "The charge didn't go through — here's
 *                                how to fix it. The deal is still signed; no
 *                                other action required from you."
 *   sendEscrowReleasedToParent — parent. "The brand approved the deal and
 *                                funds are now on the way to your custodian
 *                                account. 1-2 business days."
 *
 * New module — no edits to existing email files (co-agents may be touching
 * those). Styling mirrors emails.ts / approval-emails.ts but is locally
 * defined to stay independent.
 *
 * Fail-closed semantics: sendEmail no-ops when RESEND_API_KEY is missing;
 * every template returns { success: false } without throwing. Callers must
 * never let an email failure block DB writes.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers (local copies — keep this file independent of emails.ts)
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
    scope: 'hs-nil-payment-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-payment-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload,
  );
}

function formatMoneyFromCents(amountCents: number): string {
  return `$${Math.round(amountCents / 100).toLocaleString()}`;
}

function formatMoneyUsd(amountUsd: number): string {
  return `$${Math.round(amountUsd).toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Payment captured — to brand
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentCapturedInput {
  recipientEmail: string;
  brandName: string;
  athleteName: string;
  dealTitle: string;
  /** Whole USD. */
  amountCents: number;
  dealUrl: string;
}

export async function sendPaymentCaptured(
  input: PaymentCapturedInput,
): Promise<EmailResult> {
  const { recipientEmail, brandName, athleteName, dealTitle, amountCents, dealUrl } =
    input;

  const safeBrand = escapeHtml(brandName);
  const safeAthlete = escapeHtml(athleteName);
  const safeTitle = escapeHtml(dealTitle);
  const amountStr = formatMoneyFromCents(amountCents);

  const subject = `Payment received for ${dealTitle}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Payment authorized.</h1>
<p style="margin:0 0 16px;">Hi ${safeBrand},</p>
<p style="margin:0 0 16px;">Your card has been charged <strong>${amountStr}</strong> for <strong>${safeTitle}</strong> with <strong>${safeAthlete}</strong>. Funds are held in escrow and will be released to ${safeAthlete}'s parent custodian account when you approve the deliverable.</p>
<p style="margin:0 0 16px;">If the deliverable isn't approved or you request a refund within our dispute window, we refund the charge in full — no hidden fees.</p>
${primaryButton('View deal', dealUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">A detailed receipt will appear on your Stripe statement as "GRADEUP NIL".</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Payment Received',
      preview: `We authorized ${amountStr} for ${dealTitle}.`,
      bodyHtml,
    }),
  });

  logSend('payment_captured', recipientEmail, result, {
    brandName,
    athleteName,
    dealTitle,
    amountCents,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Payment failed — to brand
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentFailedInput {
  recipientEmail: string;
  brandName: string;
  dealTitle: string;
  amountCents: number;
  failureReason: string;
  retryUrl: string;
}

export async function sendPaymentFailedToBrand(
  input: PaymentFailedInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    brandName,
    dealTitle,
    amountCents,
    failureReason,
    retryUrl,
  } = input;

  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const safeReason = escapeHtml(failureReason);
  const amountStr = formatMoneyFromCents(amountCents);

  const subject = `Action needed — payment for ${dealTitle}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">We couldn't charge your card.</h1>
<p style="margin:0 0 16px;">Hi ${safeBrand},</p>
<p style="margin:0 0 16px;">We tried to charge <strong>${amountStr}</strong> for <strong>${safeTitle}</strong> and the payment didn't go through. The deal is still signed — we just need a working payment method before the athlete can start delivering.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What Stripe said</h2>
<p style="margin:0 0 16px;padding:12px 16px;background:#FEF2F2;border-left:3px solid #DA2B57;border-radius:6px;">${safeReason}</p>
<p style="margin:0 0 16px;">Most of the time, adding a new card or confirming the one on file fixes this in under a minute.</p>
${primaryButton('Update payment method', retryUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">If you think this is a mistake — or you want help sorting it out — reply to this email and a human from our ops team will help you directly.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Payment Failed',
      preview: `We couldn't charge your card for ${dealTitle}.`,
      bodyHtml,
    }),
  });

  logSend('payment_failed', recipientEmail, result, {
    brandName,
    dealTitle,
    amountCents,
    failureReason: failureReason.slice(0, 120),
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Escrow released — to parent
// ─────────────────────────────────────────────────────────────────────────────

export interface EscrowReleasedInput {
  recipientEmail: string;
  parentFirstName: string;
  athleteFirstName: string;
  brandName: string;
  dealTitle: string;
  /** Whole USD. This matches deals.compensation_amount (not cents). */
  amountUsd: number;
  earningsUrl: string;
}

export async function sendEscrowReleasedToParent(
  input: EscrowReleasedInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    parentFirstName,
    athleteFirstName,
    brandName,
    dealTitle,
    amountUsd,
    earningsUrl,
  } = input;

  const safeParent = escapeHtml(parentFirstName);
  const safeAthlete = escapeHtml(athleteFirstName);
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const amountStr = formatMoneyUsd(amountUsd);

  const subject = `${amountStr} is on the way for ${athleteFirstName}'s deal`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">The payment is on the way.</h1>
<p style="margin:0 0 16px;">Hi ${safeParent},</p>
<p style="margin:0 0 16px;"><strong>${safeBrand}</strong> just approved <strong>${safeAthlete}</strong>'s deliverable for <strong>${safeTitle}</strong>. We've released <strong>${amountStr}</strong> from escrow to your Stripe custodian account.</p>
<p style="margin:0 0 16px;">Most transfers land in the linked bank account within 1–2 business days. You'll see the full breakdown on your earnings page.</p>
${primaryButton('View earnings', earningsUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">A 1099-ready summary is generated at year-end; no action needed from you until then.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Escrow Released',
      preview: `${amountStr} is on the way.`,
      bodyHtml,
    }),
  });

  logSend('escrow_released', recipientEmail, result, {
    brandName,
    athleteFirstName,
    dealTitle,
    amountUsd,
  });
  return result;
}
