'use client';

import { forwardRef, memo, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const Avatar = memo(forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', src, alt, fallback, ...props }, ref) => {
    const initials = fallback || alt?.charAt(0).toUpperCase() || '?';
    const altText = alt || 'User avatar';

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
          <img
            src={src}
            alt={altText}
            className="h-full w-full object-cover"
            {...props}
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
