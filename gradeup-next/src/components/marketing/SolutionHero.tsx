/**
 * SolutionHero — reusable hero block for /solutions/* persona pages.
 *
 * Shared dark Nike-inspired tone matching /hs:
 *   - Bebas Neue display type via .font-display
 *   - Radial cyan/gold background glows
 *   - Hero grid overlay
 *   - Subtle hairline badge for the eyebrow
 *
 * Primary CTA is required; secondary is optional. Both support external-style
 * links (Opendorse's persona landings always pair "Request demo" with
 * "Browse the product"). Buttons are ≥44px tall for WCAG 2.5.5.
 *
 * Server Component — no client state.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface SolutionCta {
  label: string;
  href: string;
  ariaLabel?: string;
}

export interface SolutionHeroProps {
  eyebrow: string;
  title: string;
  titleAccent?: string; // optional highlighted tail — rendered in cyan
  subtitle: string;
  primaryCta: SolutionCta;
  secondaryCta?: SolutionCta;
  /** Short supporting line under CTAs (e.g. "Free to start • Takes 2 min"). */
  supportingNote?: string;
}

export function SolutionHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  primaryCta,
  secondaryCta,
  supportingNote,
}: SolutionHeroProps) {
  return (
    <section
      aria-label={`${eyebrow} hero`}
      className="relative bg-black pt-32 pb-20 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.09) 0%, transparent 55%)',
        }}
      />
      <div className="absolute inset-0 hero-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]" />
          </span>
          <span className="text-sm font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white max-w-4xl">
          {title}
          {titleAccent ? (
            <>
              {' '}
              <span className="text-[var(--accent-primary)]">{titleAccent}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl">
          {subtitle}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href={primaryCta.href}
            aria-label={primaryCta.ariaLabel ?? primaryCta.label}
            className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
          >
            {primaryCta.label}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              aria-label={secondaryCta.ariaLabel ?? secondaryCta.label}
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>

        {supportingNote ? (
          <p className="mt-4 text-sm text-white/50">{supportingNote}</p>
        ) : null}
      </div>
    </section>
  );
}
