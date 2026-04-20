/**
 * SolutionCtaBand — final CTA band rendered at the bottom of each
 * /solutions/* persona page. Matches the aurora-gradient treatment used on
 * the main landing page's final CTA.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
      className="relative py-20 overflow-hidden bg-gradient-to-br from-[var(--accent-primary)]/25 via-black to-[var(--accent-gold)]/20 border-t border-white/10"
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 70% 20%, rgba(0,240,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(255,200,0,0.12) 0%, transparent 55%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          {heading}
        </h2>
        {subheading ? (
          <p className="mt-4 text-white/70 text-lg max-w-2xl mx-auto">
            {subheading}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryHref}
            className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
            aria-label={primaryLabel}
          >
            {primaryLabel}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          {secondaryLabel && secondaryHref ? (
            <Link
              href={secondaryHref}
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
              aria-label={secondaryLabel}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>

        {trustNote ? (
          <p className="mt-5 text-sm text-white/60">{trustNote}</p>
        ) : null}
      </div>
    </section>
  );
}
