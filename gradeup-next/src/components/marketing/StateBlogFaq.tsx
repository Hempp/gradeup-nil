/**
 * StateBlogFaq — assembles a state-tailored FAQ list and renders it
 * via the existing SolutionFaq component (which also injects
 * schema.org/FAQPage JSON-LD).
 *
 * Content is chosen based on the state's permission status + specific
 * rule fields (age minimum, escrow, agent registration, etc.) so every
 * page is tailored rather than template-identical.
 */
import { SolutionFaq } from './SolutionFaq';
import type { FaqItem } from './SolutionFaq';
import type { StateNILRules } from '@/lib/hs-nil/state-rules';
import {
  formatDisclosureWindow,
  formatRecipient,
  countPermittedNeighbors,
} from '@/lib/hs-nil/state-blog-content';

export interface StateBlogFaqProps {
  stateName: string;
  stateCode: StateNILRules['state'];
  rules: StateNILRules;
  governingBody: string;
  pageUrl: string;
}

export function StateBlogFaq({
  stateName,
  stateCode,
  rules,
  governingBody,
  pageUrl,
}: StateBlogFaqProps) {
  const items = buildFaqs({ stateName, stateCode, rules, governingBody });

  return (
    <SolutionFaq
      heading={`Common questions about HS NIL in ${stateName}`}
      subheading={`What parents, athletes, and brands ask most. Answers reflect ${governingBody}'s current policy as of ${rules.lastReviewed}.`}
      items={items}
      pageUrl={pageUrl}
      scriptId={`state-blog-faq-${stateCode.toLowerCase()}-jsonld`}
    />
  );
}

function buildFaqs({
  stateName,
  stateCode,
  rules,
  governingBody,
}: {
  stateName: string;
  stateCode: StateNILRules['state'];
  rules: StateNILRules;
  governingBody: string;
}): FaqItem[] {
  if (rules.status === 'prohibited') {
    const permittedNeighbors = countPermittedNeighbors(stateCode);
    return [
      {
        question: `Can my high-school athlete sign an NIL deal in ${stateName}?`,
        answer: `No. As of ${rules.lastReviewed}, ${governingBody} does not permit high-school athletes to sign NIL deals while retaining their athletic eligibility. Signing a deal risks their eligibility under current ${governingBody} rules.`,
      },
      {
        question: `When will ${stateName} allow HS NIL?`,
        answer: `We don't know. Rule changes generally come out of ${governingBody}'s executive committee or the state legislature. Other state associations have moved over 6–18 months once serious proposals surfaced. Join GradeUp's interest list and we'll email you the day ${stateName}'s rules change.`,
      },
      {
        question: `What about neighboring states?`,
        answer: `${permittedNeighbors > 0 ? `${permittedNeighbors} of ${stateName}'s neighboring states currently permit HS NIL.` : `None of ${stateName}'s immediate neighbors currently permit HS NIL either.`} That pressure tends to accelerate rule changes. Regardless, an athlete's eligibility is set by the state they play in, not the state they visit.`,
      },
      {
        question: `Will my athlete lose college NIL eligibility?`,
        answer: `No. College NIL (NCAA, NAIA, NJCAA) is governed separately. Once your athlete enrolls in a college that permits NIL, they become eligible under that institution's and state's rules, regardless of what was allowed in high school.`,
      },
      {
        question: `Is there anything we can do now?`,
        answer: `Yes — build the audience. Nothing in ${stateName}'s HS-NIL prohibition prevents your athlete from growing their following, creating content, or building a personal brand. When rules change (or when they enroll in college), the audience converts directly into deal leverage.`,
      },
    ];
  }

  if (rules.status === 'transitioning') {
    return [
      {
        question: `What's the current status of HS NIL in ${stateName}?`,
        answer: `${governingBody} has not published a final, GradeUp-verified policy yet. We're monitoring their announcements. As of ${rules.lastReviewed}, we treat ${stateName} as "transitioning" — which means we don't onboard athletes for active deal flow until rules are confirmed, but we do accept interest-list signups.`,
      },
      {
        question: `Where should I look for official updates?`,
        answer: `Directly at ${governingBody}'s website. Their rules archive is the authoritative source — we mirror what they publish. We'll also email you the moment the state moves from "transitioning" to "permitted".`,
      },
      {
        question: `Can I sign an NIL deal right now?`,
        answer: `We don't recommend it until ${governingBody}'s rules are final. An improperly-disclosed or non-compliant deal could risk athletic eligibility. GradeUp is built to prevent those mistakes — which is why we wait for finalized rules before flipping a state into the active pilot.`,
      },
      {
        question: `Does GradeUp work in transitioning states?`,
        answer: `Our waitlist does. As soon as ${stateName}'s rules finalize, we notify your account, enable the live deal flow, and onboard your athlete without needing them to re-register.`,
      },
    ];
  }

  // "permitted" (and "limited" — same copy shape, content driven by fields)
  const items: FaqItem[] = [
    {
      question: `Is HS NIL legal in ${stateName}?`,
      answer: `Yes. ${governingBody} permits high-school athletes to earn NIL compensation under the rules summarized on this page. School IP (logos, mascots, uniforms) is never permitted, and pay-for-play is banned — everywhere, without exception.`,
    },
    {
      question: `Does my athlete need parental consent?`,
      answer: rules.requiresParentalConsent
        ? `Yes. Every deal for a minor athlete in ${stateName} requires a parent or legal guardian's written consent. GradeUp collects this consent as part of the deal flow — no deal goes live without it.`
        : `${stateName} does not require formal parental consent by statute, but GradeUp still collects it for every minor athlete. It's good hygiene, and it protects your athlete if rules change.`,
    },
    {
      question: `What is the disclosure window in ${stateName}?`,
      answer:
        rules.disclosureWindowHours !== null
          ? `You have ${formatDisclosureWindow(rules.disclosureWindowHours)} after signing to report the deal to the ${formatRecipient(rules.disclosureRecipient).toLowerCase()}. GradeUp files this disclosure automatically — you don't need to remember.`
          : `${stateName} does not have a specific disclosure window encoded in our rules engine. GradeUp still captures every deal's metadata in case ${governingBody} requests records.`,
    },
  ];

  if (rules.minimumAge !== null) {
    items.push({
      question: `Is there a minimum age for NIL in ${stateName}?`,
      answer: `Yes. ${stateName} requires athletes to be at least ${rules.minimumAge} years old to sign an NIL deal. Athletes below that age cannot sign, even with parental consent. GradeUp blocks the deal flow automatically for athletes below the minimum.`,
    });
  }

  if (rules.paymentDeferredUntilAge18) {
    items.push({
      question: `Why does ${stateName} hold payments until my athlete turns 18?`,
      answer: `${governingBody} requires compensation for minor athletes to be held in a custodial trust until the athlete turns 18. GradeUp automates this: the brand's payment is captured on contract sign, then held and released on your athlete's 18th birthday into the parent's custodial Stripe Connect account. No manual tracking required.`,
    });
  }

  if (rules.agentRegistrationRequired) {
    items.push({
      question: `Does my agent need to be registered in ${stateName}?`,
      answer: `Yes. ${stateName} requires NIL agents and representatives to be registered with the state. If you're using an agent, verify their registration status before signing. GradeUp operates as a marketplace, not an agent — but if a third-party agent is involved in your athlete's deal, this rule applies to them.`,
    });
  }

  items.push({
    question: `Can my athlete do a deal for school gear or in a team uniform?`,
    answer: `No. School IP — logos, mascots, uniforms, team facilities — is prohibited in every state, ${stateName} included. Any content that features a school's trademarks is off-limits. This is one of the universal guardrails GradeUp enforces on every deal.`,
  });

  // Ensure a total of 4–6. Trim any overflow (rare — max 6 in the worst case).
  return items.slice(0, 6);
}
