/**
 * /blog/state-nil-rules — INDEX page.
 *
 * SEO target: parents Googling "what states allow HS NIL", "high school NIL
 * rules by state", "does my state allow NIL". Lists every US state + DC,
 * grouped by permission status, with a last-reviewed date per state.
 *
 * All data is derived from state-rules.ts + state-blog-content.ts, so
 * the index auto-updates whenever the rules engine changes.
 *
 * Server Component. Statically rendered with daily revalidation.
 */
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  groupStateBlogPostsByStatus,
  permissionStatusLabel,
  permissionStatusDescription,
  type StateBlogIndexEntry,
} from '@/lib/hs-nil/state-blog-content';
import type { PermissionStatus } from '@/lib/hs-nil/state-rules';
import { SolutionSchema } from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

const PAGE_URL = '/blog/state-nil-rules';

export const revalidate = 86400; // Rebuild once per day.

export const metadata = {
  ...buildMarketingMetadata({
    title: 'High-School NIL Rules by State (2026 Guide) | GradeUp',
    description:
      'Complete 2026 guide to high-school Name, Image, and Likeness (NIL) rules in all 50 U.S. states and D.C. See which states permit HS NIL, the consent and disclosure rules, banned categories, and state-by-state compliance details.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL rules',
    'states that allow HS NIL',
    'NIL by state',
    'state NIL laws',
    'HS NIL guide 2026',
    'high school name image likeness',
  ],
};

const STATUS_ORDER: PermissionStatus[] = [
  'permitted',
  'limited',
  'transitioning',
  'prohibited',
];

function statusAccent(status: PermissionStatus) {
  switch (status) {
    case 'permitted':
      return {
        dot: 'bg-[var(--accent-success)]',
        text: 'text-[var(--accent-success)]',
        border: 'border-[var(--accent-success)]/30',
        bg: 'bg-[var(--accent-success)]/10',
      };
    case 'limited':
      return {
        dot: 'bg-[var(--accent-gold)]',
        text: 'text-[var(--accent-gold)]',
        border: 'border-[var(--accent-gold)]/30',
        bg: 'bg-[var(--accent-gold)]/10',
      };
    case 'transitioning':
      return {
        dot: 'bg-[var(--accent-primary)]',
        text: 'text-[var(--accent-primary)]',
        border: 'border-[var(--accent-primary)]/30',
        bg: 'bg-[var(--accent-primary)]/10',
      };
    case 'prohibited':
      return {
        dot: 'bg-white/40',
        text: 'text-white/70',
        border: 'border-white/15',
        bg: 'bg-white/5',
      };
  }
}

function StateCard({ entry }: { entry: StateBlogIndexEntry }) {
  const accent = statusAccent(entry.status);
  return (
    <Link
      href={entry.canonicalPath}
      className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
      aria-label={`${entry.name} high-school NIL rules — ${permissionStatusLabel(entry.status)}`}
    >
      <div className="min-w-0">
        <div className="text-white font-semibold truncate group-hover:text-[var(--accent-primary)] transition-colors">
          {entry.name}
        </div>
        <div className="text-xs text-white/50 mt-0.5 truncate">
          {entry.governingBody} &middot; Last reviewed {entry.lastReviewed}
        </div>
      </div>
      <span
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap ${accent.bg} ${accent.border} ${accent.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
        {permissionStatusLabel(entry.status)}
      </span>
    </Link>
  );
}

export default function StateRulesIndexPage() {
  const groups = groupStateBlogPostsByStatus();

  const totalPermitted = groups.permitted.length;
  const totalLimited = groups.limited.length;
  const totalTransitioning = groups.transitioning.length;
  const totalProhibited = groups.prohibited.length;

  return (
    <>
      <SolutionSchema
        scriptId="state-rules-index-jsonld"
        pageUrl={PAGE_URL}
        name="High-School NIL Rules by State"
        description="Complete guide to high-school NIL rules in every U.S. state and D.C. Grouped by permission status and updated regularly from each state athletic association."
        audience="Parents, high-school athletes, and brands evaluating NIL eligibility by state"
      />

      <section
        aria-label="State NIL rules hero"
        className="relative bg-black pt-32 pb-14 overflow-hidden"
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
            <Sparkles
              className="h-4 w-4 text-[var(--accent-primary)]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-white/90">
              Updated from 51 state athletic associations
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl">
            High-school NIL rules,{' '}
            <span className="text-[var(--accent-primary)]">state by state.</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-white/70 max-w-3xl">
            Your high-schooler&rsquo;s NIL eligibility is set by the state they
            compete in — not the state where the brand is. This guide lists all
            50 states and D.C. by permission status, with a dedicated page for
            every one. Same data our compliance engine uses on live deals.
          </p>

          <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            <SummaryStat
              label="Permitted"
              value={totalPermitted}
              status="permitted"
            />
            <SummaryStat
              label="Limited"
              value={totalLimited}
              status="limited"
            />
            <SummaryStat
              label="Transitioning"
              value={totalTransitioning}
              status="transitioning"
            />
            <SummaryStat
              label="Not yet permitted"
              value={totalProhibited}
              status="prohibited"
            />
          </dl>
        </div>
      </section>

      <section
        aria-label="State directory"
        className="bg-[var(--marketing-gray-950)] py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {STATUS_ORDER.map((status) => {
            const entries = groups[status];
            if (entries.length === 0) return null;
            const accent = statusAccent(status);
            return (
              <div key={status}>
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest ${accent.bg} ${accent.border} ${accent.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                    {permissionStatusLabel(status)}
                  </span>
                  <span className="text-sm text-white/50">
                    {entries.length} state{entries.length === 1 ? '' : 's'}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                  {groupHeading(status)}
                </h2>
                <p className="text-white/60 text-sm max-w-2xl mb-6">
                  {permissionStatusDescription(status)}
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => (
                    <li key={entry.code}>
                      <StateCard entry={entry} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Not sure how this applies to your athlete?
            </h2>
            <p className="mt-3 text-white/70 max-w-2xl mx-auto">
              GradeUp handles the compliance automatically. Sign up free — we
              route your athlete into the right state rules the moment they
              create a profile.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/solutions/parents"
                className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
              >
                See how it works for parents
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/hs"
                className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
              >
                Join the HS waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function groupHeading(status: PermissionStatus): string {
  switch (status) {
    case 'permitted':
      return 'States that permit HS NIL';
    case 'limited':
      return 'States with limited HS NIL';
    case 'transitioning':
      return 'States in transition';
    case 'prohibited':
      return 'States that do not yet permit HS NIL';
  }
}

function SummaryStat({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: PermissionStatus;
}) {
  const accent = statusAccent(status);
  return (
    <div
      className={`rounded-xl border p-4 ${accent.bg} ${accent.border}`}
    >
      <dt className="text-xs uppercase tracking-widest text-white/60">
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-bold ${accent.text}`}>
        {value}
      </dd>
    </div>
  );
}
