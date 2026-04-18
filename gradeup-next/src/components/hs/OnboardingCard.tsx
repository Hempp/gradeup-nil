/**
 * OnboardingCard — reusable dark-themed presentation card.
 *
 * Matches the palette of the /hs marketing landing page (dark background,
 * subtle white/10 border, glass-morphism blur). Use this wherever the
 * onboarding pages need a card container so visual tone stays consistent.
 */

import type { ReactNode } from 'react';

export interface OnboardingCardProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Render a colored left accent bar — used for emphasis cards. */
  accent?: boolean;
}

export function OnboardingCard({
  title,
  eyebrow,
  description,
  children,
  className,
  accent,
}: OnboardingCardProps) {
  const base =
    'rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8';
  const accentCls = accent
    ? 'border-l-4 border-l-[var(--accent-primary)]'
    : '';
  return (
    <div className={[base, accentCls, className ?? ''].filter(Boolean).join(' ')}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-2 text-sm text-white/70 md:text-base">{description}</p>
      )}
      {children && <div className={title || description ? 'mt-5' : ''}>{children}</div>}
    </div>
  );
}

export default OnboardingCard;
