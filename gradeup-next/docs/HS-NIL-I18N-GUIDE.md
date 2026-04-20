# HS-NIL Internationalization Guide

Version 1 ships **English (default) + Spanish** for 6 top-of-funnel public pages. This guide explains how the framework is wired and how to extend it.

## Why Spanish first

The GradeUp HS pilot states — **California, Florida, Texas, New York** — carry the largest Spanish-speaking HS parent populations in the country. Because the HS-NIL flow is parent-gated by state rule, parents who read Spanish at home make the signing decision. Translating the six highest-leverage public pages to Spanish directly multiplies the addressable family count in those states.

## Architecture at a glance

| Concern           | Approach                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| Routing           | URL-prefix (`/` = English, `/es/*` = Spanish)                            |
| Detection         | Middleware: URL segment → cookie → Accept-Language (in priority order)   |
| Persistence       | `NEXT_LOCALE` cookie, 1-year TTL, SameSite=Lax                           |
| Dictionaries      | `src/lib/i18n/dictionaries/<locale>.ts` — typed JSON                     |
| Client usage      | `useLocale()` + `makeT(dict, fallback)` in `src/lib/i18n/client.ts`      |
| Server usage      | `await getDictionary(locale)` in `src/lib/i18n/get-dictionary.ts`        |
| SEO               | `hreflang` + `canonical` per page; sitemap emits `languages` alternates  |
| Fallback          | Missing keys fall through to English — UI never shows a raw key          |

No runtime translation library (`next-intl`, `react-i18next`) — the whole framework is in-house at about 300 LOC total, dependency-free.

## Adding a new translated page

1. **Create the English metadata** — make sure the English canonical route exports a `Metadata` object (Server Component or server wrapper around a Client Component). Add `alternates.languages.es` pointing to the future Spanish path.

2. **Extend both dictionaries.** Add a new top-level key (e.g. `athletes`) to `en.ts` with every user-facing string. Duplicate the shape in `es.ts` — TypeScript will fail the build if they don't match (the `Dictionary` type is derived from the English file).

3. **Create the Spanish page.** Under `src/app/es/<path>/page.tsx`, write a Server Component that calls `await getDictionary('es')`, reuses your shared marketing components, and passes Spanish strings as props. The `generateMetadata` function should set:

   - `alternates.canonical` = `${BASE_URL}/es/<path>`
   - `alternates.languages` pointing back to the English canonical and the Spanish variant
   - `openGraph.locale` = `'es_US'`

4. **Register the path** in `src/lib/i18n/config.ts` → `TRANSLATED_PATHS`. This tells the middleware that Accept-Language-based redirects to this path are safe.

5. **Update the sitemap.** Add both the English and Spanish entries to `src/app/sitemap.ts` with `altsFor(...)` alternates so Google sees them as translation pairs.

## Adding a new locale (e.g. `fr` for Quebec)

1. Add `'fr'` to `SUPPORTED_LOCALES` in `src/lib/i18n/config.ts`.
2. Add `'fr'` to `LOCALES_WITH_ROUTES`.
3. Extend `getLocaleDisplayName()` and `getHtmlLang()` to return `'Français'` / `'fr-CA'`.
4. Create `src/lib/i18n/dictionaries/fr.ts` with the full `Dictionary` shape. Export as `export const fr: Dictionary = { ... }`.
5. Register it in `src/lib/i18n/get-dictionary.ts`: `fr: () => import('./dictionaries/fr').then((m) => ({ default: m.fr }))`.
6. Create the `/fr` route tree under `src/app/fr/` and a matching `layout.tsx` with `<div lang="fr">`.
7. For every translated page, add `fr` to the `alternates.languages` object.

The middleware and the locale switcher will automatically pick up the new locale; no edits needed there.

## Dictionary structure conventions

```
Dictionary
├── common          ← cross-page chrome (nav, footer, switcher, fallback banner, shared CTAs)
├── home            ← /(home) strings
├── parents         ← /solutions/parents strings
├── valuation       ← /hs/valuation strings
├── caseStudies     ← /business/case-studies strings
├── pricing         ← /pricing strings
└── hsLanding       ← /hs strings
```

**Nesting rules:**

- Nest by page (`home`, `parents`, ...) and then by section (`hero`, `faq`, ...).
- Prefer flat leaves over deeply-nested objects when a section has fewer than 4 strings.
- Never interpolate at the dictionary level (no `{count} athletes`). Compose at the call site. That keeps the hook zero-dep and matches how most concierge-era strings actually render.
- Internal identifiers (slugs, state codes, sport codes) stay English — they are not user-facing display strings.

## Tone guidelines for Spanish

### Parent-facing surfaces → "usted"

Parents in most Latino households expect formal Spanish from a business. The `/solutions/parents`, `/es/pricing` FAQ, and parent-oriented sections of the home + valuation pages all use **usted**. This matches how we speak to parents in concierge calls.

### Athlete-facing surfaces → "tú"

CTAs aimed at the teen athlete (home hero, "crea tu perfil") use **tú**. It matches how teens actually read copy in Spanish-language social media.

### Mixed-audience marketing lines

When a line could go either way, default to the parent reader (using "su" / "usted") since in the HS-NIL pilot states the parent is the gating signer.

### Business / brand surfaces → "usted"

Pricing tiers for brands, compliance-officer language, and the table of "always free" roles all use business Spanish conventions.

### Translation choices — stable across versions

| English term       | Spanish rendering                                                    |
| ------------------ | -------------------------------------------------------------------- |
| NIL                | NIL (untranslated — the term is in common use in Latino press)       |
| scholar-athlete    | atleta-estudiante (literal inversion matches press convention)       |
| GPA                | GPA (US-Spanish audience knows the acronym; occasional gloss as "promedio académico") |
| verified           | verificado / verificada (match noun gender)                          |
| deal               | acuerdo (preferred), occasionally "trato" for variety                |
| parent             | padre (singular generic includes mothers in business writing)        |
| dashboard          | panel                                                                 |
| compliance         | cumplimiento                                                         |
| take-rate          | comisión (plus one explanatory clause the first time)                |
| disclosure window  | ventana de divulgación (matches legal translations already in press) |

## Reviewer checklist

**Every Spanish translation must be reviewed by a native Spanish speaker before merge.** No exceptions — our audience includes parents who will reject GradeUp if our Spanish sounds Google-Translated.

For each page pair, the reviewer confirms:

- [ ] **Tone is correct.** Parent pages in usted, athlete CTAs in tú, business surfaces in usted.
- [ ] **No literal translations.** "Real market numbers vary widely" is **not** "los números reales del mercado varían ampliamente" — it's "los números reales de mercado varían mucho".
- [ ] **Gender agreement is correct.** "atleta verificada" for a named female athlete, "atleta-estudiante verificado" for generic singular.
- [ ] **Currency + dates in the right format.** "$127,450" stays USD; dates read naturally ("10 p. m. el martes" not "10pm el martes").
- [ ] **CTAs are actionable.** "Crear cuenta de marca" (imperative) feels right; "Creación de cuenta de marca" (nominalized) is wrong in a button.
- [ ] **Legal-adjacent language isn't wrong.** "Consentimiento parental" is fine; "aprobación" is too weak. "Custodia" is the right word for a Stripe Connect custodial account.
- [ ] **Keyword density is preserved.** "NIL" should appear at roughly the same frequency as English. Don't dilute SEO by over-translating.

## Middleware behavior (quick reference)

- URL starts with `/es/*` → cookie is stamped, locale is set on `x-locale` request header for downstream Server Components.
- URL has no locale prefix and user has `NEXT_LOCALE=es` cookie and the path is in `TRANSLATED_PATHS` → 307 redirect to `/es<path>`.
- URL has no locale prefix, no cookie, and `Accept-Language` prefers Spanish, and the path is translated → 307 redirect to `/es<path>`.
- URL has no locale prefix and path is **not** translated → no redirect. (We never send users to a 404 just to match their language preference.)
- Static assets, API routes, and `_next` are excluded via the existing `matcher`.

## Files created / edited in v1

**Created**

- `src/lib/i18n/config.ts`
- `src/lib/i18n/dictionaries/en.ts`
- `src/lib/i18n/dictionaries/es.ts`
- `src/lib/i18n/get-dictionary.ts`
- `src/lib/i18n/client.ts`
- `src/components/marketing/LocaleSwitcher.tsx`
- `src/components/marketing/LocaleFallbackBanner.tsx`
- `src/app/es/layout.tsx`
- `src/app/es/page.tsx`
- `src/app/es/hs/page.tsx`
- `src/app/es/hs/valuation/page.tsx`
- `src/app/es/solutions/parents/page.tsx`
- `src/app/es/business/case-studies/page.tsx`
- `src/app/es/pricing/page.tsx`
- `docs/HS-NIL-I18N-GUIDE.md` (this file)

**Edited**

- `src/middleware.ts` — locale detection + Accept-Language redirect block
- `src/components/marketing/Navbar.tsx` — LocaleSwitcher mounted in desktop + mobile nav
- `src/components/marketing/index.ts` — barrel export
- `src/app/(marketing)/page.tsx` — now a server wrapper around HomePageClient, emits hreflang
- `src/app/(marketing)/HomePageClient.tsx` — renamed from the old page.tsx
- `src/app/(marketing)/solutions/parents/page.tsx` — hreflang alternates
- `src/app/(marketing)/business/case-studies/page.tsx` — hreflang alternates
- `src/app/(marketing)/pricing/page.tsx` — hreflang alternates
- `src/app/(hs)/hs/page.tsx` — hreflang alternates
- `src/app/hs/valuation/page.tsx` — hreflang alternates
- `src/app/sitemap.ts` — Spanish entries + `languages` alternates per pair

## What's still English in v1

- Blog (`/blog/*`) — SEO value is compounding in English; revisit once we have a Spanish blog author.
- Dashboards (athlete/parent/brand/AD) — auth-gated surfaces, out of scope for a public-pages-first pass.
- Waitlist form + valuation calculator widget — form labels/validation stay English for v1; page shell around them is translated.
- Admin + state-AD portal — bilingual-optional ops team, intentional English-only.
- Other solution pages (`/solutions/athletes`, `/solutions/brands`, `/solutions/ads`, `/solutions/state-ads`) — tackle in v2 once native-speaker review capacity is confirmed.
