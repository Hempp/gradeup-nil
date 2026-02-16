'use client';

import { forwardRef, memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  src?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}

const sizes = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const Avatar = memo(forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', src, alt, fallback, priority = false }, ref) => {
    const initials = fallback || alt?.charAt(0).toUpperCase() || '?';
    const altText = alt || 'User avatar';
    const pixelSize = sizePixels[size];

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-hidden',
          sizes[size],
          className
        )}
        role="img"
        aria-label={altText}
      >
        {src ? (
          <Image
            src={src}
            alt={altText}
            fill
            sizes={`${pixelSize}px`}
            priority={priority}
            className="object-cover"
          />
        ) : (
          <span
            className="font-medium text-[var(--text-secondary)]"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </div>
    );
  }
));

Avatar.displayName = 'Avatar';

export { Avatar };
