'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// SECTION HEADER COMPONENT
// Consistent section titles with optional actions for dashboard layouts
// ═══════════════════════════════════════════════════════════════════════════

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional action element (button, link, etc.) */
  action?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function SectionHeader({
  title,
  description,
  action,
  size = 'md',
  className,
  ...props
}: SectionHeaderProps) {
  const sizeClasses = {
    sm: {
      title: 'text-sm font-semibold',
      description: 'text-xs',
      gap: 'gap-0.5',
    },
    md: {
      title: 'text-base font-semibold',
      description: 'text-sm',
      gap: 'gap-1',
    },
    lg: {
      title: 'text-lg font-bold',
      description: 'text-sm',
      gap: 'gap-1',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        className
      )}
      {...props}
    >
      <div className={cn('flex flex-col', styles.gap)}>
        <h2 className={cn(styles.title, 'text-[var(--text-primary)]')}>
          {title}
        </h2>
        {description && (
          <p className={cn(styles.description, 'text-[var(--text-muted)]')}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE HEADER COMPONENT
// Main page title with badge and actions
// ═══════════════════════════════════════════════════════════════════════════

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Badge or status indicator */
  badge?: ReactNode;
  /** Actions (buttons, dropdowns) */
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center md:justify-between gap-4',
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD GRID COMPONENTS
// Consistent grid layouts for dashboard sections
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Number of columns on large screens */
  cols?: 2 | 3 | 4;
}

export function StatsGrid({ children, cols = 4, className, ...props }: DashboardGridProps) {
  const colClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4',
        colClasses[cols],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ContentGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Layout ratio for two-column layouts */
  ratio?: '1:1' | '2:1' | '3:2' | '5:3';
}

export function ContentGrid({ children, ratio = '1:1', className, ...props }: ContentGridProps) {
  const ratioClasses = {
    '1:1': 'md:grid-cols-2',
    '2:1': 'md:grid-cols-2 lg:grid-cols-3', // First child spans 2, second spans 1
    '3:2': 'md:grid-cols-2 lg:grid-cols-5', // First child spans 3, second spans 2
    '5:3': 'md:grid-cols-2 lg:grid-cols-8', // First child spans 5, second spans 3
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 md:gap-6',
        ratioClasses[ratio],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Column span helper for ContentGrid children
export function GridColumn({
  span,
  children,
  className,
}: {
  span: number;
  children: ReactNode;
  className?: string;
}) {
  const spanClasses: Record<number, string> = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
  };

  return (
    <div className={cn(spanClasses[span] || '', className)}>
      {children}
    </div>
  );
}

export default SectionHeader;
