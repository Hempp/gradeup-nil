/**
 * Server-side dictionary loader.
 *
 * Uses dynamic imports so that a locale's dictionary only ships in the
 * bundle when a page actually renders in that locale. English is the
 * source-of-truth (Dictionary type); Spanish is lazily imported.
 *
 * Usage (Server Components):
 *   const dict = await getDictionary('es');
 *   <h1>{dict.home.hero.titleLine1}</h1>
 */
import { DEFAULT_LOCALE, type Locale } from './config';
import type { Dictionary } from './dictionaries/en';

/**
 * Map of locale → dynamic-import loader. Adding a new locale is a one-line
 * change here + a matching file under src/lib/i18n/dictionaries/.
 *
 * The English dictionary is imported lazily for consistency even though it
 * will almost always be present — keeps the branch predictable.
 */
const DICTIONARIES: Record<Locale, () => Promise<{ default?: Dictionary } | Dictionary | { en?: Dictionary; es?: Dictionary }>> = {
  en: () => import('./dictionaries/en').then((m) => ({ default: m.en })),
  es: () => import('./dictionaries/es').then((m) => ({ default: m.es })),
};

/**
 * Returns the matching dictionary for a locale. Falls back silently to the
 * default (English) if an unknown locale is passed, so that a bad URL or a
 * typo in a server component never crashes the page.
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const mod = (await loader()) as { default?: Dictionary } & Partial<Record<Locale, Dictionary>>;
  const dict = (mod.default ?? mod[locale] ?? mod[DEFAULT_LOCALE]) as Dictionary | undefined;
  if (!dict) {
    // Last-resort fallback — re-import the English dictionary directly.
    const fallback = await import('./dictionaries/en');
    return fallback.en;
  }
  return dict;
}

export type { Dictionary };
