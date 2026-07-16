'use client';

/**
 * 3-step NIL valuation calculator form.
 *
 * Step 1: Sport + state
 * Step 2: Grad level + follower count
 * Step 3: GPA tier + verification flags
 *
 * On complete: computes estimate client-side (zero-latency reveal), fires
 * a fire-and-forget POST to /api/hs/valuation/estimate so we can log
 * the attempt for future model tuning. Result persists in parent via
 * onResult callback. UI degrades gracefully if the log POST fails.
 */

import { useId, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  estimateValuation,
  SPORT_LABELS,
  FOLLOWER_LABELS,
  GPA_LABELS,
  GRAD_LABELS,
  type ValuationInput,
  type ValuationResult,
  type ValuationSport,
  type FollowerBucket,
  type GpaBucket,
  type GradLevel,
} from '@/lib/hs-nil/valuation';

interface ValuationFormProps {
  onResult: (args: {
    input: ValuationInput;
    result: ValuationResult;
    requestId: string | null;
  }) => void;
}

type Step = 0 | 1 | 2;

// A conservative list of states we surface directly. Users outside these
// can still calculate; they'll see the "state not in pilot" caveat.
const FEATURED_STATES: USPSStateCode[] = [
  ...PILOT_STATES,
  'PA',
  'OH',
  'NC',
  'MA',
  'VA',
  'WA',
  'AZ',
  'CO',
  'TN',
  'MI',
  'OR',
];

const SPORTS: ValuationSport[] = [
  'football',
  'basketball_m',
  'basketball_w',
  'baseball',
  'softball',
  'soccer_m',
  'soccer_w',
  'volleyball',
  'track_field',
  'cross_country',
  'wrestling',
  'swimming',
  'tennis',
  'golf',
  'lacrosse',
  'hockey',
  'gymnastics',
  'cheer',
  'other',
];

const FOLLOWERS: FollowerBucket[] = [
  'under_500',
  '500_to_2k',
  '2k_to_10k',
  '10k_to_50k',
  '50k_plus',
];

const GPAS: GpaBucket[] = [
  'under_3_0',
  '3_0_to_3_5',
  '3_5_to_3_9',
  '3_9_plus',
];

const GRADS: GradLevel[] = [
  'freshman',
  'sophomore',
  'junior',
  'senior',
  'college_freshman',
];

export function ValuationForm({ onResult }: ValuationFormProps) {
  const headingId = useId();
  const [step, setStep] = useState<Step>(0);
  const [sport, setSport] = useState<ValuationSport | null>(null);
  const [stateCode, setStateCode] = useState<USPSStateCode | null>(null);
  const [gradLevel, setGradLevel] = useState<GradLevel | null>(null);
  const [followerCountBucket, setFollowerCountBucket] =
    useState<FollowerBucket | null>(null);
  const [gpaBucket, setGpaBucket] = useState<GpaBucket | null>(null);
  const [verifiedGpa, setVerifiedGpa] = useState(false);
  const [tierBSubmitted, setTierBSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canAdvanceFromStep0 = sport !== null && stateCode !== null;
  const canAdvanceFromStep1 = gradLevel !== null && followerCountBucket !== null;
  const canSubmit = canAdvanceFromStep0 && canAdvanceFromStep1 && gpaBucket !== null;

  const progressPct = useMemo(() => ((step + 1) / 3) * 100, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const input: ValuationInput = {
      sport: sport!,
      stateCode: stateCode!,
      gradLevel: gradLevel!,
      followerCountBucket: followerCountBucket!,
      gpaBucket: gpaBucket!,
      verifiedGpa,
      tierBSubmitted,
    };

    // Client-side compute: instant reveal, no network dep.
    const result = estimateValuation(input);

    setSubmitting(true);

    // Fire-and-forget server log. UI progresses whether this succeeds
    // or fails; logging is best-effort for future model tuning.
    let requestId: string | null = null;
    try {
      const res = await fetch('/api/hs/valuation/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          requestId?: string;
        };
        requestId = body.requestId ?? null;
      }
    } catch {
      // Swallow — logging is not required for UX.
    }

    setSubmitting(false);
    onResult({ input, result, requestId });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-5 backdrop-blur-sm sm:p-8"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--ink-meta)]">
          <span id={headingId} className="font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Step {step + 1} of 3
          </span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--cream-section)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">Tell us the basics</h2>
            <p className="mt-1 text-sm text-[var(--ink-meta)]">
              Sport and state drive most of the estimate.
            </p>
          </div>

          <div>
            <label id="val-sport-label" className="mb-2 block text-sm font-medium text-[var(--ink)]">
              Sport
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-labelledby="val-sport-label">
              {SPORTS.map((s) => (
                <ChoiceButton
                  key={s}
                  selected={sport === s}
                  onClick={() => setSport(s)}
                  label={SPORT_LABELS[s]}
                />
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="val-state"
              className="mb-2 block text-sm font-medium text-[var(--ink)]"
            >
              State
            </label>
            <select
              id="val-state"
              value={stateCode ?? ''}
              onChange={(e) =>
                setStateCode(e.target.value ? (e.target.value as USPSStateCode) : null)
              }
              className="min-h-[44px] w-full rounded-lg border border-[var(--hairline)] bg-[var(--cream-surface)] px-4 py-2 text-[var(--ink)] focus:border-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <option value="">Select your state</option>
              <optgroup label="Pilot states (GradeUp HS live)">
                {PILOT_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other states">
                {FEATURED_STATES.filter((s) => !PILOT_STATES.includes(s)).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">Your reach</h2>
            <p className="mt-1 text-sm text-[var(--ink-meta)]">
              Grade level and social following steer the range up or down.
            </p>
          </div>

          <div>
            <label id="val-grade-label" className="mb-2 block text-sm font-medium text-[var(--ink)]">
              Grade level
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-labelledby="val-grade-label">
              {GRADS.map((g) => (
                <ChoiceButton
                  key={g}
                  selected={gradLevel === g}
                  onClick={() => setGradLevel(g)}
                  label={GRAD_LABELS[g]}
                />
              ))}
            </div>
          </div>

          <div>
            <label id="val-followers-label" className="mb-2 block text-sm font-medium text-[var(--ink)]">
              Social followers (largest platform)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-labelledby="val-followers-label">
              {FOLLOWERS.map((f) => (
                <ChoiceButton
                  key={f}
                  selected={followerCountBucket === f}
                  onClick={() => setFollowerCountBucket(f)}
                  label={FOLLOWER_LABELS[f]}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">
              Scholar-athlete signal
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-meta)]">
              GradeUp leans into academics. Strong + verified grades add leverage.
            </p>
          </div>

          <div>
            <label id="val-gpa-label" className="mb-2 block text-sm font-medium text-[var(--ink)]">
              GPA range
            </label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="val-gpa-label">
              {GPAS.map((g) => (
                <ChoiceButton
                  key={g}
                  selected={gpaBucket === g}
                  onClick={() => setGpaBucket(g)}
                  label={GPA_LABELS[g]}
                />
              ))}
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="sr-only">Verification flags</legend>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-3 transition-colors hover:border-[var(--cobalt)]">
              <input
                type="checkbox"
                checked={verifiedGpa}
                onChange={(e) => setVerifiedGpa(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">
                  Verified GPA
                </span>
                <span className="block text-xs text-[var(--ink-meta)]">
                  School or counselor has confirmed the GPA.
                </span>
              </span>
            </label>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-3 transition-colors hover:border-[var(--cobalt)]">
              <input
                type="checkbox"
                checked={tierBSubmitted}
                onChange={(e) => setTierBSubmitted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">
                  Transcript submitted (Tier B)
                </span>
                <span className="block text-xs text-[var(--ink-meta)]">
                  Gives brands a trust signal. Small but real bump.
                </span>
              </span>
            </label>
          </fieldset>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="gap-2 text-[var(--ink-muted)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < 2 ? (
          <Button
            type="button"
            size="lg"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={
              (step === 0 && !canAdvanceFromStep0) ||
              (step === 1 && !canAdvanceFromStep1)
            }
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            isLoading={submitting}
            disabled={!canSubmit || submitting}
            className="gap-2"
          >
            See my estimate
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}

interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function ChoiceButton({ label, selected, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
        selected
          ? 'border-[var(--cobalt)] bg-[var(--accent-primary-glow)] text-[var(--cobalt-hover)]'
          : 'border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-muted)] hover:border-[var(--cobalt)] hover:text-[var(--ink)]',
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export default ValuationForm;
