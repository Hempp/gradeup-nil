/**
 * HS-NIL Dispute Emails (Phase 7)
 * ----------------------------------------------------------------------------
 * Templates for the dispute resolution loop. Four templates:
 *
 *   1. sendDisputeRaisedToCounterparty — tells the "other side" a dispute has
 *      been filed against the deal. No details beyond category; the full
 *      narrative is mediated by admin.
 *   2. sendDisputeRaisedToAdmin — alerts the GradeUp admin team that a new
 *      dispute landed in the queue. Includes category, priority, description
 *      excerpt so triage is fast.
 *   3. sendDisputeResolvedToAthlete — closes the loop with the athlete after
 *      admin mediation.
 *   4. sendDisputeResolvedToBrand — parallel template for the brand side.
 *
 * All sends are best-effort. Callers on the dispute raise / resolve path
 * MUST NOT let an email failure block the DB write.
 *
 * Tone is utility, not marketing. A dispute is a serious moment — copy is
 * direct, short, and ends with "reply to this email for human support."
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

const ADMIN_NOTIFY_EMAIL =
  process.env.HS_NIL_ADMIN_ALERT_ADDRESS || SUPPORT_EMAIL;

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers (mirror the plain light-theme wrapper from emails.ts)
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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Dispute resolution</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#18181B;font-size:16px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            Need help? Reply to this email or write to
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
    scope: 'hs-nil-dispute-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-dispute-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category labels (kept in one place — mirrors the CHECK set in SQL)
// ─────────────────────────────────────────────────────────────────────────────

export type DisputeReasonCategory =
  | 'non_delivery'
  | 'quality'
  | 'timing'
  | 'compensation'
  | 'misconduct'
  | 'other';

const CATEGORY_LABEL: Record<DisputeReasonCategory, string> = {
  non_delivery: 'non-delivery',
  quality: 'quality',
  timing: 'timing',
  compensation: 'compensation',
  misconduct: 'misconduct',
  other: 'other',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. sendDisputeRaisedToCounterparty
// ─────────────────────────────────────────────────────────────────────────────

export interface DisputeRaisedCounterpartyInput {
  recipientEmail: string;
  recipientName?: string | null;
  dealTitle: string;
  dealId: string;
  reasonCategory: DisputeReasonCategory;
  raisedByLabel: string; // e.g. "the athlete", "the brand", "the parent"
  counterpartyRole: 'athlete' | 'brand';
}

export async function sendDisputeRaisedToCounterparty(
  input: DisputeRaisedCounterpartyInput
): Promise<EmailResult> {
  const {
    recipientEmail,
    recipientName,
    dealTitle,
    dealId,
    reasonCategory,
    raisedByLabel,
    counterpartyRole,
  } = input;

  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hello,';
  const dealUrl =
    counterpartyRole === 'brand'
      ? `${APP_URL}/hs/brand/deals/${dealId}`
      : `${APP_URL}/hs/deals/${dealId}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">A dispute has been raised on your deal</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${escapeHtml(raisedByLabel)}</strong> raised a dispute on the deal &ldquo;${escapeHtml(dealTitle)}&rdquo;. The dispute category is <strong>${escapeHtml(CATEGORY_LABEL[reasonCategory])}</strong>.</p>
<p style="margin:0 0 16px;">The deal is paused while a GradeUp admin reviews both sides. No payouts or status changes will happen until the dispute is resolved.</p>
${primaryButton('Open the deal', dealUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">An admin may reach out for additional context. If you want to get ahead of it, reply to this email with your side of the story — a real human will read it.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Dispute raised on your deal: ${dealTitle}`,
    html: wrapPlain({
      title: 'Dispute raised',
      preview: `A ${CATEGORY_LABEL[reasonCategory]} dispute was raised on ${dealTitle}.`,
      bodyHtml,
    }),
  });

  logSend('dispute_raised_counterparty', recipientEmail, result, {
    dealId,
    reasonCategory,
    counterpartyRole,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. sendDisputeRaisedToAdmin
// ─────────────────────────────────────────────────────────────────────────────

export interface DisputeRaisedAdminInput {
  disputeId: string;
  dealId: string;
  dealTitle: string;
  reasonCategory: DisputeReasonCategory;
  priority: 'low' | 'standard' | 'high' | 'urgent';
  raisedByRole: 'athlete' | 'parent' | 'brand';
  descriptionExcerpt: string;
}

export async function sendDisputeRaisedToAdmin(
  input: DisputeRaisedAdminInput
): Promise<EmailResult> {
  const {
    disputeId,
    dealId,
    dealTitle,
    reasonCategory,
    priority,
    raisedByRole,
    descriptionExcerpt,
  } = input;

  const mediationUrl = `${APP_URL}/hs/admin/disputes/${disputeId}`;
  const excerpt =
    descriptionExcerpt.length > 280
      ? descriptionExcerpt.slice(0, 280) + '…'
      : descriptionExcerpt;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New dispute in the queue</h1>
<p style="margin:0 0 16px;">A new dispute needs admin mediation.</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;"><strong>Deal:</strong> ${escapeHtml(dealTitle)} (${escapeHtml(dealId.slice(0, 8))})</li>
  <li style="margin:0 0 6px;"><strong>Raised by:</strong> ${escapeHtml(raisedByRole)}</li>
  <li style="margin:0 0 6px;"><strong>Category:</strong> ${escapeHtml(CATEGORY_LABEL[reasonCategory])}</li>
  <li style="margin:0 0 6px;"><strong>Priority:</strong> ${escapeHtml(priority)}</li>
</ul>
<p style="margin:0 0 8px;"><strong>Description excerpt:</strong></p>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-wrap;">${escapeHtml(excerpt)}</p>
${primaryButton('Open mediation panel', mediationUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">The deal is paused until this dispute resolves.</p>
`;

  const result = await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    replyTo: SUPPORT_EMAIL,
    subject: `[${priority.toUpperCase()}] Dispute: ${dealTitle}`,
    html: wrapPlain({
      title: 'Dispute — admin notification',
      preview: `${raisedByRole} raised a ${CATEGORY_LABEL[reasonCategory]} dispute (${priority}).`,
      bodyHtml,
    }),
  });

  logSend('dispute_raised_admin', ADMIN_NOTIFY_EMAIL, result, {
    disputeId,
    dealId,
    reasonCategory,
    priority,
    raisedByRole,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. sendDisputeResolvedToAthlete
// ─────────────────────────────────────────────────────────────────────────────

export type DisputeOutcome =
  | 'resolved_athlete'
  | 'resolved_brand'
  | 'resolved_split'
  | 'withdrawn';

function outcomeHeadline(
  outcome: DisputeOutcome,
  perspective: 'athlete' | 'brand'
): string {
  if (outcome === 'withdrawn') return 'The dispute was withdrawn';
  if (outcome === 'resolved_split') return 'The dispute was resolved with a split decision';
  if (outcome === 'resolved_athlete') {
    return perspective === 'athlete'
      ? 'The dispute was resolved in your favor'
      : 'The dispute was resolved in the athlete\u2019s favor';
  }
  if (outcome === 'resolved_brand') {
    return perspective === 'brand'
      ? 'The dispute was resolved in your favor'
      : 'The dispute was resolved in the brand\u2019s favor';
  }
  return 'The dispute has been resolved';
}

export interface DisputeResolvedAthleteInput {
  athleteEmail: string;
  athleteName?: string | null;
  dealTitle: string;
  dealId: string;
  outcome: DisputeOutcome;
  summary: string;
}

export async function sendDisputeResolvedToAthlete(
  input: DisputeResolvedAthleteInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, dealTitle, dealId, outcome, summary } =
    input;

  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';
  const dealUrl = `${APP_URL}/hs/deals/${dealId}`;
  const headline = outcomeHeadline(outcome, 'athlete');

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(headline)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">The dispute on your deal &ldquo;${escapeHtml(dealTitle)}&rdquo; has been resolved by a GradeUp admin.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Admin summary</h2>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-wrap;">${escapeHtml(summary)}</p>
${primaryButton('Open the deal', dealUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">If you believe the decision warrants a second look, reply to this email and a human from our team will follow up.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Dispute resolved: ${dealTitle}`,
    html: wrapPlain({
      title: 'Dispute resolved',
      preview: headline,
      bodyHtml,
    }),
  });

  logSend('dispute_resolved_athlete', athleteEmail, result, {
    dealId,
    outcome,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. sendDisputeResolvedToBrand
// ─────────────────────────────────────────────────────────────────────────────

export interface DisputeResolvedBrandInput {
  brandEmail: string;
  brandContactName?: string | null;
  dealTitle: string;
  dealId: string;
  outcome: DisputeOutcome;
  summary: string;
}

export async function sendDisputeResolvedToBrand(
  input: DisputeResolvedBrandInput
): Promise<EmailResult> {
  const {
    brandEmail,
    brandContactName,
    dealTitle,
    dealId,
    outcome,
    summary,
  } = input;

  const greeting = brandContactName
    ? `Hi ${escapeHtml(brandContactName)},`
    : 'Hello,';
  const dealUrl = `${APP_URL}/hs/brand/deals/${dealId}`;
  const headline = outcomeHeadline(outcome, 'brand');

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(headline)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">The dispute on your deal &ldquo;${escapeHtml(dealTitle)}&rdquo; has been resolved by a GradeUp admin.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Admin summary</h2>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-wrap;">${escapeHtml(summary)}</p>
${primaryButton('Open the deal', dealUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">If you believe the decision warrants a second look, reply to this email and a human from our team will follow up.</p>
`;

  const result = await sendEmail({
    to: brandEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Dispute resolved: ${dealTitle}`,
    html: wrapPlain({
      title: 'Dispute resolved',
      preview: headline,
      bodyHtml,
    }),
  });

  logSend('dispute_resolved_brand', brandEmail, result, { dealId, outcome });
  return result;
}
