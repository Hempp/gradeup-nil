'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  /**
   * Display mode for the toggle
   * - 'button': Single button that cycles through themes
   * - 'dropdown': Dropdown menu with all theme options
   * - 'switch': Simple light/dark toggle (ignores system)
   * @default 'button'
   */
  mode?: 'button' | 'dropdown' | 'switch';
  /**
   * Size of the toggle button
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional className for the toggle
   */
  className?: string;
  /**
   * Show label text next to the icon
   * @default false
   */
  showLabel?: boolean;
}

/**
 * Theme toggle component for switching between light, dark, and system themes
 *
 * @example
 * // Simple cycling button
 * <ThemeToggle />
 *
 * // Dropdown with all options
 * <ThemeToggle mode="dropdown" />
 *
 * // Simple light/dark switch
 * <ThemeToggle mode="switch" size="sm" />
 */
export function ThemeToggle({
  mode = 'button',
  size = 'md',
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const sizes = {
    sm: 'h-8 w-8 min-h-[32px] min-w-[32px]',
    md: 'h-10 w-10 min-h-[40px] min-w-[40px]',
    lg: 'h-11 w-11 min-h-[44px] min-w-[44px]',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const cycleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const getIcon = (themeValue: Theme | 'light' | 'dark' = theme) => {
    // For resolved theme display, show what's actually being used
    if (themeValue === 'system') {
      return <Monitor className={iconSizes[size]} aria-hidden="true" />;
    }
    if (themeValue === 'dark') {
      return <Moon className={iconSizes[size]} aria-hidden="true" />;
    }
    return <Sun className={iconSizes[size]} aria-hidden="true" />;
  };

  const getLabel = (themeValue: Theme = theme) => {
    const labels: Record<Theme, string> = {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    };
    return labels[themeValue];
  };

  // Placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <button
        className={cn(
          sizes[size],
          'flex items-center justify-center rounded-lg',
          'bg-transparent text-[var(--text-muted)]',
          'transition-colors',
          className
        )}
        disabled
        aria-label="Loading theme toggle"
      >
        <div className={cn(iconSizes[size], 'animate-pulse bg-current rounded opacity-30')} />
      </button>
    );
  }

  // Simple switch mode (light/dark only)
  if (mode === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          sizes[size],
          'flex items-center justify-center rounded-lg',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          'hover:bg-[var(--bg-card)] dark:hover:bg-white/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          'transition-all duration-200',
          'touch-manipulation',
          className
        )}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${resolvedTheme} mode. Click to switch.`}
      >
        <span className="relative">
          {/* Sun icon - visible in dark mode */}
          <Sun
            className={cn(
              iconSizes[size],
              'absolute inset-0 transition-all duration-300',
              resolvedTheme === 'dark'
                ? 'rotate-0 scale-100 opacity-100'
                : 'rotate-90 scale-0 opacity-0'
            )}
            aria-hidden="true"
          />
          {/* Moon icon - visible in light mode */}
          <Moon
            className={cn(
              iconSizes[size],
              'transition-all duration-300',
              resolvedTheme === 'light'
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            )}
            aria-hidden="true"
          />
        </span>
        {showLabel && (
          <span className="ml-2 text-sm font-medium">
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown mode
  if (mode === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            sizes[size],
            showLabel && 'w-auto px-3',
            'flex items-center justify-center gap-2 rounded-lg',
            'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--bg-card)] dark:hover:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
            'transition-all duration-200',
            'touch-manipulation',
            isOpen && 'bg-[var(--bg-card)] dark:bg-white/10',
            className
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Theme: ${getLabel()}. Click to change.`}
        >
          {getIcon(resolvedTheme)}
          {showLabel && (
            <span className="text-sm font-medium">{getLabel()}</span>
          )}
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Dropdown menu */}
            <div
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-36 py-1',
                'bg-[var(--bg-card)] dark:bg-[var(--marketing-gray-900)]',
                'border border-[var(--border-color)] dark:border-white/10',
                'rounded-lg shadow-lg',
                'animate-in fade-in-0 zoom-in-95 duration-200'
              )}
              role="listbox"
              aria-label="Select theme"
            >
              {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2',
                    'text-sm text-left',
                    'hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5',
                    'focus-visible:outline-none focus-visible:bg-[var(--bg-secondary)] dark:focus-visible:bg-white/10',
                    'transition-colors',
                    theme === themeOption && 'text-[var(--color-primary)] font-medium'
                  )}
                  role="option"
                  aria-selected={theme === themeOption}
                >
                  {getIcon(themeOption)}
                  <span>{getLabel(themeOption)}</span>
                  {theme === themeOption && (
                    <span className="ml-auto text-[var(--color-primary)]" aria-hidden="true">
                      &#10003;
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default button mode - cycles through themes
  return (
    <button
      onClick={cycleTheme}
      className={cn(
        sizes[size],
        showLabel && 'w-auto px-3',
        'flex items-center justify-center gap-2 rounded-lg',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'hover:bg-[var(--bg-card)] dark:hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        'transition-all duration-200',
        'touch-manipulation',
        className
      )}
      aria-label={`Current theme: ${getLabel()}. Click to cycle through themes.`}
      title={`Theme: ${getLabel()}`}
    >
      <span className="relative">
        {/* Show current theme icon with transition */}
        <span
          className={cn(
            'block transition-all duration-300',
            'group-hover:scale-110'
          )}
        >
          {theme === 'system' ? getIcon('system') : getIcon(resolvedTheme)}
        </span>
      </span>
      {showLabel && (
        <span className="text-sm font-medium">{getLabel()}</span>
      )}
    </button>
  );
}
