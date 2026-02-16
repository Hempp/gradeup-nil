'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show text alongside icon */
  showText?: boolean;
  /** Color variant */
  variant?: 'gradient' | 'white' | 'dark';
  /** Additional class names */
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
  xl: { icon: 56, text: 'text-3xl' },
};

export function Logo({ size = 'md', showText = true, variant = 'gradient', className }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon size={iconSize} variant={variant} />
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight',
            textSize,
            variant === 'gradient' && 'bg-gradient-to-r from-[#00f0ff] to-[#adff2f] bg-clip-text text-transparent',
            variant === 'white' && 'text-white',
            variant === 'dark' && 'text-gray-900'
          )}
        >
          GradeUp
        </span>
      )}
    </div>
  );
}

interface LogoIconProps {
  size?: number;
  variant?: 'gradient' | 'white' | 'dark';
  className?: string;
}

export function LogoIcon({ size = 32, variant = 'gradient', className }: LogoIconProps) {
  const uniqueId = useId();
  const gradientId = `logo-grad-${uniqueId}`;

  const getFill = () => {
    if (variant === 'gradient') return `url(#${gradientId})`;
    if (variant === 'white') return '#ffffff';
    return '#0a0a0a';
  };

  const getStroke = () => {
    if (variant === 'gradient') return `url(#${gradientId})`;
    if (variant === 'white') return '#ffffff';
    return '#0a0a0a';
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#adff2f" />
          </linearGradient>
        </defs>
      )}
      {/* Shield outline */}
      <path
        d="M16 2L28 6V15C28 22.5 22.5 28.5 16 30C9.5 28.5 4 22.5 4 15V6L16 2Z"
        fill={variant === 'gradient' ? '#0a0a0a' : 'transparent'}
        stroke={getStroke()}
        strokeWidth="1.5"
      />
      {/* Upward arrow */}
      <path
        d="M16 8L22 15H19V24H13V15H10L16 8Z"
        fill={getFill()}
      />
    </svg>
  );
}

/**
 * Full wordmark logo with tagline
 */
export function LogoFull({ variant = 'gradient', className }: { variant?: 'gradient' | 'white' | 'dark'; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Logo size="xl" showText variant={variant} />
      <span
        className={cn(
          'text-xs tracking-widest uppercase mt-1',
          variant === 'gradient' && 'text-[#00f0ff]/70',
          variant === 'white' && 'text-white/70',
          variant === 'dark' && 'text-gray-600'
        )}
      >
        Your GPA Is Worth Money
      </span>
    </div>
  );
}

export default Logo;
