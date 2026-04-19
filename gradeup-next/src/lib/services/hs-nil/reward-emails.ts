/**
 * HS-NIL — Referral Reward Emails (Phase 11)
 *
 * Separate module (not folded into referral-emails.ts) so the reward
 * write path can evolve independently. Shares the plain-wrapper tone
 * already established by referral-emails.ts.
 *
 * Two templates:
 *   1. sendTierEarned        → referrer hit a new tier
 *   2. sendPerkExpiringSoon  → referrer's perk is about to lapse
 *
 * Cron / scheduler for the expiry nudge is out of scope for this
 * phase; see TODO near sendPerkExpiringSoon. Template + send path
 * exist so the eventual cron is a one-liner.
 *
 * Fail-closed semantics: every send returns an EmailResult and
 * never throws. The reward-grant path treats email as best-effort.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';
import type { PerkName, RewardTierId } from '@/lib/hs-nil/referral-rewards';

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
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Referral Rewards</div>
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
    scope: 'hs-nil-reward-email',
    template,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-reward-email] ${template} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable perk names — kept in lockstep with the PerkName union.
// ─────────────────────────────────────────────────────────────────────────────

const PERK_LABELS: Record<PerkName, string> = {
  match_priority_boost_level_1: 'Match-ranking boost (Level 1, 90 days)',
  match_priority_boost_level_2: 'Match-ranking boost (Level 2, permanent)',
  match_priority_boost_level_3: 'Match-ranking boost (Level 3, permanent)',
  match_priority_boost_level_4: 'Match-ranking boost (Level 4, permanent)',
  trajectory_extended_ttl: '+60 days on every trajectory share',
  waitlist_invite_priority: 'Priority in activation batches',
  concierge_direct_line: 'Direct line to GradeUp NIL founder',
};

function perksBulletList(perks: PerkName[]): string {
  if (perks.length === 0) return '';
  const items = perks
    .map((p) => `<li style="margin:0 0 8px;">${escapeHtml(PERK_LABELS[p] ?? p)}</li>`)
    .join('');
  return `<ul style="margin:16px 0 24px 20px;padding:0;color:#18181B;">${items}</ul>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Tier earned
// ─────────────────────────────────────────────────────────────────────────────

export interface SendTierEarnedInput {
  recipientEmail: string;
  recipientFirstName?: string | null;
  tierId: RewardTierId;
  tierName: string;
  nextTierName?: string | null;
  nextTierMinConversions?: number | null;
  conversionCount: number;
  perksGranted: PerkName[];
  dashboardUrl?: string;
}

export async function sendTierEarned(
  input: SendTierEarnedInput
): Promise<EmailResult> {
  const {
    recipientEmail,
    recipientFirstName,
    tierName,
    nextTierName,
    nextTierMinConversions,
    conversionCount,
    perksGranted,
  } = input;
  const dashboardUrl =
    input.dashboardUrl ?? `${APP_URL}/hs/parent/rewards`;

  const greeting = recipientFirstName
    ? `Hi ${escapeHtml(recipientFirstName)},`
    : 'Hi,';
  const safeTier = escapeHtml(tierName);
  const nextLine =
    nextTierName && nextTierMinConversions
      ? `<p style="margin:0 0 16px;">Next up: <strong>${escapeHtml(nextTierName)}</strong> at ${nextTierMinConversions} verified signups. Keep sharing your invite — every parent who joins with your code counts.</p>`
      : `<p style="margin:0 0 16px;">You're at the top of the tier ladder. Thank you for being a pillar of this community.</p>`;

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You unlocked ${safeTier}</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your referral code has converted <strong>${conversionCount}</strong> families. That earns you the <strong>${safeTier}</strong> tier and the following perks on GradeUp NIL:</p>
${perksBulletList(perksGranted)}
${nextLine}
${primaryButton('See your rewards', dashboardUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">These perks are applied automatically to your account and your linked athletes. Nothing for you to do.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `You unlocked ${tierName}`,
    html: wrapPlain({
      title: 'Tier unlocked',
      preview: `You unlocked ${tierName} after ${conversionCount} verified referrals.`,
      bodyHtml,
    }),
  });

  logSend('tier_earned', recipientEmail, result, {
    tierId: input.tierId,
    conversionCount,
    perkCount: perksGranted.length,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Perk expiring soon
// ─────────────────────────────────────────────────────────────────────────────
// TODO: a reconciliation cron should scan referral_perk_activations
// nightly for rows where expires_at is between now() and now() + 7d
// and fire this template once per perk. The cron entry point itself
// is out of scope for Phase 11; the send path is ready.

export interface SendPerkExpiringSoonInput {
  recipientEmail: string;
  recipientFirstName?: string | null;
  perkName: PerkName;
  expiresAt: string;
  dashboardUrl?: string;
}

export async function sendPerkExpiringSoon(
  input: SendPerkExpiringSoonInput
): Promise<EmailResult> {
  const {
    recipientEmail,
    recipientFirstName,
    perkName,
    expiresAt,
  } = input;
  const dashboardUrl =
    input.dashboardUrl ?? `${APP_URL}/hs/parent/rewards`;

  const greeting = recipientFirstName
    ? `Hi ${escapeHtml(recipientFirstName)},`
    : 'Hi,';
  const label = escapeHtml(PERK_LABELS[perkName] ?? perkName);
  const safeExpiry = escapeHtml(
    new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  const bodyHtml = `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Your ${label} perk is winding down</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your <strong>${label}</strong> perk expires on <strong>${safeExpiry}</strong>. Reach the next tier before then and we'll auto-renew it at a higher level.</p>
${primaryButton('See your rewards', dashboardUrl)}
<p style="margin:24px 0 0;font-size:13px;color:#52525B;">Keep sharing your invite — each verified signup moves you closer to the next tier.</p>
`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `Your ${PERK_LABELS[perkName] ?? perkName} expires soon`,
    html: wrapPlain({
      title: 'Perk expiring soon',
      preview: `Your perk expires on ${safeExpiry}.`,
      bodyHtml,
    }),
  });

  logSend('perk_expiring_soon', recipientEmail, result, {
    perkName,
    expiresAt,
  });
  return result;
}
