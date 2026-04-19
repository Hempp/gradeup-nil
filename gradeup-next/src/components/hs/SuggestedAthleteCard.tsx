/**
 * SuggestedAthleteCard — one card per brand-matched athlete.
 *
 * Shown on /hs/brand/suggested. The card surfaces ONLY the fields
 * the backend `match_hs_athletes_for_brand` RPC returns — no email,
 * no last name, no DOB, no address. Brand clicks "Propose a deal"
 * and lands on the deal-creation form with the athlete prefilled.
 *
 * The athlete id is passed to the deal form through a signed HMAC
 * ref (see @/lib/hs-nil/matching::signAthleteRef). That signature
 * is verified on the receiving side before the UUID is used.
 */

import Link from 'next/link';
import MatchFeedbackButtons from './MatchFeedbackButtons';

export type GpaTier =
  | 'self_reported'
  | 'user_submitted'
  | 'institution_verified';

export interface SuggestedAthleteCardProps {
  firstName: string;
  schoolName: string;
  sport: string;
  gpa: number | null;
  gpaVerificationTier: GpaTier;
  stateCode: string;
  graduationYear: number;
  /** Raw match score. May exceed 1.0 slightly when affinity bonus saturates; clamped for display. */
  matchScore: number;
  /** Signed HMAC ref — NOT the raw UUID. */
  athleteRef: string;
  /**
   * Per-(brand, athlete) aggregate feedback weight. 0 when no feedback.
   * Rendered as a compact secondary indicator — the primary score
   * still dominates.
   */
  affinityScore?: number;
  /** Has the current brand already saved this athlete? Persists button state. */
  initialSaved?: boolean;
}

const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
};

const TIER_LABEL: Record<GpaTier, string> = {
  self_reported: 'Self-reported',
  user_submitted: 'In review',
  institution_verified: 'Verified',
};

const TIER_TONE: Record<GpaTier, string> = {
  self_reported: 'border-white/15 bg-white/5 text-white/70',
  user_submitted:
    'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
  institution_verified:
    'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
};

export default function SuggestedAthleteCard({
  firstName,
  schoolName,
  sport,
  gpa,
  gpaVerificationTier,
  stateCode,
  graduationYear,
  matchScore,
  athleteRef,
  affinityScore = 0,
  initialSaved = false,
}: SuggestedAthleteCardProps) {
  const scorePct = Math.round(Math.max(0, Math.min(1, matchScore)) * 100);
  const affinitySigned = affinityScore > 0 ? 'positive' : affinityScore < 0 ? 'negative' : 'neutral';
  const affinityLabel =
    affinityScore === 0
      ? null
      : `${affinityScore > 0 ? '+' : ''}${affinityScore.toFixed(2)} affinity`;
  const gpaText = gpa !== null ? gpa.toFixed(2) : '—';
  const stateLabel = STATE_LABELS[stateCode] ?? stateCode;
  const tierLabel = TIER_LABEL[gpaVerificationTier];
  const tierTone = TIER_TONE[gpaVerificationTier];

  const proposeHref = `/hs/brand/deals/new?athlete=${encodeURIComponent(athleteRef)}`;

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl text-white">{firstName}</p>
          <p className="mt-1 text-sm text-white/70">
            {schoolName} &middot; {sport}
          </p>
        </div>
        <div
          aria-label={`Match score ${scorePct} percent`}
          className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-center"
        >
          <p className="font-display text-2xl leading-none text-[var(--accent-primary)]">
            {scorePct}%
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]/80">
            match
          </p>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            GPA
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="font-display text-lg text-white">{gpaText}</span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${tierTone}`}
            >
              {tierLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            Graduation
          </dt>
          <dd className="mt-1 font-display text-lg text-white">
            {graduationYear}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            State
          </dt>
          <dd className="mt-1">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/90">
              {stateLabel}
            </span>
          </dd>
        </div>
      </dl>

      {affinityLabel && (
        <p
          className={`mt-4 text-[10px] font-semibold uppercase tracking-wider ${
            affinitySigned === 'positive'
              ? 'text-emerald-300'
              : affinitySigned === 'negative'
                ? 'text-rose-300'
                : 'text-white/40'
          }`}
          aria-label={`Your brand's affinity with this athlete ${affinityLabel}`}
        >
          {affinityLabel}
        </p>
      )}

      <div className="mt-6">
        <Link
          href={proposeHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Propose a deal
        </Link>
      </div>

      <MatchFeedbackButtons
        athleteRef={athleteRef}
        initialSaved={initialSaved}
        sourcePage="/hs/brand/suggested"
      />
    </article>
  );
}
