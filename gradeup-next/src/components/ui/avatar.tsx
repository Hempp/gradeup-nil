'use client';

import { forwardRef, memo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// BLUR PLACEHOLDER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a shimmer SVG as base64 for blur placeholder.
 * Creates a subtle animated gradient effect while loading.
 */
function generateShimmerPlaceholder(w: number, h: number): string {
  const shimmerSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(220, 13%, 18%)">
            <animate attributeName="stop-color" values="hsl(220, 13%, 18%); hsl(220, 13%, 25%); hsl(220, 13%, 18%)" dur="1.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stop-color="hsl(220, 13%, 25%)">
            <animate attributeName="stop-color" values="hsl(220, 13%, 25%); hsl(220, 13%, 18%); hsl(220, 13%, 25%)" dur="1.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="hsl(220, 13%, 18%)">
            <animate attributeName="stop-color" values="hsl(220, 13%, 18%); hsl(220, 13%, 25%); hsl(220, 13%, 18%)" dur="1.5s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shimmer)" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(shimmerSvg).toString('base64')}`;
}

/**
 * Generate a solid color placeholder (for light mode).
 */
function generateColorPlaceholder(color: string = '#e5e7eb'): string {
  const svg = `
    <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Pre-generated placeholders for performance
const SHIMMER_PLACEHOLDER = generateShimmerPlaceholder(40, 40);
const COLOR_PLACEHOLDER = generateColorPlaceholder();

// ═══════════════════════════════════════════════════════════════════════════
// AVATAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface AvatarProps {
  /** Avatar size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Fallback text (initials) when no image */
  fallback?: string;
  /** Image source URL */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Load image with priority (above the fold) */
  priority?: boolean;
  /** Custom blur placeholder data URL */
  blurPlaceholder?: string;
  /** Placeholder type: 'blur' for smooth fade, 'shimmer' for animated loading */
  placeholderType?: 'blur' | 'shimmer' | 'none';
  /** Show status indicator (online, offline, busy) */
  status?: 'online' | 'offline' | 'busy' | 'away';
  /** Show verification badge */
  verified?: boolean;
  /** Ring color for highlighting */
  ring?: 'primary' | 'success' | 'warning' | 'error' | 'none';
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

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5 border',
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-4 w-4 border-2',
};

const ringStyles = {
  primary: 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--bg-card)]',
  success: 'ring-2 ring-green-500 ring-offset-2 ring-offset-[var(--bg-card)]',
  warning: 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-[var(--bg-card)]',
  error: 'ring-2 ring-red-500 ring-offset-2 ring-offset-[var(--bg-card)]',
  none: '',
};

const Avatar = memo(forwardRef<HTMLDivElement, AvatarProps>(
  ({
    className,
    size = 'md',
    src,
    alt,
    fallback,
    priority = false,
    blurPlaceholder,
    placeholderType = 'blur',
    status,
    verified = false,
    ring = 'none',
  }, ref) => {
    const [isLoading, setIsLoading] = useState(!!src);
    const [hasError, setHasError] = useState(false);

    const initials = fallback || alt?.charAt(0).toUpperCase() || '?';
    const altText = alt || 'User avatar';
    const pixelSize = sizePixels[size];

    // Determine placeholder to use
    const placeholder = placeholderType === 'none'
      ? undefined
      : placeholderType === 'shimmer'
        ? SHIMMER_PLACEHOLDER
        : blurPlaceholder || COLOR_PLACEHOLDER;

    const showImage = src && !hasError;

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-hidden',
          sizes[size],
          ringStyles[ring],
          className
        )}
        role="img"
        aria-label={altText}
      >
        {showImage ? (
          <>
            <Image
              src={src}
              alt={altText}
              fill
              sizes={`${pixelSize}px`}
              priority={priority}
              placeholder={placeholder ? 'blur' : 'empty'}
              blurDataURL={placeholder}
              className={cn(
                'object-cover transition-opacity duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
            {/* Loading shimmer overlay */}
            {isLoading && placeholderType === 'shimmer' && (
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-tertiary)] via-[var(--bg-secondary)] to-[var(--bg-tertiary)] animate-shimmer" />
            )}
          </>
        ) : (
          <span
            className="font-medium text-[var(--text-secondary)]"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}

        {/* Status indicator */}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-[var(--bg-card)]',
              statusColors[status],
              statusSizes[size]
            )}
            aria-label={`Status: ${status}`}
          />
        )}

        {/* Verification badge */}
        {verified && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-black',
              size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'
            )}
            aria-label="Verified"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={cn(
                size === 'xs' ? 'h-2 w-2' : size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
              )}
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }
));

Avatar.displayName = 'Avatar';

// ═══════════════════════════════════════════════════════════════════════════
// AVATAR GROUP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface AvatarGroupProps {
  /** Maximum avatars to show before +N indicator */
  max?: number;
  /** Avatar size for all items */
  size?: AvatarProps['size'];
  /** Array of avatar data */
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: string;
  }>;
  /** Additional CSS classes */
  className?: string;
}

const AvatarGroup = memo(forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ avatars, max = 4, size = 'md', className }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    return (
      <div
        ref={ref}
        className={cn('flex -space-x-2', className)}
        role="group"
        aria-label={`Group of ${avatars.length} users`}
      >
        {visibleAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            size={size}
            src={avatar.src}
            alt={avatar.alt}
            fallback={avatar.fallback}
            className="ring-2 ring-[var(--bg-card)]"
          />
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              'relative inline-flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] ring-2 ring-[var(--bg-card)]',
              sizes[size]
            )}
          >
            <span className="font-medium text-[var(--text-muted)]">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    );
  }
));

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, generateShimmerPlaceholder, generateColorPlaceholder };
