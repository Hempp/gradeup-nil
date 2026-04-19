'use client';

/**
 * FunnelChart — horizontal stacked-bar funnel visualization using Recharts.
 *
 * Each step is a bar whose width is normalized to the first step (waitlist);
 * labels show absolute count and conversion rate vs previous step. This is
 * cheaper and more legible at small widths than a Sankey, and it reads top-
 * to-bottom like a traditional funnel.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface FunnelStep {
  label: string;
  count: number;
  /** Conversion rate from previous step, 0..1. */
  rateFromPrev?: number;
}

const COLORS = [
  '#22d3ee',
  '#38bdf8',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
];

function fmtPct(rate: number | undefined): string {
  if (rate === undefined || !Number.isFinite(rate)) return '';
  return ` (${Math.round(rate * 1000) / 10}%)`;
}

export default function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null;

  const data = steps.map((s, i) => ({
    name: s.label,
    value: s.count,
    rate: s.rateFromPrev,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 32, bottom: 8, left: 24 }}
        >
          <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="rgba(255,255,255,0.6)"
            tick={{ fontSize: 12 }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,10,14,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 12,
            }}
            formatter={(value, _n, item) => {
              const rate = (item as { payload?: { rate?: number } } | undefined)
                ?.payload?.rate;
              return [`${value as number}${fmtPct(rate)}`, 'Count'];
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              fill="#ffffff"
              fontSize={11}
              formatter={(v: unknown) => String(v)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
