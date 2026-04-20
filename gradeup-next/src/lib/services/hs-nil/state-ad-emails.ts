/**
 * State-AD email flows.
 *
 * Three templates:
 *   1. sendStateAdInvitation          — sent to the invited AD at invite time.
 *   2. sendStateAdInvitationAccepted  — notify the admin who issued the invite.
 *   3. sendWeeklyStateAdDigest        — TEMPLATE ONLY; no cron is wired yet.
 *                                       Future work: once /api/cron/state-ad-digest
 *                                       exists it can import this directly.
 *
 * All sends go through the shared `sendEmail` transport. Failures do not
 * throw — they return { success: false } and log.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E4E7;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E4E4E7;">
            <div style="font-size:14px;font-weight:700;letter-spacing:1.5px;color:#111;">GRADEUP NIL</div>
            <div style="font-size:12px;color:#52525B;margin-top:2px;">State Compliance Portal</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#18181B;font-size:16px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            Questions? Reply or email
            <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0070F3;">${escapeHtml(SUPPORT_EMAIL)}</a>.
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
    scope: 'hs-nil-state-ad-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[state-ad-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ---------------------------------------------------------------------------
// 1. Invitation
// ---------------------------------------------------------------------------

export interface StateAdInvitationEmailInput {
  email: string;
  stateCode: string;
  organizationName: string;
  invitationToken: string;
  expiresAt: Date;
}

export async function sendStateAdInvitation(
  input: StateAdInvitationEmailInput
): Promise<EmailResult> {
  const { email, stateCode, organizationName, invitationToken, expiresAt } = input;
  const landingUrl = `${APP_URL}/hs/state-ad-invite/${encodeURIComponent(invitationToken)}`;
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You're invited to the GradeUp NIL State Compliance Portal</h1>
<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 16px;">GradeUp NIL is extending read-only portal access to <strong>${escapeHtml(organizationName)}</strong> so your office can monitor the high-school NIL activity happening in <strong>${escapeHtml(stateCode)}</strong> under your jurisdiction.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What you'll see</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;">Every HS NIL deal signed in ${escapeHtml(stateCode)}, with compliance status at a glance.</li>
  <li style="margin:0 0 6px;">Every outbound disclosure we've emitted to your office or the governed schools.</li>
  <li style="margin:0 0 6px;">Per-deal compliance detail: parental consent record, rule-set version, signing timestamps.</li>
  <li style="margin:0 0 6px;">Minimum-necessary athlete identity (first name + last initial + school + sport). No contact info.</li>
</ul>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What you won't see</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;">No athlete contact info (email, phone), DOB, or address.</li>
  <li style="margin:0 0 6px;">No parent PII beyond the signing guardian's name on a given consent record.</li>
  <li style="margin:0 0 6px;">No write actions — the portal is strictly read-only.</li>
</ul>
<p style="margin:16px 0;">Every page you load is audit-logged and visible back to you inside the portal. We're happy to walk through the data model on a call before you accept.</p>
${primaryButton('Accept invitation', landingUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser:<br><span style="word-break:break-all;">${landingUrl}</span></p>
<p style="margin:0 0 24px;font-size:13px;color:#52525B;">This invitation expires on <strong>${escapeHtml(expiryStr)}</strong>.</p>
`;

  const result = await sendEmail({
    to: email,
    replyTo: SUPPORT_EMAIL,
    subject: `GradeUp NIL State Compliance Portal access for ${organizationName}`,
    html: wrapPlain({
      title: 'State Compliance Portal Invitation',
      preview: `Read-only portal access for ${organizationName}.`,
      bodyHtml,
    }),
  });

  logSend('state_ad_invitation', email, result, {
    stateCode,
    organizationName,
    expiresAt: expiresAt.toISOString(),
  });
  return result;
}

// ---------------------------------------------------------------------------
// 2. Accepted notification (to admin)
// ---------------------------------------------------------------------------

export interface StateAdInvitationAcceptedInput {
  adminEmail: string;
  acceptedByEmail: string;
  stateCode: string;
  organizationName: string;
  acceptedAt: Date;
}

export async function sendStateAdInvitationAccepted(
  input: StateAdInvitationAcceptedInput
): Promise<EmailResult> {
  const { adminEmail, acceptedByEmail, stateCode, organizationName, acceptedAt } = input;
  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">State AD invitation accepted</h1>
<p style="margin:0 0 16px;"><strong>${escapeHtml(acceptedByEmail)}</strong> accepted the compliance-portal invitation for <strong>${escapeHtml(organizationName)}</strong> (${escapeHtml(stateCode)}) on ${escapeHtml(acceptedAt.toUTCString())}.</p>
<p style="margin:0 0 16px;">They now have read-only access to every ${escapeHtml(stateCode)} HS deal and disclosure. Manage assignments at <a href="${APP_URL}/hs/admin/state-ads">/hs/admin/state-ads</a>.</p>
`;

  const result = await sendEmail({
    to: adminEmail,
    subject: `State AD invitation accepted — ${organizationName}`,
    html: wrapPlain({
      title: 'State AD Invitation Accepted',
      preview: `${acceptedByEmail} accepted for ${organizationName}.`,
      bodyHtml,
    }),
  });
  logSend('state_ad_invitation_accepted', adminEmail, result, {
    stateCode,
    organizationName,
  });
  return result;
}

// ---------------------------------------------------------------------------
// 3. Weekly digest — TEMPLATE ONLY, no cron wired yet.
// ---------------------------------------------------------------------------

export interface StateAdWeeklyDigestInput {
  adEmail: string;
  stateCode: string;
  organizationName: string;
  rangeStart: Date;
  rangeEnd: Date;
  metrics: {
    totalActiveDeals: number;
    totalSignedDeals: number;
    totalDisclosuresEmitted: number;
    disclosureSuccessRate: number | null;
    totalDisputes: number;
  };
  portalUrl?: string;
}

/**
 * TODO: Wire a cron at /api/cron/state-ad-digest that (a) iterates every
 * state with active assignments, (b) aggregates last-7-day metrics via
 * getPortalMetricsForState(), (c) fans out one email per assignment. The
 * template below is production-ready; only scheduling is missing.
 */
export async function sendWeeklyStateAdDigest(
  input: StateAdWeeklyDigestInput
): Promise<EmailResult> {
  const { adEmail, stateCode, organizationName, rangeStart, rangeEnd, metrics } = input;
  const portalUrl = input.portalUrl ?? `${APP_URL}/hs/ad-portal`;
  const rate =
    metrics.disclosureSuccessRate === null
      ? 'n/a'
      : `${Math.round(metrics.disclosureSuccessRate * 100)}%`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">Weekly compliance digest — ${escapeHtml(organizationName)}</h1>
<p style="margin:0 0 16px;">Summary for ${escapeHtml(stateCode)}, ${rangeStart.toDateString()} &rarr; ${rangeEnd.toDateString()}:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;"><strong>${metrics.totalActiveDeals}</strong> active deals</li>
  <li style="margin:0 0 6px;"><strong>${metrics.totalSignedDeals}</strong> signed deals</li>
  <li style="margin:0 0 6px;"><strong>${metrics.totalDisclosuresEmitted}</strong> disclosures emitted (${escapeHtml(rate)} success)</li>
  <li style="margin:0 0 6px;"><strong>${metrics.totalDisputes}</strong> disputes raised</li>
</ul>
${primaryButton('Open portal', portalUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This digest is sent weekly and is fully auditable inside the portal itself.</p>
`;

  const result = await sendEmail({
    to: adEmail,
    subject: `${stateCode} weekly compliance digest — ${organizationName}`,
    html: wrapPlain({
      title: 'Weekly Compliance Digest',
      preview: `Weekly digest for ${organizationName} (${stateCode}).`,
      bodyHtml,
    }),
  });
  logSend('state_ad_weekly_digest', adEmail, result, { stateCode });
  return result;
}
