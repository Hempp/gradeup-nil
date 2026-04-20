'use client';

/**
 * Brand-perspective Fair-Market-Value calculator form.
 *
 * 4-step flow mirrors the athlete-side `ValuationForm` but reframes the
 * question from "what am I worth?" to "what should I pay?":
 *
 *   Step 1 — Athlete specs   (sport, state)
 *   Step 2 — Athlete reach   (grade level, follower bucket)
 *   Step 3 — Scholar signal  (GPA bucket, verification flags)
 *   Step 4 — Brand context   (vertical, deliverable type, athlete count, notes)
 *
 * On submit: compute client-side via `estimateBrandCampaignValuation` for
 * instant reveal, then fire a best-effort POST to
 * /api/hs/valuation/brand-estimate so the row is logged as a brand-side
 * sales lead. UI degrades gracefully if the log fails.
 */

import { useId, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  estimateBrandCampaignValuation,
  SPORT_LABELS,
  FOLLOWER_LABELS,
  GPA_LABELS,
  GRAD_LABELS,
  DELIVERABLE_LABELS,
  BRAND_VERTICAL_LABELS,
  VOLUME_DISCOUNT_ATHLETE_THRESHOLD,
  type ValuationSport,
  type FollowerBucket,
  type GpaBucket,
  type GradLevel,
  type DeliverableType,
  type BrandVertical,
  type BrandValuationInput,
  type BrandValuationResult,
} from '@/lib/hs-nil/valuation';

export interface BrandFmvResultPayload {
  input: BrandValuationInput;
  result: BrandValuationResult;
  requestId: string | null;
}

interface BrandFmvFormProps {
  onResult: (payload: BrandFmvResultPayload) => void;
}

type Step = 0 | 1 | 2 | 3;

// Widened pilot list (same as athlete-side) so brands in non-pilot states
// can still play with the tool and see the "state not in pilot" caveat.
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

const VERTICALS: BrandVertical[] = [
  'qsr',
  'apparel',
  'training',
  'local_services',
  'education',
  'other',
];

const DELIVERABLES: DeliverableType[] = [
  'single_post',
  'three_post_series',
  'in_person_appearance',
  'multi_month_campaign',
];

export function BrandFmvForm({ onResult }: BrandFmvFormProps) {
  const headingId = useId();
  const [step, setStep] = useState<Step>(0);

  // Athlete-spec inputs (mirrors ValuationForm shape intentionally).
  const [sport, setSport] = useState<ValuationSport | null>(null);
  const [stateCode, setStateCode] = useState<USPSStateCode | null>(null);
  const [gradLevel, setGradLevel] = useState<GradLevel | null>(null);
  const [followerCountBucket, setFollowerCountBucket] =
    useState<FollowerBucket | null>(null);
  const [gpaBucket, setGpaBucket] = useState<GpaBucket | null>(null);
  const [verifiedGpa, setVerifiedGpa] = useState(false);
  const [tierBSubmitted, setTierBSubmitted] = useState(false);

  // Brand-specific inputs.
  const [vertical, setVertical] = useState<BrandVertical | null>(null);
  const [deliverableType, setDeliverableType] =
    useState<DeliverableType | null>(null);
  const [athleteCount, setAthleteCount] = useState<number>(1);
  const [campaignNotes, setCampaignNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const canAdvanceFromStep0 = sport !== null && stateCode !== null;
  const canAdvanceFromStep1 = gradLevel !== null && followerCountBucket !== null;
  const canAdvanceFromStep2 = gpaBucket !== null;
  const canSubmit =
    canAdvanceFromStep0 &&
    canAdvanceFromStep1 &&
    canAdvanceFromStep2 &&
    vertical !== null &&
    deliverableType !== null &&
    athleteCount >= 1;

  const progressPct = useMemo(() => ((step + 1) / 4) * 100, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const input: BrandValuationInput = {
      sport: sport!,
      stateCode: stateCode!,
      gradLevel: gradLevel!,
      followerCountBucket: followerCountBucket!,
      gpaBucket: gpaBucket!,
      verifiedGpa,
      tierBSubmitted,
      brand: {
        vertical: vertical!,
        deliverableType: deliverableType!,
        athleteCount,
        campaignNotes: campaignNotes.trim() || null,
      },
    };

    // Client-side compute for instant reveal. The engine is pure, so the
    // result the user sees matches what the server will re-compute
    // against when it logs the row.
    const result = estimateBrandCampaignValuation(input);

    setSubmitting(true);

    let requestId: string | null = null;
    try {
      const res = await fetch('/api/hs/valuation/brand-estimate', {
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
      // Swallow — logging is best-effort.
    }

    setSubmitting(false);
    onResult({ input, result, requestId });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-8"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span
            id={headingId}
            className="font-semibold uppercase tracking-widest text-[var(--accent-primary)]"
          >
            Step {step + 1} of 4
          </span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
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
            <h2 className="font-display text-2xl text-white">
              Who are you hiring?
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Pick the sport + state you&rsquo;re targeting. One athlete
              profile sets the per-head math; we&rsquo;ll multiply by your
              campaign size later.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Sport
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              htmlFor="bfmv-state"
              className="mb-2 block text-sm font-medium text-white"
            >
              State
            </label>
            <select
              id="bfmv-state"
              value={stateCode ?? ''}
              onChange={(e) =>
                setStateCode(
                  e.target.value ? (e.target.value as USPSStateCode) : null
                )
              }
              className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <option value="">Select athlete state</option>
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
            <p className="mt-2 text-xs text-white/50">
              State drives compliance callouts &mdash; disclosure windows,
              banned categories, school-IP rules.
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-white">Reach profile</h2>
            <p className="mt-1 text-sm text-white/60">
              Grade level + social following anchor the per-athlete unit
              price.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Target grade level
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            <label className="mb-2 block text-sm font-medium text-white">
              Target follower bucket
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            <h2 className="font-display text-2xl text-white">
              Scholar-athlete premium
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Verified GPA + transcript-on-file unlock premium
              education/financial-services verticals.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Target GPA band
            </label>
            <div className="grid grid-cols-2 gap-2">
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

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/30">
              <input
                type="checkbox"
                checked={verifiedGpa}
                onChange={(e) => setVerifiedGpa(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Require verified GPA
                </span>
                <span className="block text-xs text-white/60">
                  Narrows the pool; bumps the estimate.
                </span>
              </span>
            </label>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/30">
              <input
                type="checkbox"
                checked={tierBSubmitted}
                onChange={(e) => setTierBSubmitted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Require transcript on file (Tier B)
                </span>
                <span className="block text-xs text-white/60">
                  Trust signal \u2014 brand-facing proof the athlete is
                  credible.
                </span>
              </span>
            </label>
          </fieldset>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-white">
              Campaign shape
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Vertical + deliverable type + how many athletes you&rsquo;re
              planning to hire.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Your vertical
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VERTICALS.map((v) => (
                <ChoiceButton
                  key={v}
                  selected={vertical === v}
                  onClick={() => setVertical(v)}
                  label={BRAND_VERTICAL_LABELS[v]}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Deliverable type
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DELIVERABLES.map((d) => (
                <ChoiceButton
                  key={d}
                  selected={deliverableType === d}
                  onClick={() => setDeliverableType(d)}
                  label={DELIVERABLE_LABELS[d]}
                />
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="bfmv-athlete-count"
              className="mb-2 block text-sm font-medium text-white"
            >
              How many athletes?
            </label>
            <div className="flex items-center gap-3">
              <input
                id="bfmv-athlete-count"
                type="number"
                min={1}
                max={500}
                value={athleteCount}
                onChange={(e) => {
                  const raw = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(raw)) {
                    setAthleteCount(1);
                    return;
                  }
                  setAthleteCount(Math.min(500, Math.max(1, raw)));
                }}
                className="min-h-[44px] w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              />
              <span className="text-sm text-white/60">athlete{athleteCount === 1 ? '' : 's'}</span>
            </div>
            {athleteCount >= VOLUME_DISCOUNT_ATHLETE_THRESHOLD && (
              <p className="mt-2 rounded-md border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-3 py-2 text-xs text-[var(--accent-gold)]">
                At {athleteCount}+ athletes you&rsquo;re in volume-rate
                territory. Ask us about a campaign rate card after you
                submit.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bfmv-notes"
              className="mb-2 block text-sm font-medium text-white"
            >
              Campaign notes{' '}
              <span className="text-white/40">(optional)</span>
            </label>
            <textarea
              id="bfmv-notes"
              rows={3}
              maxLength={500}
              value={campaignNotes}
              onChange={(e) => setCampaignNotes(e.target.value)}
              placeholder="e.g. \u201CBack-to-school push across 3 markets, want CA + TX athletes.\u201D"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            />
            <p className="mt-1 text-xs text-white/40">
              Only visible to our sales team if you choose to talk to us
              afterward. Not shown publicly.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="gap-2 text-white/70"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={
              (step === 0 && !canAdvanceFromStep0) ||
              (step === 1 && !canAdvanceFromStep1) ||
              (step === 2 && !canAdvanceFromStep2)
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
            See my budget range
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
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-white'
          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white',
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export default BrandFmvForm;
