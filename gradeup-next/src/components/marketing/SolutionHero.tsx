/**
 * SolutionHero — reusable hero block for /solutions/* persona pages.
 *
 * Cream editorial tone matching the rest of the marketing surface:
 *   - Anton display type via .font-display, ink headline + cobalt key phrase
 *   - Serif subcopy (inherited from the `.marketing-dark` scope)
 *   - Mono eyebrow badge
 *   - Optional duotone editorial photo alongside the copy
 *
 * Primary CTA is required; secondary is optional. Both support external-style
 * links (Opendorse's persona landings always pair "Request demo" with
 * "Browse the product"). Buttons are ≥44px tall for WCAG 2.5.5.
 *
 * Server Component — no client state.
 */
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export interface SolutionCta {
  label: string;
  href: string;
  ariaLabel?: string;
}

export interface SolutionHeroProps {
  eyebrow: string;
  title: string;
  titleAccent?: string; // optional highlighted tail — rendered in cobalt
  subtitle: string;
  primaryCta: SolutionCta;
  secondaryCta?: SolutionCta;
  /** Short supporting line under CTAs (e.g. "Free to start • Takes 2 min"). */
  supportingNote?: string;
  /** Optional editorial photo rendered duotone alongside the copy. */
  image?: { src: string; alt: string };
}

export function SolutionHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  primaryCta,
  secondaryCta,
  supportingNote,
  image,
}: SolutionHeroProps) {
  return (
    <section
      aria-label={`${eyebrow} hero`}
      className="relative bg-[var(--cream)] pt-32 pb-20 overflow-hidden"
    >
      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
          image ? 'grid lg:grid-cols-2 gap-12 items-center' : ''
        }`}
      >
        <div>
          <div className="eyebrow inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cobalt)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--cobalt)]" />
            </span>
            {eyebrow}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight text-[var(--ink)] max-w-4xl">
            {title}
            {titleAccent ? (
              <>
                {' '}
                <span className="text-[var(--cobalt)]">{titleAccent}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[var(--ink-muted)] max-w-2xl">
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
            <p className="mt-4 text-sm text-[var(--ink-meta)]">{supportingNote}</p>
          ) : null}
        </div>

        {image ? (
          <div className="duotone relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
