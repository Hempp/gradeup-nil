'use client';

/**
 * Client glue for /solutions/brands/fmv. Keeps the FMV page itself a
 * pure Server Component (metadata, static copy) by boxing the form →
 * result → campaign-preview → CTA state machine here.
 *
 * Mirrors the structure of ValuationCalculatorClient so a maintainer
 * can refactor them toward a shared primitive later if brand-side UI
 * stays symmetrical with athlete-side.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import {
  BrandFmvForm,
  type BrandFmvResultPayload,
} from '@/components/hs/BrandFmvForm';
import { BrandFmvResultCard } from '@/components/hs/BrandFmvResultCard';
import { BrandFmvCampaignPreview } from '@/components/hs/BrandFmvCampaignPreview';

export function BrandFmvCalculatorClient() {
  const [state, setState] = useState<BrandFmvResultPayload | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleResult(next: BrandFmvResultPayload) {
    setState(next);
    queueMicrotask(() => {
      resultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  if (!state) {
    return <BrandFmvForm onResult={handleResult} />;
  }

  // Prefill query params so the brand signup page can pick up the
  // campaign context as soon as the brand clicks through. Values are
  // url-encoded and strictly the non-PII ones from the calculator.
  const signupSearch = new URLSearchParams({
    from: 'fmv',
    vertical: state.input.brand.vertical,
    deliverable: state.input.brand.deliverableType,
    athletes: String(state.input.brand.athleteCount),
    sport: state.input.sport,
    state: state.input.stateCode,
  }).toString();
  const signupHref = `/hs/signup/brand?${signupSearch}`;

  return (
    <div ref={resultRef} className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <BrandFmvResultCard input={state.input} result={state.result} />
        <BrandFmvCampaignPreview
          input={state.input}
          result={state.result}
        />
      </div>

      <div className="space-y-4">
        {/* Primary CTA: sign up + prefill campaign */}
        <Link
          href={signupHref}
          className="btn-marketing-primary flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-sm font-semibold"
        >
          <span>Sign up as a brand &mdash; post this campaign</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {/* Secondary CTA: talk to the team (opt-in only) */}
        <Link
          href="mailto:brands@gradeupnil.com?subject=Talk%20to%20the%20GradeUp%20HS%20team"
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] px-5 py-4 text-sm font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--cobalt)] hover:text-[var(--ink)]"
        >
          <span className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Talk to our team
          </span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => setState(null)}
          className="w-full rounded-lg border border-[var(--hairline)] bg-[var(--cream)] px-4 py-3 text-sm font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--cobalt)] hover:text-[var(--ink)]"
        >
          Recalculate with different inputs
        </button>

        <p className="text-xs text-[var(--ink-meta)]">
          Your inputs logged anonymously (hashed IP, coarse UA) for
          model calibration. We never capture your email unless you
          click &ldquo;Talk to our team.&rdquo;
        </p>
      </div>
    </div>
  );
}

export default BrandFmvCalculatorClient;
