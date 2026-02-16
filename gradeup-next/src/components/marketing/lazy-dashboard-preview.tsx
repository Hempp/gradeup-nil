'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lazy-loaded DashboardPreview component
 * This reduces initial bundle size for the marketing page by deferring
 * the heavy dashboard preview (500+ lines) until it's needed.
 * The component is typically below the fold, making this a good optimization.
 */

function DashboardPreviewLoadingPlaceholder() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-[var(--marketing-gray-800)] bg-[var(--marketing-black)]"
      role="status"
      aria-label="Loading dashboard preview"
    >
      {/* Tab Switcher skeleton */}
      <div className="flex items-center border-b border-[var(--marketing-gray-800)]">
        <div className="flex-1 flex items-center justify-center gap-2 py-4">
          <Skeleton className="h-4 w-4 rounded" aria-hidden="true" />
          <Skeleton className="h-4 w-20" aria-hidden="true" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 py-4">
          <Skeleton className="h-4 w-4 rounded" aria-hidden="true" />
          <Skeleton className="h-4 w-20" aria-hidden="true" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 lg:p-6 space-y-4">
        {/* Profile Card skeleton */}
        <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" aria-hidden="true" />
              <Skeleton className="h-4 w-48" aria-hidden="true" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" aria-hidden="true" />
                <Skeleton className="h-6 w-24 rounded-full" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]"
            >
              <Skeleton className="h-9 w-9 rounded-lg mb-3" aria-hidden="true" />
              <Skeleton className="h-6 w-16 mb-1" aria-hidden="true" />
              <Skeleton className="h-3 w-20" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* Deals skeleton */}
        <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-4 w-24" aria-hidden="true" />
            <Skeleton className="h-4 w-16" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--marketing-gray-800)]/50">
                <Skeleton className="h-10 w-10 rounded-lg" aria-hidden="true" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" aria-hidden="true" />
                  <Skeleton className="h-3 w-16" aria-hidden="true" />
                </div>
                <Skeleton className="h-5 w-16" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading dashboard preview...</span>
    </div>
  );
}

export const LazyDashboardPreview = dynamic(
  () => import('./DashboardPreview').then((mod) => ({ default: mod.DashboardPreview })),
  {
    loading: () => <DashboardPreviewLoadingPlaceholder />,
    ssr: false,
  }
);

export { DashboardPreviewLoadingPlaceholder };
