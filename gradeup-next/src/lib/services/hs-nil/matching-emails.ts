/**
 * HS-NIL Matching — Transactional Emails
 *
 * Separate module from `emails.ts` on purpose: the matching surface
 * ships independently (brand-to-athlete discovery) and sends mail on
 * a different cadence (daily cron vs. per-event), so keeping its
 * templates isolated lets ops tune copy without touching the consent
 * flow. Uses the same `sendEmail` transport and wrapPlain shell as
 * emails.ts for visual consistency.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ─────────────────────────────────────────────────────────────────
// Shared helpers (mirrored from emails.ts — deliberately duplicated
// so we can iterate on matching-side copy without refactoring the
// consent-flow templates.)
// ─────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';
const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

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

// ─────────────────────────────────────────────────────────────────
// sendNewAthleteMatchAlert
// ─────────────────────────────────────────────────────────────────

export interface TopMatchSummary {
  firstName: string;
  schoolName: string;
  gpa: number | null;
  gpaTier: 'self_reported' | 'user_submitted' | 'institution_verified';
}

export interface NewAthleteMatchAlertInput {
  brandEmail: string;
  brandName?: string | null;
  matchCount: number;
  /** Up to 3 top matches — rendered as a bullet list. */
  topMatchesSummary: TopMatchSummary[];
  dashboardUrl?: string;
}

const TIER_LABEL: Record<TopMatchSummary['gpaTier'], string> = {
  self_reported: 'self-reported',
  user_submitted: 'transcript submitted',
  institution_verified: 'verified',
};

function summarizeMatch(m: TopMatchSummary): string {
  const gpaLabel =
    m.gpa !== null
      ? `${m.gpa.toFixed(2)} GPA (${TIER_LABEL[m.gpaTier]})`
      : `GPA not on file`;
  return `${escapeHtml(m.firstName)} &middot; ${escapeHtml(m.schoolName)} &middot; ${escapeHtml(gpaLabel)}`;
}

/**
 * Send the daily "you have new matches" email. Best-effort — returns
 * the EmailResult (never throws) so the cron can continue through
 * the rest of its brands on a single-brand failure.
 */
export async function sendNewAthleteMatchAlert(
  input: NewAthleteMatchAlertInput
): Promise<EmailResult> {
  const { brandEmail, brandName, matchCount, topMatchesSummary } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/brand/suggested`;

  const greeting = brandName
    ? `Hi ${escapeHtml(brandName)},`
    : 'Hello,';

  const bullets = topMatchesSummary
    .slice(0, 3)
    .map(
      (m) =>
        `<li style="margin:0 0 6px;">${summarizeMatch(m)}</li>`
    )
    .join('');

  const bulletBlock =
    topMatchesSummary.length > 0
      ? `<ul style="margin:0 0 16px;padding-left:20px;">${bullets}</ul>`
      : '';

  const subject = `${matchCount} new athlete${matchCount === 1 ? '' : 's'} match your brand in the last day.`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New athletes match your brand.</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${matchCount}</strong> new scholar-athlete${matchCount === 1 ? '' : 's'} in your operating states matched your brand profile in the last 24 hours.</p>
${bulletBlock}
${primaryButton('View all matches', dashboardUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">You see first name, school, sport, state, GPA + verification tier, and graduation year. No PII. When you find a fit, click "Propose a deal" to prefill the deal-creation form.</p>
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Want to pause these alerts? Reply to this email and we'll adjust.</p>
`;

  const result = await sendEmail({
    to: brandEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: `${matchCount} new athlete${matchCount === 1 ? '' : 's'} match your brand.`,
      bodyHtml,
    }),
  });

  logSend('new_athlete_match_alert', brandEmail, result, {
    matchCount,
    topCount: topMatchesSummary.length,
  });
  return result;
}
