'use client';

/**
 * Locale fallback banner.
 *
 * Rendered when a user has signaled a preference for a non-default locale
 * (cookie or URL) but the page they've navigated to hasn't been translated
 * yet. Shows a subtle, dismissible banner at the top of the page.
 *
 * The banner reads its own locale from the NEXT_LOCALE cookie rather than
 * from the URL, because by definition it is rendered on English paths
 * where the URL segment gives no signal.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LOCALE_COOKIE, isSupportedLocale, type Locale } from '@/lib/i18n/config';

const MESSAGES: Record<Locale, string | null> = {
  en: null, // Never rendered for English readers.
  es: 'Esta página aún no está disponible en español. Mostrando la versión en inglés.',
};

const DISMISS_LABELS: Record<Locale, string> = {
  en: 'Dismiss',
  es: 'Cerrar',
};

/**
 * The session-storage key we use to remember a dismiss. We intentionally
 * use sessionStorage (not localStorage) so the banner reappears in a new
 * session — a user who came back a week later probably wants to know
 * again.
 */
const DISMISS_KEY = 'gradeup.locale-fallback.dismissed';

export function LocaleFallbackBanner() {
  const [locale, setLocale] = useState<Locale | null>(null);
  const [dismissed, setDismissed] = useState(true); // Hidden until we've checked state.

  useEffect(() => {
    // Read locale preference from cookie (client-side only).
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`),
    );
    const cookieLocale = match ? decodeURIComponent(match[1]) : null;
    if (cookieLocale && isSupportedLocale(cookieLocale) && cookieLocale !== 'en') {
      setLocale(cookieLocale);
      try {
        const wasDismissed = window.sessionStorage.getItem(DISMISS_KEY) === '1';
        setDismissed(wasDismissed);
      } catch {
        // Private browsing / storage disabled — default to showing the banner.
        setDismissed(false);
      }
    }
  }, []);

  if (!locale || dismissed) return null;
  const message = MESSAGES[locale];
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-40 bg-[var(--accent-primary)]/10 border-b border-[var(--accent-primary)]/20 text-white/90 backdrop-blur"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <p className="text-sm text-white/80 flex-1">{message}</p>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              window.sessionStorage.setItem(DISMISS_KEY, '1');
            } catch {
              // Non-fatal; the banner will just reappear on next mount.
            }
          }}
          aria-label={DISMISS_LABELS[locale]}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
