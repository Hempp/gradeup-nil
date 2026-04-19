/**
 * MetricSummaryCard — server-renderable single-metric tile.
 *
 * Label, big number, optional delta + sparkline spark strip. Delta arrow
 * direction derived from sign; color from whether positive is desirable
 * (caller controls via `positiveIsGood`, default true).
 */

import { Fragment } from 'react';

export interface MetricSummaryCardProps {
  label: string;
  value: string;
  subtext?: string;
  /** Number in [-1, +1] (or % points). Renders with sign + arrow. */
  deltaPct?: number | null;
  positiveIsGood?: boolean;
  /** Mini sparkline values. Caller normalizes scale; we just render dots. */
  sparkline?: number[] | null;
  href?: string;
}

function arrow(delta: number): string {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '·';
}

function colorForDelta(delta: number, positiveIsGood: boolean): string {
  if (delta === 0) return 'text-white/50';
  const good = delta > 0 === positiveIsGood;
  return good ? 'text-emerald-300' : 'text-rose-300';
}

export default function MetricSummaryCard({
  label,
  value,
  subtext,
  deltaPct = null,
  positiveIsGood = true,
  sparkline,
  href,
}: MetricSummaryCardProps) {
  const Inner = (
    <Fragment>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white md:text-4xl">
        {value}
      </p>
      {subtext ? (
        <p className="mt-0.5 text-xs text-white/50">{subtext}</p>
      ) : null}
      {deltaPct !== null && deltaPct !== undefined ? (
        <p
          className={`mt-2 text-xs font-semibold ${colorForDelta(
            deltaPct,
            positiveIsGood
          )}`}
        >
          {arrow(deltaPct)} {Math.abs(deltaPct).toFixed(1)}%
        </p>
      ) : null}
      {sparkline && sparkline.length > 0 ? (
        <Sparkline values={sparkline} />
      ) : null}
    </Fragment>
  );

  const base =
    'block rounded-xl border border-white/10 bg-white/5 p-5 transition-colors';
  if (href) {
    return (
      <a href={href} className={`${base} hover:bg-white/[0.08]`}>
        {Inner}
      </a>
    );
  }
  return <div className={base}>{Inner}</div>;
}

/** Tiny inline SVG sparkline — no Recharts needed for 10-20 points. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 24;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-6 w-full max-w-[160px] text-[var(--accent-primary)]"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}
