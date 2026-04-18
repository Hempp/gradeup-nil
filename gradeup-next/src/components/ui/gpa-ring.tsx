'use client';

import { useEffect, useState, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// GPA PROGRESS RING COMPONENT
// Animated circular progress indicator for GPA display
// ═══════════════════════════════════════════════════════════════════════════

interface GPARingProps extends HTMLAttributes<HTMLDivElement> {
  /** The GPA value (0.0 - 4.0 scale) */
  gpa: number;
  /** Maximum GPA scale (default: 4.0) */
  maxGpa?: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Whether to animate the ring on mount */
  animate?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Show the GPA label below the value */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Variant affects color theming */
  variant?: 'default' | 'compact';
}

/**
 * Get the color based on GPA value
 * - 3.5+ = Excellent (success green)
 * - 3.0+ = Good (primary blue)
 * - 2.5+ = Average (warning yellow)
 * - Below = Needs improvement (error red)
 */
function getGpaColor(gpa: number): string {
  if (gpa >= 3.5) return 'var(--color-success)';
  if (gpa >= 3.0) return 'var(--color-primary)';
  if (gpa >= 2.5) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/**
 * Get the background track color (subtle version of the main color)
 */
function getTrackColor(gpa: number): string {
  if (gpa >= 3.5) return 'var(--color-success-muted)';
  if (gpa >= 3.0) return 'var(--color-primary-muted)';
  if (gpa >= 2.5) return 'var(--color-warning-muted)';
  return 'var(--color-error-muted)';
}

/**
 * Get GPA status text
 */
function getGpaStatus(gpa: number): string {
  if (gpa >= 3.7) return "Dean's List";
  if (gpa >= 3.5) return 'Excellent';
  if (gpa >= 3.0) return 'Good';
  if (gpa >= 2.5) return 'Satisfactory';
  if (gpa >= 2.0) return 'Fair';
  return 'Needs Improvement';
}

export function GPARing({
  gpa,
  maxGpa = 4.0,
  size = 120,
  strokeWidth = 8,
  animate = true,
  animationDuration = 1000,
  showLabel = true,
  label,
  variant = 'default',
  className,
  ...props
}: GPARingProps) {
  const [progress, setProgress] = useState(animate ? 0 : gpa);
  const [isVisible, setIsVisible] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);

  // Calculate dimensions
  const normalizedGpa = Math.min(Math.max(gpa, 0), maxGpa);
  const percentage = (normalizedGpa / maxGpa) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / maxGpa) * circumference;

  // Animate on visibility (Intersection Observer)
  useEffect(() => {
    if (!animate) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ringRef.current) {
      observer.observe(ringRef.current);
    }

    return () => observer.disconnect();
  }, [animate, isVisible]);

  // Animate the progress value
  useEffect(() => {
    if (!animate || !isVisible) return;

    const startTime = performance.now();
    const startValue = 0;
    const endValue = normalizedGpa;

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / animationDuration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progressRatio, 3);
      const currentValue = startValue + (endValue - startValue) * eased;

      setProgress(currentValue);

      if (progressRatio < 1) {
        requestAnimationFrame(animateValue);
      }
    };

    requestAnimationFrame(animateValue);
  }, [animate, isVisible, normalizedGpa, animationDuration]);

  // Compact variant is smaller with less detail
  if (variant === 'compact') {
    const compactSize = 48;
    const compactStroke = 4;
    const compactRadius = (compactSize - compactStroke) / 2;
    const compactCircumference = compactRadius * 2 * Math.PI;
    const compactOffset = compactCircumference - (progress / maxGpa) * compactCircumference;

    return (
      <div
        ref={ringRef}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: compactSize, height: compactSize }}
        {...props}
      >
        <svg
          width={compactSize}
          height={compactSize}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={compactSize / 2}
            cy={compactSize / 2}
            r={compactRadius}
            fill="none"
            stroke={getTrackColor(normalizedGpa)}
            strokeWidth={compactStroke}
          />
          {/* Progress ring */}
          <circle
            cx={compactSize / 2}
            cy={compactSize / 2}
            r={compactRadius}
            fill="none"
            stroke={getGpaColor(normalizedGpa)}
            strokeWidth={compactStroke}
            strokeLinecap="round"
            strokeDasharray={compactCircumference}
            strokeDashoffset={compactOffset}
            className="transition-all duration-300"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {progress.toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ringRef}
      className={cn('relative inline-flex flex-col items-center', className)}
      {...props}
    >
      {/* Ring container */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getTrackColor(normalizedGpa)}
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getGpaColor(normalizedGpa)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
            style={{
              filter: `drop-shadow(0 0 6px ${getGpaColor(normalizedGpa)}40)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--text-primary)]">
            {progress.toFixed(2)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            GPA
          </span>
        </div>
      </div>

      {/* Label below ring */}
      {showLabel && (
        <div className="mt-2 text-center">
          <p
            className="text-sm font-medium"
            style={{ color: getGpaColor(normalizedGpa) }}
          >
            {label || getGpaStatus(normalizedGpa)}
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GPA BADGE - Inline badge version for cards and lists
// ═══════════════════════════════════════════════════════════════════════════

interface GPABadgeProps {
  gpa: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function GPABadge({ gpa, showIcon = true, size = 'md' }: GPABadgeProps) {
  const color = getGpaColor(gpa);
  const bgColor = getTrackColor(gpa);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        sizeClasses[size]
      )}
      style={{
        backgroundColor: bgColor,
        color: color,
      }}
    >
      {showIcon && (
        <svg
          className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      )}
      {gpa.toFixed(2)} GPA
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GPA STAT DISPLAY - For stat cards with trend
// ═══════════════════════════════════════════════════════════════════════════

interface GPAStatProps {
  gpa: number;
  previousGpa?: number;
  label?: string;
}

export function GPAStat({ gpa, previousGpa, label = 'Current GPA' }: GPAStatProps) {
  const trend = previousGpa ? gpa - previousGpa : null;
  const trendDirection = trend && trend > 0 ? 'up' : trend && trend < 0 ? 'down' : null;

  return (
    <div className="flex items-center gap-4">
      <GPARing gpa={gpa} size={80} strokeWidth={6} showLabel={false} />
      <div className="flex flex-col">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          {label}
        </span>
        <span
          className="text-2xl font-bold"
          style={{ color: getGpaColor(gpa) }}
        >
          {gpa.toFixed(2)}
        </span>
        {trendDirection && (
          <span
            className={cn(
              'text-xs flex items-center gap-1',
              trendDirection === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}
          >
            {trendDirection === 'up' ? '↑' : '↓'} {Math.abs(trend!).toFixed(2)} from last term
          </span>
        )}
      </div>
    </div>
  );
}

export default GPARing;
