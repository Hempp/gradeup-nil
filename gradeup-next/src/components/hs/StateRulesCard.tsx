/**
 * StateRulesCard — compact summary of the athlete's state's NIL rules.
 *
 * Sourced from STATE_RULES in src/lib/hs-nil/state-rules.ts. If the athlete's
 * state isn't in that map (e.g. a legacy row from before PILOT_STATES was
 * enforced), we render a graceful placeholder rather than throwing.
 *
 * Intentionally lighter than the onboarding "While you wait" card — this
 * sits on a dashboard alongside other cards, so it trades exhaustive detail
 * for scannability.
 */
import {
  STATE_RULES,
  type USPSStateCode,
  type StateNILRules,
} from '@/lib/hs-nil/state-rules';
import { OnboardingCard } from './OnboardingCard';

const STATE_NAMES: Partial<Record<USPSStateCode, string>> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
  AL: 'Alabama',
  HI: 'Hawaii',
  IN: 'Indiana',
  MI: 'Michigan',
  WY: 'Wyoming',
};

export interface StateRulesCardProps {
  stateCode: string | null;
}

function formatRecipient(
  r: StateNILRules['disclosureRecipient'],
): string {
  switch (r) {
    case 'state_athletic_association':
      return 'State athletic association';
    case 'school':
      return 'Your school';
    case 'both':
      return 'School + state association';
    default:
      return 'Not required';
  }
}

function formatWindow(hours: number | null): string {
  if (!hours) return 'No formal window';
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} after signing`;
}

export function StateRulesCard({ stateCode }: StateRulesCardProps) {
  const code = stateCode?.toUpperCase() as USPSStateCode | undefined;
  const rules = code ? STATE_RULES[code] : undefined;
  const stateName = code ? (STATE_NAMES[code] ?? code) : null;

  if (!rules || !stateName) {
    return (
      <OnboardingCard
        eyebrow="State rules"
        title={
          stateName
            ? `Rules for ${stateName} coming soon`
            : 'State rules coming soon'
        }
        description="We haven't finalized the rule set for your state yet. Until then, a GradeUp concierge reviews every deal manually."
      />
    );
  }

  return (
    <OnboardingCard
      eyebrow={`State rules — ${stateName}`}
      title={`How NIL works in ${stateName}`}
      description="Every state writes its own rulebook. Here's the short version of yours."
    >
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <Fact
          label="Disclosure window"
          value={formatWindow(rules.disclosureWindowHours)}
        />
        <Fact
          label="Disclose to"
          value={formatRecipient(rules.disclosureRecipient)}
        />
        <Fact
          label="Minimum age"
          value={rules.minimumAge ? `${rules.minimumAge}+` : 'No minimum'}
        />
        <Fact
          label="Agent registration"
          value={rules.agentRegistrationRequired ? 'Required' : 'Not required'}
        />
      </dl>

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Never allowed
        </p>
        <p className="mt-1 text-sm text-white/70">
          {rules.bannedCategories.join(' • ')}
        </p>
        <p className="mt-3 text-xs text-white/50">
          Plus a universal rule: no school logos, mascots, or uniforms — and
          nothing tied to on-field performance.
        </p>
      </div>
    </OnboardingCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-white">{value}</dd>
    </div>
  );
}

export default StateRulesCard;
