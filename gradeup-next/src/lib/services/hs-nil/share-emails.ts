/**
 * HS-NIL — Share-the-Win Celebration Emails
 *
 * Append-only sibling to `emails.ts`. Owns the celebration mail that
 * fires when a deal transitions to `fully_signed`. Everything routes
 * through the shared `sendEmail` transport (Resend singleton, API-key
 * gating) — identical fail-closed semantics as emails.ts.
 *
 * Why a separate file: the parent playbook mandates append-only edits
 * on the existing emails.ts so concurrent agents don't step on each
 * other's commits. Any future share-flow mail goes here.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers — re-implemented locally to avoid importing from emails.ts
// (keeps the two files fully independent per the append-only rule).
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
    scope: 'hs-nil-share-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-share-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload,
  );
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// sendDealCelebration
// ─────────────────────────────────────────────────────────────────────────────

export interface DealCelebrationInput {
  recipientEmail: string;
  athleteName: string;
  brandName: string;
  amount: number;
  shareUrl: string;
}

/**
 * Send the celebration email to the athlete or parent after a deal is fully
 * signed. Fire-and-forget from the sign handler — any failure MUST NOT block
 * the contract-signed response. The underlying transport no-ops cleanly when
 * RESEND_API_KEY is missing.
 */
export async function sendDealCelebration(
  input: DealCelebrationInput,
): Promise<EmailResult> {
  const { recipientEmail, athleteName, brandName, amount, shareUrl } = input;

  const amountStr = formatCurrency(amount);
  const safeAthlete = escapeHtml(athleteName);
  const safeBrand = escapeHtml(brandName);

  const subject = `Congrats — ${athleteName}'s deal with ${brandName} is signed.`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">You did it.</h1>
<p style="margin:0 0 16px;">${safeAthlete}'s partnership with <strong>${safeBrand}</strong> is fully signed. The deal is live, the payout is queued, and ${amountStr} is on its way.</p>
<p style="margin:0 0 16px;">This is what GradeUp NIL is about — a scholar-athlete earning from their name, image, and likeness on terms their family chose. Share your story, let the world see what a scholar-athlete can do, and show the next family this is real.</p>
${primaryButton('Share the win', shareUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">We drafted share copy for Instagram, LinkedIn, X, and TikTok — edit any of it to sound like you. Your voice is the point.</p>
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Any question about disclosures, timelines, or payouts — reply here, a human will get back to you.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: `${athleteName} x ${brandName}`,
      preview: `${athleteName}'s deal with ${brandName} is fully signed — ${amountStr}.`,
      bodyHtml,
    }),
  });

  logSend('deal_celebration', recipientEmail, result, {
    athleteName,
    brandName,
    amount,
  });
  return result;
}
