/**
 * SolutionCtaBand — final CTA band rendered at the bottom of each
 * /solutions/* persona page. Cobalt editorial band matching the cream
 * theme's arrow-pill CTA treatment.
 */
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export interface SolutionCtaBandProps {
  heading: string;
  subheading?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Trust row shown under the buttons (comma-delimited). */
  trustNote?: string;
}

export function SolutionCtaBand({
  heading,
  subheading,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  trustNote,
}: SolutionCtaBandProps) {
  return (
    <section
      aria-label="Final call to action"
      className="relative py-20 overflow-hidden bg-[var(--cobalt)] border-t border-[var(--hairline)]"
    >
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#FBF9F2]">
          {heading}
        </h2>
        {subheading ? (
          <p className="mt-4 text-[#FBF9F2]/80 text-lg max-w-2xl mx-auto">
            {subheading}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryHref}
            className="arrow-pill inline-flex items-center justify-center gap-3 px-6 py-3 min-h-[44px] rounded-full bg-[var(--cream-surface)] text-[var(--cobalt)] font-semibold shadow-lg"
            aria-label={primaryLabel}
          >
            {primaryLabel}
            <span className="circle inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--cobalt)]">
              <ArrowUpRight className="h-4 w-4 text-[#FBF9F2]" aria-hidden="true" />
            </span>
          </Link>
          {secondaryLabel && secondaryHref ? (
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold border border-[#FBF9F2]/40 text-[#FBF9F2] hover:bg-[#FBF9F2]/10 transition-colors"
              aria-label={secondaryLabel}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>

        {trustNote ? (
          <p className="mt-5 text-sm text-[#FBF9F2]/60">{trustNote}</p>
        ) : null}
      </div>
    </section>
  );
}
