/**
 * HS-NIL — Ops Brief Email
 * ----------------------------------------------------------------------------
 * Renders the daily ops digest as a scannable HTML email. Inline styles
 * only (no <style> blocks, no external CSS — Gmail and Outlook strip them).
 *
 * Tone: utility. The founder is reading this over coffee; they need
 * to know "what needs me today" in 60 seconds. Everything is a clickable
 * deep link back to the right admin page.
 *
 * Layout:
 *   - Tally row at the top: total count + urgent / warn / clear bucketing.
 *   - Table of contents with jump links per domain.
 *   - One section per domain. Color-coded left border by urgency.
 *   - Footer: "Reply with issues — this goes straight to the ops inbox."
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';
import type {
  DailyOpsBrief,
  OpsBriefDomainStatus,
  OpsBriefUrgency,
} from '@/lib/hs-nil/ops-brief';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT_ADDRESS || 'ops@gradeupnil.com';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urgencyBorderColor(u: OpsBriefUrgency): string {
  switch (u) {
    case 'urgent':
      return '#DA2B57'; // red
    case 'warn':
      return '#D97706'; // amber-600
    case 'clear':
    default:
      return '#10B981'; // emerald-500
  }
}

function urgencyBadge(u: OpsBriefUrgency): string {
  const color = urgencyBorderColor(u);
  const label =
    u === 'urgent' ? 'URGENT' : u === 'warn' ? 'WATCH' : 'CLEAR';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${color};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.5px;">${label}</span>`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DomainRender {
  slug: string;
  title: string;
  domain: OpsBriefDomainStatus;
}

function renderDomainBlock(section: DomainRender): string {
  const { slug, title, domain } = section;
  const href = `${APP_URL}${domain.deepLink}`;
  const borderColor = urgencyBorderColor(domain.urgency);
  const badge = urgencyBadge(domain.urgency);
  const summary = domain.unavailable
    ? `<em style="color:#991B1B;">Data unavailable — ${escapeHtml(
        (domain.error ?? 'source query failed').slice(0, 200)
      )}</em>`
    : escapeHtml(domain.summary);

  const previewList =
    !domain.unavailable && domain.preview.length > 0
      ? `<ul style="margin:8px 0 0;padding:0 0 0 18px;color:#27272A;font-size:13px;line-height:1.5;">
          ${domain.preview
            .slice(0, 5)
            .map(
              (p) =>
                `<li style="margin:0 0 4px;">${escapeHtml(p.summary)}</li>`
            )
            .join('')}
        </ul>`
      : '';

  return `
<table role="presentation" id="${slug}" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
  <tr>
    <td style="border-left:4px solid ${borderColor};padding:12px 16px;background:#FAFAFA;border-radius:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:15px;font-weight:700;color:#111;">${escapeHtml(title)} ${badge}</td>
        <td align="right" style="font-size:22px;font-weight:700;color:#111;">${domain.count.toLocaleString()}</td>
      </tr></table>
      <p style="margin:6px 0 0;font-size:13px;color:#3F3F46;line-height:1.5;">${summary}</p>
      ${previewList}
      <p style="margin:10px 0 0;font-size:12px;">
        <a href="${href}" style="color:#0070F3;font-weight:600;text-decoration:none;">Open ${escapeHtml(title.toLowerCase())} →</a>
      </p>
    </td>
  </tr>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────────────────────────────────────

function renderBriefHtml(brief: DailyOpsBrief, recipientName: string | null): string {
  const greetingName = recipientName ?? 'team';
  const sections: DomainRender[] = [
    { slug: 'disclosures', title: 'Compliance disclosures', domain: brief.domains.disclosures },
    { slug: 'transcripts', title: 'Transcript reviews', domain: brief.domains.transcripts },
    { slug: 'parentLinks', title: 'Parent-athlete links', domain: brief.domains.parentLinks },
    { slug: 'disputes', title: 'Dispute SLA', domain: brief.domains.disputes },
    { slug: 'deferredPayouts', title: 'Deferred payouts releasing today', domain: brief.domains.deferredPayouts },
    { slug: 'expiringConsents', title: 'Expiring parental consents', domain: brief.domains.expiringConsents },
    { slug: 'regulatoryChanges', title: 'Regulatory changes', domain: brief.domains.regulatoryChanges },
    { slug: 'payoutFailures', title: 'Payout failures', domain: brief.domains.payoutFailures },
    { slug: 'moderationQueue', title: 'Moderation queue', domain: brief.domains.moderationQueue },
    { slug: 'waitlistInflow', title: 'Waitlist inflow (last 24h)', domain: brief.domains.waitlistInflow },
    { slug: 'dealActivity', title: 'Deal activity', domain: brief.domains.dealActivity },
    { slug: 'brandOnboarding', title: 'Brand onboarding (last 7 days)', domain: brief.domains.brandOnboarding },
  ];

  const toc = sections
    .map(
      (s) =>
        `<li style="margin:0 0 4px;">
          <a href="#${s.slug}" style="color:#0070F3;text-decoration:none;">${escapeHtml(s.title)}</a>
          <span style="color:#71717A;">· ${s.domain.count.toLocaleString()}${
            s.domain.unavailable ? ' · unavailable' : ''
          }</span>
        </li>`
    )
    .join('');

  const tallyBg =
    brief.tally.urgent > 0
      ? '#FEE2E2'
      : brief.tally.warn > 0
        ? '#FEF3C7'
        : '#DCFCE7';
  const tallyFg =
    brief.tally.urgent > 0
      ? '#991B1B'
      : brief.tally.warn > 0
        ? '#92400E'
        : '#065F46';

  const subjectSummary =
    brief.tally.urgent > 0
      ? `${brief.tally.urgent} URGENT`
      : brief.tally.warn > 0
        ? `${brief.tally.warn} to watch`
        : 'all clear';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>GradeUp HS — Daily Ops Brief</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
<span style="display:none;visibility:hidden;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">Daily HS-NIL ops brief — ${escapeHtml(subjectSummary)}.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E4E7;">
        <tr>
          <td style="padding:20px 28px;border-bottom:1px solid #E4E4E7;">
            <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;color:#111;">GRADEUP HS · OPS BRIEF</div>
            <div style="font-size:12px;color:#52525B;margin-top:2px;">${escapeHtml(fmtDate(brief.generatedAt))}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px;color:#18181B;">
            <p style="margin:0 0 12px;font-size:15px;">Morning ${escapeHtml(greetingName)} — here's what needs you today.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-collapse:collapse;">
              <tr>
                <td style="padding:14px 18px;background:${tallyBg};border-radius:10px;color:${tallyFg};">
                  <div style="font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">Today's tally</div>
                  <div style="margin-top:4px;font-size:20px;font-weight:700;">
                    ${brief.tally.total.toLocaleString()} open items · ${brief.tally.urgent} urgent · ${brief.tally.warn} to watch
                  </div>
                </td>
              </tr>
            </table>

            <h2 style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:1px;">Jump to</h2>
            <ul style="margin:0 0 16px;padding:0 0 0 18px;font-size:13px;color:#18181B;line-height:1.6;">
              ${toc}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px;">
            ${sections.map(renderDomainBlock).join('\n')}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            Reply to this email with issues — it goes straight to the ops inbox at
            <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0070F3;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            To stop receiving this brief, toggle the opt-out on the
            <a href="${APP_URL}/hs/admin/ops-brief" style="color:#0070F3;">ops-brief admin page</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public sender
// ─────────────────────────────────────────────────────────────────────────────

export interface SendDailyOpsBriefInput {
  recipientEmail: string;
  recipientName?: string | null;
  brief: DailyOpsBrief;
  sentAt?: Date;
}

export async function sendDailyOpsBrief(
  input: SendDailyOpsBriefInput
): Promise<EmailResult> {
  const { recipientEmail, recipientName, brief } = input;

  const subjectTag =
    brief.tally.urgent > 0
      ? `[URGENT ${brief.tally.urgent}]`
      : brief.tally.warn > 0
        ? `[WATCH ${brief.tally.warn}]`
        : '[clear]';

  const subject = `${subjectTag} GradeUp HS ops brief · ${brief.tally.total} open items`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject,
    html: renderBriefHtml(brief, recipientName ?? null),
  });

  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-ops-brief] ${result.success ? 'sent' : 'failed'}`,
    {
      recipient: recipientEmail,
      success: result.success,
      messageId: result.data?.id ?? null,
      error: result.error ?? null,
      tally: brief.tally,
    }
  );

  return result;
}

/**
 * Exposed for the /hs/admin/ops-brief page so the live view uses the
 * exact same HTML the email would render — no template drift.
 */
export function renderDailyOpsBriefHtml(
  brief: DailyOpsBrief,
  recipientName: string | null
): string {
  return renderBriefHtml(brief, recipientName);
}
