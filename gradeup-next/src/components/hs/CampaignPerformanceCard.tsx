/**
 * CampaignPerformanceCard — brand-side aggregate stats for a single
 * campaign. Reads campaign_performance_summary via the service layer
 * (server-component caller).
 */

export interface CampaignPerformanceCardProps {
  participantCount: number;
  completedCount: number;
  activeCount: number;
  totalShares: number;
  totalCompensationCents: number;
}

export function CampaignPerformanceCard(
  props: CampaignPerformanceCardProps,
) {
  const dollars = (props.totalCompensationCents / 100).toLocaleString(
    undefined,
    { maximumFractionDigits: 0 },
  );
  return (
    <section
      aria-labelledby="campaign-perf-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <h3
        id="campaign-perf-heading"
        className="font-display text-xl text-white/80"
      >
        Campaign performance
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Participants" value={props.participantCount.toString()} />
        <Stat label="Active" value={props.activeCount.toString()} />
        <Stat label="Completed" value={props.completedCount.toString()} />
        <Stat label="Total shares" value={props.totalShares.toString()} />
      </div>
      <p className="mt-4 text-sm text-white/60">
        Committed spend:{' '}
        <span className="font-semibold text-white">${dollars}</span> across
        active + delivered + completed participants.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white">{value}</p>
    </div>
  );
}
