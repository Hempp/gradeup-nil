/**
 * HS-to-College Transition — Transactional Emails
 *
 * Four templates for the bracket-transition lifecycle:
 *   1. sendTransitionConfirmationToAthlete — receipt on initiate
 *   2. sendTransitionToAdmin              — ops queue notification
 *   3. sendTransitionVerifiedToAthlete    — bracket flipped, welcome to college-side
 *   4. sendTransitionDeniedToAthlete      — with reason + resubmit instructions
 *
 * All sends are best-effort. The caller's DB write must NEVER be blocked
 * on email delivery. If RESEND_API_KEY is missing the transport no-ops
 * cleanly and returns a failure EmailResult we pass through to the caller.
 *
 * Tone mirrors the rest of /lib/services/hs-nil/emails.ts — utility, not
 * marketing. The "college bridge" is a life event; keep the copy warm but
 * procedural.
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

const OPS_EMAIL = process.env.EMAIL_OPS_ADDRESS || SUPPORT_EMAIL;

// ─────────────────────────────────────────────────────────────────────────────
// HTML helpers (kept consistent with /lib/services/hs-nil/emails.ts)
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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">HS → College Bridge</div>
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function logSend(
  template: string,
  recipient: string,
  result: EmailResult,
  context: Record<string, unknown> = {}
): void {
  const payload = {
    scope: 'hs-nil-transition-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-transition] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Confirmation to athlete — "we got your request"
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionConfirmationInput {
  athleteEmail: string;
  athleteName?: string;
  collegeName: string;
  matriculationDate: string; // ISO yyyy-mm-dd
  needsProof: boolean;
  statusUrl?: string;
}

export async function sendTransitionConfirmationToAthlete(
  input: TransitionConfirmationInput
): Promise<EmailResult> {
  const {
    athleteEmail,
    athleteName,
    collegeName,
    matriculationDate,
    needsProof,
  } = input;
  const statusUrl = input.statusUrl ?? `${APP_URL}/hs/athlete/transition`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';

  const proofBlock = needsProof
    ? `<p style="margin:0 0 16px;">Next: please upload <strong>enrollment proof</strong> so our ops team can verify. An enrollment letter, an official acceptance letter with matriculation confirmation, or a college transcript showing enrolled status all work.</p>${primaryButton('Upload enrollment proof', statusUrl)}`
    : `<p style="margin:0 0 16px;">We've received your enrollment proof. Our ops team will review and get back to you.</p>${primaryButton('Check status', statusUrl)}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your college transition request is in</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">We got your matriculation request for <strong>${escapeHtml(collegeName)}</strong> starting <strong>${escapeHtml(formatDate(matriculationDate))}</strong>.</p>
${proofBlock}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Once verified, your GradeUp account will flip to the college-side bracket. Your high-school academic history (GPA, verified badges, trajectory) stays on your profile — it's the story that got you here.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Received: your transition to ${collegeName}`,
    html: wrapPlain({
      title: 'Transition Request Received',
      preview: `We received your matriculation request for ${collegeName}.`,
      bodyHtml,
    }),
  });

  logSend('transition_confirmation_athlete', athleteEmail, result, {
    collegeName,
    matriculationDate,
    needsProof,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin / ops notification
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionAdminNotificationInput {
  transitionId: string;
  athleteName?: string;
  athleteEmail: string;
  collegeName: string;
  collegeState: string;
  ncaaDivision: string;
  matriculationDate: string;
  sportContinued: boolean;
  proofSubmitted: boolean;
  reviewUrl?: string;
}

export async function sendTransitionToAdmin(
  input: TransitionAdminNotificationInput
): Promise<EmailResult> {
  const {
    transitionId,
    athleteName,
    athleteEmail,
    collegeName,
    collegeState,
    ncaaDivision,
    matriculationDate,
    sportContinued,
    proofSubmitted,
  } = input;
  const reviewUrl =
    input.reviewUrl ?? `${APP_URL}/hs/admin/transitions/${transitionId}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New bracket transition pending review</h1>
<p style="margin:0 0 16px;">An athlete has initiated their HS-to-college matriculation. Review and decide in the ops queue.</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:14px;">
  <li style="margin:0 0 6px;"><strong>Athlete:</strong> ${escapeHtml(athleteName ?? 'Unknown')} (${escapeHtml(athleteEmail)})</li>
  <li style="margin:0 0 6px;"><strong>College:</strong> ${escapeHtml(collegeName)}, ${escapeHtml(collegeState)}</li>
  <li style="margin:0 0 6px;"><strong>Division:</strong> ${escapeHtml(ncaaDivision)}</li>
  <li style="margin:0 0 6px;"><strong>Matriculation:</strong> ${escapeHtml(formatDate(matriculationDate))}</li>
  <li style="margin:0 0 6px;"><strong>Continuing sport:</strong> ${sportContinued ? 'Yes' : 'No'}</li>
  <li style="margin:0 0 6px;"><strong>Enrollment proof submitted:</strong> ${proofSubmitted ? 'Yes' : 'Not yet'}</li>
</ul>
${primaryButton('Open review panel', reviewUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Transition ID: <span style="font-family:monospace;">${escapeHtml(transitionId)}</span></p>
`;

  const result = await sendEmail({
    to: OPS_EMAIL,
    replyTo: SUPPORT_EMAIL,
    subject: `[Ops] Transition pending — ${collegeName}`,
    html: wrapPlain({
      title: 'Transition Pending Review',
      preview: `New transition pending for ${collegeName}.`,
      bodyHtml,
    }),
  });

  logSend('transition_admin_notification', OPS_EMAIL, result, {
    transitionId,
    collegeName,
    proofSubmitted,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Verified — athlete's bracket has flipped
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionVerifiedInput {
  athleteEmail: string;
  athleteName?: string;
  collegeName: string;
  matriculationDate: string;
  dashboardUrl?: string;
}

export async function sendTransitionVerifiedToAthlete(
  input: TransitionVerifiedInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, collegeName, matriculationDate } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/athlete/transition`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Welcome to the college side</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your enrollment at <strong>${escapeHtml(collegeName)}</strong> is verified. Your GradeUp account is now on the college-NIL bracket effective <strong>${escapeHtml(formatDate(matriculationDate))}</strong>.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What stays the same</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:14px;">
  <li style="margin:0 0 6px;">Your high-school academic narrative — verified GPA, trajectory, sport history — stays on your profile. That's the story recruiters and brands want.</li>
  <li style="margin:0 0 6px;">Any HS deals you already signed stay HS-era. They continue to execute under the parental-consent and state-disclosure rules that were in force when you signed. Nothing reopens.</li>
</ul>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What changes</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:14px;">
  <li style="margin:0 0 6px;">New deals are college-era and follow NCAA / conference NIL rules.</li>
  <li style="margin:0 0 6px;">You sign directly — no parental consent required.</li>
  <li style="margin:0 0 6px;">Payouts flow to you (not a parent custodial account).</li>
</ul>
${primaryButton('See your dashboard', dashboardUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Every other NIL platform starts you from scratch the day you commit. You arrive with your narrative intact.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `You're verified at ${collegeName} — welcome to the college side`,
    html: wrapPlain({
      title: 'Transition Verified',
      preview: `Your enrollment at ${collegeName} is verified.`,
      bodyHtml,
    }),
  });

  logSend('transition_verified_athlete', athleteEmail, result, {
    collegeName,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Denied — with reason + resubmit instructions
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionDeniedInput {
  athleteEmail: string;
  athleteName?: string;
  collegeName: string;
  denialReason: string;
  resubmitUrl?: string;
}

export async function sendTransitionDeniedToAthlete(
  input: TransitionDeniedInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, collegeName, denialReason } = input;
  const resubmitUrl =
    input.resubmitUrl ?? `${APP_URL}/hs/athlete/transition`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">We need more to verify your transition</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">We reviewed your transition request for <strong>${escapeHtml(collegeName)}</strong> and weren't able to verify it yet. Here's what our ops team noted:</p>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #DA2B57;border-radius:6px;">${escapeHtml(denialReason)}</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">How to resubmit</h2>
<p style="margin:0 0 16px;">Open your transition page, start a new request, and upload one of:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:14px;">
  <li style="margin:0 0 6px;">An <strong>enrollment letter</strong> from the registrar.</li>
  <li style="margin:0 0 6px;">An <strong>official acceptance letter</strong> with matriculation confirmation.</li>
  <li style="margin:0 0 6px;">A <strong>college transcript</strong> showing enrolled status for the term.</li>
</ul>
${primaryButton('Start a new request', resubmitUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Nothing on your HS-side account changes in the meantime. Your profile, deals, and academic history all stay exactly where they are.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Transition to ${collegeName} needs another look`,
    html: wrapPlain({
      title: 'Transition Needs Resubmission',
      preview: `Your transition to ${collegeName} needs another look.`,
      bodyHtml,
    }),
  });

  logSend('transition_denied_athlete', athleteEmail, result, {
    collegeName,
  });
  return result;
}
