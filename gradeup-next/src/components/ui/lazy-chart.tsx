'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

/**
 * Lazy-loaded chart components using Next.js dynamic imports
 * This reduces initial bundle size by ~350KB
 *
 * IMPORTANT: Do NOT re-export recharts sub-components here.
 * Each page should import them directly from 'recharts' so tree-shaking works.
 * The optimizePackageImports config in next.config.ts handles tree-shaking.
 *
 * Example usage in a page:
 * ```tsx
 * import { LazyLineChart as LineChart } from '@/components/ui/lazy-chart';
 * import { XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer } from 'recharts';
 * ```
 */

// Loading placeholder for charts
function ChartLoadingPlaceholder({ height = 300 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="w-full flex items-center justify-center"
      role="status"
      aria-label="Loading chart"
    >
      <Skeleton className="w-full h-full rounded-[var(--radius-md)]" aria-hidden="true" />
      <span className="sr-only">Loading chart data...</span>
    </div>
  );
}

// Lazy load individual Recharts chart containers
// These are the heavy components that benefit from code-splitting
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

// Export the loading placeholder for custom usage
export { ChartLoadingPlaceholder };
