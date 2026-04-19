'use client';

/**
 * TrajectoryChart — GPA over time with tier-colored points.
 *
 * X-axis: reported_at (chronological).
 * Y-axis: GPA (0..5 scale).
 * Dots: colored by verification tier.
 *   - self_reported          → neutral gray
 *   - user_submitted         → accent blue
 *   - institution_verified   → success green
 * Reference lines: vertical markers for completed deal dates, with
 *   brand name on hover.
 *
 * Uses the lazy-chart wrapper (LazyLineChart) so Recharts is code-
 * split out of the initial dashboard bundle. Sub-components are
 * imported directly from 'recharts' per lazy-chart.tsx guidance
 * (tree-shaking via optimizePackageImports).
 */

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { LazyLineChart as LineChart } from '@/components/ui/lazy-chart';
import type {
  GpaSnapshot,
  TrajectoryDeal,
  VerificationTier,
} from '@/lib/hs-nil/trajectory';

const TIER_COLOR: Record<VerificationTier, string> = {
  self_reported: '#9CA3AF', // gray-400
  user_submitted: '#3B82F6', // blue-500
  institution_verified: '#10B981', // emerald-500
};

export interface TrajectoryChartProps {
  snapshots: GpaSnapshot[];
  deals: TrajectoryDeal[];
  height?: number;
}

interface ChartPoint {
  ts: number;
  reportedAt: string;
  gpa: number;
  tier: VerificationTier;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Recharts passes dot props with cx/cy/payload. Typed loosely — the
// shape is documented at https://recharts.org/api/Line but the lib
// doesn't ship a strong prop type for custom dot renderers.
interface TieredDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

function TieredDot(props: TieredDotProps) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const fill = TIER_COLOR[payload.tier] ?? TIER_COLOR.self_reported;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="#0b0f17"
      strokeWidth={2}
    />
  );
}

export function TrajectoryChart({
  snapshots,
  deals,
  height = 320,
}: TrajectoryChartProps) {
  if (snapshots.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/60"
      >
        Add more verified GPAs to build your trajectory.
      </div>
    );
  }

  const points: ChartPoint[] = snapshots.map((s) => ({
    ts: new Date(s.reportedAt).getTime(),
    reportedAt: s.reportedAt,
    gpa: s.gpa,
    tier: s.tier,
  }));

  const dealMarkers = deals
    .filter((d) => d.completedAt)
    .map((d) => ({
      ts: new Date(d.completedAt ?? d.createdAt).getTime(),
      brandName: d.brandName,
      dealId: d.id,
    }));

  return (
    <div
      style={{ height }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 16, right: 16, bottom: 20, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts: number) =>
              fmtShortDate(new Date(ts).toISOString())
            }
            stroke="#ffffff80"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            stroke="#ffffff80"
            tick={{ fontSize: 11 }}
          >
            <Label
              value="GPA"
              angle={-90}
              position="insideLeft"
              style={{ fill: '#ffffffaa', fontSize: 11 }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              background: '#0b0f17',
              border: '1px solid #ffffff22',
              borderRadius: 8,
              color: '#ffffff',
              fontSize: 12,
            }}
            labelFormatter={(label) =>
              fmtShortDate(new Date(Number(label)).toISOString())
            }
            formatter={(value) =>
              [`${Number(value).toFixed(2)} GPA`, 'GPA'] as [string, string]
            }
          />
          {dealMarkers.map((m) => (
            <ReferenceLine
              key={m.dealId}
              x={m.ts}
              stroke="#ffffff44"
              strokeDasharray="2 2"
              label={{
                value: m.brandName,
                position: 'top',
                fill: '#ffffff99',
                fontSize: 10,
              }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="gpa"
            stroke="#ffffffcc"
            strokeWidth={2}
            dot={<TieredDot />}
            activeDot={<TieredDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
        <Legend color={TIER_COLOR.self_reported} label="Self-reported" />
        <Legend color={TIER_COLOR.user_submitted} label="Transcript-verified" />
        <Legend
          color={TIER_COLOR.institution_verified}
          label="Institution-verified"
        />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export default TrajectoryChart;
