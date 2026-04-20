/**
 * HS-NIL — Post-Waitlist Nurture Emails
 *
 * Role-specific drip templates fired by the hs-nurture-sequencer cron.
 * Copy lives here (not in SQL) so marketing can iterate without a
 * migration; the SQL seed only records structure (day_offset +
 * template_key + subject hint).
 *
 * Template resolution:
 *   Each step in a nurture_sequence_definitions.steps array names a
 *   `template_key`. The cron passes that key into `renderNurtureEmail`
 *   here, which switches to the matching template function. A missing
 *   key is a soft failure — the cron records `failed` with the reason
 *   and advances backoff.
 *
 * Conventions (inherited from waitlist-emails.ts):
 *   - Plain HTML, inline styles. Lighter shell for guardian / compliance
 *     facing mail.
 *   - Unsubscribe link is non-optional — every template embeds it via
 *     the shared `wrapPlain` helper.
 *   - State-specific copy uses `STATE_RULES`. For prohibited states the
 *     day-14 template is a hold-pattern note rather than a rules dump.
 */

import { sendEmail } from '@/lib/services/email';
import type { EmailResult } from '@/types/email';
import {
  STATE_RULES,
  type USPSStateCode,
} from '@/lib/hs-nil/state-rules';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT_ADDRESS || 'support@gradeupnil.com';

const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  IL: 'Illinois',
  NJ: 'New Jersey',
  NY: 'New York',
  TX: 'Texas',
};

function displayStateName(code: string | null | undefined): string {
  if (!code) return 'your state';
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

function buildUnsubscribeUrl(token: string): string {
  return `${APP_URL}/hs/unsubscribe/${token}`;
}

function wrapPlain(args: {
  title: string;
  preview: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}): string {
  const { title, preview, bodyHtml, unsubscribeUrl } = args;
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
            &middot; <a href="${unsubscribeUrl}" style="color:#52525B;">Unsubscribe</a>
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
// State-rules helpers
// ─────────────────────────────────────────────────────────────────────────────

interface StateCopyBlock {
  title: string;
  paragraph: string;
  status: 'permitted' | 'prohibited' | 'other';
}

function stateCopy(code: string | null | undefined): StateCopyBlock {
  const stateName = displayStateName(code);
  if (!code) {
    return {
      title: 'Your state rules',
      paragraph:
        'We will share state-specific rules as soon as we finalize your state. Reply to this email if you have questions in the meantime.',
      status: 'other',
    };
  }

  const rules = STATE_RULES[code as USPSStateCode];
  if (!rules) {
    return {
      title: `${stateName} rules`,
      paragraph: `We don't have the ${stateName} rules indexed yet. We'll email you when the statute lands in our engine.`,
      status: 'other',
    };
  }

  if (rules.status === 'prohibited') {
    return {
      title: `${stateName} currently prohibits HS NIL`,
      paragraph: `The ${stateName} state athletic association hasn't opened high school NIL yet. We're tracking it — we'll email you the moment the rule changes. Nothing for you to do right now.`,
      status: 'prohibited',
    };
  }

  const windowDays = rules.disclosureWindowHours
    ? Math.round(rules.disclosureWindowHours / 24)
    : null;
  const recipientText = (() => {
    switch (rules.disclosureRecipient) {
      case 'state_athletic_association':
        return 'the state athletic association';
      case 'school':
        return 'the athlete\'s school';
      case 'both':
        return 'both the school and the state athletic association';
      default:
        return 'the designated recipient';
    }
  })();

  const paragraphs: string[] = [];
  paragraphs.push(
    `<strong>${escapeHtml(stateName)}</strong> permits high-school NIL with parental consent for every minor athlete.`
  );
  if (windowDays !== null) {
    paragraphs.push(
      `Every deal must be disclosed to ${escapeHtml(recipientText)} within <strong>${windowDays} day${windowDays === 1 ? '' : 's'}</strong> of signing. We file the disclosure automatically.`
    );
  }
  if (rules.minimumAge) {
    paragraphs.push(
      `Minimum age for deal sign-off in ${escapeHtml(stateName)}: <strong>${rules.minimumAge}</strong>. Younger athletes can build their profile but cannot close until they meet the age floor.`
    );
  }
  if (rules.paymentDeferredUntilAge18) {
    paragraphs.push(
      `Compensation is held in a parent-custodial trust until the athlete turns 18 (state requirement). We handle the hold and release automatically.`
    );
  }
  paragraphs.push(
    `Banned in ${escapeHtml(stateName)}: ${rules.bannedCategories.map((c) => escapeHtml(c)).join(', ')}. We block those categories at the deal level.`
  );

  return {
    title: `${stateName} rules — what applies to you`,
    paragraph: paragraphs.map((p) => `<p style="margin:0 0 12px;">${p}</p>`).join(''),
    status: 'permitted',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public input surface
// ─────────────────────────────────────────────────────────────────────────────

export type NurtureRole = 'hs_athlete' | 'hs_parent' | 'coach' | 'brand';

export interface NurtureRecipient {
  email: string;
  firstName?: string | null;
  stateCode?: string | null;
}

export interface NurtureRenderInput {
  user: NurtureRecipient;
  unsubscribeToken: string;
  stepIndex: number;
  templateKey: string;
  subjectHint?: string | null;
}

function greeting(firstName?: string | null): string {
  return firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,';
}

// ─────────────────────────────────────────────────────────────────────────────
// Template fragments
// ─────────────────────────────────────────────────────────────────────────────

interface RenderedTemplate {
  subject: string;
  preview: string;
  bodyHtml: string;
}

function athleteDay1(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: "You're on the list — your scholar-athlete story is starting",
    preview: 'Here is what happens between now and your pilot going live.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You're on the list.</h1>
<p style="margin:0 0 16px;">${hi} You signed up for GradeUp HS — the first NIL platform that leads with your GPA, not just your highlight reel.</p>
<p style="margin:0 0 16px;">Here's what will hit your inbox over the next month:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;">Day 3: how NIL actually works for HS athletes (and what you can / can't sign).</li>
  <li style="margin:0 0 6px;">Day 7: a spotlight on a real HS athlete's first deal.</li>
  <li style="margin:0 0 6px;">Day 14: your state's rules, spelled out.</li>
  <li style="margin:0 0 6px;">Day 30: your pilot-state launch check-in.</li>
</ul>
<p style="margin:0 0 16px;">In the meantime, the best thing you can do is keep your grades up. GPA is a ranker input for brand match — not just a bio line.</p>
${primaryButton('Preview your future profile', `${APP_URL}/hs`)}
`,
  };
}

function athleteDay3(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'How NIL actually works for HS athletes',
    preview: 'Parental consent, state rules, and the four guardrails every deal goes through.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">NIL for HS athletes — in plain English.</h1>
<p style="margin:0 0 16px;">${hi} You don't need a legal degree to do NIL safely. You need four guardrails in place:</p>
<ol style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;"><strong>Parental consent</strong> — signed once, renewed each year. GradeUp routes every brand offer to your parent before you see it.</li>
  <li style="margin:0 0 6px;"><strong>Your state's rules</strong> — disclosure window, banned categories, age minimums. We apply them automatically.</li>
  <li style="margin:0 0 6px;"><strong>No school IP</strong> — you can't use your school's logo, uniform, or mascot in a post. Ever.</li>
  <li style="margin:0 0 6px;"><strong>No pay-for-play</strong> — compensation has to be for <em>you</em> (your likeness, your audience), not for athletic performance.</li>
</ol>
<p style="margin:0 0 16px;">Everything flows through that. Your parent approves. Your school gets notified (or the state association does) within the disclosure window. The money moves to your parent's custodial account until you're 18.</p>
<p style="margin:0 0 0;">Next email: a real athlete's first-deal story.</p>
`,
  };
}

function athleteDay7(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'Real athlete spotlight: first NIL deal signed',
    preview: 'A 3.8 GPA + 2k followers + a local brand = her first $500.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Her first deal: $500, one post, zero drama.</h1>
<p style="margin:0 0 16px;">${hi} Here's a composite based on our concierge pilot — names changed, facts representative.</p>
<p style="margin:0 0 16px;"><strong>Maya, 16, lacrosse, GPA 3.8, pilot state.</strong> ~2,100 Instagram followers. A regional athletic-wear brand wanted post + story + one IRL appearance at a back-to-school event.</p>
<p style="margin:0 0 16px;">Total timeline end-to-end: <strong>9 days</strong>. Consent signed (day 1), brief received (day 2), parent approved the offer (day 3), deal signed (day 4), post went live (day 7), disclosure filed with the state association automatically (day 7), payment to her parent's custodial account (day 9).</p>
<p style="margin:0 0 16px;">Maya didn't need a manager. She needed a platform that handled the compliance. That's what we built.</p>
<p style="margin:0 0 0;">Next email: the rules in your state.</p>
`,
  };
}

function athleteDay14(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const copy = stateCopy(input.user.stateCode);
  return {
    subject: copy.status === 'prohibited'
      ? `${displayStateName(input.user.stateCode)} hasn't changed — we'll let you know when it does`
      : `Your state's rules + what you can (and can't) sign`,
    preview: 'Disclosure window, banned categories, age floor — all in one note.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(copy.title)}</h1>
<p style="margin:0 0 16px;">${hi}</p>
${copy.paragraph}
<p style="margin:16px 0 0;">Keep this as a reference — we apply these automatically to every deal you're offered.</p>
`,
  };
}

function athleteDay30(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const stateName = displayStateName(input.user.stateCode);
  const copy = stateCopy(input.user.stateCode);
  const isLive = copy.status === 'permitted';
  return {
    subject: isLive
      ? `Pilot is live in ${stateName} — sign up now`
      : `${stateName} update — your spot is still saved`,
    preview: isLive
      ? `GradeUp HS just opened in ${stateName}.`
      : `We haven't forgotten you — here's where ${stateName} stands.`,
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(
      isLive
        ? `${stateName} is live.`
        : `${stateName} — still holding your spot.`
    )}</h1>
<p style="margin:0 0 16px;">${hi} ${
      isLive
        ? `GradeUp HS is now accepting signups in ${escapeHtml(stateName)}. Claim your profile, verify your GPA, and get in front of brands matching your sport and categories.`
        : `Your state hasn't flipped the switch yet. We're ready for the day it does — and you're at the front of the line when it happens.`
    }</p>
${isLive ? primaryButton('Activate my account', `${APP_URL}/hs`) : ''}
<p style="margin:0 0 0;">Questions? Just reply.</p>
`,
  };
}

function parentDay1(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: "Welcome to the GradeUp HS waitlist — here's what's next",
    preview: 'A month of plain-English updates so you know what you signed up for.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Welcome — and thanks for protecting your athlete.</h1>
<p style="margin:0 0 16px;">${hi} You joined the GradeUp HS waitlist. Most parents do this because NIL has arrived but the rules feel fuzzy. We've built GradeUp to take that fuzziness off your plate.</p>
<p style="margin:0 0 16px;">Here's the rhythm you'll see:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;">Day 3: what "verified parental consent" actually means (and why we insist on it).</li>
  <li style="margin:0 0 6px;">Day 7: how a pilot-state parent prepared for their athlete's first deal.</li>
  <li style="margin:0 0 6px;">Day 14: your state's rules in plain English.</li>
  <li style="margin:0 0 6px;">Day 30: your pilot-state activation check-in.</li>
</ul>
<p style="margin:0 0 0;">If anything above raises a question now, hit reply. A human answers.</p>
`,
  };
}

function parentDay3(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'What verified parental consent actually means',
    preview: 'Not a checkbox — a routed, revocable, timestamped signature chain.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">"Parental consent" on other platforms vs. ours.</h1>
<p style="margin:0 0 16px;">${hi} Most NIL platforms treat parental consent as a checkbox at signup. We don't.</p>
<p style="margin:0 0 16px;">On GradeUp HS:</p>
<ol style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;">Consent is signed by you (the verified guardian), timestamped, and tied to your linked athlete.</li>
  <li style="margin:0 0 6px;">Every brand offer routes to you <em>before</em> your athlete can accept. You see the brand, the category, the compensation, the content requirements.</li>
  <li style="margin:0 0 6px;">You can revoke consent in one click. New offers stop the instant you do.</li>
  <li style="margin:0 0 6px;">Consent renews annually. We email you ahead of the renewal window.</li>
  <li style="margin:0 0 6px;">Compensation flows to <em>your</em> custodial Stripe Connect account — not your athlete's debit card.</li>
</ol>
<p style="margin:0 0 0;">In short: you're in the loop on every deal, on the record, with the ability to say no.</p>
`,
  };
}

function parentDay7(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const stateName = displayStateName(input.user.stateCode);
  return {
    subject: `How ${stateName} parents prepare for NIL (case study excerpt)`,
    preview: 'Three decisions one pilot parent made before their athlete signed their first deal.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Three things one pilot parent decided up front.</h1>
<p style="margin:0 0 16px;">${hi} A composite from our concierge pilot — facts representative, details blended.</p>
<ol style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 12px;"><strong>Which categories are off-limits.</strong> This parent pre-filtered out energy drinks and anything the school's coaching staff had concerns about — before the first offer ever arrived.</li>
  <li style="margin:0 0 12px;"><strong>How to split the money.</strong> They sat down and agreed: 50% into the custodial savings account, 25% to the athlete's checking for allowed spend, 25% set aside for taxes. Decision made once, not per-deal.</li>
  <li style="margin:0 0 12px;"><strong>What to do about schoolwork.</strong> The rule they set: GPA drops below 3.3 for a grading period, NIL activity pauses until it's back up. That's a family rule, not our rule — but it's the single most common rule the pilot parents set.</li>
</ol>
<p style="margin:0 0 0;">These decisions are easier to make <em>before</em> money is on the table. Use this waiting period.</p>
`,
  };
}

function parentDay14(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const copy = stateCopy(input.user.stateCode);
  return {
    subject: copy.status === 'prohibited'
      ? `Rules haven't changed for ${displayStateName(input.user.stateCode)} — we'll let you know when they do`
      : `${displayStateName(input.user.stateCode)}'s rules — what applies to your athlete`,
    preview: copy.status === 'prohibited'
      ? `Still tracking your state's statute. Nothing for you to do right now.`
      : `Disclosure windows, banned categories, age floors. Plain English.`,
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(copy.title)}</h1>
<p style="margin:0 0 16px;">${hi}</p>
${copy.paragraph}
<p style="margin:16px 0 0;">Reply if a rule here surprises you — we'll walk through what it means for your family.</p>
`,
  };
}

function parentDay30(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const stateName = displayStateName(input.user.stateCode);
  const copy = stateCopy(input.user.stateCode);
  const isLive = copy.status === 'permitted';
  return {
    subject: isLive
      ? `${stateName} is opening soon — your spot is ready`
      : `${stateName} update — your spot is still reserved`,
    preview: isLive
      ? `Activate your parent account to approve your athlete's first deals.`
      : `Progress update on your state, no action needed yet.`,
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(
      isLive
        ? `Your pilot state is live.`
        : `Still holding your spot in ${stateName}.`
    )}</h1>
<p style="margin:0 0 16px;">${hi}</p>
<p style="margin:0 0 16px;">${
      isLive
        ? `${escapeHtml(stateName)} is open. When your athlete activates their account, you'll get a guardian invitation — that's when you sign consent and start approving offers.`
        : `We're still waiting on your state. No action needed on your side. When it opens, you'll be among the first invited.`
    }</p>
${isLive ? primaryButton('Set up my parent account', `${APP_URL}/hs`) : ''}
`,
  };
}

function coachDay1(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'Welcome — roster-level NIL visibility is coming',
    preview: 'We built coach tooling so you see the full picture, not just gossip.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Coach visibility, without the surveillance.</h1>
<p style="margin:0 0 16px;">${hi} You joined the waitlist because NIL is happening to your athletes whether you see it or not. GradeUp was built so you see it.</p>
<p style="margin:0 0 16px;">What the coach seat gives you when your state opens:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;">Roster-level dashboard — which of your athletes are active, which have closed deals, which are compliant.</li>
  <li style="margin:0 0 6px;">Disclosure tracking — every deal in your program auto-files with the state association within the window.</li>
  <li style="margin:0 0 6px;">Category and brand flags — if a deal category conflicts with a school sponsor, you see it surfaced immediately.</li>
</ul>
<p style="margin:0 0 0;">Next up: how we keep your program compliant.</p>
`,
  };
}

function coachDay3(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'How we keep your program NCAA- and state-compliant',
    preview: 'Four automated guardrails that stop bad deals before they happen.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Four guardrails protecting your program.</h1>
<p style="margin:0 0 16px;">${hi}</p>
<ol style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;"><strong>School IP lockdown.</strong> Every deal is auto-scanned for school logos, uniforms, mascots. Offers using any of those get blocked at creation.</li>
  <li style="margin:0 0 6px;"><strong>Pay-for-play detection.</strong> Deals contingent on stats or game outcomes are rejected before they land in an athlete's inbox.</li>
  <li style="margin:0 0 6px;"><strong>State-timed disclosures.</strong> Your state's disclosure window is built into the deal lifecycle. You don't chase; the system files.</li>
  <li style="margin:0 0 6px;"><strong>Booster restrictions.</strong> Deals with donor-adjacent entities get flagged for manual review.</li>
</ol>
<p style="margin:0 0 0;">NCAA-bound athletes keep their eligibility. You keep your job.</p>
`,
  };
}

function coachDay7(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'How one AD used GradeUp to monitor team NIL activity',
    preview: 'One athletic director, 47 athletes, zero eligibility violations in 9 months.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">One AD's playbook — composite from our pilot.</h1>
<p style="margin:0 0 16px;">${hi} A composite from the pilot programs we've supported.</p>
<p style="margin:0 0 16px;"><strong>Setting:</strong> 47-athlete football program, pilot state, 9 months of active NIL.</p>
<p style="margin:0 0 16px;"><strong>What the AD did:</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;">Onboarded the coaching staff as coach seats — not just himself.</li>
  <li style="margin:0 0 6px;">Set roster-level alerts on "category conflict" and "booster-adjacent".</li>
  <li style="margin:0 0 6px;">Reviewed the weekly roster summary for 10 minutes each Monday.</li>
</ul>
<p style="margin:0 0 16px;"><strong>Result:</strong> 23 deals signed. Zero disclosure misses. Zero categories that got his AD in a meeting with the school board.</p>
<p style="margin:0 0 0;">Next: your state's rules.</p>
`,
  };
}

function coachDay14(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const copy = stateCopy(input.user.stateCode);
  return {
    subject: copy.status === 'prohibited'
      ? `${displayStateName(input.user.stateCode)} HS NIL is still prohibited`
      : `Your state's disclosure rules — what coaches need to know`,
    preview: "We file disclosures automatically so you don't chase paperwork.",
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(copy.title)}</h1>
<p style="margin:0 0 16px;">${hi}</p>
${copy.paragraph}
<p style="margin:16px 0 0;">You'll get a weekly digest of every deal in your program — filed, in-flight, and flagged.</p>
`,
  };
}

function coachDay30(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const stateName = displayStateName(input.user.stateCode);
  const copy = stateCopy(input.user.stateCode);
  const isLive = copy.status === 'permitted';
  return {
    subject: isLive
      ? `Pilot is opening in ${stateName} — activate your coach seat`
      : `${stateName} update — we'll email when it opens`,
    preview: isLive
      ? `Get the roster dashboard online before your first deal lands.`
      : `Still tracking your state. No action needed.`,
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(
      isLive
        ? `${stateName} is live.`
        : `${stateName} — still in the queue.`
    )}</h1>
<p style="margin:0 0 16px;">${hi}</p>
<p style="margin:0 0 16px;">${
      isLive
        ? `Your state pilot just opened. Claim your coach seat so your roster dashboard is live before your first athlete signs.`
        : `Your state hasn't opened yet. We're tracking it. When it flips, you're on the priority invite list.`
    }</p>
${isLive ? primaryButton('Activate my coach seat', `${APP_URL}/hs`) : ''}
`,
  };
}

function brandDay1(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: "Welcome — here's how HS NIL inventory works",
    preview: 'Cleared, parentally-consented, state-compliant — and GPA-sorted.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">HS NIL inventory, demystified.</h1>
<p style="margin:0 0 16px;">${hi} You asked for early access to HS scholar-athletes. Here's what the inventory looks like once your state opens:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 6px;"><strong>GPA-sorted</strong>, not just follower-sorted. The ranker weighs academics heavily — scholar-athletes outperform raw-reach picks in category resonance.</li>
  <li style="margin:0 0 6px;"><strong>Parentally consented</strong>. Every athlete on the platform has a verified guardian consent chain. Your brand is never the blocker.</li>
  <li style="margin:0 0 6px;"><strong>State-compliant</strong>. Disclosure windows, banned categories, school-IP enforcement — automatic.</li>
  <li style="margin:0 0 6px;"><strong>Campaign-ready</strong>. Standardized deal terms, escrow, deliverable submission, post-campaign reporting.</li>
</ul>
<p style="margin:0 0 0;">Over the next four weeks: the ROI data, a per-vertical case study, your state's rules, and the FMV tool for pricing.</p>
`,
  };
}

function brandDay3(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'Why scholar-athlete campaigns outperform general HS influencer buys',
    preview: 'Three metrics where NIL scholar-athletes beat general HS influencer cohorts.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">The ROI case for scholar-athletes.</h1>
<p style="margin:0 0 16px;">${hi} Three reasons brands in our concierge pilot are over-indexing on GradeUp HS athletes:</p>
<ol style="margin:0 0 16px;padding-left:20px;">
  <li style="margin:0 0 12px;"><strong>Brand-safety multiplier.</strong> Scholar-athletes carry a pre-vetted trust signal (verified GPA, parental oversight, school-aware). Brand-safety incidents cost way more to clean up than the premium you pay for a vetted creator.</li>
  <li style="margin:0 0 12px;"><strong>Audience composition.</strong> HS scholar-athletes over-index on the 13–24 demo brands actually want to reach — and their parent / community audiences are a free secondary exposure.</li>
  <li style="margin:0 0 12px;"><strong>Earned media halo.</strong> A deal with a scholar-athlete lands as a local story in a way a general-influencer deal doesn't. Our pilot brands have seen local press on ~20% of their signed deals.</li>
</ol>
<p style="margin:0 0 0;">Next email: a vertical-specific spotlight.</p>
`,
  };
}

function brandDay7(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  return {
    subject: 'Vertical spotlight: how this category wins with HS athletes',
    preview: 'Regional athletic-wear brand, 6 deals, $14k total spend, 3.1M impressions.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Vertical spotlight: regional athletic wear.</h1>
<p style="margin:0 0 16px;">${hi} A composite based on our concierge pilot:</p>
<p style="margin:0 0 16px;"><strong>Brand:</strong> Regional athletic-wear brand, DTC-heavy, ~$25M ARR.</p>
<p style="margin:0 0 16px;"><strong>Campaign:</strong> Back-to-school product push, 6 scholar-athletes across 3 states, mix of football / basketball / track.</p>
<p style="margin:0 0 16px;"><strong>Spend:</strong> $14,000 total ($2,333 per athlete average).</p>
<p style="margin:0 0 16px;"><strong>Result:</strong> 3.1M combined impressions, 47k clicks to product pages, 1.4% attributable conversion lift over the previous year's general HS influencer campaign.</p>
<p style="margin:0 0 0;">Your category is different — but the structure scales. Reply if you want us to model yours.</p>
`,
  };
}

function brandDay14(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const copy = stateCopy(input.user.stateCode);
  return {
    subject: copy.status === 'prohibited'
      ? `${displayStateName(input.user.stateCode)} hasn't opened yet — here's the FMV tool you'll use when it does`
      : `${displayStateName(input.user.stateCode)}'s rules + the FMV tool you'll use to price deals`,
    preview: 'Disclosure windows, banned categories, and our fair-market-value calculator.',
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(copy.title)}</h1>
<p style="margin:0 0 16px;">${hi}</p>
${copy.paragraph}
<p style="margin:16px 0 16px;">When you're ready to price, our FMV tool returns a state-aware compensation range for any athlete profile you're evaluating. It's the same engine our pilot brands use to defend budget internally.</p>
${primaryButton('Preview the FMV tool', `${APP_URL}/hs`)}
`,
  };
}

function brandDay30(input: NurtureRenderInput): RenderedTemplate {
  const hi = greeting(input.user.firstName);
  const stateName = displayStateName(input.user.stateCode);
  const copy = stateCopy(input.user.stateCode);
  const isLive = copy.status === 'permitted';
  return {
    subject: isLive
      ? `${stateName} is live — meet the athletes`
      : `${stateName} pilot update — still holding your early access`,
    preview: isLive
      ? `Your brand account is ready. Match with cleared scholar-athletes now.`
      : `No state change yet. We'll alert you the moment it flips.`,
    bodyHtml: `
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">${escapeHtml(
      isLive
        ? `${stateName} inventory is open.`
        : `${stateName} — still on the shortlist.`
    )}</h1>
<p style="margin:0 0 16px;">${hi}</p>
<p style="margin:0 0 16px;">${
      isLive
        ? `Your state just opened. Activate your brand account, pick your deal categories, and our matcher will put cleared scholar-athletes in front of you within the hour.`
        : `Your state hasn't opened yet. No action needed on your side. When it does, your brand is on the early-access invite list ahead of general availability.`
    }</p>
${isLive ? primaryButton('Activate my brand account', `${APP_URL}/hs`) : ''}
`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

type TemplateFn = (input: NurtureRenderInput) => RenderedTemplate;

const TEMPLATE_MAP: Record<string, TemplateFn> = {
  athlete_day1_welcome: athleteDay1,
  athlete_day3_how_nil_works: athleteDay3,
  athlete_day7_spotlight: athleteDay7,
  athlete_day14_state_rules: athleteDay14,
  athlete_day30_pilot_live: athleteDay30,
  parent_day1_welcome: parentDay1,
  parent_day3_consent: parentDay3,
  parent_day7_case_study: parentDay7,
  parent_day14_state_update: parentDay14,
  parent_day30_activation: parentDay30,
  coach_day1_welcome: coachDay1,
  coach_day3_compliance: coachDay3,
  coach_day7_case_study: coachDay7,
  coach_day14_state_rules: coachDay14,
  coach_day30_activation: coachDay30,
  brand_day1_welcome: brandDay1,
  brand_day3_roi: brandDay3,
  brand_day7_vertical: brandDay7,
  brand_day14_fmv: brandDay14,
  brand_day30_activation: brandDay30,
};

/** True if the cron knows how to render this template key. */
export function hasNurtureTemplate(templateKey: string): boolean {
  return templateKey in TEMPLATE_MAP;
}

/** Resolve the default sequence id for a waitlist role. */
export function defaultSequenceIdForRole(
  role: 'athlete' | 'parent' | 'coach' | 'brand'
): string {
  switch (role) {
    case 'athlete':
      return 'athlete_intro_v1';
    case 'parent':
      return 'parent_awareness_v1';
    case 'coach':
      return 'coach_intro_v1';
    case 'brand':
      return 'brand_intro_v1';
  }
}

function logSend(
  templateKey: string,
  recipient: string,
  result: EmailResult,
  context: Record<string, unknown>
): void {
  const payload = {
    scope: 'hs-nil-email',
    template: `nurture.${templateKey}`,
    recipient,
    success: result.success,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    ...context,
  };
  // eslint-disable-next-line no-console
  (result.success ? console.log : console.warn)(
    `[hs-nil-email] nurture.${templateKey} ${result.success ? 'sent' : 'failed'}`,
    payload
  );
}

/**
 * Render + send a nurture email for a given step. Caller is the cron
 * — it handles backoff, enrollment advancement, and event logging.
 * This function's job is: deliver the mail, return an EmailResult.
 */
export async function sendNurtureEmail(
  input: NurtureRenderInput
): Promise<EmailResult> {
  const fn = TEMPLATE_MAP[input.templateKey];
  if (!fn) {
    return {
      success: false,
      error: `Unknown nurture template_key: ${input.templateKey}`,
    };
  }

  const rendered = fn(input);
  const unsubscribeUrl = buildUnsubscribeUrl(input.unsubscribeToken);
  const subject = input.subjectHint?.trim()
    ? input.subjectHint.trim()
    : rendered.subject;

  const html = wrapPlain({
    title: subject,
    preview: rendered.preview,
    bodyHtml: rendered.bodyHtml,
    unsubscribeUrl,
  });

  const result = await sendEmail({
    to: input.user.email,
    replyTo: SUPPORT_EMAIL,
    subject,
    html,
  });

  logSend(input.templateKey, input.user.email, result, {
    stepIndex: input.stepIndex,
    stateCode: input.user.stateCode ?? null,
  });
  return result;
}
