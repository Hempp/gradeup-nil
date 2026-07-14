/**
 * StateRuleAtAGlance — renders the state's rule values as a fact list.
 * Server Component, no state. Deliberately literal so parents can scan.
 */
import { ClipboardCheck } from 'lucide-react';
import type { StateNILRules } from '@/lib/hs-nil/state-rules';
import {
  formatBannedCategories,
  formatDisclosureWindow,
  formatRecipient,
} from '@/lib/hs-nil/state-blog-content';

export interface StateRuleAtAGlanceProps {
  rules: StateNILRules;
  stateName: string;
  governingBody: string;
}

interface FactRow {
  label: string;
  value: string | string[];
  note?: string;
}

export function StateRuleAtAGlance({
  rules,
  stateName,
  governingBody,
}: StateRuleAtAGlanceProps) {
  const rows: FactRow[] = [
    {
      label: 'Governing body',
      value: governingBody,
      note: 'Source of the rule; our engine mirrors their published policy.',
    },
    {
      label: 'Parental consent required',
      value: rules.requiresParentalConsent ? 'Yes' : 'Not required by statute',
      note: rules.requiresParentalConsent
        ? 'Every deal for a minor athlete must be signed by a parent or legal guardian before it goes live.'
        : undefined,
    },
    {
      label: 'Minimum athlete age',
      value:
        rules.minimumAge === null
          ? 'No statutory minimum'
          : `${rules.minimumAge} years old`,
      note:
        rules.minimumAge !== null
          ? 'Athletes below this age cannot sign a deal in this state.'
          : undefined,
    },
    {
      label: 'Disclosure window',
      value: formatDisclosureWindow(rules.disclosureWindowHours),
      note:
        rules.disclosureWindowHours !== null
          ? 'How long you have after signing before the deal must be reported.'
          : undefined,
    },
    {
      label: 'Disclosure recipient',
      value: formatRecipient(rules.disclosureRecipient),
    },
    {
      label: 'Agent registration required',
      value: rules.agentRegistrationRequired
        ? 'Yes — agents must register with the state'
        : 'Not required',
    },
    {
      label: 'Payment deferred until 18',
      value: rules.paymentDeferredUntilAge18
        ? 'Yes — escrowed in a custodial trust until the athlete turns 18'
        : 'No — paid on contract completion',
    },
    {
      label: 'Banned deal categories',
      value: formatBannedCategories(rules.bannedCategories),
    },
  ];

  return (
    <section
      aria-label={`${stateName} NIL rule summary`}
      className="bg-[var(--cream-section)] py-16 border-y border-[var(--hairline)]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            <ClipboardCheck className="h-3.5 w-3.5 text-[var(--cobalt)]" aria-hidden="true" />
            Rule at a glance
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl text-[var(--ink)]">
            What {stateName}&rsquo;s HS NIL rules require
          </h2>
        </div>

        <dl className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="card-marketing rounded-xl p-5"
            >
              <dt className="eyebrow">
                {row.label}
              </dt>
              <dd className="mt-2 text-[var(--ink)] font-semibold">
                {Array.isArray(row.value) ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm font-normal">
                    {row.value.map((v) => (
                      <li key={v} className="text-[var(--ink-muted)]">
                        {v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  row.value
                )}
              </dd>
              {row.note ? (
                <p className="mt-2 text-xs text-[var(--ink-meta)] leading-relaxed">
                  {row.note}
                </p>
              ) : null}
            </div>
          ))}
        </dl>

        {rules.notes ? (
          <div className="mt-6 rounded-xl border border-[var(--cobalt)]/20 bg-[var(--cobalt)]/5 p-5">
            <p className="eyebrow text-[var(--cobalt)]">
              Rule notes
            </p>
            <p className="mt-2 text-[var(--ink-muted)] text-sm leading-relaxed">
              {rules.notes}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
