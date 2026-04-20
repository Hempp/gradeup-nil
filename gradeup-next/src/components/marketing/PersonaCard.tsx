/**
 * PersonaCard — linkable card used on /solutions overview and for cross-links
 * on individual persona pages.
 *
 * Matches the CaseStudyCard visual language (dark card + hover accent) so the
 * marketing surface has one consistent card system.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PersonaCardProps {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  /** Icon node (e.g. <Heart />) — rendered at 24px. */
  icon?: ReactNode;
  /** Optional short list of "what you get" shown as bullets. */
  bullets?: string[];
  /** Optional short CTA label override. Default: "Learn more". */
  ctaLabel?: string;
}

export function PersonaCard({
  eyebrow,
  title,
  description,
  href,
  icon,
  bullets,
  ctaLabel,
}: PersonaCardProps) {
  return (
    <Link
      href={href}
      className="group card-marketing p-6 flex flex-col h-full hover-lift transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={`${title} — ${ctaLabel ?? 'Learn more'}`}
    >
      {icon ? (
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-4">
          {icon}
        </div>
      ) : null}
      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] mb-2">
        {eyebrow}
      </span>
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
        {title}
      </h3>
      <p className="text-white/70 text-sm mb-4 leading-relaxed">{description}</p>
      {bullets && bullets.length > 0 ? (
        <ul className="mb-5 space-y-2 text-sm text-white/80">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span
                className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] flex-shrink-0"
                aria-hidden="true"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)]">
        {ctaLabel ?? 'Learn more'}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
