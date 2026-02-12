'use client';

import { forwardRef, type HTMLAttributes, useMemo } from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   PAGINATION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const ChevronLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
}

const DOTS = '...';

function usePagination({
  totalPages,
  siblingCount = 1,
  currentPage,
}: {
  totalPages: number;
  siblingCount: number;
  currentPage: number;
}): (number | typeof DOTS)[] {
  return useMemo(() => {
    // Total page numbers we want to show in pagination
    const totalPageNumbers = siblingCount + 5;

    // Case 1: Total pages is less than the page numbers we want to show
    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    // Calculate left and right sibling index
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    // We do not show dots when there's only one page between extremes and siblings
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: No left dots, but rights dots
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, totalPages];
    }

    // Case 3: No right dots, but left dots
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [firstPageIndex, DOTS, ...rightRange];
    }

    // Case 4: Both left and right dots
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    return range(1, totalPages);
  }, [totalPages, siblingCount, currentPage]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGINATION COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      onPageChange,
      siblingCount = 1,
      ...props
    },
    ref
  ) => {
    const paginationRange = usePagination({
      currentPage,
      totalPages,
      siblingCount,
    });

    // Calculate display range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handlePrevious = () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };

    const handleNext = () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };

    // If there are no items, don't render pagination
    if (totalItems === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col sm:flex-row items-center justify-between gap-4 py-4',
          className
        )}
        {...props}
      >
        {/* Results info */}
        <p className="text-sm text-[var(--text-secondary)]">
          Showing <span className="font-medium text-[var(--text-primary)]">{startItem}</span>
          {' - '}
          <span className="font-medium text-[var(--text-primary)]">{endItem}</span>
          {' of '}
          <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> results
        </p>

        {/* Navigation */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={cn(
              `
              flex items-center justify-center
              h-9 px-3 gap-1
              rounded-[var(--radius-md)]
              text-sm font-medium
              transition-colors duration-[var(--transition-fast)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
              `,
              currentPage === 1
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            )}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === DOTS) {
                return (
                  <span
                    key={`dots-${index}`}
                    className="h-9 w-9 flex items-center justify-center text-[var(--text-muted)]"
                  >
                    {DOTS}
                  </span>
                );
              }

              const isActive = pageNumber === currentPage;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(pageNumber as number)}
                  className={cn(
                    `
                    h-9 min-w-[36px] px-3
                    rounded-[var(--radius-md)]
                    text-sm font-medium
                    transition-colors duration-[var(--transition-fast)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                    `,
                    isActive
                      ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={cn(
              `
              flex items-center justify-center
              h-9 px-3 gap-1
              rounded-[var(--radius-md)]
              text-sm font-medium
              transition-colors duration-[var(--transition-fast)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
              `,
              currentPage === totalPages
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            )}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon />
          </button>
        </nav>
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export { Pagination };
