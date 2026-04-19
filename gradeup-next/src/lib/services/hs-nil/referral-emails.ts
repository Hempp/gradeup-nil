/**
 * HS-NIL — Referral Emails
 *
 * Separate module per HS-NIL convention so parallel work doesn't
 * thrash `emails.ts`. Shares the plain-wrapper tone of the other
 * HS-NIL mail (utility-flavoured, not marketing).
 *
 * Three templates:
 *   1. sendReferralSignupConfirmation  → referrer: "X joined with your invite"
 *   2. sendReferralFunnelMilestone     → referrer: "X signed consent / first deal"
 *   3. sendInviteFromParent            → target: "Your friend invited you to GradeUp HS"
 *
 * Fail-closed semantics: returns EmailResult, never throws. Callers
 * inspect success; a send failure must not break the referral write.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

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
    scope: 'hs-nil-referral-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-referral-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

const ROLE_LABEL: Record<string, string> = {
  hs_parent: 'parent',
  hs_athlete: 'athlete',
  hs_brand: 'brand',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Referral signup confirmation (to the referring user)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferralSignupConfirmationInput {
  referrerEmail: string;
  referrerFirstName?: string | null;
  referredName: string;
  referredRole: 'hs_parent' | 'hs_athlete' | 'hs_brand';
  dashboardUrl?: string;
}

export async function sendReferralSignupConfirmation(
  input: ReferralSignupConfirmationInput
): Promise<EmailResult> {
  const {
    referrerEmail,
    referrerFirstName,
    referredName,
    referredRole,
  } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/parent/referrals`;
  const greeting = referrerFirstName
    ? `Hi ${escapeHtml(referrerFirstName)},`
    : 'Hi,';
  const safeReferred = escapeHtml(referredName);
  const roleLabel = escapeHtml(ROLE_LABEL[referredRole] ?? 'person');

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeReferred} just joined GradeUp with your invite</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${safeReferred}</strong> (${roleLabel}) signed up to GradeUp NIL using your referral link. That's your first attributed conversion — thank you for helping us build a community of families looking out for each other.</p>
${primaryButton('See your referrals', dashboardUrl)}
<p style="margin:0 0 16px;">We'll email you again when ${safeReferred} completes the next step in their onboarding (parental consent, then a first deal).</p>
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Want to invite another parent? Open your dashboard and hit "Email a friend".</p>
`;

  const result = await sendEmail({
    to: referrerEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${referredName} just joined GradeUp with your invite`,
    html: wrapPlain({
      title: 'Referral Signup',
      preview: `${referredName} joined GradeUp with your invite.`,
      bodyHtml,
    }),
  });

  logSend('referral_signup_confirmation', referrerEmail, result, {
    referredName,
    referredRole,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Funnel milestone (consent signed / first deal)
// ─────────────────────────────────────────────────────────────────────────────

export type ReferralMilestone = 'first_consent_signed' | 'first_deal_signed';

export interface ReferralFunnelMilestoneInput {
  referrerEmail: string;
  referrerFirstName?: string | null;
  referredName: string;
  milestone: ReferralMilestone;
  dashboardUrl?: string;
}

const MILESTONE_COPY: Record<
  ReferralMilestone,
  { subjectVerb: string; headline: string; bodyLine: string }
> = {
  first_consent_signed: {
    subjectVerb: 'signed parental consent',
    headline: 'just signed parental consent',
    bodyLine:
      'They crossed the biggest trust milestone in the funnel — cleared to review real brand deals.',
  },
  first_deal_signed: {
    subjectVerb: 'signed their first deal',
    headline: 'just signed their first deal',
    bodyLine:
      'Their first NIL deal is live. That means real earnings, real compliance disclosures, and the pilot pays out exactly as designed.',
  },
};

export async function sendReferralFunnelMilestone(
  input: ReferralFunnelMilestoneInput
): Promise<EmailResult> {
  const {
    referrerEmail,
    referrerFirstName,
    referredName,
    milestone,
  } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/parent/referrals`;
  const copy = MILESTONE_COPY[milestone];
  const greeting = referrerFirstName
    ? `Hi ${escapeHtml(referrerFirstName)},`
    : 'Hi,';
  const safeReferred = escapeHtml(referredName);

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeReferred} ${escapeHtml(copy.headline)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${safeReferred}</strong> — whom you referred to GradeUp NIL — ${escapeHtml(copy.subjectVerb)}. ${escapeHtml(copy.bodyLine)}</p>
${primaryButton('See your referral funnel', dashboardUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">No action needed. This is a courtesy update because you helped bring ${safeReferred} onto GradeUp.</p>
`;

  const result = await sendEmail({
    to: referrerEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${referredName} ${copy.subjectVerb} on GradeUp NIL`,
    html: wrapPlain({
      title: 'Referral Milestone',
      preview: `${referredName} ${copy.subjectVerb} on GradeUp NIL.`,
      bodyHtml,
    }),
  });

  logSend('referral_funnel_milestone', referrerEmail, result, {
    referredName,
    milestone,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Personal invite from a parent ("email a friend")
// ─────────────────────────────────────────────────────────────────────────────

export interface InviteFromParentInput {
  toEmail: string;
  fromParentName: string;
  fromParentEmail?: string | null;
  personalNote?: string | null;
  inviteUrl: string;
}

export async function sendInviteFromParent(
  input: InviteFromParentInput
): Promise<EmailResult> {
  const {
    toEmail,
    fromParentName,
    fromParentEmail,
    personalNote,
    inviteUrl,
  } = input;

  const safeFrom = escapeHtml(fromParentName);
  const note = personalNote?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;font-style:italic;">${escapeHtml(personalNote.trim())}</p>`
    : '';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeFrom} invited you to GradeUp HS</h1>
<p style="margin:0 0 16px;">Hi,</p>
<p style="margin:0 0 16px;"><strong>${safeFrom}</strong> thought GradeUp NIL might be useful for your family. GradeUp is the first NIL platform designed specifically for high-school student-athletes — verified GPAs, parental consent built in, and state-compliant by default.</p>
${note}
${primaryButton('See what GradeUp is', inviteUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser:<br><span style="word-break:break-all;">${inviteUrl}</span></p>
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This invite came from ${safeFrom}${fromParentEmail ? ` (${escapeHtml(fromParentEmail)})` : ''}. If it wasn't expected, you can ignore it safely — we won't follow up.</p>
`;

  const result = await sendEmail({
    to: toEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${fromParentName} invited you to GradeUp HS`,
    html: wrapPlain({
      title: 'Invite to GradeUp HS',
      preview: `${fromParentName} invited you to GradeUp HS.`,
      bodyHtml,
    }),
  });

  logSend('invite_from_parent', toEmail, result, {
    fromParentName,
    hasNote: Boolean(personalNote?.trim()),
  });
  return result;
}
