'use client';

/**
 * Post-submit result card for the brand-side Fair-Market-Value calculator.
 *
 * Two headline ranges rendered side-by-side:
 *   1. Per-athlete per-deliverable cost
 *   2. Total campaign cost (per-athlete x athleteCount)
 *
 * Plus:
 *   - Methodology strip ("how we computed this")
 *   - Opendorse-comparison copy block
 *   - State-rules compliance callouts
 *   - Existing ValuationCaveatList for the athlete-side caveats
 */

import { AlertTriangle, Calculator, Sparkles } from 'lucide-react';
import {
  formatValuationCents,
  DELIVERABLE_LABELS,
  BRAND_VERTICAL_LABELS,
  DELIVERABLE_MULTIPLIERS,
  type BrandValuationInput,
  type BrandValuationResult,
} from '@/lib/hs-nil/valuation';
import { ValuationCaveatList } from './ValuationCaveatList';

interface BrandFmvResultCardProps {
  input: BrandValuationInput;
  result: BrandValuationResult;
}

export function BrandFmvResultCard({
  input,
  result,
}: BrandFmvResultCardProps) {
  const deliverableLabel = DELIVERABLE_LABELS[input.brand.deliverableType];
  const deliverableMult =
    DELIVERABLE_MULTIPLIERS[input.brand.deliverableType];
  const verticalLabel = BRAND_VERTICAL_LABELS[input.brand.vertical];

  return (
    <div className="space-y-6">
      {/* Headline: per-deliverable */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 via-[var(--cream-surface)] to-[var(--accent-gold)]/10 p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent-primary)]/10 blur-3xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Per athlete &middot; {deliverableLabel}
          </div>

          <div
            className="font-display text-4xl font-bold leading-tight text-[var(--ink)] sm:text-5xl md:text-6xl"
            aria-live="polite"
          >
            {formatValuationCents(result.perDeliverableCents.low)}
            <span className="mx-2 text-[var(--ink-meta)]">&ndash;</span>
            {formatValuationCents(result.perDeliverableCents.high)}
          </div>

          <p className="mt-2 text-sm text-[var(--ink-meta)]">
            central estimate{' '}
            <span className="font-semibold text-[var(--ink-muted)]">
              {formatValuationCents(result.perDeliverableCents.mid)}
            </span>
          </p>
        </div>
      </div>

      {/* Total campaign budget */}
      <div className="rounded-2xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-gold)]">
          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
          Total campaign budget &middot; {input.brand.athleteCount} athlete
          {input.brand.athleteCount === 1 ? '' : 's'}
        </div>

        <div className="font-display text-3xl font-bold leading-tight text-[var(--ink)] sm:text-4xl">
          {formatValuationCents(result.campaignTotalCents.low)}
          <span className="mx-2 text-[var(--ink-meta)]">&ndash;</span>
          {formatValuationCents(result.campaignTotalCents.high)}
        </div>

        <p className="mt-2 text-sm text-[var(--ink-meta)]">
          central estimate{' '}
          <span className="font-semibold text-[var(--ink-muted)]">
            {formatValuationCents(result.campaignTotalCents.mid)}
          </span>
        </p>

        {result.volumeDiscountApplied && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-gold)]">
            Volume tier unlocked &middot; ~10% off aspirational &middot; talk
            to us for a rate card
          </p>
        )}
      </div>

      {/* How we computed this */}
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          How we computed this
        </h3>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">
          <li>
            &middot; Athlete-side engine runs first (sport, state, grade,
            followers, GPA, verification) &mdash; same model as the athlete
            calculator at /hs/valuation.
          </li>
          <li>
            &middot; Deliverable multiplier of{' '}
            <strong className="text-[var(--ink)]">{deliverableMult.toFixed(2)}x</strong>{' '}
            applied for &ldquo;{deliverableLabel}&rdquo;.
          </li>
          <li>
            &middot; Multiplied by {input.brand.athleteCount} athlete
            {input.brand.athleteCount === 1 ? '' : 's'} for total
            campaign cost.
          </li>
          <li>
            &middot; Low/high envelope is 60% / 160% of central &mdash;
            matches the 25th-75th percentile of reported HS NIL deals
            in 2024-2026.
          </li>
        </ul>
        <p className="mt-3 text-xs text-[var(--ink-meta)]">
          Vertical &ldquo;{verticalLabel}&rdquo; drives the compliance
          callouts below, not the price. Methodology version{' '}
          {result.methodologyVersion}.
        </p>
      </div>

      {/* Benchmark framing against published college NIL averages. */}
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          Benchmark check
        </h3>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          These ranges fall <strong className="text-[var(--ink)]">below</strong>{' '}
          the published college-NIL averages, consistent with the HS
          market where deals are smaller and more locally-scoped.
          That&rsquo;s the point: HS-NIL is where you build a pipeline
          of loyal creators early, before the college premium kicks in.
        </p>
      </div>

      {/* Compliance callouts */}
      {result.complianceCallouts.length > 0 && (
        <div className="rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <AlertTriangle
              className="h-4 w-4 text-[var(--accent-gold)]"
              aria-hidden="true"
            />
            Compliance callouts for {input.stateCode}
          </div>
          <ul className="space-y-2 text-sm text-[var(--ink-muted)]">
            {result.complianceCallouts.map((c, i) => (
              <li key={i} className="leading-relaxed">
                &middot; {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-meta)]">
            We re-surface these at campaign creation time too. You can
            post compliantly without being a lawyer &mdash; that&rsquo;s
            our job.
          </p>
        </div>
      )}

      {/* Reuse athlete-side caveat list for the general market caveats */}
      <ValuationCaveatList caveats={result.caveats} />

      <p className="text-xs text-[var(--ink-meta)]">
        Estimates only &mdash; not an offer, quote, or guarantee. Actual
        deal pricing is brokered between brand + athlete + parent on
        GradeUp HS.
      </p>
    </div>
  );
}

export default BrandFmvResultCard;
