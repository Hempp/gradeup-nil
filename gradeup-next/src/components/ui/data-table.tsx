'use client';

import { forwardRef, useState, useRef, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { ChevronLeft, ChevronRight, ChevronDown, Filter } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - DataTable Component
// A comprehensive, reusable data table with loading states and row interactions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for a table column
 * @template T - The type of data objects in the table
 */
export interface DataTableColumn<T> {
  /** Unique key matching the data property name */
  key: string;
  /** Header text displayed in the table header */
  header: string;
  /** Custom render function for cell content */
  render?: (value: T[keyof T], row: T) => ReactNode;
  /** CSS width class or value for the column */
  width?: string;
  /** Hide this column on mobile screens (md breakpoint) */
  hideOnMobile?: boolean;
  /** Priority for mobile card view (lower = higher priority, shown first) */
  mobilePriority?: number;
}

/**
 * Props for the DataTable component
 * @template T - The type of data objects in the table
 */
export interface DataTableProps<T> extends HTMLAttributes<HTMLDivElement> {
  /** Column configuration array */
  columns: DataTableColumn<T>[];
  /** Array of data objects to display */
  data: T[];
  /** Show loading skeleton instead of data */
  loading?: boolean;
  /** Custom empty state component when data is empty */
  emptyState?: ReactNode;
  /** Callback when a row is clicked (makes rows interactive) */
  onRowClick?: (row: T) => void;
  /** Custom function to extract unique key for each row */
  keyExtractor?: (row: T, index: number) => string;
  /** Accessible caption for the table (screen readers only) */
  caption?: string;
  /** Description for row click action for screen readers */
  rowActionDescription?: string;
  /** Enable responsive card view on mobile (md breakpoint) */
  mobileCardView?: boolean;
  /** Custom render function for mobile card view */
  renderMobileCard?: (row: T, index: number) => ReactNode;
}

// ─── Loading Row Component ───
interface LoadingRowProps {
  columnCount: number;
}

function LoadingRow({ columnCount }: LoadingRowProps) {
  return (
    <tr className="border-b border-[var(--surface-100)]">
      {[...Array(columnCount)].map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton
            className={cn(
              'h-4',
              index === 0 ? 'w-32' : index === columnCount - 1 ? 'w-20' : 'w-24'
            )}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State Component ───
interface EmptyStateProps {
  children?: ReactNode;
}

function DefaultEmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-100)] flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-[var(--neutral-400)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      {children || (
        <>
          <p className="text-sm font-medium text-[var(--neutral-900)] mb-1">
            No data available
          </p>
          <p className="text-sm text-[var(--neutral-400)]">
            There are no items to display at this time.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Mobile Card Component ───
interface MobileCardProps<T> {
  row: T;
  columns: DataTableColumn<T>[];
  onClick?: () => void;
  rowActionDescription: string;
  getValue: (row: T, key: string) => T[keyof T];
}

function MobileCard<T extends Record<string, unknown>>({
  row,
  columns,
  onClick,
  rowActionDescription,
  getValue,
}: MobileCardProps<T>) {
  // Sort columns by mobilePriority, filter out those marked hideOnMobile
  const visibleColumns = columns
    .filter((col) => !col.hideOnMobile && col.key !== 'actions')
    .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99));

  const actionColumn = columns.find((col) => col.key === 'actions');

  return (
    <div
      className={cn(
        'bg-[var(--bg-card)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)]',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:border-[var(--border-color-hover)] hover:shadow-[var(--shadow-md)] active:scale-[0.99]'
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? rowActionDescription : undefined}
    >
      <div className="space-y-3">
        {visibleColumns.map((column, index) => {
          const value = getValue(row, column.key);
          return (
            <div
              key={column.key}
              className={cn(
                index === 0 ? 'pb-2 border-b border-[var(--border-color)]' : ''
              )}
            >
              {index > 0 && (
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  {column.header}
                </span>
              )}
              <div className={index === 0 ? 'text-base' : 'text-sm mt-0.5'}>
                {column.render
                  ? column.render(value, row)
                  : value !== null && value !== undefined
                  ? String(value)
                  : '-'}
              </div>
            </div>
          );
        })}
      </div>
      {actionColumn && (
        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
          {actionColumn.render?.(undefined as T[keyof T], row)}
        </div>
      )}
    </div>
  );
}

// ─── DataTable Component ───
/**
 * A comprehensive data table component with responsive mobile support
 *
 * Features:
 * - Loading skeleton state
 * - Customizable column rendering
 * - Row click interactions with keyboard support
 * - Responsive mobile card view
 * - Accessible with ARIA labels
 * - Empty state handling
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Name', mobilePriority: 1 },
 *     { key: 'status', header: 'Status', render: (v) => <Badge>{v}</Badge> },
 *     { key: 'amount', header: 'Amount', hideOnMobile: true }
 *   ]}
 *   data={deals}
 *   loading={isLoading}
 *   onRowClick={(deal) => router.push(`/deals/${deal.id}`)}
 *   mobileCardView
 *   caption="List of active deals"
 * />
 */
function DataTableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    loading = false,
    emptyState,
    onRowClick,
    keyExtractor,
    caption,
    rowActionDescription = 'View details',
    mobileCardView = false,
    renderMobileCard,
    className,
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const getRowKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    if ('id' in row) return String(row.id);
    return String(index);
  };

  const getValue = (row: T, key: string): T[keyof T] => {
    return row[key as keyof T];
  };

  // Mobile Card View
  if (mobileCardView && !loading && data.length > 0) {
    return (
      <div
        ref={ref}
        className={cn('md:hidden', className)}
        {...props}
      >
        <div className="space-y-3">
          {data.map((row, rowIndex) => (
            renderMobileCard ? (
              <div key={getRowKey(row, rowIndex)}>
                {renderMobileCard(row, rowIndex)}
              </div>
            ) : (
              <MobileCard
                key={getRowKey(row, rowIndex)}
                row={row}
                columns={columns}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                rowActionDescription={`${rowActionDescription} for row ${rowIndex + 1}`}
                getValue={getValue}
              />
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--surface-white)] rounded-xl shadow-sm border border-[var(--surface-200)] overflow-hidden',
        mobileCardView && 'hidden md:block',
        className
      )}
      {...props}
    >
      {/* Horizontal scroll wrapper with custom scrollbar styling */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent">
        <table className="w-full min-w-[600px]">
          {/* ─── Table Caption (Screen Reader Only) ─── */}
          {caption && <caption className="sr-only">{caption}</caption>}
          {/* ─── Table Header ─── */}
          <thead className="bg-[var(--surface-50)] sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-[var(--neutral-400)] uppercase tracking-wider',
                    column.width
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ─── Table Body ─── */}
          <tbody className="divide-y divide-[var(--surface-100)]">
            {loading ? (
              // Loading skeleton rows
              [...Array(5)].map((_, index) => (
                <LoadingRow key={`loading-${index}`} columnCount={columns.length} />
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length}>
                  {emptyState || <DefaultEmptyState />}
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cn(
                    'border-b border-[var(--surface-100)] last:border-b-0',
                    'transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-[var(--surface-50)] focus:bg-[var(--surface-50)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]'
                  )}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `${rowActionDescription} for row ${rowIndex + 1}` : undefined}
                >
                  {columns.map((column) => {
                    const value = getValue(row, column.key);
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'px-6 py-4 text-sm text-[var(--neutral-900)]',
                          column.width
                        )}
                      >
                        {column.render
                          ? column.render(value, row)
                          : value !== null && value !== undefined
                          ? String(value)
                          : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Using type assertion for forwardRef with generics
const DataTable = forwardRef(DataTableInner) as <T extends Record<string, unknown>>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof DataTableInner>;

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE TABLE WRAPPER
// Adds scroll shadows and mobile-optimized controls
// ═══════════════════════════════════════════════════════════════════════════

interface ResponsiveTableWrapperProps extends HTMLAttributes<HTMLDivElement> {
  /** Show scroll shadow indicators */
  showScrollShadows?: boolean;
  /** Show "scroll for more" hint on mobile */
  showScrollHint?: boolean;
  children: ReactNode;
}

/**
 * Wrapper component that adds responsive scroll shadows and hints.
 * Use this around a DataTable or any horizontally scrollable content.
 *
 * @example
 * <ResponsiveTableWrapper showScrollShadows showScrollHint>
 *   <DataTable columns={columns} data={data} />
 * </ResponsiveTableWrapper>
 */
const ResponsiveTableWrapper = forwardRef<HTMLDivElement, ResponsiveTableWrapperProps>(
  ({ children, showScrollShadows = true, showScrollHint = true, className, ...props }, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showHint, setShowHint] = useState(true);

    // Check scroll position and update shadows
    const updateScrollState = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    };

    useEffect(() => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;

      updateScrollState();
      scrollEl.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);

      // Hide hint after user scrolls
      const hideHint = () => setShowHint(false);
      scrollEl.addEventListener('scroll', hideHint, { once: true });

      return () => {
        scrollEl.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
      };
    }, []);

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {/* Left scroll shadow */}
        {showScrollShadows && canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg-card)] to-transparent z-10 pointer-events-none md:hidden"
            aria-hidden="true"
          />
        )}

        {/* Right scroll shadow with hint */}
        {showScrollShadows && canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--bg-card)] to-transparent z-10 pointer-events-none flex items-center justify-end pr-2 md:hidden"
            aria-hidden="true"
          >
            {showScrollHint && showHint && (
              <div className="animate-bounce-x">
                <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent -webkit-overflow-scrolling-touch"
        >
          {children}
        </div>

        {/* Mobile scroll hint text (shown once) */}
        {showScrollHint && canScrollRight && showHint && (
          <div className="text-center text-xs text-[var(--text-muted)] mt-2 md:hidden animate-fade-in">
            Swipe to see more →
          </div>
        )}
      </div>
    );
  }
);

ResponsiveTableWrapper.displayName = 'ResponsiveTableWrapper';

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE SORT/FILTER CONTROLS
// Compact controls for mobile table interactions
// ═══════════════════════════════════════════════════════════════════════════

export interface MobileTableControlsProps {
  /** Available sort options */
  sortOptions?: Array<{ key: string; label: string }>;
  /** Current sort key */
  currentSort?: string;
  /** Callback when sort changes */
  onSortChange?: (key: string) => void;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Callback when sort direction changes */
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;
  /** Show filter button */
  showFilter?: boolean;
  /** Callback when filter is clicked */
  onFilterClick?: () => void;
  /** Active filter count */
  activeFilterCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Mobile-optimized sort and filter controls for data tables.
 *
 * @example
 * <MobileTableControls
 *   sortOptions={[
 *     { key: 'name', label: 'Name' },
 *     { key: 'date', label: 'Date' },
 *   ]}
 *   currentSort={sortKey}
 *   onSortChange={setSortKey}
 *   showFilter
 *   onFilterClick={() => setShowFilters(true)}
 * />
 */
function MobileTableControls({
  sortOptions = [],
  currentSort,
  onSortChange,
  sortDirection = 'asc',
  onSortDirectionChange,
  showFilter = false,
  onFilterClick,
  activeFilterCount = 0,
  className,
}: MobileTableControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = sortOptions.find((o) => o.key === currentSort)?.label || 'Sort by';

  return (
    <div className={cn('flex items-center gap-2 md:hidden', className)}>
      {/* Sort dropdown */}
      {sortOptions.length > 0 && (
        <div ref={dropdownRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-full flex items-center justify-between gap-2 h-10 px-3 rounded-[var(--radius-md)]',
              'bg-[var(--bg-tertiary)] border border-[var(--border-color)]',
              'text-sm text-[var(--text-primary)]',
              'hover:border-[var(--border-color-hover)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
              isOpen && 'border-[var(--color-primary)]'
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{currentSortLabel}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-[var(--text-muted)] transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </button>

          {isOpen && (
            <div
              className={cn(
                'absolute top-full left-0 right-0 mt-1 z-50',
                'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)]',
                'shadow-lg animate-in fade-in-0 zoom-in-95 duration-150',
                'py-1'
              )}
              role="listbox"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    if (currentSort === option.key) {
                      // Toggle direction if same sort key
                      onSortDirectionChange?.(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      onSortChange?.(option.key);
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    'flex items-center justify-between',
                    currentSort === option.key
                      ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                  role="option"
                  aria-selected={currentSort === option.key}
                >
                  <span>{option.label}</span>
                  {currentSort === option.key && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter button */}
      {showFilter && (
        <button
          type="button"
          onClick={onFilterClick}
          className={cn(
            'relative flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)]',
            'bg-[var(--bg-tertiary)] border border-[var(--border-color)]',
            'hover:border-[var(--border-color-hover)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
            activeFilterCount > 0 && 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]'
          )}
          aria-label={`Filter${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        >
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 text-[10px] font-medium bg-[var(--color-primary)] text-black rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE LOADING CARDS
// Skeleton loading state optimized for mobile card view
// ═══════════════════════════════════════════════════════════════════════════

interface MobileLoadingCardsProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for mobile card view.
 */
function MobileLoadingCards({ count = 3, className }: MobileLoadingCardsProps) {
  return (
    <div className={cn('space-y-3 md:hidden', className)}>
      {[...Array(count)].map((_, index) => (
        <div
          key={index}
          className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)]"
        >
          {/* Primary content skeleton */}
          <div className="pb-3 border-b border-[var(--border-color)]">
            <Skeleton className="h-5 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          {/* Secondary content skeleton */}
          <div className="pt-3 space-y-3">
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {/* Action skeleton */}
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SWIPEABLE MOBILE CARD
// Card with swipe-to-reveal actions
// ═══════════════════════════════════════════════════════════════════════════

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

interface SwipeableMobileCardProps<T> {
  row: T;
  columns: DataTableColumn<T>[];
  onClick?: () => void;
  rowActionDescription: string;
  getValue: (row: T, key: string) => T[keyof T];
  /** Actions revealed on swipe left */
  swipeActions?: SwipeAction[];
}

/**
 * Enhanced mobile card with swipe-to-reveal actions.
 * Swipe left to reveal action buttons.
 */
function SwipeableMobileCard<T extends Record<string, unknown>>({
  row,
  columns,
  onClick,
  rowActionDescription,
  getValue,
  swipeActions = [],
}: SwipeableMobileCardProps<T>) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const actionWidth = swipeActions.length * 72; // 72px per action button

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swipeActions.length === 0) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || swipeActions.length === 0) return;
    const diff = startXRef.current - e.touches[0].clientX;
    // Only allow swiping left (revealing actions)
    const newTranslateX = Math.max(0, Math.min(diff, actionWidth));
    setTranslateX(newTranslateX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    // Snap to open or closed
    if (translateX > actionWidth / 2) {
      setTranslateX(actionWidth);
    } else {
      setTranslateX(0);
    }
  };

  // Sort columns by mobilePriority
  const visibleColumns = columns
    .filter((col) => !col.hideOnMobile && col.key !== 'actions')
    .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99));

  const actionColumn = columns.find((col) => col.key === 'actions');

  const actionVariants = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
    danger: 'bg-red-500 text-white',
    success: 'bg-green-500 text-white',
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-[var(--radius-lg)]">
      {/* Swipe actions (behind the card) */}
      {swipeActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
          {swipeActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                setTranslateX(0);
              }}
              className={cn(
                'w-[72px] flex flex-col items-center justify-center gap-1 text-xs font-medium',
                actionVariants[action.variant || 'default']
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Card content */}
      <div
        className={cn(
          'bg-[var(--bg-card)] p-4 border border-[var(--border-color)]',
          'transition-transform duration-200 ease-out',
          onClick && !isSwiping && translateX === 0 && 'cursor-pointer hover:border-[var(--border-color-hover)] active:scale-[0.99]'
        )}
        style={{ transform: `translateX(-${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (translateX > 0) {
            setTranslateX(0);
          } else {
            onClick?.();
          }
        }}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        aria-label={onClick ? rowActionDescription : undefined}
      >
        <div className="space-y-3">
          {visibleColumns.map((column, index) => {
            const value = getValue(row, column.key);
            return (
              <div
                key={column.key}
                className={cn(
                  index === 0 ? 'pb-2 border-b border-[var(--border-color)]' : ''
                )}
              >
                {index > 0 && (
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    {column.header}
                  </span>
                )}
                <div className={index === 0 ? 'text-base' : 'text-sm mt-0.5'}>
                  {column.render
                    ? column.render(value, row)
                    : value !== null && value !== undefined
                    ? String(value)
                    : '-'}
                </div>
              </div>
            );
          })}
        </div>
        {actionColumn && translateX === 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
            {actionColumn.render?.(undefined as T[keyof T], row)}
          </div>
        )}
      </div>
    </div>
  );
}

export {
  DataTable,
  LoadingRow,
  DefaultEmptyState as EmptyState,
  MobileCard,
  ResponsiveTableWrapper,
  MobileTableControls,
  MobileLoadingCards,
  SwipeableMobileCard,
};
