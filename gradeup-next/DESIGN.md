# GradeUp — Design Contract (Cream Editorial System)

> The public marketing surface of GradeUp NIL. This file is the source of
> truth for the cream editorial look. When a component drifts from this
> contract, the component is wrong — not this file. Reconcile to it.

_Last reconciled: 2026-07-14 (full design/UX pass, branch `feat/statstaq-agency-reskin`)._

---

## 1. Positioning & voice

GradeUp is **"the verified-GPA scholar-athlete layer of StatStaq."** The public
site reads like an editorial sports magazine, not a SaaS dashboard: heavy
condensed display type, warm cream paper, one confident cobalt accent, real
duotone photography. Confident, plain-spoken, proof-first. Never hypey.

## 2. Surfaces (three registers, one brand)

| Register | Wrapper class | Where | Look |
|----------|---------------|-------|------|
| **Cream editorial** | `.marketing-dark` (legacy name — it is a LIGHT theme) | all public/marketing pages, `/es`, `/athletes`, `/brands`, `/schools`, `/hs/valuation` | cream paper, navy ink, cobalt accent |
| **Auth** | `.auth-theme` | `/(auth)/*` | intentionally dark, cobalt accent, gradient orbs |
| **App** | `.dark` default + `DashboardShell` | dashboards, HS portal (flag-gated) | dark app chrome, sidebar nav |

> The public register keeps the historical class name `.marketing-dark` for
> wrapper compatibility, but the gray ladder is **inverted** to a light theme.
> Do not "fix" the name.

## 3. Color tokens (scoped to `.marketing-dark`)

| Token | Value | Use |
|-------|-------|-----|
| `--cream` | `#F2EDE1` | page background |
| `--cream-section` | `#ECE6D8` | section band |
| `--cream-surface` | `#FBF9F2` | cards, inputs, elevated surfaces |
| `--ink` | `#16182B` | primary text |
| `--ink-muted` | `#35384D` | secondary text |
| `--ink-meta` | `#6B6E82` | meta / muted / labels |
| `--cobalt` | `#2563EB` | the one accent (links, CTAs, active, highlights) |
| `--cobalt-hover` | `#1D4ED8` | accent hover |
| `--hairline` | `rgba(22,24,43,.14)` | borders / dividers |
| `--text-inverse` | `#FBF9F2` | text ON a cobalt surface (≈5.2:1 AA) |

**Rules**
- One accent only. Cobalt. The legacy `--marketing-lime/gold/magenta` are all
  remapped to cobalt on purpose — do not reintroduce a second accent.
- **Text on cream** → `--ink` / `--ink-muted` / `--ink-meta`. Never `text-white`.
- **Text on cobalt** → `--text-inverse` (cream), never navy.
- **Never** ship a dark-theme utility (`text-white`, `bg-white/5`,
  `border-white/10`, `bg-black`) inside the cream surface. `<html>` carries
  `.dark` globally, so those read as the app dark theme and vanish on cream.
  See §7.

## 4. Typography

- **Display / headlines** — `Anton` via `.font-display` (or `font-display`):
  heavy condensed, `text-transform: uppercase`, `line-height: .95`,
  `letter-spacing: .01em`. Big, confident, cobalt on the emphasis word.
- **Body / prose** — `Source Serif 4` (transitional serif). This is the default
  body font on `.marketing-dark`. It is what makes the site read "editorial."
- **Eyebrows / meta / stats** — mono/uppercase tracking via the `.eyebrow`
  utility and the stat-pill pattern.

## 5. Signature components

- **Stat pill** — rounded cream-surface pill, hairline border, mono uppercase
  copy with cobalt figures. e.g. `VERIFIED GPA 3 TIERS · SOURCED 15% · YOU BRING 0%`.
- **Duotone photo** — `.duotone` wrapper: desaturated image + cobalt tint
  overlay (`opacity: .42`). Editorial, on-brand, hides stock-photo tells.
- **Choice pill / tab (selected)** — `border-[var(--cobalt)]
  bg-[var(--accent-primary-glow)] text-[var(--cobalt)]`. Unselected:
  `border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-muted)]`.
- **Primary button** — cobalt fill, cream text, arrow affordance.
- **Secondary button** — cream surface, hairline border, ink text.

## 6. Chrome & layout

- Every public page renders the shared **`<Navbar/>` + `<Footer/>`**. Pages
  outside the `(marketing)` route group get it via a thin segment `layout.tsx`
  that wraps children in **`<MarketingChrome/>`** (`components/marketing/`).
- `MarketingChrome` does NOT add its own `<main>`; those pages ship their own
  `<main id="main-content">` — avoids nested-landmark (WCAG 1.3.1). New public
  page outside `(marketing)`? Add a `layout.tsx` using `MarketingChrome` and
  give the page a single `<main id="main-content">`.
- Navbar is `fixed top-0` (~64px). Page heroes carry their own top padding
  (`pt-24`/`pt-32`) to clear it.
- Desktop nav at `lg` (1024px); hamburger sheet below.
- Nav IA: four hubs — Product · Directories · Pricing · Resources — + two CTAs.
  Don't add top-level nav items; slot new links into a hub.

## 7. The `.dark` form-control trap (read before styling any input)

`<html>` carries `.dark` site-wide (app default). globals.css has
`.dark input, .dark select, .dark textarea { background:#262626; color:#fff }`
at specificity (0,1,1), which **beats** a Tailwind `bg-[var(--cream-surface)]`
utility (0,1,0). So on a cream page, an un-overridden field renders as a black
box with white text. The cure lives in globals.css:
`.marketing-dark input:not([type=checkbox]):not([type=radio]), .marketing-dark
select, .marketing-dark textarea { … cream tokens … }` with higher specificity.
**Do not remove it.** When adding fields to the cream surface, this makes them
correct by default; only override for a deliberate reason.

## 8. Accessibility floor

- WCAG 2.2 AA contrast. Ink-on-cream and cream-on-cobalt both clear AA.
- Skip link on every page; single `<main id="main-content">` landmark.
- Focus-visible ring in cobalt (`--accent-primary`); ESC closes every overlay;
  44px min touch targets.
- Duotone/decorative images `aria-hidden` or empty `alt`; content images get
  real alt text.

## 9. Known scope boundaries (not in the cream contract)

- The **authenticated app** (dashboards, HS portal behind `FEATURE_HS_NIL`)
  uses the dark app register on purpose. Do NOT cream-ify data dashboards.
- Pre-existing: `/api/athletes/[id]` — the supporter-checkout route was moved
  under `[id]` (was `[username]`) to satisfy Next 16's one-slug-per-path rule;
  URL and payment logic are unchanged.
