import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

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

export { DataTable, LoadingRow, DefaultEmptyState as EmptyState, MobileCard };
