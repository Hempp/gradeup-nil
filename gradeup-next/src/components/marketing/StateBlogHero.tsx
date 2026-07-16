/**
 * StateBlogHero — hero block for per-state NIL rules blog pages.
 *
 * Server Component. Combines the shared dark aesthetic with a status
 * badge, quick-fact strip, and the last-reviewed date for trust.
 */
import Link from 'next/link';
import type { PermissionStatus } from '@/lib/hs-nil/state-rules';

export interface StateBlogHeroProps {
  stateName: string;
  status: PermissionStatus;
  statusLabel: string;
  statusDescription: string;
  governingBody: string;
  lastReviewed: string;
  quickFacts: Array<{ label: string; value: string }>;
}

function statusTone(status: PermissionStatus) {
  switch (status) {
    case 'permitted':
      return {
        bg: 'bg-[var(--status-verified)]/10',
        border: 'border-[var(--status-verified)]/40',
        text: 'text-[var(--status-verified)]',
        dot: 'bg-[var(--status-verified)]',
      };
    case 'limited':
      return {
        bg: 'bg-[var(--status-caution)]/10',
        border: 'border-[var(--status-caution)]/40',
        text: 'text-[var(--status-caution)]',
        dot: 'bg-[var(--status-caution)]',
      };
    case 'transitioning':
      return {
        bg: 'bg-[var(--cobalt)]/10',
        border: 'border-[var(--cobalt)]/40',
        text: 'text-[var(--cobalt)]',
        dot: 'bg-[var(--cobalt)]',
      };
    case 'prohibited':
      return {
        bg: 'bg-[var(--status-restricted)]/10',
        border: 'border-[var(--status-restricted)]/40',
        text: 'text-[var(--status-restricted)]',
        dot: 'bg-[var(--status-restricted)]',
      };
  }
}

export function StateBlogHero({
  stateName,
  status,
  statusLabel,
  statusDescription,
  governingBody,
  lastReviewed,
  quickFacts,
}: StateBlogHeroProps) {
  const tone = statusTone(status);

  return (
    <section
      aria-label={`${stateName} HS NIL rules hero`}
      className="relative bg-[var(--cream)] pt-28 pb-16 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.3fr_1fr] gap-12 items-start">
        <div>
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--ink-meta)]">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-[var(--cobalt)]">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/blog/state-nil-rules"
                  className="hover:text-[var(--cobalt)]"
                >
                  State NIL rules
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-[var(--ink-muted)]">{stateName}</li>
            </ol>
          </nav>

          <div
            className={`eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full border ${tone.bg} ${tone.border} ${tone.text} mb-5`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${tone.dot}`}
              />
            </span>
            {statusLabel}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[var(--ink)] max-w-3xl">
            NIL rules for{' '}
            <span className="text-[var(--cobalt)]">{stateName}</span>{' '}
            high-school athletes
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-[var(--ink-muted)] max-w-2xl">
            {statusDescription} Governing body: <strong>{governingBody}</strong>.
          </p>

          <p className="mt-4 text-sm text-[var(--ink-meta)]">
            Last reviewed: {lastReviewed}. Content is pulled directly from
            GradeUp&rsquo;s rules engine and updates whenever the underlying rule
            changes.
          </p>

          {quickFacts.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-3">
              {quickFacts.map((fact) => (
                <span key={fact.label} className="stat-strip">
                  {fact.label}: <b>{fact.value}</b>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="duotone relative rounded-2xl overflow-hidden aspect-[4/5] hidden lg:block bg-cover bg-center"
          style={{ backgroundImage: `url(/editorial/photo-04.jpg)` }}
          role="img"
          aria-label="High-school athlete on the field, representing state NIL rules"
        />
      </div>
    </section>
  );
}
