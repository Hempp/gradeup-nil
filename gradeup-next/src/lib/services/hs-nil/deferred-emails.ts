/**
 * HS-NIL — Deferred-Payout (TX Escrow-Until-18) Transactional Emails
 * ----------------------------------------------------------------------------
 * Phase 11 (ESCROW-TX). Sends four mails wrapping the escrow-until-18 flow:
 *
 *   sendDeferralCreatedToParent   — parent. "Brand approved the deal. Funds
 *                                    are being held in trust under Texas UIL
 *                                    rules until [athlete] turns 18 on [date]."
 *   sendDeferralCreatedToAthlete  — athlete. "Nice work — you closed the deal.
 *                                    The $X will release to your parent's
 *                                    custodian account on your 18th birthday."
 *   sendDeferredReleaseUpcoming   — parent. "7-day reminder: $X will release
 *                                    on [athlete]'s 18th birthday on [date]."
 *                                    (Scheduling is TODO — the reminder cron
 *                                    isn't wired in this pass.)
 *   sendDeferredReleased          — parent. "The release just fired. Funds
 *                                    are en route to your bank — 1-2 days."
 *
 * Pattern mirrors payment-emails.ts: local shared helpers, no shared
 * dependency on emails.ts, fail-closed sendEmail wrapper, concise logSend.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
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
    scope: 'hs-nil-deferred-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-deferred-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload,
  );
}

function formatMoneyFromCents(amountCents: number): string {
  return `$${Math.round(amountCents / 100).toLocaleString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deferral created — to parent
// ─────────────────────────────────────────────────────────────────────────────

export interface DeferralCreatedParentInput {
  recipientEmail: string;
  parentFirstName: string;
  athleteFirstName: string;
  brandName: string;
  dealTitle: string;
  amountCents: number;
  /** ISO timestamp. Rendered as a UTC calendar date. */
  releaseEligibleAt: string;
  stateCode: string;
  parentDashboardUrl?: string;
}

export async function sendDeferralCreatedToParent(
  input: DeferralCreatedParentInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    parentFirstName,
    athleteFirstName,
    brandName,
    dealTitle,
    amountCents,
    releaseEligibleAt,
    stateCode,
    parentDashboardUrl,
  } = input;

  const safeParent = escapeHtml(parentFirstName);
  const safeAthlete = escapeHtml(athleteFirstName);
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const amountStr = formatMoneyFromCents(amountCents);
  const dateStr = formatDate(releaseEligibleAt);
  const url = parentDashboardUrl || `${APP_URL}/hs/parent`;

  const subject = `${amountStr} earned — released on ${athleteFirstName}'s 18th birthday`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">The deal closed — funds are held in trust.</h1>
<p style="margin:0 0 16px;">Hi ${safeParent},</p>
<p style="margin:0 0 16px;"><strong>${safeBrand}</strong> just approved <strong>${safeAthlete}</strong>'s deliverable for <strong>${safeTitle}</strong>. You earned <strong>${amountStr}</strong>.</p>
<p style="margin:0 0 16px;">Under ${escapeHtml(stateCode)} high-school athletic rules, NIL compensation for athletes under 18 must be held in a custodial trust until the athlete's 18th birthday. GradeUp handles this automatically — your funds are parked in our partner trust account and will release to your Stripe custodian on <strong>${dateStr}</strong>.</p>
<p style="margin:0 0 16px;">Nothing for you to do. We'll email you again 7 days before release, and once more the day the transfer fires.</p>
${primaryButton('View held earnings', url)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This is a rule enforced by the state athletic association — not a GradeUp fee. Your earnings are 100% intact and tracked.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Held in trust',
      preview: `${amountStr} releases on ${dateStr}.`,
      bodyHtml,
    }),
  });

  logSend('deferral_created_parent', recipientEmail, result, {
    athleteFirstName,
    brandName,
    amountCents,
    releaseEligibleAt,
    stateCode,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Deferral created — to athlete
// ─────────────────────────────────────────────────────────────────────────────

export interface DeferralCreatedAthleteInput {
  recipientEmail: string;
  athleteFirstName: string;
  brandName: string;
  dealTitle: string;
  amountCents: number;
  releaseEligibleAt: string;
  stateCode: string;
  deferredEarningsUrl?: string;
}

export async function sendDeferralCreatedToAthlete(
  input: DeferralCreatedAthleteInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    athleteFirstName,
    brandName,
    dealTitle,
    amountCents,
    releaseEligibleAt,
    stateCode,
    deferredEarningsUrl,
  } = input;

  const safeAthlete = escapeHtml(athleteFirstName);
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(dealTitle);
  const amountStr = formatMoneyFromCents(amountCents);
  const dateStr = formatDate(releaseEligibleAt);
  const url =
    deferredEarningsUrl || `${APP_URL}/hs/athlete/deferred-earnings`;

  const subject = `You earned ${amountStr} — releases ${dateStr}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You did the work.</h1>
<p style="margin:0 0 16px;">Hey ${safeAthlete},</p>
<p style="margin:0 0 16px;"><strong>${safeBrand}</strong> approved your deliverable for <strong>${safeTitle}</strong>. You just earned <strong>${amountStr}</strong>.</p>
<p style="margin:0 0 16px;">${escapeHtml(stateCode)} rules say NIL compensation for athletes under 18 has to sit in trust until your 18th birthday. Translation: the money's yours, and it automatically transfers to your parent's custodian account on <strong>${dateStr}</strong>. Every penny accounted for.</p>
${primaryButton('See your held earnings', url)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Keep going. This is just the beginning.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Earnings held',
      preview: `${amountStr} releases on your 18th birthday.`,
      bodyHtml,
    }),
  });

  logSend('deferral_created_athlete', recipientEmail, result, {
    athleteFirstName,
    brandName,
    amountCents,
    releaseEligibleAt,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Deferred release upcoming (7-day heads-up)
// ─────────────────────────────────────────────────────────────────────────────
//
// TODO(phase 11 follow-up): schedule this from a second daily cron. The
// simple approach is an index scan on hs_deferred_payouts WHERE
// status='holding' AND release_eligible_at BETWEEN now() + 7d AND now() +
// 7d + 24h, sending one row at a time. Scheduling scaffolding is not in
// scope for this pass — the template exists so the scheduler can be a
// one-file add.

export interface DeferredReleaseUpcomingInput {
  recipientEmail: string;
  parentFirstName: string;
  athleteFirstName: string;
  amountCents: number;
  releaseEligibleAt: string;
  parentDashboardUrl?: string;
}

export async function sendDeferredReleaseUpcoming(
  input: DeferredReleaseUpcomingInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    parentFirstName,
    athleteFirstName,
    amountCents,
    releaseEligibleAt,
    parentDashboardUrl,
  } = input;

  const safeParent = escapeHtml(parentFirstName);
  const safeAthlete = escapeHtml(athleteFirstName);
  const amountStr = formatMoneyFromCents(amountCents);
  const dateStr = formatDate(releaseEligibleAt);
  const url = parentDashboardUrl || `${APP_URL}/hs/parent`;

  const subject = `${amountStr} releases on ${dateStr}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">One week until release.</h1>
<p style="margin:0 0 16px;">Hi ${safeParent},</p>
<p style="margin:0 0 16px;">A quick heads-up: <strong>${amountStr}</strong> in ${safeAthlete}'s held earnings will release to your Stripe custodian on <strong>${dateStr}</strong> — the day ${safeAthlete} turns 18.</p>
<p style="margin:0 0 16px;">Nothing to do on your end. Make sure the bank account linked to your Stripe custodian is still active so the transfer lands cleanly.</p>
${primaryButton('Review Stripe custodian', url)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This is an automated reminder; no action required.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Release coming up',
      preview: `${amountStr} releases on ${dateStr}.`,
      bodyHtml,
    }),
  });

  logSend('deferred_release_upcoming', recipientEmail, result, {
    athleteFirstName,
    amountCents,
    releaseEligibleAt,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Deferred released (transfer fired)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeferredReleasedInput {
  recipientEmail: string;
  parentFirstName: string;
  athleteFirstName: string;
  amountCents: number;
  earningsUrl?: string;
}

export async function sendDeferredReleased(
  input: DeferredReleasedInput,
): Promise<EmailResult> {
  const {
    recipientEmail,
    parentFirstName,
    athleteFirstName,
    amountCents,
    earningsUrl,
  } = input;

  const safeParent = escapeHtml(parentFirstName);
  const safeAthlete = escapeHtml(athleteFirstName);
  const amountStr = formatMoneyFromCents(amountCents);
  const url = earningsUrl || `${APP_URL}/hs/parent`;

  const subject = `${amountStr} is on the way (${athleteFirstName} is 18)`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">The release just fired.</h1>
<p style="margin:0 0 16px;">Hi ${safeParent},</p>
<p style="margin:0 0 16px;">Happy 18th birthday to ${safeAthlete}! We just released <strong>${amountStr}</strong> from the custodial trust to your Stripe custodian account. Most transfers land in the linked bank within 1–2 business days.</p>
${primaryButton('View earnings', url)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">A year-end 1099-ready summary will be generated automatically.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Released from trust',
      preview: `${amountStr} is on the way.`,
      bodyHtml,
    }),
  });

  logSend('deferred_released', recipientEmail, result, {
    athleteFirstName,
    amountCents,
  });
  return result;
}
