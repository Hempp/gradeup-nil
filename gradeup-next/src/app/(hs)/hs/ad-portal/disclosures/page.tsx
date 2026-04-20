/**
 * /hs/ad-portal/disclosures — All disclosures emitted for this state.
 *
 * Read-only. Lists successful and failed disclosures with payload preview.
 * Filters: status, date range. Logs state_ad_portal_views('disclosure_list').
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  listDisclosuresInState,
  logPortalView,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';
import { ADDisclosureRow } from '@/components/hs/ADDisclosureRow';

export const metadata: Metadata = {
  title: 'Disclosures — State Compliance Portal',
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
  return { userId: user.id, active };
}

function pickString(
  v: string | string[] | undefined,
  fallback?: string
): string | undefined {
  if (!v) return fallback;
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdPortalDisclosuresPage({
  searchParams,
}: PageProps) {
  const search = await searchParams;
  const stateCode = pickString(search.state);
  const { userId, active } = await requireStateAd(stateCode);

  const page = Math.max(1, Number(pickString(search.page, '1')) || 1);
  const filters = {
    status: pickString(search.status),
    dateStart: pickString(search.dateStart),
    dateEnd: pickString(search.dateEnd),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  await logPortalView(userId, active.stateCode, 'disclosure_list');
  const { rows, total } = await listDisclosuresInState(
    active.stateCode,
    filters
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qsBase = new URLSearchParams();
  qsBase.set('state', active.stateCode);
  if (filters.status) qsBase.set('status', filters.status);
  if (filters.dateStart) qsBase.set('dateStart', filters.dateStart);
  if (filters.dateEnd) qsBase.set('dateEnd', filters.dateEnd);

  function pageHref(p: number): string {
    const q = new URLSearchParams(qsBase);
    q.set('page', String(p));
    return `/hs/ad-portal/disclosures?${q.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link
            href={`/hs/ad-portal?state=${encodeURIComponent(active.stateCode)}`}
            className="hover:text-white"
          >
            Portal
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Disclosures</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            {active.organizationName} · Disclosures
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            All {active.stateCode} disclosures
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {total} record{total === 1 ? '' : 's'}. Read-only. Payload previews
            only — no PII.
          </p>
        </header>

        <form
          method="GET"
          action="/hs/ad-portal/disclosures"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <input type="hidden" name="state" value={active.stateCode} />
          <label className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Status
            </span>
            <select
              name="status"
              defaultValue={filters.status ?? ''}
              className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
            >
              <option value="">Any</option>
              <option value="sent">sent</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Created after
            </span>
            <input
              type="date"
              name="dateStart"
              defaultValue={filters.dateStart ?? ''}
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
              defaultValue={filters.dateEnd ?? ''}
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

        {rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            No disclosures match the current filters.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((row) => (
              <ADDisclosureRow key={row.id} row={row} />
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
