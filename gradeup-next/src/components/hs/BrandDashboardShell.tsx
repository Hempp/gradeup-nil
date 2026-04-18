/**
 * BrandDashboardShell — chrome for the HS brand experience.
 *
 * Keeps the same dark marketing palette as the athlete / parent HS
 * dashboards and exposes a single slot for page content. The shell
 * itself is a Server Component (no client state), so it can be
 * composed directly from Server Components that fetch via SSR
 * Supabase.
 *
 * Header shape:
 *   - Eyebrow ("Brand dashboard")
 *   - Greeting with brand name or first name fallback.
 *   - Operating-states pill stack.
 *   - Deal-categories badge stack.
 *   - Primary CTA slot (typically "Post a new deal").
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BrandDashboardShellProps {
  brandName: string;
  firstName?: string | null;
  operatingStates: string[];
  dealCategories: string[];
  /** Optional CTA element rendered in the header — defaults to "Post a new deal". */
  primaryCta?: ReactNode;
  /** Optional secondary CTAs rendered next to the primary. */
  secondaryCtas?: ReactNode;
  children: ReactNode;
}

const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
};

const CATEGORY_LABELS: Record<string, string> = {
  apparel: 'Apparel',
  food_beverage: 'Food & beverage',
  local_business: 'Local business',
  training: 'Training & camps',
  autograph: 'Autograph',
  social_media_promo: 'Social promo',
};

export default function BrandDashboardShell({
  brandName,
  firstName,
  operatingStates,
  dealCategories,
  primaryCta,
  secondaryCtas,
  children,
}: BrandDashboardShellProps) {
  const defaultCta = (
    <Link
      href="/hs/brand/deals/new"
      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
    >
      Post a new deal
    </Link>
  );

  const greeting =
    firstName && firstName.trim().length > 0
      ? `Welcome back, ${firstName}.`
      : `Welcome, ${brandName}.`;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Brand dashboard
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">{greeting}</h1>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            You&rsquo;re signed in as{' '}
            <span className="font-semibold text-white">{brandName}</span>.
          </p>

          {operatingStates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Operating states
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {operatingStates.map((code) => (
                  <li
                    key={code}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/90"
                  >
                    {STATE_LABELS[code] ?? code}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dealCategories.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Deal categories
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {dealCategories.map((id) => (
                  <li
                    key={id}
                    className="inline-flex items-center rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]"
                  >
                    {CATEGORY_LABELS[id] ?? id}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {primaryCta ?? defaultCta}
            {secondaryCtas}
          </div>
        </header>

        <div className="mt-12">{children}</div>
      </div>
    </main>
  );
}
