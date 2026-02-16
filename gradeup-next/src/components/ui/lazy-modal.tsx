'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';
import type { ModalProps } from './modal';

/**
 * Lazy-loaded Modal component using Next.js dynamic imports
 * This reduces initial bundle size by deferring modal code loading
 */

// Loading placeholder for modal
function ModalLoadingPlaceholder() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="status"
      aria-label="Loading modal"
    >
      <div className="w-full max-w-md bg-[var(--bg-card)] rounded-[var(--radius-xl)] p-6">
        <Skeleton className="h-6 w-48 mb-4" aria-hidden="true" />
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <Skeleton className="h-4 w-3/4 mb-4" aria-hidden="true" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" aria-hidden="true" />
          <Skeleton className="h-10 w-24" aria-hidden="true" />
        </div>
        <span className="sr-only">Loading modal content...</span>
      </div>
    </div>
  );
}

// Lazy load the Modal component
export const LazyModal = dynamic<ModalProps>(
  () => import('./modal').then((mod) => ({ default: mod.Modal })),
  {
    loading: () => <ModalLoadingPlaceholder />,
    ssr: false,
  }
);

export { ModalLoadingPlaceholder };
