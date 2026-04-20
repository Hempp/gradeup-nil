/**
 * HS-NIL — OCR Email Service
 * ----------------------------------------------------------------------------
 * Email sends specific to the real-OCR flow. Lives in its own module so the
 * existing `emails.ts` (reviewed + approved in earlier phases) stays
 * untouched.
 *
 * Two templates:
 *   1. sendTranscriptAutoApproved — athlete-facing. Goes out when OCR
 *      confidence cleared 0.90 + the GPA matched claimed. Tone: celebratory,
 *      short — the whole point is they never waited for a human.
 *
 *   2. sendOcrLowConfidenceNotification — ops-facing digest-style fire from
 *      `confidenceGatedAutoApproval` when a submission fell into manual
 *      review because confidence was too low OR the extracted GPA diverged
 *      from the claim. Helps ops triage the queue by surfacing the worst
 *      offenders first.
 *
 * Fail-closed: underlying `sendEmail` returns { success:false } cleanly when
 * RESEND_API_KEY is missing; we surface the result and never throw from the
 * caller's perspective.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

const OPS_EMAIL =
  process.env.EMAIL_OPS_ADDRESS ||
  process.env.EMAIL_SUPPORT_ADDRESS ||
  'support@gradeupnil.com';

// ---------------------------------------------------------------------------
// Styling helpers (plain HTML, inline styles — mirrors emails.ts shell)
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
    scope: 'hs-nil-ocr-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-ocr-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ---------------------------------------------------------------------------
// 1. Transcript auto-approved (athlete-facing)
// ---------------------------------------------------------------------------

export interface TranscriptAutoApprovedInput {
  athleteEmail: string;
  athleteName?: string;
  approvedGpa: number;
  provider: string;
  confidence: number;
  dashboardUrl?: string;
}

export async function sendTranscriptAutoApproved(
  input: TranscriptAutoApprovedInput
): Promise<EmailResult> {
  const {
    athleteEmail,
    athleteName,
    approvedGpa,
    provider,
    confidence,
  } = input;
  const dashboardUrl = input.dashboardUrl ?? `${APP_URL}/hs/dashboard`;
  const greeting = athleteName ? `Hi ${escapeHtml(athleteName)},` : 'Hi,';
  const gpaStr = approvedGpa.toFixed(2);

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your GPA was verified automatically</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">We checked your transcript with automated OCR and it matched what you entered. Your profile now shows a verified GPA of <strong>${escapeHtml(gpaStr)}</strong> with the <strong>Tier B — Verified</strong> badge live for brands.</p>
${primaryButton('Open your dashboard', dashboardUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Verified by ${escapeHtml(provider)} (confidence ${confidence.toFixed(2)}). If anything looks off, reply to this email and a human from our ops team will re-check within one business day.</p>
`;

  const result = await sendEmail({
    to: athleteEmail,
    replyTo: SUPPORT_EMAIL,
    subject: 'Your GPA was verified automatically on GradeUp NIL',
    html: wrapPlain({
      title: 'GPA Auto-Verified',
      preview: `Your GPA was auto-verified: ${gpaStr}.`,
      bodyHtml,
    }),
  });

  logSend('transcript_auto_approved', athleteEmail, result, {
    approvedGpa,
    provider,
    confidence,
  });
  return result;
}

// ---------------------------------------------------------------------------
// 2. Low-confidence OCR notification (ops-facing)
// ---------------------------------------------------------------------------

export interface OcrLowConfidenceNotificationInput {
  submissionId: string;
  provider: string;
  confidence: number;
  extractedGpa: number | null;
  claimedGpa: number;
  reason: 'low_confidence' | 'gpa_mismatch';
  /** Optional override — defaults to EMAIL_OPS_ADDRESS. */
  opsEmail?: string;
}

export async function sendOcrLowConfidenceNotification(
  input: OcrLowConfidenceNotificationInput
): Promise<EmailResult> {
  const {
    submissionId,
    provider,
    confidence,
    extractedGpa,
    claimedGpa,
    reason,
  } = input;
  const to = input.opsEmail || OPS_EMAIL;
  const queueUrl = `${APP_URL}/hs/admin/transcripts`;
  const extractedStr =
    extractedGpa === null ? 'not extracted' : extractedGpa.toFixed(2);
  const reasonLabel =
    reason === 'low_confidence'
      ? `Low OCR confidence (${confidence.toFixed(2)})`
      : 'Extracted GPA diverged from athlete claim';

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">Transcript needs human review</h1>
<p style="margin:0 0 16px;">A transcript submission fell into manual review after the OCR pass. Reason: <strong>${escapeHtml(reasonLabel)}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">
  <tr><td style="padding:4px 8px;color:#52525B;">Submission</td><td style="padding:4px 8px;font-family:ui-monospace,monospace;">${escapeHtml(submissionId)}</td></tr>
  <tr><td style="padding:4px 8px;color:#52525B;">Provider</td><td style="padding:4px 8px;">${escapeHtml(provider)}</td></tr>
  <tr><td style="padding:4px 8px;color:#52525B;">Confidence</td><td style="padding:4px 8px;">${confidence.toFixed(2)}</td></tr>
  <tr><td style="padding:4px 8px;color:#52525B;">Claimed GPA</td><td style="padding:4px 8px;">${claimedGpa.toFixed(2)}</td></tr>
  <tr><td style="padding:4px 8px;color:#52525B;">Extracted GPA (norm 4.0)</td><td style="padding:4px 8px;">${escapeHtml(extractedStr)}</td></tr>
</table>
${primaryButton('Open ops queue', queueUrl)}
<p style="margin:0 0 16px;font-size:13px;color:#52525B;">Auto-approval requires confidence ≥ 0.90 AND extracted GPA within ±0.05 of claim.</p>
`;

  const result = await sendEmail({
    to,
    replyTo: SUPPORT_EMAIL,
    subject: `[HS-NIL] Transcript OCR needs review — ${reason}`,
    html: wrapPlain({
      title: 'OCR needs review',
      preview: `Submission ${submissionId} needs manual review.`,
      bodyHtml,
    }),
  });

  logSend('ocr_low_confidence', to, result, {
    submissionId,
    provider,
    confidence,
    reason,
  });
  return result;
}
