'use client';

/**
 * Locale switcher.
 *
 * Pure client component. Reads the current locale from the URL, renders
 * the two-locale toggle (English ↔ Español), and navigates to the
 * localized equivalent of the current path when a user clicks the other
 * locale. Also writes the NEXT_LOCALE cookie so the preference survives
 * across sessions.
 *
 * Behavior notes
 * ──────────────
 *   - If the current English path has no Spanish version, the switcher
 *     still sends the user to /es (the Spanish home) rather than into a
 *     404. The fallback banner handles communicating "not translated yet".
 *   - We do NOT introduce a context provider; the locale is a derived
 *     value from the URL, which is already reactive.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  TRANSLATED_PATHS,
  getLocaleDisplayName,
  localizedPath,
  stripLocalePrefix,
  type Locale,
} from '@/lib/i18n/config';
import { detectLocaleFromPath } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

interface LocaleSwitcherProps {
  className?: string;
  /** Render variant: "menu" (default, desktop nav) or "compact" (inline list for mobile). */
  variant?: 'menu' | 'compact';
}

export function LocaleSwitcher({ className, variant = 'menu' }: LocaleSwitcherProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current: Locale = detectLocaleFromPath(pathname);

  const handleSelect = useCallback(
    (next: Locale) => {
      setOpen(false);
      // Persist preference for next time.
      if (typeof document !== 'undefined') {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
      }

      // Figure out target URL. Start from the English-canonical path.
      const canonical = stripLocalePrefix(pathname);

      // If target is a non-default locale but the current canonical path
      // has no translated route, land them on the translated HOME rather
      // than into a 404.
      const hasTranslated = TRANSLATED_PATHS.includes(canonical);
      const targetPath =
        next === DEFAULT_LOCALE || hasTranslated
          ? localizedPath(canonical, next)
          : `/${next}`;

      router.push(targetPath);
      router.refresh();
    },
    [pathname, router],
  );

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)} role="group" aria-label="Language">
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            aria-pressed={current === loc}
            onClick={() => handleSelect(loc)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium min-h-[44px] min-w-[44px] transition-colors',
              current === loc
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-white/70 hover:text-white hover:bg-white/5 border border-white/10',
            )}
          >
            {getLocaleDisplayName(loc)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Select language"
        className="flex items-center gap-1.5 h-11 px-3 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="uppercase">{current}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-white/10 bg-[var(--marketing-gray-900)]/95 backdrop-blur-md shadow-xl p-1 z-50"
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              role="menuitemradio"
              aria-checked={current === loc}
              type="button"
              onClick={() => handleSelect(loc)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-white/5 focus:bg-white/5 focus:outline-none',
                current === loc ? 'text-[var(--accent-primary)]' : 'text-white/80',
              )}
            >
              <span>{getLocaleDisplayName(loc)}</span>
              {current === loc ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
