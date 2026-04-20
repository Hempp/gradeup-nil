/**
 * StateBlogHero — hero block for per-state NIL rules blog pages.
 *
 * Server Component. Combines the shared dark aesthetic with a status
 * badge, quick-fact strip, and the last-reviewed date for trust.
 */
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
        bg: 'bg-[var(--accent-success)]/15',
        border: 'border-[var(--accent-success)]/40',
        text: 'text-[var(--accent-success)]',
      };
    case 'limited':
      return {
        bg: 'bg-[var(--accent-gold)]/15',
        border: 'border-[var(--accent-gold)]/40',
        text: 'text-[var(--accent-gold)]',
      };
    case 'transitioning':
      return {
        bg: 'bg-[var(--accent-primary)]/15',
        border: 'border-[var(--accent-primary)]/40',
        text: 'text-[var(--accent-primary)]',
      };
    case 'prohibited':
      return {
        bg: 'bg-white/5',
        border: 'border-white/20',
        text: 'text-white/70',
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
      className="relative bg-black pt-28 pb-16 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.08) 0%, transparent 55%)',
        }}
      />
      <div className="absolute inset-0 hero-grid opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/50">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <a href="/" className="hover:text-white">
                Home
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <a
                href="/blog/state-nil-rules"
                className="hover:text-white"
              >
                State NIL rules
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-white/80">{stateName}</li>
          </ol>
        </nav>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${tone.bg} ${tone.border} ${tone.text} text-xs font-semibold uppercase tracking-widest mb-5`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${tone.text.replace('text-', 'bg-')}`}
            />
          </span>
          {statusLabel}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl">
          NIL rules for{' '}
          <span className="text-[var(--accent-primary)]">{stateName}</span>{' '}
          high-school athletes
        </h1>

        <p className="mt-5 text-lg sm:text-xl text-white/70 max-w-2xl">
          {statusDescription} Governing body: <strong>{governingBody}</strong>.
        </p>

        <p className="mt-4 text-sm text-white/50">
          Last reviewed: {lastReviewed}. Content is pulled directly from
          GradeUp&rsquo;s rules engine and updates whenever the underlying rule
          changes.
        </p>

        {quickFacts.length > 0 ? (
          <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <dt className="text-xs uppercase tracking-widest text-white/50">
                  {fact.label}
                </dt>
                <dd className="mt-1 font-semibold text-white">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
