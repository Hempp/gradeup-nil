import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - DataTable Component
// A comprehensive, reusable data table with loading states and row interactions
// ═══════════════════════════════════════════════════════════════════════════

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
  width?: string;
}

export interface DataTableProps<T> extends HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  keyExtractor?: (row: T, index: number) => string;
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

// ─── DataTable Component ───
function DataTableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    loading = false,
    emptyState,
    onRowClick,
    keyExtractor,
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

  return (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--surface-white)] rounded-xl shadow-sm border border-[var(--surface-200)] overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
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
                    onRowClick && 'cursor-pointer hover:bg-[var(--surface-50)]'
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

export { DataTable, LoadingRow, DefaultEmptyState as EmptyState };
