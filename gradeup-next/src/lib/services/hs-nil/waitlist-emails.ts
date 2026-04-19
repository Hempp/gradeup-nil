/**
 * HS-NIL — Waitlist Activation Emails
 *
 * Separate file from emails.ts so the waitlist-activation work doesn't
 * conflict with other HS-NIL email edits landing in parallel. Shares the
 * same sendEmail transport + plain-wrapper style as emails.ts so the
 * look-and-feel is consistent.
 *
 * Fail-closed semantics match the rest of the HS stack: sendEmail returns
 * { success, error } rather than throwing. Callers inspect result.success
 * and decide whether to roll back the DB write (see waitlist-activation.ts
 * — invite token is committed only when the email send succeeds).
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// State display names — keep in lockstep with the waitlist form and the
// state-rules map. Falls back to the 2-letter code for anything not yet
// launched, which should never fire in practice.
const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  IL: 'Illinois',
  NJ: 'New Jersey',
  NY: 'New York',
};

function displayStateName(code: string): string {
  return STATE_NAMES[code] ?? code;
}

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
  optOutUrl: string;
}): string {
  const { title, preview, bodyHtml, optOutUrl } = args;
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
            Safety by design: parental consent, state-compliant, no pay-for-play.
            <br>Questions? Reply to this email or write to
            <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0070F3;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            <br>GradeUp NIL &middot; <a href="${APP_URL}/privacy" style="color:#52525B;">Privacy</a> &middot; <a href="${APP_URL}/terms" style="color:#52525B;">Terms</a>
            &middot; <a href="${optOutUrl}" style="color:#52525B;">Opt out</a>
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
  recipient: string,
  result: EmailResult,
  context: Record<string, unknown>
): void {
  const payload = {
    scope: 'hs-nil-email',
    template: 'waitlist_invite',
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-email] waitlist_invite ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

export type WaitlistInviteRole = 'athlete' | 'parent' | 'coach' | 'brand';

export interface WaitlistInviteInput {
  email: string;
  role: WaitlistInviteRole;
  stateCode: string;
  /** Fully-qualified invite URL: `${APP_URL}/hs/invite/${token}`. */
  invitationUrl: string;
  /** Opt-out URL — same invite URL with ?opt_out=1. */
  optOutUrl: string;
  /** Optional first name to personalize greeting. */
  firstName?: string | null;
  /** Weeks since the person joined the waitlist. Used for the copy
   *  hook ("you joined ~N weeks ago"). Null when unavailable. */
  weeksOnWaitlist?: number | null;
}

// Role-specific body copy. We tuned each message to the audience:
// athletes get the ambition angle, parents the safety angle, coaches
// the roster angle, brands the access angle. All four share the same
// CTA and the same safety footer.
function bodyForRole(args: {
  role: WaitlistInviteRole;
  stateName: string;
  stateCode: string;
  invitationUrl: string;
  firstName?: string | null;
  weeksOnWaitlist?: number | null;
}): { heading: string; intro: string; ctaLabel: string } {
  const { role, stateName, invitationUrl: _invitationUrl, firstName, weeksOnWaitlist } = args;
  void _invitationUrl;
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : '';
  const timeNote =
    weeksOnWaitlist && weeksOnWaitlist > 0
      ? ` You joined our waitlist about ${weeksOnWaitlist} week${weeksOnWaitlist === 1 ? '' : 's'} ago — thanks for your patience.`
      : '';

  switch (role) {
    case 'athlete':
      return {
        heading: `You're in. GradeUp HS is live in ${escapeHtml(stateName)}.`,
        intro: `${greeting}${timeNote} Your spot is ready. Complete your athlete profile, verify your GPA, and get on the way to your first NIL deal — all with parental oversight built in.`,
        ctaLabel: 'Activate your account',
      };
    case 'parent':
      return {
        heading: `GradeUp HS is live in ${escapeHtml(stateName)} — set up your parent account.`,
        intro: `${greeting}${timeNote} You signed up to stay in the loop. GradeUp HS is now open in ${escapeHtml(stateName)}. Create your guardian account so your scholar-athlete can onboard safely, with you approving every deal.`,
        ctaLabel: 'Set up my parent account',
      };
    case 'coach':
      return {
        heading: `GradeUp HS is live in ${escapeHtml(stateName)} — roster your athletes.`,
        intro: `${greeting}${timeNote} You asked to hear when we opened in ${escapeHtml(stateName)}. We're live. Create your coach account to help your scholar-athletes onboard and to monitor school-compliant NIL activity.`,
        ctaLabel: 'Create my coach account',
      };
    case 'brand':
      return {
        heading: `GradeUp HS is live in ${escapeHtml(stateName)} — meet your athletes.`,
        intro: `${greeting}${timeNote} You asked for early access to ${escapeHtml(stateName)} scholar-athletes. The pilot is now open. Stand up your brand account, pick your deal categories, and we'll match you with cleared, parentally-consented athletes who represent academics and athletics.`,
        ctaLabel: 'Activate my brand account',
      };
  }
}

/**
 * Send the waitlist activation invite. On a successful send the caller
 * commits the invitation_token + activation_state='invited' transition.
 * On failure the caller rolls back to 'waiting' so the cron can retry
 * on the next batch (email-or-nothing semantics).
 */
export async function sendWaitlistInvite(
  input: WaitlistInviteInput
): Promise<EmailResult> {
  const {
    email,
    role,
    stateCode,
    invitationUrl,
    optOutUrl,
    firstName,
    weeksOnWaitlist,
  } = input;
  const stateName = displayStateName(stateCode);

  const copy = bodyForRole({
    role,
    stateName,
    stateCode,
    invitationUrl,
    firstName,
    weeksOnWaitlist,
  });

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${copy.heading}</h1>
<p style="margin:0 0 16px;">${copy.intro}</p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Why GradeUp HS</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;"><strong>GPA-centered.</strong> Brands see both your academic and athletic story.</li>
  <li style="margin:0 0 6px;"><strong>Parental consent, built in.</strong> Every deal routes through a guardian when the athlete is a minor.</li>
  <li style="margin:0 0 6px;"><strong>State-compliant.</strong> We apply ${escapeHtml(stateCode)}'s NIL rules automatically, including disclosure to the state athletic association.</li>
  <li style="margin:0 0 6px;"><strong>No pay-for-play.</strong> Ever.</li>
</ul>

${primaryButton(copy.ctaLabel, invitationUrl)}

<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser: <br><span style="word-break:break-all;">${invitationUrl}</span></p>

<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This link is tied to your waitlist signup. If you no longer want to hear from us, <a href="${optOutUrl}" style="color:#52525B;">click here to opt out</a>.</p>
`;

  const subject = `You're in. GradeUp HS is live in ${stateName}.`;

  const result = await sendEmail({
    to: email,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: `GradeUp HS just opened in ${stateName}.`,
      bodyHtml,
      optOutUrl,
    }),
  });

  logSend(email, result, {
    role,
    stateCode,
    hasFirstName: Boolean(firstName),
    weeksOnWaitlist: weeksOnWaitlist ?? null,
  });
  return result;
}
