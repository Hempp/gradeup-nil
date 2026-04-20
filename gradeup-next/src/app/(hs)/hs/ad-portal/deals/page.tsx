/**
 * /hs/ad-portal/deals — Paginated in-state deals list for the AD.
 *
 * Read-only. Filters by status and date range (via ?status=, ?dateStart=,
 * ?dateEnd=). Sport/school filters are supported by the service but not
 * surfaced as UI in this pass — they're wired into the query string so an
 * operator can deep-link.
 *
 * Every fetch logs state_ad_portal_views via logPortalView('deal_list').
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  listDealsInState,
  logPortalView,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';
import { ADDealRow } from '@/components/hs/ADDealRow';

export const metadata: Metadata = {
  title: 'Deals — State Compliance Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 25;

async function requireStateAd(selectedState: string | undefined): Promise<{
  userId: string;
  assignments: StateAdAssignment[];
  active: StateAdAssignment;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const assignments = await listAssignmentsForUser(user.id);
  if (assignments.length === 0) notFound();

  const active =
    (selectedState
      ? assignments.find((a) => a.stateCode === selectedState)
      : assignments[0]) ?? assignments[0];
  if (!active) notFound();
  return { userId: user.id, assignments, active };
}

function pickString(
  v: string | string[] | undefined,
  fallback?: string
): string | undefined {
  if (!v) return fallback;
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdPortalDealsPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const stateCode = pickString(search.state);
  const { userId, active } = await requireStateAd(stateCode);

  const page = Math.max(1, Number(pickString(search.page, '1')) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const filters = {
    status: pickString(search.status),
    dateStart: pickString(search.dateStart),
    dateEnd: pickString(search.dateEnd),
    sport: pickString(search.sport),
    school: pickString(search.school),
    limit: PAGE_SIZE,
    offset,
  };

  await logPortalView(userId, active.stateCode, 'deal_list');
  const { rows, total } = await listDealsInState(active.stateCode, filters);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qsBase = new URLSearchParams();
  qsBase.set('state', active.stateCode);
  if (filters.status) qsBase.set('status', filters.status);
  if (filters.dateStart) qsBase.set('dateStart', filters.dateStart);
  if (filters.dateEnd) qsBase.set('dateEnd', filters.dateEnd);

  function pageHref(p: number): string {
    const q = new URLSearchParams(qsBase);
    q.set('page', String(p));
    return `/hs/ad-portal/deals?${q.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Breadcrumb stateCode={active.stateCode} label="Deals" />
        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            {active.organizationName} · Deals
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            All {active.stateCode} deals
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {total} deal{total === 1 ? '' : 's'} in view. Read-only. Drill into
            a row for parental consent + disclosure detail.
          </p>
        </header>

        <FilterBar
          stateCode={active.stateCode}
          status={filters.status}
          dateStart={filters.dateStart}
          dateEnd={filters.dateEnd}
        />

        {rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            No deals match the current filters.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((row) => (
              <ADDealRow
                key={row.id}
                row={row}
                href={`/hs/ad-portal/deals/${encodeURIComponent(row.id)}?state=${encodeURIComponent(active.stateCode)}`}
              />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label="Pagination"
            className="mt-6 flex items-center justify-between gap-3"
          >
            <span className="text-xs text-white/50">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
                >
                  ← Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
                >
                  Next →
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  );
}

function Breadcrumb({ stateCode, label }: { stateCode: string; label: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs uppercase tracking-widest text-white/50"
    >
      <Link
        href={`/hs/ad-portal?state=${encodeURIComponent(stateCode)}`}
        className="hover:text-white"
      >
        Portal
      </Link>
      <span className="mx-2 text-white/30">/</span>
      <span className="text-white/80">{label}</span>
    </nav>
  );
}

function FilterBar({
  stateCode,
  status,
  dateStart,
  dateEnd,
}: {
  stateCode: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
}) {
  const statusOptions = [
    '',
    'pending',
    'negotiating',
    'accepted',
    'active',
    'fully_signed',
    'in_review',
    'approved',
    'paid',
    'completed',
    'cancelled',
  ];
  return (
    <form
      method="GET"
      action="/hs/ad-portal/deals"
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <input type="hidden" name="state" value={stateCode} />
      <label className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          Status
        </span>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        >
          {statusOptions.map((s) => (
            <option key={s || 'any'} value={s}>
              {s ? s.replace(/_/g, ' ') : 'Any'}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          Created after
        </span>
        <input
          type="date"
          name="dateStart"
          defaultValue={dateStart ?? ''}
          className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          Created before
        </span>
        <input
          type="date"
          name="dateEnd"
          defaultValue={dateEnd ?? ''}
          className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
      >
        Apply
      </button>
    </form>
  );
}
