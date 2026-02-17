'use client';

import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The main metric value to display */
  value: string | number;
  /** Label describing the metric */
  label: string;
  /** Percentage change from previous period (positive = increase) */
  trend?: number;
  /** Override automatic trend direction (useful when lower is better) */
  trendDirection?: 'up' | 'down';
  /** Whether positive trend is good (default true, false for metrics like "errors") */
  trendPositiveIsGood?: boolean;
  /** Icon to display in the card header */
  icon?: ReactNode;
  /** Additional subtitle or context below the label */
  subtitle?: string;
  /** Comparison value from previous period */
  previousValue?: string | number;
  /** Enable premium visual effects */
  premium?: boolean;
  /** Size variant of the card */
  size?: 'sm' | 'md' | 'lg';
  /** Color accent variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const TrendArrowUp = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const TrendArrowDown = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const TrendNeutral = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

/**
 * A card component for displaying key metrics with trend indicators
 *
 * Features:
 * - Trend indicator with up/down arrows and color coding
 * - Comparison to previous period
 * - Icon support
 * - Multiple size variants
 * - Premium visual effects option
 *
 * @example
 * ```tsx
 * <MetricCard
 *   label="Total Revenue"
 *   value="$4.25M"
 *   trend={22.4}
 *   icon={<DollarSign />}
 *   previousValue="$3.47M"
 *   subtitle="vs last month"
 *   premium
 * />
 * ```
 */
const MetricCard = memo(forwardRef<HTMLDivElement, MetricCardProps>(
  ({
    className,
    value,
    label,
    trend,
    trendDirection,
    trendPositiveIsGood = true,
    icon,
    subtitle,
    previousValue,
    premium = false,
    size = 'md',
    variant = 'default',
    ...props
  }, ref) => {
    // Determine trend direction from value if not explicitly set
    const effectiveTrendDirection = trendDirection ?? (
      trend === 0 ? undefined :
      trend !== undefined ? (trend > 0 ? 'up' : 'down') : undefined
    );

    // Determine if the trend is positive (good) or negative (bad)
    const isTrendGood = effectiveTrendDirection
      ? (effectiveTrendDirection === 'up') === trendPositiveIsGood
      : undefined;

    // Trend color based on whether it's good or bad
    const trendColorClass = isTrendGood === undefined
      ? 'text-[var(--text-muted)]'
      : isTrendGood
        ? 'text-[var(--color-success)]'
        : 'text-[var(--color-error)]';

    // Size variants
    const sizeStyles = {
      sm: {
        card: 'p-4',
        iconWrapper: 'h-8 w-8',
        value: 'text-xl',
        label: 'text-xs',
      },
      md: {
        card: 'p-6',
        iconWrapper: 'h-10 w-10',
        value: 'text-3xl',
        label: 'text-sm',
      },
      lg: {
        card: 'p-8',
        iconWrapper: 'h-12 w-12',
        value: 'text-4xl',
        label: 'text-base',
      },
    };

    // Variant colors for icon background
    const variantStyles = {
      default: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]',
      primary: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]',
      success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
      warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
      error: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
    };

    const baseStyles = `
      bg-[var(--bg-card)] rounded-[var(--radius-xl)]
      border border-[var(--border-color)]
      shadow-[var(--shadow-sm)]
      transition-all duration-[var(--transition-normal)]
      hover:shadow-[var(--shadow-md)] hover:border-[var(--border-color-hover)]
    `;

    const premiumStyles = premium ? `
      card-shine card-hover-glow
      hover:shadow-[0_10px_40px_var(--color-primary-glow)]
      hover:border-[var(--color-primary)]
    ` : '';

    return (
      <div
        ref={ref}
        className={cn(baseStyles, premiumStyles, sizeStyles[size].card, className)}
        {...props}
      >
        {/* Top row: Icon + Trend */}
        <div className="flex items-center justify-between mb-4">
          {icon && (
            <div
              className={cn(
                'flex items-center justify-center rounded-[var(--radius-lg)]',
                sizeStyles[size].iconWrapper,
                variantStyles[variant]
              )}
            >
              {icon}
            </div>
          )}
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trendColorClass
              )}
              aria-label={`${effectiveTrendDirection === 'up' ? 'Increased' : effectiveTrendDirection === 'down' ? 'Decreased' : 'No change'} by ${Math.abs(trend)}%`}
            >
              {effectiveTrendDirection === 'up' && <TrendArrowUp />}
              {effectiveTrendDirection === 'down' && <TrendArrowDown />}
              {effectiveTrendDirection === undefined && <TrendNeutral />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {/* Main value */}
        <div
          className={cn(
            'font-bold text-[var(--text-primary)] mb-1',
            sizeStyles[size].value,
            premium && 'gradient-text-cyan'
          )}
        >
          {value}
        </div>

        {/* Label */}
        <div className={cn('text-[var(--text-muted)]', sizeStyles[size].label)}>
          {label}
        </div>

        {/* Previous value comparison */}
        {previousValue !== undefined && (
          <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{subtitle ?? 'Previous period'}</span>
              <span className="font-medium">{previousValue}</span>
            </div>
          </div>
        )}

        {/* Subtitle without comparison */}
        {subtitle && previousValue === undefined && (
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {subtitle}
          </div>
        )}
      </div>
    );
  }
));

MetricCard.displayName = 'MetricCard';

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════════

export function MetricCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const valueSizes = {
    sm: 'h-6 w-16',
    md: 'h-8 w-24',
    lg: 'h-10 w-32',
  };

  return (
    <div
      className={cn(
        'bg-[var(--bg-card)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm',
        sizeStyles[size]
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--surface-100)] animate-shimmer" />
        <div className="h-4 w-12 rounded bg-[var(--surface-100)] animate-shimmer" />
      </div>
      <div className={cn('rounded bg-[var(--surface-100)] animate-shimmer mb-2', valueSizes[size])} />
      <div className="h-4 w-20 rounded bg-[var(--surface-100)] animate-shimmer" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC CARD GRID
// ═══════════════════════════════════════════════════════════════════════════

export interface MetricCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Grid container for MetricCard components
 *
 * @example
 * ```tsx
 * <MetricCardGrid columns={4}>
 *   <MetricCard label="Athletes" value={2847} trend={12.5} />
 *   <MetricCard label="Brands" value={423} trend={8.3} />
 *   <MetricCard label="Deals" value={1256} trend={15.7} />
 *   <MetricCard label="Revenue" value="$4.25M" trend={22.4} />
 * </MetricCardGrid>
 * ```
 */
export function MetricCardGrid({ children, columns = 4, className }: MetricCardGridProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridClasses[columns], className)}>
      {children}
    </div>
  );
}

export { MetricCard };
export default MetricCard;
