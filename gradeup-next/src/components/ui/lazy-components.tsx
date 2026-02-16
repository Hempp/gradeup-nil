'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

/**
 * Lazy-loaded heavy components using Next.js dynamic imports
 * This reduces initial bundle size and improves Time to Interactive
 */

// ═══════════════════════════════════════════════════════════════════════════
// LOADING PLACEHOLDERS
// ═══════════════════════════════════════════════════════════════════════════

function CardLoadingPlaceholder() {
  return (
    <div
      className="bg-[var(--bg-card)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-6"
      role="status"
      aria-label="Loading content"
    >
      <Skeleton className="h-6 w-32 mb-4" aria-hidden="true" />
      <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
      <Skeleton className="h-4 w-3/4" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function TableLoadingPlaceholder() {
  return (
    <div
      className="bg-[var(--bg-card)] rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden"
      role="status"
      aria-label="Loading table"
    >
      <div className="p-4 border-b border-[var(--border-color)]">
        <Skeleton className="h-5 w-48" aria-hidden="true" />
      </div>
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-32" aria-hidden="true" />
            <Skeleton className="h-4 w-24" aria-hidden="true" />
            <Skeleton className="h-4 w-20" aria-hidden="true" />
            <Skeleton className="h-4 flex-1" aria-hidden="true" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

function FilterPanelLoadingPlaceholder() {
  return (
    <div
      className="bg-[var(--bg-card)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-4"
      role="status"
      aria-label="Loading filters"
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-9 w-9 rounded-lg" aria-hidden="true" />
        <Skeleton className="h-5 w-20" aria-hidden="true" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" aria-hidden="true" />
        <Skeleton className="h-10 w-full" aria-hidden="true" />
      </div>
      <span className="sr-only">Loading filter options...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY-LOADED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Note: DataTable is generic and lightweight, usually better to import directly
// For very large tables, consider using react-window for virtualization instead

// Lazy load FilterPanel (collapsible with animations)
export const LazyFilterPanel = dynamic(
  () => import('../filters/filter-panel').then((mod) => ({ default: mod.FilterPanel })),
  {
    loading: () => <FilterPanelLoadingPlaceholder />,
    ssr: false,
  }
);

// Lazy load ConfirmDialog (rarely needed on initial load)
export const LazyConfirmDialog = dynamic(
  () => import('./confirm-dialog').then((mod) => ({ default: mod.ConfirmDialog })),
  {
    loading: () => null, // Don't show placeholder for dialogs
    ssr: false,
  }
);

// Lazy load OnboardingTourProvider (only needed for first-time users)
export const LazyOnboardingTourProvider = dynamic(
  () => import('./onboarding-tour').then((mod) => ({ default: mod.OnboardingTourProvider })),
  {
    loading: () => null,
    ssr: false,
  }
);

// Export loading placeholders for reuse
export { CardLoadingPlaceholder, TableLoadingPlaceholder, FilterPanelLoadingPlaceholder };
