# GradeUp → StatStaq Agency Reskin + Reposition — Design

**Date:** 2026-07-12
**Status:** Approved (brainstorming → spec)
**Scope owner:** seg / Coach Phillips
**Repo:** `gradeup-nil/gradeup-next` (Next.js 16, live at gradeup-next.vercel.app, git-linked Vercel)

---

## 1. Goal

**GradeUp is part of StatStaq** — not a rival product. StatStaq already runs the
done-for-you NIL agency ("four jobs off your plate": produce content · value brand
· source deals · negotiate contracts, priced free-to-join + commission). GradeUp
is the **scholar-athlete layer on top of that engine**: the verified-GPA
eligibility gate and its 3-tier verification system that decides who StatStaq
represents on academic merit.

Express this through a **visual + messaging + SEO reskin only** — GradeUp's
surfaces adopt StatStaq's look and voice and carry the StatStaq endorsement — with
no changes to information architecture, user flows, or features.

**Brand lockup:** GradeUp stays the product name and leads on every surface.
StatStaq appears as the **parent endorsement** — "part of StatStaq" / "A StatStaq
company" in the header/footer/about — the credential, not the headline. (Decided.)

**One-line positioning:**

> GradeUp is the scholar-athlete layer of StatStaq. Keep your GPA up (verified) and
> StatStaq runs your NIL for you — produces your content, values your brand, sources
> your deals, negotiates your contracts. GradeUp is how you qualify.

## 2. Non-Goals (explicit exclusions)

- **No** changes to IA, routes, navigation, or page inventory. No new pages, no
  redirects. Slugs stay identical (protects SEO).
- **No** changes to user flows, onboarding steps, deal flow, or the GPA
  verification pipeline. The GPA system (`hs_athlete_gpa_snapshots`,
  `transcript_ocr_results`, confidence-gated auto-approval, trajectory shares)
  stays **functionally identical**.
- **No** database, auth, API, or component-logic changes.
- **No** reskin of authenticated dashboards. They stay **light-first** as designed
  (`:root` professional-blue + gold, `.dashboard-dark`). Confirmed decision.

## 3. Surfaces In Scope

| Surface | Theme scope | Change |
|---|---|---|
| Public marketing (~28 `(marketing)` routes) | `.marketing-dark` | Reskin + copy retone + SEO |
| Auth pages | `.auth-theme` | Reskin (token rebind) |
| Authenticated dashboards | `:root`, `.dashboard-dark` | **Untouched** |

Marketing routes (from `src/app/(marketing)/`): `/` (home), `blog` (+ `[slug]`,
`state-nil-rules/[stateSlug]`), `business/case-studies` (+ `[slug]`), `compare`,
`discover`, `help`, `opportunities`, `pricing`, `privacy`, `terms`,
`subscription-terms`, and `solutions` (+ `ads`, `athletes`, `brands` &
sub-verticals: `fitness`, `fmv`, `local-restaurant`, `local-retail`, `templates`,
`training-facility`, `tutoring`; `parents`, `state-ads`).

## 4. Visual System (token rebind — no component edits)

GradeUp's design system is three-layer: primitives → semantic tokens → contextual
theme scopes. Components read **only semantic tokens**. Therefore the reskin is a
**token rebind inside two scope blocks** — `globals.css` `.marketing-dark`
(≈line 1185) and `.auth-theme` (≈line 2181) — plus the decorative hero-orb colors.
No `.tsx` component edits required for color/type.

Target palette is StatStaq's `DESIGN.md` contract:

**Surfaces (replace pure-black Nike register with a ladder):**
- `--bg-primary` / ink: `#0A0A0A`
- surface: `#141414`
- surface-2 (nested cards, chat bubbles, tiles): `#1C1C1C`

**Accent — single cobalt only (collapse cyan+gold+lime+magenta):**
- `--accent` / `--accent-primary`: `#2563EB`
- hover: `#3B82F6`
- soft: `rgba(37,99,235,0.10)` · tint: `rgba(37,99,235,0.18)`
- In `.marketing-dark`, repoint `--accent-secondary`, `--accent-gold`,
  `--accent-success`, `--accent-tertiary` (and their `-glow` variants) to the
  cobalt/glow values so no second chromatic accent survives. Hero-orb classes
  (`.hero-orb-cyan`, `.hero-orb-magenta`, etc.) become cobalt radial-glow blooms.

**Text ladder:** `#FAFAFA` → `rgba(255,255,255,.65)` → `.45` → `.25`.
Keep `--text-inverse` legible on cobalt surfaces (mirror the existing guard that
prevents white-on-accent low-contrast buttons — set it to ink `#0A0A0A`).

**Type:**
- Hero `h1`: **Bebas Neue** — already loaded via `next/font` (`--font-bebas-neue`).
  No new font. line-height ~0.9, positive tracking.
- Body / UI / section headings: **Inter** (replaces DM Sans). h2 = Inter 800,
  −0.025em. Enable `font-feature-settings: "cv02","cv03","cv04","cv11"`.
- Editorial pullquotes only: Source Serif Pro. Register break everywhere else.

**Atmospherics:** 4% grain overlay, 40px dot-grid background, cobalt radial-glow
bloom on hero + closing CTA. Everything else solid surface.

**Status colors:** success `#15803D` / warn `#F59E0B` / danger `#DC2626` remain
**semantic only** (deltas, flags, live indicators) — never decorative. Note: warn
reuses the old gold hue but is scoped to status semantics, not accent.

## 5. Messaging / Positioning (how the business model "combines")

Retone copy **inside existing page structures** — same components, same section
order, same routes. This is where StatStaq's model actually lands.

**Core promise (home hero + solutions/athletes):** StatStaq takes four jobs off
your plate — produce content · value your brand · source your deals · negotiate
your contracts. "A real producer, with agent superpowers." Attribute the agency
work to StatStaq (the engine); GradeUp is how a scholar-athlete gets in.

**The GradeUp layer as the gate:** GradeUp represents scholar-athletes only. Keep
your GPA up — verified through the 3-tier system (self-reported → transcript OCR
auto-approve at ≥0.90 confidence & ±0.05 of claim → institution-verified) — and
StatStaq runs your NIL. The verified-GPA requirement is the eligibility hook, not a
badge. Frame: *"GradeUp qualifies you. StatStaq represents you."*

**StatStaq endorsement placement:** add "part of StatStaq" / "A StatStaq company"
lockup to the marketing header and footer, and an endorsement line on the About
page. This is brand copy/lockup, not an IA change — no new routes, no nav items.

**Pricing (`/pricing`):** reframe to StatStaq's model — free to join · % on deals
we source · % on deals you bring — reconciled with the existing page's structure.

**Honesty guardrail (hard rule):** the current home metadata/copy hardcodes
`$127,450+ paid to 847 verified athletes`. Do **not** carry these over and do
**not** invent agency metrics (deals closed, dollars paid, athlete counts).
Replace with claim-free positioning. A specific number may appear **only** if seg
can source it. (Consistent with seg's no-fabricated-stats red line and NTP-v1.)

## 6. SEO

- Root `layout.tsx` metadata (title template, description, `openGraph`,
  `twitter`) retoned: "Your GPA Is Worth Money / marketplace" → the layer
  positioning ("GradeUp — the scholar-athlete layer of StatStaq" register). GradeUp
  stays the `siteName`. Strip the fabricated `$127,450+` figure per §5.
- Per-page `metadata` exports across the `(marketing)` routes retoned to match.
- JSON-LD updated: GradeUp `Organization` with `parentOrganization` = StatStaq (the
  machine-readable form of the endorsement), plus a `Service` entity for the
  done-for-you agency offering (content production, brand valuation, deal sourcing,
  contract negotiation) `provider` = StatStaq, gated on GradeUp's academic
  eligibility.
- **Unchanged:** `metadataBase` (`https://gradeup-next.vercel.app`), all URLs, all
  slugs, sitemap structure. No IA change ⇒ no redirects ⇒ no ranking loss.

## 7. Verification & Rollout

- **Reskin risk = contrast/legibility.** After the token rebind, run a real-browser
  pass over key marketing + auth pages, screenshotting each in the new dark cobalt
  and checking WCAG contrast on text, buttons (esp. `--text-inverse` on cobalt),
  borders, and status colors.
- **Copy retone** is the higher-touch part (~28 routes). Done page-by-page; each
  page's component tree and section order stay intact. Diff each page for
  structure drift.
- **Ship on a branch**, Vercel preview-deploys before any merge to `main`
  (git-linked: merge to `main` auto-deploys to production).

## 8. Component Boundaries (units of work)

1. **Token rebind** — `globals.css` `.marketing-dark` + `.auth-theme` scopes +
   hero-orb decorative colors. Single, self-contained CSS change; re-themes every
   in-scope page at once. Verifiable by screenshot diff.
2. **Font swap** — body/UI DM Sans → Inter in the marketing/auth register
   (load via `next/font`, bind the body font var in-scope). Bebas Neue hero
   untouched.
3. **Copy retone + StatStaq endorsement** — per-route text edits within
   `(marketing)`, structure-preserving; plus the "part of StatStaq" lockup in the
   marketing header/footer components and the About page. Endorsement is copy/logo
   only — confirm the header/footer edits stay within the marketing layout and add
   no nav items or routes.
4. **SEO metadata** — root + per-page metadata + JSON-LD (incl. `parentOrganization`).

Each unit is independently testable and independently revertable.

## 9. Open Items (for seg)

- Any **real, sourceable** metrics to feature? Default: none (claim-free copy).
- Confirm cobalt `#2563EB` is the final accent (vs. sampling StatStaq's live cobalt).
- Exact endorsement wording — "part of StatStaq" vs "A StatStaq company" vs
  "Powered by StatStaq"? Default: **"part of StatStaq."**
- Is there a StatStaq logo/wordmark asset to place in the header/footer lockup, or
  should the endorsement be text-only for now? Default: **text-only.**
