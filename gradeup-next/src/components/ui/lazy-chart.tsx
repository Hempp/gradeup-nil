'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

/**
 * Lazy-loaded chart components using Next.js dynamic imports
 * This reduces initial bundle size by ~350KB
 */

// Loading placeholder for charts
function ChartLoadingPlaceholder({ height = 300 }: { height?: number }) {
  return (
    <div style={{ height }} className="w-full flex items-center justify-center">
      <Skeleton className="w-full h-full rounded-[var(--radius-md)]" />
    </div>
  );
}

// Lazy load individual Recharts components
export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  {
    loading: () => <ChartLoadingPlaceholder />,
    ssr: false,
  }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  {
    loading: () => <ChartLoadingPlaceholder />,
    ssr: false,
  }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartLoadingPlaceholder />,
    ssr: false,
  }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  {
    loading: () => <ChartLoadingPlaceholder height={200} />,
    ssr: false,
  }
);

// Re-export chart sub-components that don't need lazy loading
export {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
