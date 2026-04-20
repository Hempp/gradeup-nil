/**
 * ADPortalMetricsHeader — signal stack for the top of the AD dashboard.
 *
 * Pure presentational Server Component. Reuses AdminSignalBadge styling so
 * the portal feels like the same design language as /hs/admin even though
 * it's a separate surface with a different audience (state AD, not ops).
 */

import { AdminSignalBadge } from '@/components/hs/AdminSignalBadge';
import type { PortalMetrics } from '@/lib/hs-nil/state-ad-portal';

export interface ADPortalMetricsHeaderProps {
  metrics: PortalMetrics;
  stateDisplayName: string;
}

function fmtPct(rate: number | null): string {
  if (rate === null) return 'n/a';
  return `${Math.round(rate * 100)}%`;
}

function fmtHours(hours: number | null): string {
  if (hours === null) return 'n/a';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ADPortalMetricsHeader({
  metrics,
  stateDisplayName,
}: ADPortalMetricsHeaderProps) {
  return (
    <section aria-labelledby="ad-portal-metrics-heading" className="mt-8">
      <h2
        id="ad-portal-metrics-heading"
        className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]"
      >
        {stateDisplayName} · compliance snapshot
      </h2>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Signal summary">
        <AdminSignalBadge
          label="active deals"
          count={metrics.totalActiveDeals}
          thresholds={{ warn: 9999, urgent: 99999 }}
        />
        <AdminSignalBadge
          label="signed deals"
          count={metrics.totalSignedDeals}
          thresholds={{ warn: 9999, urgent: 99999 }}
        />
        <AdminSignalBadge
          label="disclosures emitted"
          count={metrics.totalDisclosuresEmitted}
          thresholds={{ warn: 9999, urgent: 99999 }}
        />
        <AdminSignalBadge
          label="disclosures failed"
          count={metrics.totalDisclosuresFailed}
          thresholds={{ warn: 1, urgent: 5 }}
        />
        <AdminSignalBadge
          label="disputes"
          count={metrics.totalDisputes}
          thresholds={{ warn: 1, urgent: 3 }}
        />
        <AdminSignalBadge
          label="athletes"
          count={metrics.athletesActive}
          thresholds={{ warn: 9999, urgent: 99999 }}
        />
        <AdminSignalBadge
          label="brands"
          count={metrics.brandsActive}
          thresholds={{ warn: 9999, urgent: 99999 }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Disclosure success
          </dt>
          <dd className="mt-1 font-display text-2xl tabular-nums text-white">
            {fmtPct(metrics.disclosureSuccessRate)}
          </dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Avg time to disclose
          </dt>
          <dd className="mt-1 font-display text-2xl tabular-nums text-white">
            {fmtHours(metrics.averageHoursToDisclosure)}
          </dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Paid deals
          </dt>
          <dd className="mt-1 font-display text-2xl tabular-nums text-white">
            {metrics.totalPaidDeals}
          </dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Failed disclosures
          </dt>
          <dd className="mt-1 font-display text-2xl tabular-nums text-white">
            {metrics.totalDisclosuresFailed}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default ADPortalMetricsHeader;
