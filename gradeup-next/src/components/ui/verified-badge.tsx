'use client';

type BadgeSize = 'sm' | 'md' | 'lg';

interface VerifiedBadgeProps {
  /** Size of the badge */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
  /** Custom aria-label (defaults to "Verified") */
  label?: string;
}

const SIZE_CLASSES: Record<BadgeSize, { container: string; checkmark: string }> = {
  sm: { container: 'h-4 w-4', checkmark: 'h-2 w-2' },
  md: { container: 'h-5 w-5', checkmark: 'h-3 w-3' },
  lg: { container: 'h-6 w-6', checkmark: 'h-3.5 w-3.5' },
};

/**
 * A verified badge component showing a checkmark in a primary-colored circle
 * Used to indicate verified status for athletes, brands, etc.
 */
export function VerifiedBadge({
  size = 'md',
  className = '',
  label = 'Verified',
}: VerifiedBadgeProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div
      className={`${sizeClasses.container} rounded-full bg-[var(--color-primary)] flex items-center justify-center ${className}`}
      role="img"
      aria-label={label}
    >
      <svg
        className={`${sizeClasses.checkmark} text-white`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
