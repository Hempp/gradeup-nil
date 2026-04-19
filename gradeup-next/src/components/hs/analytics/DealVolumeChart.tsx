'use client';

/**
 * DealVolumeChart — combined Bar(count) + Line(amount) using Recharts.
 *
 * Bar = deal count per bucket. Line = total compensation $ per bucket.
 * Dual axes let amount + count read independently without one swamping
 * the other.
 */

import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  ResponsiveContainer,
} from 'recharts';

export interface DealVolumePoint {
  bucketStart: string;
  count: number;
  amountCents: number;
}

function fmtBucket(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default function DealVolumeChart({
  data,
}: {
  data: DealVolumePoint[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No HS deals in window. Volume chart will populate once deals flow.
      </p>
    );
  }

  const series = data.map((p) => ({
    bucket: fmtBucket(p.bucketStart),
    count: p.count,
    amount: p.amountCents / 100,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={series}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="bucket"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            stroke="#60a5fa"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#22d3ee"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,10,14,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === 'Amount') {
                return [fmtDollars((value as number) * 100), name];
              }
              return [value as number, name as string];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="count"
            name="Deals"
            fill="#60a5fa"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="amount"
            name="Amount"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
