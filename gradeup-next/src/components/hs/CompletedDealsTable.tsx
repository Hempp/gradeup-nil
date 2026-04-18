/**
 * CompletedDealsTable — shared history table for athlete + brand views.
 *
 * Single component, two callers, controlled via `role`:
 *
 *   - role="athlete": columns = Brand, Date, Amount, Shares, Deliverables.
 *   - role="brand":   columns = Athlete, School, Date, Amount, Shares.
 *
 * Server-safe (no client state). Pagination is caller-controlled (pass the
 * next slice on the next render — we intentionally don't own routing state
 * because the earnings/performance pages may want cursor semantics later).
 *
 * Empty state is explicit — this is a surface where "no completed deals
 * yet" is the common case for early cohort users and we want the copy to
 * feel like momentum, not failure.
 */
import Link from 'next/link';
import {
  formatCentsUSD,
  formatDateShort,
  type CompletedDeal,
} from '@/lib/hs-nil/earnings';

export type CompletedDealsTableRole = 'athlete' | 'brand';

export interface CompletedDealsTableProps {
  deals: CompletedDeal[];
  role: CompletedDealsTableRole;
  /** Shown when `deals` is empty. */
  emptyCopy?: string;
  className?: string;
}

export function CompletedDealsTable({
  deals,
  role,
  emptyCopy,
  className,
}: CompletedDealsTableProps) {
  if (deals.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60 ${className ?? ''}`}
      >
        {emptyCopy ??
          (role === 'athlete'
            ? 'No completed deals yet. Your first one will show up here.'
            : 'No completed deals yet. Post a deal to get started.')}
      </div>
    );
  }

  const headers =
    role === 'athlete'
      ? ['Brand', 'Date', 'Amount', 'Shares', '']
      : ['Athlete', 'School', 'Date', 'Amount', 'Shares'];

  return (
    <div
      className={`overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] ${className ?? ''}`}
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/50">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => {
            const dateStr = formatDateShort(d.completedAt ?? d.createdAt);
            const amountStr = formatCentsUSD(d.compensationCents);
            if (role === 'athlete') {
              return (
                <tr
                  key={d.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {d.brandName}
                  </td>
                  <td className="px-4 py-3 text-white/70">{dateStr}</td>
                  <td className="px-4 py-3 tabular-nums text-white">
                    {amountStr}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/70">
                    {d.shareCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/hs/deals/${d.id}`}
                      className="inline-flex items-center text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={d.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/5"
              >
                <td className="px-4 py-3 font-medium text-white">
                  {d.athleteFirstName}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {d.athleteSchool ?? '—'}
                </td>
                <td className="px-4 py-3 text-white/70">{dateStr}</td>
                <td className="px-4 py-3 tabular-nums text-white">
                  {amountStr}
                </td>
                <td className="px-4 py-3 tabular-nums text-white/70">
                  {d.shareCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CompletedDealsTable;
