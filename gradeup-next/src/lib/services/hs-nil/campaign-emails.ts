/**
 * HS-NIL Campaign Emails
 * ----------------------------------------------------------------------------
 * Transactional emails for the multi-athlete campaign surface. Reuses the
 * plain-shell wrapper pattern from emails.ts (light bg, high-contrast,
 * utility tone — campaigns are a business transaction, not a marketing
 * promo).
 *
 * Four templates:
 *
 *   sendCampaignInvitationToAthlete
 *     Athlete was explicitly invited to an invited_only or hybrid
 *     campaign — OR — the campaign opened and the athlete falls inside
 *     the target state set (openFanOut=true re-frames the copy).
 *
 *   sendCampaignApplicationReceived (brand-side)
 *     Athlete applied to an open campaign. Nudges the brand to review
 *     from /hs/brand/campaigns/[id].
 *
 *   sendCampaignAcceptedToAthlete
 *     Brand accepted the athlete; a real deal was spawned. Athlete
 *     goes through the normal /hs/deals accept path from here.
 *
 *   sendCampaignClosedToAthlete
 *     Campaign closed before acceptance, or athlete was explicitly
 *     rejected. Always includes a closing note — if brand supplied a
 *     reason we echo it, otherwise we say "the brand picked a different
 *     set of athletes".
 *
 * Preference gating: the push half of fan-out (sendPushToUser) already
 * enforces push_preferences. Email fan-out is not individually gated
 * today because HS-NIL email preferences are not modeled — the platform
 * treats campaign emails as transactional (consent-adjacent) rather
 * than marketing.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ---------------------------------------------------------------------------
// Shared shell — mirrors the plain wrapper from emails.ts
// ---------------------------------------------------------------------------

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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Campaigns</div>
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
    scope: 'hs-nil-campaign-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-campaign-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload,
  );
}

// ---------------------------------------------------------------------------
// 1. Invitation to athlete (invited_only / hybrid / open fan-out)
// ---------------------------------------------------------------------------

export interface CampaignInvitationToAthleteInput {
  athleteEmail: string;
  athleteFirstName: string;
  campaignTitle: string;
  campaignId: string;
  /** True when this was a broad open-campaign fan-out vs a direct invite. */
  openFanOut?: boolean;
}

export async function sendCampaignInvitationToAthlete(
  input: CampaignInvitationToAthleteInput,
): Promise<EmailResult> {
  const {
    athleteEmail,
    athleteFirstName,
    campaignTitle,
    campaignId,
    openFanOut,
  } = input;
  const url = `${APP_URL}/hs/athlete/campaigns/${campaignId}`;
  const subject = openFanOut
    ? `New campaign open for you: ${campaignTitle}`
    : `You were invited: ${campaignTitle}`;
  const lead = openFanOut
    ? `A new GradeUp NIL campaign just opened and you're in the target group. Take a look — if it fits, apply directly.`
    : `A brand invited you to a GradeUp NIL campaign. You can review the details and decide whether to accept.`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">Hi ${escapeHtml(athleteFirstName)},</p>
<p style="margin:0 0 16px;">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px;"><strong>${escapeHtml(campaignTitle)}</strong></p>
${primaryButton(openFanOut ? 'See the campaign' : 'Review the invitation', url)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">You'll still need parental consent covering the deal category for accepted applications — the app shows you what to ask for if needed.</p>
`;
  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: lead,
      bodyHtml,
    }),
  });
  logSend('campaign_invitation_to_athlete', athleteEmail, result, {
    campaignId,
    openFanOut: Boolean(openFanOut),
  });
  return result;
}

// ---------------------------------------------------------------------------
// 2. Application received (brand-side)
// ---------------------------------------------------------------------------

export interface CampaignApplicationReceivedInput {
  brandEmail: string;
  brandName: string;
  campaignTitle: string;
  campaignId: string;
  athleteId: string;
}

export async function sendCampaignApplicationReceived(
  input: CampaignApplicationReceivedInput,
): Promise<EmailResult> {
  const { brandEmail, brandName, campaignTitle, campaignId } = input;
  const url = `${APP_URL}/hs/brand/campaigns/${campaignId}`;
  const subject = `New applicant for ${campaignTitle}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">Hi ${escapeHtml(brandName)},</p>
<p style="margin:0 0 16px;">A high-school athlete just applied to <strong>${escapeHtml(campaignTitle)}</strong>. Review their details and decide whether to accept.</p>
${primaryButton('Review applicants', url)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Accepting an applicant spawns a real deal row in your pipeline. All the normal state-rule, consent-scope, and disclosure checks apply.</p>
`;
  const result = await sendEmail({
    to: brandEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: `An athlete applied to ${campaignTitle}.`,
      bodyHtml,
    }),
  });
  logSend('campaign_application_received', brandEmail, result, {
    campaignId,
  });
  return result;
}

// ---------------------------------------------------------------------------
// 3. Acceptance to athlete
// ---------------------------------------------------------------------------

export interface CampaignAcceptedToAthleteInput {
  athleteEmail: string;
  athleteFirstName: string;
  campaignTitle: string;
  campaignId: string;
}

export async function sendCampaignAcceptedToAthlete(
  input: CampaignAcceptedToAthleteInput,
): Promise<EmailResult> {
  const { athleteEmail, athleteFirstName, campaignTitle, campaignId } = input;
  const url = `${APP_URL}/hs/deals`;
  const subject = `You're in: ${campaignTitle}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">Hi ${escapeHtml(athleteFirstName)},</p>
<p style="margin:0 0 16px;">You were accepted into <strong>${escapeHtml(campaignTitle)}</strong>. A deal is now live on your dashboard — review and accept it to kick off the work.</p>
${primaryButton('Open your deals', url)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Links, reminders, and payout details flow through the same HS-NIL dashboard you already use. Your parent will be looped in if consent needs to be refreshed.</p>
`;
  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: `You were accepted into ${campaignTitle}.`,
      bodyHtml,
    }),
  });
  logSend('campaign_accepted_to_athlete', athleteEmail, result, {
    campaignId,
  });
  return result;
}

// ---------------------------------------------------------------------------
// 4. Closed to athlete (campaign ended or explicit rejection)
// ---------------------------------------------------------------------------

export interface CampaignClosedToAthleteInput {
  athleteEmail: string;
  athleteFirstName: string;
  campaignTitle: string;
  campaignId: string;
  /** Optional reason string passed by the brand on explicit rejection. */
  reason: string | null;
}

export async function sendCampaignClosedToAthlete(
  input: CampaignClosedToAthleteInput,
): Promise<EmailResult> {
  const { athleteEmail, athleteFirstName, campaignTitle, campaignId, reason } =
    input;
  const url = `${APP_URL}/hs/athlete/campaigns`;
  const subject = `Update on ${campaignTitle}`;

  const reasonBlock = reason
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;">${escapeHtml(reason)}</p>`
    : '';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">Hi ${escapeHtml(athleteFirstName)},</p>
<p style="margin:0 0 16px;">The brand finalized their roster for <strong>${escapeHtml(campaignTitle)}</strong> and did not include your application this round.</p>
${reasonBlock}
${primaryButton('Browse other campaigns', url)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">This does not affect your account standing or any other deals you're already signed into. New campaigns show up here as brands post them.</p>
`;
  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: `The ${campaignTitle} campaign has closed for your application.`,
      bodyHtml,
    }),
  });
  logSend('campaign_closed_to_athlete', athleteEmail, result, {
    campaignId,
    withReason: Boolean(reason),
  });
  return result;
}
