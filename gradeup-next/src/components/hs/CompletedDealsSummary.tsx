/**
 * CompletedDealsSummary — compact list of completed deals for the
 * trajectory narrative view.
 *
 * Distinct from CompletedDealsTable (which is the earnings-ledger
 * surface with columns, shares, deliverables, etc.). The trajectory
 * is a story; this renders that story with minimal chrome.
 */

import type { TrajectoryDeal } from '@/lib/hs-nil/trajectory';
import { formatCentsUSD, formatDateShort } from '@/lib/hs-nil/earnings';

export interface CompletedDealsSummaryProps {
  deals: TrajectoryDeal[];
  emptyCopy?: string;
  className?: string;
}

export function CompletedDealsSummary({
  deals,
  emptyCopy = 'No completed deals yet.',
  className,
}: CompletedDealsSummaryProps) {
  if (deals.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60 ${className ?? ''}`}
      >
        {emptyCopy}
      </div>
    );
  }

  return (
    <ul
      className={`divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] ${className ?? ''}`}
    >
      {deals.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-4 px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
            {d.brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.brandLogoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-white/70">
                {d.brandName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {d.brandName}
            </p>
            <p className="truncate text-xs text-white/60">{d.title}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-white">
              {formatCentsUSD(d.compensationCents)}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-white/40">
              {formatDateShort(d.completedAt ?? d.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default CompletedDealsSummary;
