/**
 * LinkedAthleteCard
 * ----------------------------------------------------------------------------
 * Per-athlete summary tile rendered in the parent dashboard. This is the
 * densest piece of the dashboard — one card per athlete, and every tile must
 * tell the parent the three things they came here for:
 *   1. Who (name, school)
 *   2. How they're doing (GPA + tier, state context)
 *   3. What (if anything) the parent needs to do (consent state + CTA)
 *
 * Consent state visually dominates because it's the action driver. Adult
 * athletes (>=18) get a read-only variant — parents can still see context
 * but the consent system doesn't apply.
 */

import Link from 'next/link';
import type { StateNILRules } from '@/lib/hs-nil/state-rules';

export type ConsentBadgeState =
  | { kind: 'active'; expiresAt: string; id: string }
  | { kind: 'expiring'; expiresAt: string; id: string; daysLeft: number }
  | { kind: 'pending'; id: string; parentEmail: string }
  | { kind: 'revoked'; id: string }
  | { kind: 'expired'; id: string }
  | { kind: 'none' };

export interface LinkedAthleteCardProps {
  /** Auth user id of the athlete. Used as React key by the parent page. */
  athleteUserId: string;
  /**
   * First name of the athlete if we can resolve it. Falls back to
   * `fallbackLabel` (typically the invite email) when we can't. We never
   * show a bare "Athlete" placeholder — better to show the email.
   */
  firstName: string | null;
  fallbackLabel: string;
  schoolName: string | null;
  sport: string | null;
  stateCode: string | null;
  /** Age computed from date_of_birth. `null` when DOB isn't available. */
  age: number | null;
  gpa: number | null;
  gpaTier: 'self_reported' | 'user_submitted' | 'institution_verified' | null;
  /** Whether the link is verified (athlete confirmed). */
  linkVerified: boolean;
  /** Per-state rule set, for the state pill summary. */
  stateRules: StateNILRules | null;
  consent: ConsentBadgeState;
}

const TIER_LABELS: Record<
  NonNullable<LinkedAthleteCardProps['gpaTier']>,
  string
> = {
  self_reported: 'Self-reported',
  user_submitted: 'Transcript uploaded',
  institution_verified: 'Institution-verified',
};

const TIER_COLORS: Record<
  NonNullable<LinkedAthleteCardProps['gpaTier']>,
  string
> = {
  self_reported: 'border-white/15 text-white/60',
  user_submitted: 'border-amber-400/30 text-amber-200',
  institution_verified: 'border-emerald-400/40 text-emerald-200',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stateSummary(rules: StateNILRules | null): string {
  if (!rules) return 'State rules loading.';
  if (rules.status === 'prohibited') {
    return 'HS NIL is not permitted in this state.';
  }
  if (rules.disclosureWindowHours == null) {
    return 'Deal disclosure required.';
  }
  const window =
    rules.disclosureWindowHours % 24 === 0
      ? `${rules.disclosureWindowHours / 24}-day`
      : `${rules.disclosureWindowHours}-hour`;
  return `${window} disclosure window`;
}

function ConsentBadge({ consent }: { consent: ConsentBadgeState }) {
  switch (consent.kind) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Active until {formatDate(consent.expiresAt)}
        </span>
      );
    case 'expiring':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Expires in {consent.daysLeft} day{consent.daysLeft === 1 ? '' : 's'}
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Waiting on your signature
        </span>
      );
    case 'revoked':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Revoked
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Expired
        </span>
      );
    case 'none':
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/40" />
          Not requested
        </span>
      );
  }
}

function QuickAction({
  consent,
  isAdult,
}: {
  consent: ConsentBadgeState;
  isAdult: boolean;
}) {
  if (isAdult) {
    return (
      <p className="text-xs text-white/50">
        Adult athlete — consent not required.
      </p>
    );
  }

  switch (consent.kind) {
    case 'pending':
      return (
        <Link
          href={`/hs/consent/manage`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Review pending request
        </Link>
      );
    case 'active':
      return (
        <Link
          href={`/hs/consent/manage`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Manage consent
        </Link>
      );
    case 'expiring':
    case 'expired':
    case 'revoked':
      return (
        <Link
          href={`/hs/consent/request`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          {consent.kind === 'expiring' ? 'Renew consent' : 'Request new consent'}
        </Link>
      );
    case 'none':
      return (
        <Link
          href={`/hs/consent/request`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Request consent
        </Link>
      );
  }
}

export function LinkedAthleteCard(props: LinkedAthleteCardProps) {
  const {
    firstName,
    fallbackLabel,
    schoolName,
    sport,
    stateCode,
    age,
    gpa,
    gpaTier,
    linkVerified,
    stateRules,
    consent,
  } = props;

  const displayName = firstName ?? fallbackLabel;
  const isAdult = age !== null && age >= 18;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl text-white md:text-3xl">
              {displayName}
            </h3>
            {!linkVerified && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                Pending confirmation
              </span>
            )}
          </div>
          {(schoolName || sport) && (
            <p className="mt-1 text-sm text-white/70">
              {[schoolName, sport].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <ConsentBadge consent={consent} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {gpa != null && (
          <div>
            <dt className="text-white/50 uppercase tracking-wider">GPA</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="font-display text-xl text-white">
                {gpa.toFixed(2)}
              </span>
              {gpaTier && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TIER_COLORS[gpaTier]}`}
                >
                  {TIER_LABELS[gpaTier]}
                </span>
              )}
            </dd>
          </div>
        )}

        {stateCode && (
          <div>
            <dt className="text-white/50 uppercase tracking-wider">State</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-xs text-white/80">
                {stateCode}
                <span className="text-white/50">·</span>
                <span className="text-white/60">{stateSummary(stateRules)}</span>
              </span>
            </dd>
          </div>
        )}

        {age != null && (
          <div>
            <dt className="text-white/50 uppercase tracking-wider">Age</dt>
            <dd className="mt-1 text-sm text-white/80">{age}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex items-center justify-end">
        <QuickAction consent={consent} isAdult={isAdult} />
      </div>
    </article>
  );
}

export default LinkedAthleteCard;
