'use client';

/**
 * Post-estimate result card with animated count-up reveal.
 *
 * Range-first layout: the headline is the range, not a single point.
 * A central "expected" figure sits between low and high for users who
 * want a single number to quote to friends, but the UI treats the
 * range as the truth.
 */

import { useEffect, useRef, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { formatValuationCents } from '@/lib/hs-nil/valuation';
import type { ValuationResult } from '@/lib/hs-nil/valuation';
import { ValuationCaveatList } from './ValuationCaveatList';

interface ValuationResultCardProps {
  result: ValuationResult;
}

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const lastTarget = useRef<number>(target);

  useEffect(() => {
    // Respect reduced motion.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setValue(target);
      lastTarget.current = target;
      return;
    }

    startedAt.current = null;
    const from = lastTarget.current;
    const to = target;

    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = now - startedAt.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        lastTarget.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}

export function ValuationResultCard({ result }: ValuationResultCardProps) {
  const mid = useCountUp(result.midEstimateCents);
  const low = useCountUp(result.lowEstimateCents);
  const high = useCountUp(result.highEstimateCents);

  return (
    <div className="space-y-6">
      {/* Headline range */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 via-white/5 to-[var(--accent-gold)]/10 p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent-primary)]/10 blur-3xl" />

        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Estimated annual NIL value
          </div>

          <div
            className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl"
            aria-live="polite"
          >
            {formatValuationCents(low)}
            <span className="mx-2 text-white/40">–</span>
            {formatValuationCents(high)}
          </div>

          <p className="mt-2 text-sm text-white/60">
            per year · central estimate{' '}
            <span className="font-semibold text-white/80">
              {formatValuationCents(mid)}
            </span>
          </p>

          {/* Visual range bar */}
          <div className="mt-6">
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-primary)] to-[var(--accent-gold)]"
                style={{ width: '100%' }}
              />
              {/* Center marker */}
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg ring-2 ring-[var(--accent-primary)]"
                style={{ left: '50%' }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/50">
              <span>Low {formatValuationCents(result.lowEstimateCents)}</span>
              <span>High {formatValuationCents(result.highEstimateCents)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {result.topSuggestedCategories.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <TrendingUp
              className="h-4 w-4 text-[var(--accent-gold)]"
              aria-hidden="true"
            />
            Best-fit deal categories
          </div>
          <div className="flex flex-wrap gap-2">
            {result.topSuggestedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full bg-[var(--accent-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/20"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Caveats */}
      <ValuationCaveatList caveats={result.caveats} />

      <p className="text-xs text-white/40">
        Methodology version {result.methodologyVersion}. These are v1 public
        estimates; they are not an offer, quote, or guarantee.
      </p>
    </div>
  );
}

export default ValuationResultCard;
