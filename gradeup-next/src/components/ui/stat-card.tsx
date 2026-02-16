'use client';

import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  trend?: number;
  trendDirection?: 'up' | 'down';
  icon?: ReactNode;
  subtitle?: ReactNode;
}

const TrendArrowUp = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
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
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const StatCard = memo(forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, trend, trendDirection = 'up', icon, subtitle, ...props }, ref) => {
    const trendColor = trendDirection === 'up'
      ? 'text-[var(--color-success)]'
      : 'text-[var(--color-error)]';

    return (
      <div
        ref={ref}
        className={cn(
          `
          bg-[var(--bg-card)] rounded-[var(--radius-xl)] p-6
          border border-[var(--border-color)]
          shadow-[var(--shadow-sm)]
          transition-all duration-[var(--transition-normal)]
          hover:shadow-[var(--shadow-md)] hover:border-[var(--border-color-hover)]
          `,
          className
        )}
        {...props}
      >
        {/* Top row: Icon + Trend */}
        <div className="flex items-center justify-between mb-4">
          {icon && (
            <div className="h-10 w-10 flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
              {icon}
            </div>
          )}
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              {trendDirection === 'up' ? <TrendArrowUp /> : <TrendArrowDown />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {/* Center: Large stat value */}
        <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
          {value}
        </div>

        {/* Bottom: Label + Subtitle */}
        <div className="text-sm text-[var(--text-muted)]">
          {title}
        </div>
        {subtitle && (
          <div className="mt-1">
            {subtitle}
          </div>
        )}
      </div>
    );
  }
));

StatCard.displayName = 'StatCard';

export { StatCard };
