/**
 * i18n core config
 * ────────────────
 * URL-prefix locale routing: default (English) lives at /*, Spanish at /es/*.
 * Internal identifiers (page slugs, state codes, sport codes) stay English —
 * only user-visible display strings get translated.
 *
 * Pilot states (CA, FL, TX, NY) carry large Spanish-speaking HS parent
 * populations; Spanish is our first and currently only additional locale.
 *
 * Extending: add to SUPPORTED_LOCALES, create a new dictionary module under
 * src/lib/i18n/dictionaries/<locale>.ts, register it in get-dictionary.ts,
 * and add display-name mapping below.
 */

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export const DEFAULT_LOCALE = 'en' as const;

/**
 * Locales that have a dedicated /<locale>/* route tree today.
 * Used by the middleware to decide whether an Accept-Language-triggered
 * redirect actually has somewhere to land (we never redirect into a 404).
 */
export const LOCALES_WITH_ROUTES: readonly Locale[] = ['es'];

/**
 * Paths (English canonical) that have a matching Spanish route at /es<path>.
 * The middleware uses this to gate Accept-Language redirects so users only
 * get auto-redirected when we actually have a translated page.
 *
 * Keep this list in sync with whatever pages exist under src/app/es/.
 */
export const TRANSLATED_PATHS: readonly string[] = [
  '/',
  '/hs',
  '/hs/valuation',
  '/solutions/parents',
  '/business/case-studies',
  '/pricing',
];

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Human-readable display name for a locale, rendered in the locale switcher
 * in that locale's own language. Keeps the switcher self-identifying even
 * when a user is currently on the "wrong" language.
 */
export function getLocaleDisplayName(locale: Locale): string {
  switch (locale) {
    case 'en':
      return 'English';
    case 'es':
      return 'Español';
    default: {
      const never_: never = locale;
      return never_;
    }
  }
}

/**
 * BCP-47 tags for hreflang + html[lang]. Kept in one place so that
 * alternate links, canonical emission, and the html tag all stay in sync.
 */
export function getHtmlLang(locale: Locale): string {
  switch (locale) {
    case 'en':
      return 'en-US';
    case 'es':
      return 'es-US'; // US-Spanish audience, not Latin-American generic
  }
}

/**
 * The cookie key we use to persist a user's locale preference. The name is
 * intentionally Next-conventional ("NEXT_LOCALE") so that anything else in
 * the ecosystem that reads this cookie keeps working.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Strip a leading /<locale> prefix from a pathname (if present) and return
 * the English-canonical path. Used by LocaleSwitcher and hreflang helpers.
 *
 *   /es/solutions/parents  → /solutions/parents
 *   /es                    → /
 *   /pricing               → /pricing
 */
export function stripLocalePrefix(pathname: string): string {
  for (const loc of SUPPORTED_LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (pathname === `/${loc}`) return '/';
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

/**
 * Build the locale-prefixed URL for a given English-canonical path.
 *   locale=en, path=/pricing → /pricing
 *   locale=es, path=/pricing → /es/pricing
 *   locale=es, path=/        → /es
 */
export function localizedPath(path: string, locale: Locale): string {
  const canonical = stripLocalePrefix(path);
  if (locale === DEFAULT_LOCALE) return canonical;
  if (canonical === '/') return `/${locale}`;
  return `/${locale}${canonical}`;
}
