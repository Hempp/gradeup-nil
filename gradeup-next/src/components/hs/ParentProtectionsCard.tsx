/**
 * ParentProtectionsCard
 * ----------------------------------------------------------------------------
 * The trust layer of the parent dashboard. Copy-only, no dynamic data. Parents
 * need to see what's protecting their athlete every time they land here — not
 * just during onboarding. Three numbered guardrails plus one disclosure line
 * that references their state's athletic association.
 *
 * Why on the dashboard (not just onboarding):
 *   - Parents re-open the dashboard after conversations with their athlete,
 *     school, or other parents. They scan for "what's GradeUp's promise?"
 *   - Viral amplification: parents who can articulate the guardrails out-loud
 *     are the engine of word-of-mouth. Keep them fluent.
 *
 * Copy guardrails:
 *   - No marketing superlatives. Declarative statements, not adjectives.
 *   - Numbered 1-2-3 so a parent can recount them from memory.
 *   - State-aware disclosure line pulls from state-rules to avoid lying.
 */

import type { StateNILRules } from '@/lib/hs-nil/state-rules';

export interface ParentProtectionsCardProps {
  /**
   * The state whose disclosure window should show on the fourth line.
   * When multiple athletes are linked across states, pass the most
   * restrictive one. When no athletes are linked, pass null and we
   * render a generic "your state" variant.
   */
  stateRules: StateNILRules | null;
}

function stateAssociationName(stateCode: string | null): string {
  switch (stateCode) {
    case 'CA':
      return 'CIF (California Interscholastic Federation)';
    case 'FL':
      return 'FHSAA (Florida High School Athletic Association)';
    case 'GA':
      return 'GHSA (Georgia High School Association)';
    default:
      return 'your state athletic association';
  }
}

function disclosureWindowSentence(rules: StateNILRules | null): string {
  if (!rules || rules.disclosureWindowHours == null) {
    return 'Every deal is disclosed to your state athletic association on the timeline the state requires. You and we are both on the record.';
  }

  const hours = rules.disclosureWindowHours;
  const window =
    hours % 24 === 0
      ? `${hours / 24} days`
      : `${hours} hours`;

  const recipient =
    rules.disclosureRecipient === 'school'
      ? `your athlete's school`
      : rules.disclosureRecipient === 'both'
        ? `the school and ${stateAssociationName(rules.state)}`
        : stateAssociationName(rules.state);

  return `Every deal is disclosed to ${recipient} within ${window}. You and we are both on the record.`;
}

export function ParentProtectionsCard({ stateRules }: ParentProtectionsCardProps) {
  return (
    <section
      aria-labelledby="protections-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        You&rsquo;re in control
      </p>
      <h2
        id="protections-heading"
        className="mt-2 font-display text-2xl text-white md:text-3xl"
      >
        The guardrails we hold for you.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
        Three rules are non-negotiable on GradeUp HS. They protect your
        athlete&rsquo;s eligibility, your family&rsquo;s name, and the
        integrity of every deal that clears our review.
      </p>

      <ol className="mt-6 space-y-4">
        <ProtectionItem
          number={1}
          title="Pay-for-play is banned."
          body="No deal can be tied to a game result, a stat line, or a win. Compensation is for name, image, and likeness — never performance."
        />
        <ProtectionItem
          number={2}
          title="School marks stay with the school."
          body="No logos, uniforms, or mascots in any deal. Your athlete represents themselves, not the program. This keeps their eligibility clean."
        />
        <ProtectionItem
          number={3}
          title="You control the scope."
          body="Categories, dollar limits, and duration all require your approval. Revoke consent at any time and active deals pause until a new one is in place."
        />
      </ol>

      <p className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
        {disclosureWindowSentence(stateRules)}
      </p>
    </section>
  );
}

function ProtectionItem({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 font-display text-sm text-[var(--accent-primary)]"
      >
        {number}
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg text-white">{title}</p>
        <p className="mt-1 text-sm text-white/70">{body}</p>
      </div>
    </li>
  );
}

export default ParentProtectionsCard;
