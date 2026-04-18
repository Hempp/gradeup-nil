/**
 * HS-NIL — Deal Completion Emails
 * ----------------------------------------------------------------------------
 * Celebratory transactional mail that fires the instant a deal reaches a
 * fully-paid state. Three recipients, three variants:
 *
 *   - Athlete: "You did it" — restates amount, notes the loop is closed,
 *              surfaces share-count as social proof, links to earnings.
 *   - Brand:   ROI-framed receipt — amount, share count, link to post
 *              another deal.
 *   - Parent:  "Funds settled to your custodian account" — utility-toned,
 *              links to parent dashboard.
 *
 * Share metrics are injected by the caller (pulled from `getShareCountsForDeal`
 * in `@/lib/hs-nil/share`). Kept separate from the template so this module
 * doesn't take a Supabase dependency.
 *
 * This file is NEW (append-only relative to emails.ts). All sends go through
 * the shared `sendEmail` transport and no-op cleanly when RESEND_API_KEY is
 * missing — the upstream `afterDealPaid` caller treats every send as
 * best-effort / fail-soft.
 */
import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ----------------------------------------------------------------------------
// Shared helpers (intentionally duplicated from emails.ts: that file is
// append-only per the task contract, so we re-implement the minimum needed
// helpers rather than refactor the shared wrappers into a third file.)
// ----------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsdDollars(dollars: number): string {
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
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

// ----------------------------------------------------------------------------
// Shared input
// ----------------------------------------------------------------------------

export type CompletionRecipient = 'athlete' | 'brand' | 'parent';

export interface SendDealCompletedInput {
  recipient: CompletionRecipient;
  toEmail: string;
  athleteFirstName: string;
  brandName: string;
  /** Gross deal dollars — same whole-dollar unit as deals.compensation_amount. */
  amountDollars: number;
  /** Total share-events across all platforms for the deal. */
  totalShares: number;
  /** Optional per-role overrides; default per-role dashboard links used otherwise. */
  athleteDashboardUrl?: string;
  brandDashboardUrl?: string;
  parentDashboardUrl?: string;
  /** Already-escaped? No — we escape on the way in. */
  parentFullName?: string | null;
}

// ----------------------------------------------------------------------------
// sendDealCompleted
// ----------------------------------------------------------------------------

export async function sendDealCompleted(
  input: SendDealCompletedInput,
): Promise<EmailResult> {
  const {
    recipient,
    toEmail,
    athleteFirstName,
    brandName,
    amountDollars,
    totalShares,
  } = input;
  const athleteUrl =
    input.athleteDashboardUrl ?? `${APP_URL}/hs/athlete/earnings`;
  const brandUrl =
    input.brandDashboardUrl ?? `${APP_URL}/hs/brand/performance`;
  const parentUrl = input.parentDashboardUrl ?? `${APP_URL}/hs/parent`;

  const safeAthlete = escapeHtml(athleteFirstName || 'Scholar');
  const safeBrand = escapeHtml(brandName || 'the brand');
  const amountStr = formatUsdDollars(amountDollars);
  const sharePhrase =
    totalShares > 0
      ? `Your story reached <strong>${totalShares} share${totalShares === 1 ? '' : 's'}</strong> — thanks for letting us celebrate.`
      : `This one goes in the books — share-counts kick in once the celebration page ships.`;
  const brandSharePhrase =
    totalShares > 0
      ? `The celebration page generated <strong>${totalShares} share${totalShares === 1 ? '' : 's'}</strong> across social.`
      : `No shares logged yet — the celebration page is live either way.`;

  const subject = `Deal complete: ${athleteFirstName} × ${brandName}`;

  let bodyHtml = '';
  let preview = '';

  if (recipient === 'athlete') {
    preview = `You earned ${amountStr} from ${brandName}. Your first NIL loop just closed.`;
    bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeAthlete}, the deal is done.</h1>
<p style="margin:0 0 16px;">Your partnership with <strong>${safeBrand}</strong> is officially complete. That's <strong>${escapeHtml(amountStr)}</strong> earned the right way — hustle, grades, and a family that's in it with you.</p>
<p style="margin:0 0 16px;">Payout is on its way to the custodian account your parent set up. If anything looks off, reply to this email and a real human will help.</p>
<p style="margin:0 0 16px;">${sharePhrase}</p>
${primaryButton('View your earnings', athleteUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Keep shining. The next one starts from here.</p>
`;
  } else if (recipient === 'brand') {
    preview = `Deal complete with ${athleteFirstName}. ${amountStr} paid out. ${totalShares} share${totalShares === 1 ? '' : 's'}.`;
    bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Deal complete with ${safeAthlete}</h1>
<p style="margin:0 0 16px;">Your partnership with <strong>${safeAthlete}</strong> closed cleanly. The payout of <strong>${escapeHtml(amountStr)}</strong> settled to the parent's custodian account.</p>
<p style="margin:0 0 16px;">${brandSharePhrase}</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Quick recap</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;">Athlete: ${safeAthlete}</li>
  <li style="margin:0 0 6px;">Amount: ${escapeHtml(amountStr)}</li>
  <li style="margin:0 0 6px;">Share events: ${totalShares}</li>
</ul>
${primaryButton('Post a new deal', `${APP_URL}/hs/brand/deals/new`)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Performance dashboard: <a href="${brandUrl}" style="color:#0070F3;">${brandUrl}</a></p>
`;
  } else {
    const parentGreeting = input.parentFullName
      ? `Hi ${escapeHtml(input.parentFullName)},`
      : 'Hello,';
    preview = `Funds from ${brandName} settled to your custodian account for ${athleteFirstName}.`;
    bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Great work from ${safeAthlete}</h1>
<p style="margin:0 0 16px;">${parentGreeting}</p>
<p style="margin:0 0 16px;">The deal between <strong>${safeAthlete}</strong> and <strong>${safeBrand}</strong> is complete. <strong>${escapeHtml(amountStr)}</strong> has settled to the custodian account you set up.</p>
<p style="margin:0 0 16px;">Nothing else is required from you — this note is a receipt. You can review the full history and payout record any time on your parent dashboard.</p>
${primaryButton('Open your parent dashboard', parentUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Consent scope stays in place for future deals until you change it.</p>
`;
  }

  const result = await sendEmail({
    to: toEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview,
      bodyHtml,
    }),
  });

  logSend('deal_completed', toEmail, result, {
    recipient,
    athleteFirstName,
    brandName,
    amountDollars,
    totalShares,
  });

  return result;
}
