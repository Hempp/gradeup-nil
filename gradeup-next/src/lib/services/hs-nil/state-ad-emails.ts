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
// 3. Weekly compliance digest
// ---------------------------------------------------------------------------
// Driven by /api/cron/hs-state-ad-digest (daily 09:00 UTC). Each state AD
// picks a preferred day-of-week on their settings page; the cron fans out
// matching assignments. Empty-week suppression, 6-day idempotency guard,
// and PII discipline (first name + last initial only) live in
// src/lib/hs-nil/state-ad-digest.ts — this file is pure template rendering.

export interface StateAdWeeklyDigestDeal {
  id: string;
  athleteAnon: string;
  athleteSchool: string | null;
  athleteSport: string | null;
  brandName: string | null;
  compensationAmount: number | null;
}

export interface StateAdWeeklyDigestTopSchool {
  school: string;
  dealCount: number;
}

export interface StateAdWeeklyDigestInput {
  recipientEmail: string;
  stateCode: string;
  stateName: string;
  organizationName: string;
  rangeStart: Date;
  rangeEnd: Date;
  newDealCount: number;
  deals: StateAdWeeklyDigestDeal[];
  totalCompensation: number;
  disclosuresEmitted: number;
  disclosuresFailed: number;
  unreviewedComplianceEvents: number;
  complianceRate: number | null;
  topSchools: StateAdWeeklyDigestTopSchool[];
  portalUrl?: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatDealAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return formatCurrency(Number(amount));
}

function formatWeekEnding(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderTally(args: {
  dealCount: number;
  totalCompensation: number;
  disclosuresEmitted: number;
  complianceRate: number | null;
}): string {
  const { dealCount, totalCompensation, disclosuresEmitted, complianceRate } = args;
  const rateLabel =
    complianceRate === null
      ? '—'
      : `${Math.round(complianceRate * 100)}%`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    <td style="width:25%;padding:14px;background:#F4F4F5;border-radius:8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1px;font-weight:700;text-transform:uppercase;color:#52525B;">New deals</div>
      <div style="margin-top:4px;font-size:22px;font-weight:700;color:#111;">${dealCount.toLocaleString()}</div>
    </td>
    <td style="width:25%;padding:14px;background:#F4F4F5;border-radius:8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1px;font-weight:700;text-transform:uppercase;color:#52525B;">Compensation</div>
      <div style="margin-top:4px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(formatCurrency(totalCompensation))}</div>
    </td>
    <td style="width:25%;padding:14px;background:#F4F4F5;border-radius:8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1px;font-weight:700;text-transform:uppercase;color:#52525B;">Disclosures</div>
      <div style="margin-top:4px;font-size:22px;font-weight:700;color:#111;">${disclosuresEmitted.toLocaleString()}</div>
    </td>
    <td style="width:25%;padding:14px;background:#F4F4F5;border-radius:8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1px;font-weight:700;text-transform:uppercase;color:#52525B;">Compliance</div>
      <div style="margin-top:4px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(rateLabel)}</div>
    </td>
  </tr>
</table>`;
}

function renderDealRow(d: StateAdWeeklyDigestDeal): string {
  const athleteLine = escapeHtml(d.athleteAnon);
  const contextParts: string[] = [];
  if (d.athleteSchool) contextParts.push(escapeHtml(d.athleteSchool));
  if (d.athleteSport) contextParts.push(escapeHtml(d.athleteSport));
  const contextLine =
    contextParts.length > 0 ? `<span style="color:#52525B;">${contextParts.join(' · ')}</span>` : '';

  return `
<tr>
  <td style="padding:8px 0;border-bottom:1px solid #E4E4E7;font-size:13px;color:#18181B;line-height:1.5;">
    <div style="font-weight:600;">${athleteLine}</div>
    ${contextLine ? `<div style="font-size:12px;">${contextLine}</div>` : ''}
  </td>
  <td style="padding:8px 0 8px 12px;border-bottom:1px solid #E4E4E7;font-size:13px;color:#18181B;line-height:1.5;">
    ${d.brandName ? escapeHtml(d.brandName) : '<span style="color:#71717A;">—</span>'}
  </td>
  <td align="right" style="padding:8px 0 8px 12px;border-bottom:1px solid #E4E4E7;font-size:13px;color:#18181B;font-weight:600;white-space:nowrap;">
    ${escapeHtml(formatDealAmount(d.compensationAmount))}
  </td>
</tr>`;
}

function renderTopSchools(rows: StateAdWeeklyDigestTopSchool[]): string {
  if (rows.length === 0) return '';
  const items = rows
    .map(
      (r) =>
        `<li style="margin:0 0 6px;"><strong>${escapeHtml(r.school)}</strong> · ${r.dealCount} deal${r.dealCount === 1 ? '' : 's'}</li>`
    )
    .join('');
  return `
<h2 style="margin:24px 0 8px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#111;">Top schools this week</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:13px;line-height:1.6;">
  ${items}
</ul>`;
}

function renderFlags(args: {
  disclosuresFailed: number;
  unreviewedComplianceEvents: number;
}): string {
  const { disclosuresFailed, unreviewedComplianceEvents } = args;
  if (disclosuresFailed === 0 && unreviewedComplianceEvents === 0) return '';
  const rows: string[] = [];
  if (disclosuresFailed > 0) {
    rows.push(
      `<li style="margin:0 0 6px;"><strong>${disclosuresFailed}</strong> disclosure${disclosuresFailed === 1 ? '' : 's'} failed to send. Our ops team is retrying; the portal shows current status per deal.</li>`
    );
  }
  if (unreviewedComplianceEvents > 0) {
    rows.push(
      `<li style="margin:0 0 6px;"><strong>${unreviewedComplianceEvents}</strong> unreviewed regulatory change event${unreviewedComplianceEvents === 1 ? '' : 's'} mentioning your state were detected this week.</li>`
    );
  }
  return `
<div style="margin:20px 0;padding:14px 16px;border-left:4px solid #D97706;background:#FFFBEB;border-radius:6px;">
  <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:#92400E;">Needs attention</div>
  <ul style="margin:8px 0 0;padding-left:20px;color:#78350F;font-size:13px;line-height:1.5;">
    ${rows.join('')}
  </ul>
</div>`;
}

/**
 * Compose and send the weekly compliance digest for a single state AD.
 * Pure template rendering — feature-flagging, idempotency, and empty-week
 * suppression live in the caller (the cron route).
 *
 * PII posture: athletes are surfaced exclusively as first-name + last-initial
 * + school + sport. The payload must never carry email/phone/DOB/parent
 * data — caller-side `collectWeeklyStateAdBrief` enforces that.
 */
export async function sendWeeklyStateAdDigest(
  input: StateAdWeeklyDigestInput
): Promise<EmailResult> {
  const {
    recipientEmail,
    stateCode,
    stateName,
    organizationName,
    rangeStart,
    rangeEnd,
    newDealCount,
    deals,
    totalCompensation,
    disclosuresEmitted,
    disclosuresFailed,
    unreviewedComplianceEvents,
    complianceRate,
    topSchools,
  } = input;

  const portalUrl =
    input.portalUrl ??
    `${APP_URL}/hs/ad-portal?state=${encodeURIComponent(stateCode)}`;
  const settingsUrl = `${APP_URL}/hs/ad-portal/settings`;
  const weekEndingLabel = formatWeekEnding(rangeEnd);

  const dealTable =
    deals.length > 0
      ? `
<h2 style="margin:24px 0 8px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#111;">New deals this week (${newDealCount.toLocaleString()})</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 0;">
  <thead>
    <tr>
      <th align="left" style="padding:6px 0;border-bottom:2px solid #111;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#52525B;">Athlete</th>
      <th align="left" style="padding:6px 0 6px 12px;border-bottom:2px solid #111;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#52525B;">Brand</th>
      <th align="right" style="padding:6px 0 6px 12px;border-bottom:2px solid #111;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#52525B;">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${deals.map(renderDealRow).join('')}
  </tbody>
</table>
${
  newDealCount > deals.length
    ? `<p style="margin:8px 0 0;font-size:12px;color:#52525B;">Showing ${deals.length} of ${newDealCount.toLocaleString()}. Open the portal for the full list.</p>`
    : ''
}`
      : `<p style="margin:16px 0;font-size:13px;color:#52525B;">No new deals signed this week.</p>`;

  const bodyHtml = `
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Weekly NIL compliance summary</h1>
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">${escapeHtml(stateName)} (${escapeHtml(stateCode)}) · week ending ${escapeHtml(weekEndingLabel)}</p>

${renderTally({ dealCount: newDealCount, totalCompensation, disclosuresEmitted, complianceRate })}

${renderFlags({ disclosuresFailed, unreviewedComplianceEvents })}

${dealTable}

${renderTopSchools(topSchools)}

${primaryButton('Open portal dashboard', portalUrl)}

<p style="margin:24px 0 12px;font-size:12px;color:#52525B;line-height:1.6;">
  Athlete identifiers in this email are intentionally minimal (first name + last initial). The portal respects the same privacy tier.
  Every portal page-load you make is audit-logged and visible to both GradeUp and your office.
</p>
<p style="margin:0;font-size:12px;color:#52525B;line-height:1.6;">
  Manage your digest preferences (turn off, change day of week) in <a href="${settingsUrl}" style="color:#0070F3;">portal settings</a>.
</p>
`;

  const subject = `[${organizationName}] Weekly NIL compliance summary — ${weekEndingLabel}`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Weekly Compliance Digest',
      preview: `${newDealCount} new deals · ${disclosuresEmitted} disclosures emitted in ${stateCode} this week.`,
      bodyHtml,
    }),
  });

  logSend('state_ad_weekly_digest', recipientEmail, result, {
    stateCode,
    newDealCount,
    disclosuresEmitted,
    disclosuresFailed,
  });
  return result;
}
