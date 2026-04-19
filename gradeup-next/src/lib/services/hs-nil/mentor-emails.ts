/**
 * HS-NIL Alumni Mentor — Transactional Emails
 *
 * Four templates for the mentor-session lifecycle:
 *   1. sendSessionRequestedToMentor   — athlete just asked; mentor notified
 *   2. sendSessionResponseToAthlete   — accepted or declined (single entry,
 *                                       decision determines copy)
 *   3. sendNewMessage                 — either party received a new DM,
 *                                       throttled to ≤1 send per recipient
 *                                       per hour per session (derived from
 *                                       recent message timestamps, not from
 *                                       a last_emailed_at column).
 *
 * All sends are best-effort. The caller's DB write must NEVER be blocked
 * on email delivery. If RESEND_API_KEY is missing the transport no-ops
 * cleanly and returns a failure EmailResult we pass through to the caller.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';
import { shouldSuppressNewMessageEmail } from '@/lib/hs-nil/mentors';
import type { MentorMessageSenderRole } from '@/lib/hs-nil/mentors';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// HTML helpers
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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Alumni Mentor Network</div>
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
    scope: 'hs-nil-mentor-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-mentor] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Session requested — to mentor
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionRequestedInput {
  mentorEmail: string;
  mentorName?: string;
  athleteFirstName: string;
  athleteSchool: string | null;
  athleteSport: string | null;
  athleteState: string | null;
  requestedTopic: string;
  requestedFormat: 'message' | 'video_call';
  sessionId: string;
  athleteNote?: string | null;
}

export async function sendSessionRequestedToMentor(
  input: SessionRequestedInput
): Promise<EmailResult> {
  const {
    mentorEmail,
    mentorName,
    athleteFirstName,
    athleteSchool,
    athleteSport,
    athleteState,
    requestedTopic,
    requestedFormat,
    sessionId,
    athleteNote,
  } = input;

  const greeting = mentorName ? `Hi ${escapeHtml(mentorName)},` : 'Hi,';
  const actionUrl = `${APP_URL}/hs/alumni/sessions/${sessionId}`;
  const formatLabel =
    requestedFormat === 'video_call'
      ? 'Video call (scheduled in-thread)'
      : 'Async messages';

  const athleteContext = [athleteSport, athleteSchool, athleteState]
    .filter(Boolean)
    .map((s) => escapeHtml(String(s)))
    .join(' &middot; ');

  const noteBlock =
    athleteNote && athleteNote.trim().length > 0
      ? `<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-line;">${escapeHtml(athleteNote.trim())}</p>`
      : '';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New mentorship request</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${escapeHtml(athleteFirstName)}</strong> asked to learn from you.</p>
${athleteContext ? `<p style="margin:0 0 16px;color:#52525B;font-size:14px;">${athleteContext}</p>` : ''}
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;font-size:14px;">
  <li style="margin:0 0 6px;"><strong>Topic:</strong> ${escapeHtml(requestedTopic)}</li>
  <li style="margin:0 0 6px;"><strong>Format:</strong> ${escapeHtml(formatLabel)}</li>
</ul>
${noteBlock}
${primaryButton('Open request', actionUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">You can accept, decline, or ask a clarifying question before deciding. Your email and contact info stay private — all messaging routes through GradeUp until you choose to share more.</p>
`;

  const result = await sendEmail({
    to: mentorEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${athleteFirstName} wants to talk — mentorship request`,
    html: wrapPlain({
      title: 'New mentorship request',
      preview: `${athleteFirstName} asked about ${requestedTopic}`,
      bodyHtml,
    }),
  });

  logSend('session_requested_mentor', mentorEmail, result, {
    sessionId,
    requestedFormat,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Session response — to athlete
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionResponseInput {
  athleteEmail: string;
  athleteName?: string;
  mentorName: string;
  mentorCollege: string;
  sessionId: string;
  decision: 'accepted' | 'declined';
  declinedReason?: string | null;
}

export async function sendSessionResponseToAthlete(
  input: SessionResponseInput
): Promise<EmailResult> {
  const {
    athleteEmail,
    athleteName,
    mentorName,
    mentorCollege,
    sessionId,
    decision,
    declinedReason,
  } = input;

  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';
  const actionUrl = `${APP_URL}/hs/athlete/mentor-sessions`;
  const threadUrl = `${APP_URL}/hs/alumni/sessions/${sessionId}`;

  const bodyHtml =
    decision === 'accepted'
      ? `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(mentorName)} said yes</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your mentorship session with <strong>${escapeHtml(mentorName)}</strong> at <strong>${escapeHtml(mentorCollege)}</strong> is active. Open the thread and introduce yourself.</p>
${primaryButton('Open the thread', threadUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Tip: share your trajectory link if you want ${escapeHtml(mentorName)} to see where you started and where you're headed. It's optional — you control what's shared.</p>
`
      : `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(mentorName)} couldn't take this one</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your request with <strong>${escapeHtml(mentorName)}</strong> at <strong>${escapeHtml(mentorCollege)}</strong> was declined.</p>
${
  declinedReason && declinedReason.trim().length > 0
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #DA2B57;border-radius:6px;">${escapeHtml(declinedReason.trim())}</p>`
    : ''
}
<p style="margin:0 0 16px;">There's no penalty here — mentors have limited bandwidth and most decline at least a few requests. Try another alum; the network is growing.</p>
${primaryButton('Find another mentor', actionUrl)}
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject:
      decision === 'accepted'
        ? `${mentorName} accepted your mentorship request`
        : `${mentorName} couldn't take this session`,
    html: wrapPlain({
      title: decision === 'accepted' ? 'Mentor accepted' : 'Mentor declined',
      preview:
        decision === 'accepted'
          ? `${mentorName} accepted. Open the thread.`
          : `${mentorName} declined your request.`,
      bodyHtml,
    }),
  });

  logSend(`session_response_${decision}`, athleteEmail, result, {
    sessionId,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. New message — to recipient (throttled ≤1/hour per session per recipient)
// ─────────────────────────────────────────────────────────────────────────────

export interface NewMessageEmailInput {
  recipientEmail: string;
  recipientName?: string;
  senderDisplayName: string;
  sessionId: string;
  messagePreview: string;
  /** The role of the SENDER (used for throttle lookup). */
  senderRole: MentorMessageSenderRole;
  /** The created_at of the message that triggered this send. */
  messageCreatedAt: string;
}

export async function sendNewMessage(
  input: NewMessageEmailInput
): Promise<EmailResult | { success: false; error: string; suppressed: true }> {
  // Derived throttle: if a prior message from the same sender landed in
  // the last 60 minutes we assume a prior email already went out and
  // suppress this one. We read mentor_messages timestamps directly — no
  // last_emailed_at column exists or is needed.
  const suppress = await shouldSuppressNewMessageEmail(
    input.sessionId,
    input.senderRole,
    input.messageCreatedAt,
    60
  );
  if (suppress) {
    return {
      success: false,
      error: 'Throttled: recipient already notified within the last hour.',
      suppressed: true,
    };
  }

  const greeting = input.recipientName
    ? `Hi ${escapeHtml(input.recipientName)},`
    : 'Hi,';
  const actionUrl = `${APP_URL}/hs/alumni/sessions/${input.sessionId}`;
  const preview =
    input.messagePreview.length > 240
      ? `${input.messagePreview.slice(0, 240)}…`
      : input.messagePreview;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">New message from ${escapeHtml(input.senderDisplayName)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;white-space:pre-line;">${escapeHtml(preview)}</p>
${primaryButton('Read + reply', actionUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">You'll get at most one notification per hour per session so your inbox stays quiet.</p>
`;

  const result = await sendEmail({
    to: input.recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `New message from ${input.senderDisplayName}`,
    html: wrapPlain({
      title: 'New mentor-session message',
      preview: `New message from ${input.senderDisplayName}`,
      bodyHtml,
    }),
  });

  logSend('mentor_session_new_message', input.recipientEmail, result, {
    sessionId: input.sessionId,
    senderRole: input.senderRole,
  });
  return result;
}
