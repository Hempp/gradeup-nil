/**
 * HS-NIL — Transactional Email Service
 *
 * Per-flow email sends for the HS-NIL pilot. All sends go through the shared
 * `sendEmail` transport in `@/lib/services/email` (Resend singleton, provider
 * abstraction, API-key gating). This file owns the *copy* and *template
 * architecture* for HS-specific mail — waitlist confirmation, parent signing
 * request, and parent-signed notification.
 *
 * Fail-closed semantics:
 *   - If RESEND_API_KEY is missing, the underlying transport returns
 *     { success: false, error: 'Email not configured' } and logs a warn; we
 *     surface that as a returned EmailResult but never throw. Callers on the
 *     signup path MUST NOT let an email failure block their DB write.
 *
 * Templates:
 *   - Plain HTML via tagged template literals. No JS dependency, no React
 *     Email dep (not in package.json). Palette and structure match the
 *     existing email.ts wrapper for brand consistency, but the HS-NIL mails
 *     use a lighter, plainer shell because consent mail needs to read as
 *     legal/guardian-facing, not marketing.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Shared styling helpers (plain HTML, inline styles only — email-safe)
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Plain light-themed wrapper. Consent-adjacent mail must read as a utility
 * notice, not marketing — so we do NOT reuse the dark-brand wrapper from the
 * main email service. High contrast, ~600px, no background imagery.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Logging helper — every send emits a structured line so ops can grep the
// logs and retry by-hand if Resend is down.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Waitlist confirmation
// ─────────────────────────────────────────────────────────────────────────────

export interface WaitlistConfirmationInput {
  email: string;
  role: 'athlete' | 'parent' | 'coach' | 'brand';
  stateCode: string;
  /** Total waitlist rank at time of signup. Null if unavailable. */
  position: number | null;
}

const ROLE_LABEL: Record<WaitlistConfirmationInput['role'], string> = {
  athlete: 'athlete',
  parent: 'parent or guardian',
  coach: 'coach',
  brand: 'brand partner',
};

export async function sendWaitlistConfirmation(
  input: WaitlistConfirmationInput
): Promise<EmailResult> {
  const { email, role, stateCode, position } = input;
  const roleLabel = ROLE_LABEL[role];
  const referralUrl = `${APP_URL}/hs?ref=${encodeURIComponent(email)}`;

  const positionBlock =
    position !== null
      ? `<p style="margin:0 0 16px;">You're <strong>#${position.toLocaleString()}</strong> on the list for ${escapeHtml(stateCode)}.</p>`
      : '';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You're on the GradeUp HS waitlist</h1>
<p style="margin:0 0 16px;">Thanks for signing up as a ${escapeHtml(roleLabel)}. We'll let you know when the pilot opens in <strong>${escapeHtml(stateCode)}</strong>.</p>
${positionBlock}
<p style="margin:0 0 16px;">GradeUp NIL is a Name, Image, and Likeness platform built specifically for high school scholar-athletes. We combine academic verification with athletic performance so brands find students who represent both — and families stay in control of every deal.</p>
<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Move up the list</h2>
<p style="margin:0 0 8px;">Every friend who signs up with your link bumps your place.</p>
${primaryButton('Share your link', referralUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">This is the only email you'll receive unless something changes for ${escapeHtml(stateCode)}. You can reply any time with questions.</p>
`;

  const result = await sendEmail({
    to: email,
    replyTo: SUPPORT_EMAIL,
    subject: "You're on the GradeUp HS waitlist",
    html: wrapPlain({
      title: 'GradeUp HS Waitlist',
      preview: `You're on the GradeUp HS waitlist for ${stateCode}.`,
      bodyHtml,
    }),
  });

  logSend('waitlist_confirmation', email, result, { role, stateCode, position });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Parent consent request
// ─────────────────────────────────────────────────────────────────────────────

export interface ParentConsentRequestInput {
  parentEmail: string;
  parentFullName?: string;
  athleteName: string;
  signingUrl: string;
  expiresAt: Date;
  /**
   * Phase 17: when the parent has a phone on file, we also send a
   * companion SMS. Passing a value here adds a one-line "you may also
   * receive this as an SMS to <last-4>" note so the SMS arrival
   * doesn't surprise the recipient. Pass the original (non-normalised)
   * phone — we mask to last-4 ourselves.
   */
  parentPhone?: string | null;
}

/**
 * Show only the last 4 digits of a phone for a softer privacy posture
 * in email copy. Returns null if we can't extract at least 4 digits.
 */
function maskPhoneForEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `***-***-${digits.slice(-4)}`;
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function sendParentConsentRequest(
  input: ParentConsentRequestInput
): Promise<EmailResult> {
  const { parentEmail, parentFullName, athleteName, signingUrl, expiresAt } = input;
  const greeting = parentFullName ? `Hi ${escapeHtml(parentFullName)},` : 'Hello,';
  const expiry = formatExpiry(expiresAt);
  const safeAthlete = escapeHtml(athleteName);
  const safeSigningUrl = signingUrl; // URL not user-supplied; generated server-side
  const maskedPhone = maskPhoneForEmail(input.parentPhone);

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${safeAthlete} needs your permission for GradeUp NIL</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${safeAthlete}</strong> is joining GradeUp NIL, a platform that lets high-school student-athletes earn money from their Name, Image, and Likeness (NIL) — things like social media posts, local business endorsements, training camps, or autograph sessions.</p>
<p style="margin:0 0 16px;">Because ${safeAthlete} is a minor, <strong>no deals can happen until you review and sign the parental consent form.</strong></p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What you are approving</h2>
<p style="margin:0 0 8px;">The consent form lets you set limits: which types of deals are allowed, a maximum dollar amount per deal, and how long the consent lasts. You can revoke it at any time.</p>
<p style="margin:0 0 16px;">You are <strong>not</strong> agreeing to any specific deal right now. Every deal requires separate review inside the app.</p>

${primaryButton('Review and sign', safeSigningUrl)}

<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser: <br><span style="word-break:break-all;">${safeSigningUrl}</span></p>
<p style="margin:0 0 24px;font-size:13px;color:#52525B;">This link expires on <strong>${escapeHtml(expiry)}</strong> and can only be used once.</p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Is this email legitimate?</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;">This link only works for you — it was generated for your email address.</li>
  <li style="margin:0 0 6px;">Confirm the link above starts with <strong>${escapeHtml(new URL(APP_URL).host)}</strong>.</li>
  <li style="margin:0 0 6px;">We will never ask for a Social Security number, bank account, or payment to process consent.</li>
  <li style="margin:0 0 6px;">If anything looks off, email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0070F3;">${escapeHtml(SUPPORT_EMAIL)}</a> before clicking.</li>
</ul>

<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Didn't expect this? You can ignore this email and nothing will happen — the link will expire on its own.</p>
${maskedPhone ? `<p style="margin:8px 0 0;font-size:12px;color:#71717A;">You may also receive this as an SMS to ${escapeHtml(maskedPhone)}.</p>` : ''}
`;

  const result = await sendEmail({
    to: parentEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${athleteName} needs your permission for GradeUp NIL`,
    html: wrapPlain({
      title: 'Parental Consent Request',
      preview: `${athleteName} needs your permission to join GradeUp NIL.`,
      bodyHtml,
    }),
  });

  logSend('parent_consent_request', parentEmail, result, {
    athleteName,
    expiresAt: expiresAt.toISOString(),
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Parent-signed notification (to athlete)
// ─────────────────────────────────────────────────────────────────────────────

export interface ParentConsentSignedInput {
  athleteEmail: string;
  athleteName: string;
  parentFullName: string;
  signedAt: Date;
  /** Absolute URL to the athlete's consent-status page. */
  dashboardUrl?: string;
}

export async function sendParentConsentSigned(
  input: ParentConsentSignedInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, parentFullName, signedAt } = input;
  const dashboardUrl =
    input.dashboardUrl ?? `${APP_URL}/hs/dashboard`;
  const signedStr = signedAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your parental consent is signed</h1>
<p style="margin:0 0 16px;">Hi ${escapeHtml(athleteName)},</p>
<p style="margin:0 0 16px;"><strong>${escapeHtml(parentFullName)}</strong> reviewed and signed your parental consent on ${escapeHtml(signedStr)}. You're now cleared to start reviewing NIL deals under the scope they approved.</p>
${primaryButton('Open your dashboard', dashboardUrl)}
<p style="margin:0 0 16px;">Remember — every individual deal still needs your review and will also surface to your guardian if it exceeds what they approved. State-specific rules (school notice, agent caps, etc.) are enforced automatically.</p>
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Questions? Reply to this email.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: 'Your parental consent is signed — you can start reviewing deals',
    html: wrapPlain({
      title: 'Parental Consent Signed',
      preview: `${parentFullName} signed your parental consent.`,
      bodyHtml,
    }),
  });

  logSend('parent_consent_signed', athleteEmail, result, {
    athleteName,
    parentFullName,
    signedAt: signedAt.toISOString(),
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Parent-athlete link confirmation (to parent)
// ─────────────────────────────────────────────────────────────────────────────

export interface ParentLinkConfirmedInput {
  parentEmail: string;
  parentFullName?: string | null;
  athleteName: string;
  dashboardUrl?: string;
}

/**
 * Notify a parent that the athlete confirmed the pending parent-athlete
 * link. Utility-toned — no marketing, no "next steps" cross-sell — this
 * is a straight receipt that symmetric trust has been established.
 *
 * Send is best-effort from the verify API route; failures must never
 * block the DB write that flipped verified_at. The underlying transport
 * no-ops cleanly when RESEND_API_KEY is missing.
 */
export async function sendParentLinkConfirmed(
  input: ParentLinkConfirmedInput
): Promise<EmailResult> {
  const { parentEmail, parentFullName, athleteName } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/parent`;
  const greeting = parentFullName ? `Hi ${escapeHtml(parentFullName)},` : 'Hello,';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your link to ${escapeHtml(athleteName)} is confirmed</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;"><strong>${escapeHtml(athleteName)}</strong> confirmed your parent link on GradeUp NIL. You can now request and sign parental consent for their NIL deals from your parent dashboard.</p>
${primaryButton('Open your parent dashboard', dashboardUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">If ${escapeHtml(athleteName)} later unlinks you, any consents you've already signed stay in place for the deals they cover. You'll only lose the ability to approve new deals.</p>
`;

  const result = await sendEmail({
    to: parentEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `${athleteName} confirmed your GradeUp NIL parent link`,
    html: wrapPlain({
      title: 'Parent Link Confirmed',
      preview: `${athleteName} confirmed your parent link on GradeUp NIL.`,
      bodyHtml,
    }),
  });

  logSend('parent_link_confirmed', parentEmail, result, { athleteName });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Transcript verification decisions (Tier B)
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptApprovedInput {
  athleteEmail: string;
  athleteName?: string;
  approvedGpa: number;
  dashboardUrl?: string;
}

export async function sendTranscriptApproved(
  input: TranscriptApprovedInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, approvedGpa } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/dashboard`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';
  const gpaStr = approvedGpa.toFixed(2);

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your GPA is verified</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your transcript checked out. We've bumped your profile GPA to <strong>${escapeHtml(gpaStr)}</strong> and added a <strong>Verified</strong> badge so brands can see the academic side of your story is confirmed.</p>
${primaryButton('Open your dashboard', dashboardUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Transcripts are reviewed by a human on our team. If you change schools or your GPA moves, upload a fresh transcript anytime and we'll re-verify.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: 'Your GPA is verified on GradeUp NIL',
    html: wrapPlain({
      title: 'GPA Verified',
      preview: `Your transcript was verified. GPA: ${gpaStr}.`,
      bodyHtml,
    }),
  });

  logSend('transcript_approved', athleteEmail, result, { approvedGpa });
  return result;
}

export interface TranscriptRejectedInput {
  athleteEmail: string;
  athleteName?: string;
  /** Short note shown to the athlete. Ops-authored; we pass through verbatim. */
  athleteVisibleNote?: string;
  /** Whether ops asked for a resubmission vs a flat rejection. */
  resubmission: boolean;
  resubmitUrl?: string;
}

export async function sendTranscriptRejected(
  input: TranscriptRejectedInput
): Promise<EmailResult> {
  const { athleteEmail, athleteName, athleteVisibleNote, resubmission } = input;
  const resubmitUrl = input.resubmitUrl ?? `${APP_URL}/hs/onboarding/verify-gpa`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';

  const lead = resubmission
    ? 'We took a look at your transcript and need a cleaner upload before we can verify.'
    : 'We took a look at your transcript and were not able to verify it.';

  const noteBlock = athleteVisibleNote
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;">${escapeHtml(athleteVisibleNote)}</p>`
    : '';

  const cta = resubmission
    ? primaryButton('Upload a new transcript', resubmitUrl)
    : '';

  const subject = resubmission
    ? 'Please resubmit your transcript for GradeUp NIL'
    : 'Transcript could not be verified';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">${escapeHtml(lead)}</p>
${noteBlock}
${cta}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Reply to this email with any questions — a real human from our ops team will get back to you.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: subject,
      preview: resubmission
        ? 'Please resubmit your transcript.'
        : 'Your transcript could not be verified.',
      bodyHtml,
    }),
  });

  logSend('transcript_rejected', athleteEmail, result, {
    resubmission,
    hasNote: Boolean(athleteVisibleNote),
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Consent renewal nudge (admin-triggered)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nudge a parent that their consent is about to expire. Triggered by an
 * admin from /hs/admin/consents via the admin-actions service.
 *
 * Does NOT mutate any consent row — renewal requires explicit parental
 * intent, signed through the existing /hs/consent/request flow. This
 * email only reminds.
 *
 * Tone is utility, not marketing. Parents whose consent has already been
 * signed once don't need a re-sell — they need a clear "heads up, expiry
 * date, one click to renew" message.
 */
export interface ConsentRenewalNudgeInput {
  parentEmail: string;
  parentFullName?: string | null;
  athleteName: string;
  /** Short human-readable summary of the current scope (categories, max, duration). */
  scopeSummary: string;
  currentExpiresAt: Date;
  /** Absolute URL to the renewal / manage surface. */
  renewUrl: string;
}

function formatExpiresIn(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 'soon';
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return 'in 1 day';
  if (days < 14) return `in ${days} days`;
  const weeks = Math.ceil(days / 7);
  return `in ${weeks} weeks`;
}

function formatExpiryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function sendConsentRenewalNudge(
  input: ConsentRenewalNudgeInput
): Promise<EmailResult> {
  const {
    parentEmail,
    parentFullName,
    athleteName,
    scopeSummary,
    currentExpiresAt,
    renewUrl,
  } = input;
  const greeting = parentFullName
    ? `Hi ${escapeHtml(parentFullName)},`
    : 'Hello,';
  const safeAthlete = escapeHtml(athleteName);
  const safeScope = escapeHtml(scopeSummary);
  const expiresIn = formatExpiresIn(currentExpiresAt);
  const expiresOn = formatExpiryDate(currentExpiresAt);

  const subject = `Parental consent for ${athleteName} expires ${expiresIn}`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(subject)}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your parental consent for <strong>${safeAthlete}</strong> on GradeUp NIL is set to expire on <strong>${escapeHtml(expiresOn)}</strong>. To keep approving new NIL deals past that date, you'll need to renew it.</p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">Your current approved scope</h2>
<p style="margin:0 0 16px;padding:12px 16px;background:#F4F4F5;border-left:3px solid #0070F3;border-radius:6px;">${safeScope}</p>

${primaryButton('Renew consent', renewUrl)}

<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser:<br><span style="word-break:break-all;">${renewUrl}</span></p>

<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What happens if it expires</h2>
<ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
  <li style="margin:0 0 6px;"><strong>Active deals remain binding.</strong> Anything already signed before the expiry stays in effect for its contract term.</li>
  <li style="margin:0 0 6px;"><strong>New deals cannot be approved until renewed.</strong> Brands reaching out to ${safeAthlete} will be held until a fresh consent is on file.</li>
  <li style="margin:0 0 6px;">You can renew with the same scope, or adjust categories, maximum deal amount, or duration before re-signing.</li>
</ul>

<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Questions? Reply to this email — a real human from our team will get back to you.</p>
`;

  const result = await sendEmail({
    to: parentEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: wrapPlain({
      title: 'Parental Consent Renewal Reminder',
      preview: `Your consent for ${athleteName} expires ${expiresIn}.`,
      bodyHtml,
    }),
  });

  logSend('consent_renewal_nudge', parentEmail, result, {
    athleteName,
    expiresAt: currentExpiresAt.toISOString(),
  });
  return result;
}
