/**
 * ADComplianceRateCard — percentage of on-time disclosures for the
 * state over the supplied window. "On-time" here means:
 *
 *   sent_at <= scheduled_for + grace (we treat 'sent' as on-time since
 *   our pipeline fires the moment the deal signs; the scheduled_for
 *   window is a legal ceiling, not a lower bound).
 *
 * Used as a hero KPI on the AD portal dashboard.
 */

export interface ADComplianceRateCardProps {
  /** 0..1 or null (no data yet). */
  rate: number | null;
  totalEmitted: number;
  totalFailed: number;
}

function tone(rate: number | null): {
  ring: string;
  chipText: string;
  countText: string;
  label: string;
} {
  if (rate === null) {
    return {
      ring: 'ring-white/10',
      chipText: 'text-white/70',
      countText: 'text-white/70',
      label: 'No data yet',
    };
  }
  if (rate >= 0.98) {
    return {
      ring: 'ring-emerald-400/25',
      chipText: 'text-emerald-200',
      countText: 'text-emerald-200',
      label: 'Excellent',
    };
  }
  if (rate >= 0.9) {
    return {
      ring: 'ring-amber-400/30',
      chipText: 'text-amber-200',
      countText: 'text-amber-200',
      label: 'Attention',
    };
  }
  return {
    ring: 'ring-[var(--color-error,#DA2B57)]/30',
    chipText: 'text-[var(--color-error,#DA2B57)]',
    countText: 'text-[var(--color-error,#DA2B57)]',
    label: 'Below SLA',
  };
}

export function ADComplianceRateCard({
  rate,
  totalEmitted,
  totalFailed,
}: ADComplianceRateCardProps) {
  const t = tone(rate);
  const pct = rate === null ? '—' : `${Math.round(rate * 100)}%`;
  return (
    <article
      className={[
        'rounded-xl border border-white/10 bg-white/5 p-6 ring-1',
        t.ring,
      ].join(' ')}
      aria-label="On-time disclosure rate"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-white md:text-2xl">
            On-time disclosure rate
          </h3>
          <p className="mt-1 text-sm text-white/60">
            Percentage of disclosures the pipeline sent successfully within the
            state&rsquo;s legal window.
          </p>
        </div>
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-semibold',
            t.chipText,
          ].join(' ')}
        >
          {t.label}
        </span>
      </header>
      <div className="mt-6 flex items-baseline gap-3">
        <span
          className={[
            'font-display text-5xl tabular-nums leading-none',
            t.countText,
          ].join(' ')}
          aria-label={`${pct} on-time`}
        >
          {pct}
        </span>
        <span className="text-sm text-white/50">on-time</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
        <div>
          <dt className="uppercase tracking-widest text-white/40">Emitted</dt>
          <dd className="mt-0.5 font-mono text-white/80">{totalEmitted}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-widest text-white/40">Failed</dt>
          <dd className="mt-0.5 font-mono text-white/80">{totalFailed}</dd>
        </div>
      </dl>
    </article>
  );
}

export default ADComplianceRateCard;
