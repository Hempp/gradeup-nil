'use client';

/**
 * Client-side i18n hooks.
 *
 * This file intentionally stays dependency-free — no context provider, no
 * suspense boundary. Locale is derived from the URL (the source of truth
 * for "which language am I looking at"), not from React state, so that
 * every Client Component on a Spanish route picks it up automatically.
 *
 * For heavy static strings, prefer passing `dict` down from a Server
 * Component that called `getDictionary(locale)`. These hooks exist for
 * the cases where a Client Component needs to translate on its own
 * (e.g., the LocaleSwitcher labels, the fallback banner).
 */
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
  isSupportedLocale,
} from './config';
import type { Dictionary } from './dictionaries/en';

/**
 * Read the active locale from the current URL. Defaults to English when
 * the path has no locale prefix. Safe during SSR — `usePathname` returns
 * a stable string on both sides.
 */
export function useLocale(): Locale {
  const pathname = usePathname() ?? '/';
  return useMemo(() => detectLocaleFromPath(pathname), [pathname]);
}

export function detectLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split('/')[1];
  if (seg && isSupportedLocale(seg) && seg !== DEFAULT_LOCALE) {
    return seg;
  }
  // All other cases (including "/", "/pricing", or unrecognized first
  // segments) resolve to the default locale.
  return DEFAULT_LOCALE;
}

/**
 * Dot-path lookup against a dictionary. Used primarily by `t()` below
 * but also exported for callers that want to fetch a single key without
 * instantiating a translator.
 *
 *   lookup(dict, 'home.hero.titleLine1')  → 'Your GPA'
 *
 * Returns `undefined` when the path doesn't resolve, so callers can
 * distinguish "missing translation" from "empty string".
 */
export function lookup(dict: Dictionary | undefined, key: string): string | undefined {
  if (!dict) return undefined;
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dict;
  for (const part of parts) {
    if (node == null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Build a translator bound to a specific dictionary. Falls back to the
 * provided fallback dict (always English at the call site) when a key
 * is missing — the UI never shows a raw `home.hero.titleLine1` string.
 */
export function makeT(active: Dictionary | undefined, fallback: Dictionary) {
  return function t(key: string): string {
    return lookup(active, key) ?? lookup(fallback, key) ?? key;
  };
}

/**
 * List of locales available in the UI (excluding the current one).
 * Drives the LocaleSwitcher rendering.
 */
export function otherLocales(current: Locale): readonly Locale[] {
  return SUPPORTED_LOCALES.filter((l) => l !== current);
}
