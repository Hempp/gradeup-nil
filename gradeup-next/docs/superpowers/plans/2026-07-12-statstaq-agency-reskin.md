# StatStaq Agency Reskin + Reposition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin GradeUp's marketing + auth surfaces to StatStaq's dark-cobalt stats-lab look and retone copy + SEO to position GradeUp as StatStaq's verified-GPA scholar-athlete layer — with zero IA/flow/feature/dashboard/DB changes.

**Architecture:** GradeUp's CSS uses three layers (primitives → semantic tokens → theme scopes). Both `.marketing-dark` and `.auth-theme` consume the `--marketing-*` **primitives** (globals.css:227–246); dashboards (`:root`, `.dashboard-dark`) do not. So the entire color reskin is a rebind of ~20 primitive lines. Font, copy, endorsement, and SEO are additive edits on top. Everything ships on branch `feat/statstaq-agency-reskin` and preview-deploys on Vercel before any merge to `main`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript 5, `next/font/google`, Jest, ESLint, Vercel.

## Global Constraints

- Branch: `feat/statstaq-agency-reskin` (already created; spec committed). Never edit `main` directly — merge to `main` auto-deploys to production.
- **No** new routes, nav items, redirects, or slug changes (protects SEO). No flow/feature/DB/auth/component-logic changes. GPA verification pipeline stays functionally identical.
- **Do not touch** dashboard theme scopes: `:root` (light) and `.dashboard-dark`. Only `.marketing-dark`, `.auth-theme`, and the `--marketing-*` primitives they consume.
- **Single chromatic accent = cobalt `#2563EB`** (hover `#3B82F6`) on reskinned surfaces. No second accent survives (cyan/lime/gold/magenta all collapse to cobalt). Status colors (success `#15803D`, warn `#F59E0B`, danger `#DC2626`) remain semantic-only, never decorative.
- Surface ladder: ink `#0A0A0A` → surface `#141414` → surface-2 `#1C1C1C`. Text ladder: `#FAFAFA` → `rgba(255,255,255,.65)` → `.45` → `.25`.
- Hero display font stays **Bebas Neue** (already loaded). Body/UI font becomes **Inter** on marketing/auth (replaces DM Sans in those scopes).
- **Honesty rule (hard):** never carry over or invent metrics. Strip `$127,450+` and `847 verified athletes`. A specific number appears only if seg supplies a sourceable one. Consistent with the no-fabricated-stats red line.
- **Brand lockup:** GradeUp stays the product name and `siteName`. StatStaq appears as parent endorsement — canonical wording **"part of StatStaq"** (text-only unless a StatStaq logo asset is provided). Canonical copy frame: **"GradeUp qualifies you. StatStaq represents you."**
- **Canonical "four jobs" list** (reuse verbatim, in this order): **produce your content · value your brand · source your deals · negotiate your contracts.**
- After every task: `npm run build` must pass and `npm test` must stay green before commit.

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `src/app/globals.css` | Rebind `--marketing-*` primitives + hero-orb decorative colors to cobalt/ink ladder; bind Inter body var in marketing/auth scopes | 1, 2 |
| `src/app/layout.tsx` | Load Inter via `next/font`; retone root metadata; update `orgJsonLd` (parentOrganization + Service) | 2, 3 |
| `src/app/(marketing)/page.tsx`, `HomePageClient.tsx` | Home hero + metadata retone | 4 |
| `src/app/(marketing)/solutions/athletes/page.tsx` | Core "four jobs" + GPA-gate framing + metadata | 5 |
| `src/app/(marketing)/pricing/page.tsx` | Commission model copy + metadata | 6 |
| `src/components/marketing/Navbar.tsx`, `Footer.tsx` | "part of StatStaq" endorsement lockup | 7 |
| Remaining `(marketing)` routes (+ `es/`) | Copy retone + per-page metadata to retone rules | 8 |
| `src/app/(marketing)/about*` / About surface | Endorsement line + final browser verification | 9 |
| `__tests__` (new) | Guard test: metadata is claim-free + StatStaq-endorsed | 3 |

---

## Task 1: Cobalt token rebind (color reskin)

Rebinds the `--marketing-*` primitives so both `.marketing-dark` and `.auth-theme` adopt the StatStaq palette at once. No component edits.

**Files:**
- Modify: `src/app/globals.css:227-246` (primitive block) and hero-orb color rules (`.hero-orb-cyan`, `.hero-orb-magenta`, and any sibling orb classes, ~line 1226+).

**Interfaces:**
- Consumes: nothing.
- Produces: cobalt-themed marketing/auth surfaces. Downstream tasks assume `--accent-primary`, `--color-primary`, `--border-color-focus` all resolve to cobalt `#2563EB` in both scopes.

- [ ] **Step 1: Rebind the primitive values**

In `src/app/globals.css`, replace the marketing primitive block (lines 227–246) with:

```css
  /* ─── Surface ladder (StatStaq stats-lab) ─── */
  --marketing-black: #0A0A0A;    /* ink — page bg */
  --marketing-gray-950: #141414; /* surface — sections */
  --marketing-gray-900: #1C1C1C; /* surface-2 — cards, tiles, chat bubbles */
  --marketing-gray-800: #262626; /* borders */
  --marketing-gray-700: #404040;
  --marketing-gray-600: #525252;
  --marketing-gray-500: #737373;
  --marketing-gray-400: #a3a3a3;
  --marketing-gray-300: #d4d4d4;

  /* ─── Single accent: cobalt (all former accents collapse here) ─── */
  --marketing-cyan: #2563EB;
  --marketing-cyan-dark: #1D4ED8;
  --marketing-cyan-glow: rgba(37, 99, 235, 0.40);
  --marketing-lime: #2563EB;
  --marketing-lime-glow: rgba(37, 99, 235, 0.30);
  --marketing-gold: #2563EB;
  --marketing-gold-glow: rgba(37, 99, 235, 0.30);
  --marketing-magenta: #2563EB;
  --marketing-magenta-glow: rgba(37, 99, 235, 0.30);
```

- [ ] **Step 2: Add cobalt hover token**

Immediately after the block above, add (used by copy/CTA hovers that reference a lighter accent):

```css
  --marketing-cobalt-hover: #3B82F6;
```

- [ ] **Step 3: Recolor hero orbs to cobalt bloom**

Find the hero-orb color rules (search `hero-orb-`). For every orb variant (`-cyan`, `-magenta`, and any others), set the gradient to cobalt so no second hue blooms:

```css
.hero-orb-cyan,
.hero-orb-magenta {
  background: radial-gradient(circle, rgba(37, 99, 235, 0.55) 0%, transparent 70%);
}
```

(Keep existing `opacity`, `filter`, and animation declarations on those selectors — only the `background` changes.)

- [ ] **Step 4: Build + verify no dashboard bleed**

Run: `npm run build`
Expected: build succeeds. Then confirm dashboards untouched:
Run: `git diff -U0 src/app/globals.css | grep -E '^\+' | grep -iE ':root|dashboard-dark' || echo "OK: no dashboard-scope lines changed"`
Expected: `OK: no dashboard-scope lines changed`

- [ ] **Step 5: Browser screenshot check (marketing + auth)**

Start the app and screenshot `/` and one auth page (e.g. `/login`) via the claude-in-chrome skill. Expected: dark `#0A0A0A` surfaces, single cobalt accent on CTAs/eyebrows, no cyan/lime/gold/magenta anywhere, legible button text on cobalt. If any element renders low-contrast, note it for a follow-up token fix (do not proceed to commit until legible).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "style: rebind marketing/auth primitives to StatStaq cobalt ladder"
```

---

## Task 2: Inter body font on marketing/auth

Bebas Neue hero is untouched. Swap the body/UI face to Inter in the two reskinned scopes only.

**Files:**
- Modify: `src/app/layout.tsx:4` (import) and font-init block (~21–47), plus body `className` (~138).
- Modify: `src/app/globals.css` — bind `--font-dm-sans` consumers to Inter inside `.marketing-dark` and `.auth-theme`.

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `--font-inter` CSS var available globally; marketing/auth body text renders Inter.

- [ ] **Step 1: Import Inter**

In `src/app/layout.tsx:4`, add `Inter` to the import:

```ts
import { Geist, Geist_Mono, Bebas_Neue, DM_Sans, Inter } from "next/font/google";
```

- [ ] **Step 2: Initialize Inter**

After the `dmSans` init block, add:

```ts
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
```

- [ ] **Step 3: Register the variable on <body>**

In the body `className` template (~line 138), append `${inter.variable}`:

```tsx
className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${dmSans.variable} ${inter.variable} antialiased`}
```

- [ ] **Step 4: Point marketing/auth body font at Inter**

In `src/app/globals.css`, inside the `.marketing-dark` block add:

```css
  font-family: var(--font-inter), system-ui, sans-serif;
  font-feature-settings: "cv02","cv03","cv04","cv11";
```

And inside the `.auth-theme` block add the same two declarations. (Hero `h1` keeps `--font-bebas-neue` via its existing selector — do not change heading font bindings.)

- [ ] **Step 5: Build + screenshot**

Run: `npm run build` — expected: passes.
Screenshot `/` — expected: body/nav/buttons render Inter; hero `h1` still Bebas Neue.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "style: use Inter for marketing/auth body text"
```

---

## Task 3: Root SEO metadata + JSON-LD endorsement

**Files:**
- Modify: `src/app/layout.tsx` — `metadata` export (~50–120) and `orgJsonLd` (before line 125).
- Create: `src/app/__tests__/root-metadata.test.ts` (guard test).

**Interfaces:**
- Consumes: nothing.
- Produces: claim-free, StatStaq-endorsed root metadata and `orgJsonLd` with `parentOrganization` + a `Service` node. Task 8 mirrors this pattern per page.

- [ ] **Step 1: Write the failing guard test**

Create `src/app/__tests__/root-metadata.test.ts`:

```ts
import { metadata } from "../layout";

const asText = JSON.stringify(metadata);

test("root metadata carries no fabricated metrics", () => {
  expect(asText).not.toMatch(/127,?450/);
  expect(asText).not.toMatch(/847/);
});

test("root metadata endorses StatStaq while GradeUp stays the product", () => {
  expect(asText).toMatch(/StatStaq/);
  expect(metadata.openGraph?.siteName).toBe("GradeUp NIL");
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npm test -- root-metadata`
Expected: FAIL (current metadata contains `127,450`/`847` and no `StatStaq`).

- [ ] **Step 3: Retone the metadata export**

In `src/app/layout.tsx`, rewrite the `metadata` `description`, `openGraph`, and `twitter` fields (keep `metadataBase`, `siteName: "GradeUp NIL"`, and all URLs unchanged). Use:

- title (default/template): `"GradeUp — Verified scholar-athlete NIL, part of StatStaq"`
- description: `"GradeUp is the scholar-athlete layer of StatStaq. Keep your GPA up (verified) and StatStaq runs your NIL — producing your content, valuing your brand, sourcing your deals, negotiating your contracts. GradeUp is how you qualify."`
- openGraph.title / twitter.title: `"GradeUp — Verified scholar-athlete NIL, part of StatStaq"`
- openGraph.description / twitter.description: reuse the description above (may trim twitter to ≤200 chars).

Remove every `$127,450`/`847` occurrence.

- [ ] **Step 4: Update `orgJsonLd`**

Set `orgJsonLd` to an `Organization` for GradeUp with a `parentOrganization` and a `Service` describing the offering:

```ts
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GradeUp NIL",
  url: "https://gradeup-next.vercel.app",
  parentOrganization: { "@type": "Organization", name: "StatStaq" },
  description:
    "GradeUp is the verified-GPA scholar-athlete layer of StatStaq's NIL agency.",
  makesOffer: {
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name: "Done-for-you NIL representation for scholar-athletes",
      provider: { "@type": "Organization", name: "StatStaq" },
      serviceType:
        "Content production, brand valuation, deal sourcing, contract negotiation",
    },
  },
};
```

(If `orgJsonLd` currently has fields worth keeping like `logo`/`sameAs`, preserve them.)

- [ ] **Step 5: Run the guard test — expect PASS**

Run: `npm test -- root-metadata`
Expected: PASS.

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/app/layout.tsx src/app/__tests__/root-metadata.test.ts
git commit -m "seo: retone root metadata + JSON-LD to GradeUp-part-of-StatStaq"
```

---

## Task 4: Home page copy retone

**Files:**
- Modify: `src/app/(marketing)/page.tsx` (metadata if present) and `src/app/(marketing)/HomePageClient.tsx` (hero + sections).

**Interfaces:**
- Consumes: canonical strings from Global Constraints.
- Produces: home hero that leads with the layer positioning.

- [ ] **Step 1: Retone the hero**

In `HomePageClient.tsx`, replace the current headline/subhead (the "Your GPA Is Worth Money" / marketplace framing and any `$127,450`/`847` stat block) with the layer story. Hero `h1` (Bebas Neue) short and bold; subhead carries the four jobs. Example:

- h1: `KEEP YOUR GRADES UP. WE'LL RUN YOUR NIL.`
- subhead: `GradeUp is the scholar-athlete layer of StatStaq. Verify your GPA, and StatStaq's team produces your content, values your brand, sources your deals, and negotiates your contracts.`
- primary CTA label unchanged in destination; text may become `Qualify with your GPA`.

Delete any hardcoded metric tiles. If a proof section is structurally required, replace numbers with claim-free proof (e.g. "3-tier verified GPA", "produced, valued, sourced, negotiated") — no counts or dollars.

- [ ] **Step 2: Retone remaining home sections**

For each existing section component rendered by `HomePageClient.tsx`, retone copy in place (same components, same order) to the four-jobs + gate framing. Include the frame line `GradeUp qualifies you. StatStaq represents you.` once, near the closing CTA.

- [ ] **Step 3: Verify structure preserved**

Run: `git diff --stat src/app/(marketing)/HomePageClient.tsx` — expected: text-only changes; no removed/added JSX elements beyond metric-tile deletion. Run: `npm run build` — passes.

- [ ] **Step 4: Screenshot `/` and commit**

Screenshot `/`. Expected: coherent cobalt hero, no fabricated numbers.

```bash
git add "src/app/(marketing)/page.tsx" "src/app/(marketing)/HomePageClient.tsx"
git commit -m "copy: retone home to GradeUp-layer-of-StatStaq positioning"
```

---

## Task 5: solutions/athletes — core four-jobs + GPA gate

**Files:**
- Modify: `src/app/(marketing)/solutions/athletes/page.tsx` (copy + `metadata`).

**Interfaces:**
- Consumes: canonical four-jobs list + gate frame.
- Produces: the athlete-facing canonical expression of the model, reused as tone reference by Task 8.

- [ ] **Step 1: Retone the page copy**

Rewrite the athlete solution copy so each of the four jobs is a section/point in canonical order (produce your content · value your brand · source your deals · negotiate your contracts), attributed to StatStaq, with the verified-GPA gate as the entry requirement. Keep the existing component/section structure. Weave the 3-tier verification (self-reported → transcript OCR auto-approve at ≥0.90 confidence & ±0.05 of claim → institution-verified) as the "how you qualify" explainer. No invented outcomes/metrics.

- [ ] **Step 2: Retone the page `metadata`**

Update `title`/`description`/OG to the layer positioning; strip any fabricated figures. Title pattern: `"For scholar-athletes — GradeUp, part of StatStaq"`.

- [ ] **Step 3: Build + screenshot + commit**

Run: `npm run build` — passes. Screenshot `/solutions/athletes`.

```bash
git add "src/app/(marketing)/solutions/athletes/page.tsx"
git commit -m "copy: retone athlete solution to four-jobs + verified-GPA gate"
```

---

## Task 6: pricing — commission model

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx` (copy + `metadata`).

**Interfaces:**
- Consumes: StatStaq pricing model.
- Produces: pricing copy = free to join · % on deals we source · % on deals you bring.

- [ ] **Step 1: Retone pricing copy**

Reframe the existing pricing page structure to StatStaq's model: **Free to join**, **% on deals we source**, **% on deals you bring**. Keep the page's existing card/section layout. Do not invent specific percentages unless already present in the page or supplied by seg — if a number is needed and unknown, use the qualitative frame ("a share of deals we source for you") and flag `⟨percent?⟩` in a code comment for seg, not in visible copy.

- [ ] **Step 2: Retone `metadata`; build; screenshot; commit**

Run: `npm run build` — passes. Screenshot `/pricing`.

```bash
git add "src/app/(marketing)/pricing/page.tsx"
git commit -m "copy: reframe pricing to StatStaq commission model"
```

---

## Task 7: StatStaq endorsement lockup (Navbar + Footer)

**Files:**
- Modify: `src/components/marketing/Navbar.tsx`, `src/components/marketing/Footer.tsx`.

**Interfaces:**
- Consumes: canonical endorsement wording "part of StatStaq".
- Produces: persistent parent endorsement on every marketing page. Text-only (no logo asset by default).

- [ ] **Step 1: Add endorsement to Footer**

In `Footer.tsx`, near the GradeUp wordmark/copyright row, add a text endorsement (no new nav section, no links to nonexistent routes):

```tsx
<span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
  part of StatStaq
</span>
```

- [ ] **Step 2: Add a subtle endorsement to Navbar**

In `Navbar.tsx`, adjacent to the GradeUp logo/wordmark, add the same "part of StatStaq" microcopy (small, muted, non-interactive). Do not add a nav item or route.

- [ ] **Step 3: Build + verify no new routes**

Run: `npm run build` — passes.
Run: `git diff src/components/marketing/Navbar.tsx | grep -E 'href=' || echo "OK: no new links"`
Expected: `OK: no new links` (or only pre-existing hrefs).

- [ ] **Step 4: Screenshot + commit**

Screenshot `/` header and footer. Expected: "part of StatStaq" visible, muted, GradeUp still leads.

```bash
git add src/components/marketing/Navbar.tsx src/components/marketing/Footer.tsx
git commit -m "brand: add 'part of StatStaq' endorsement to marketing nav + footer"
```

---

## Task 8: Long-tail marketing routes — copy + metadata

Retone every remaining `(marketing)` route (and the Spanish `es/` surface) to the same rules. Structure-preserving; per-page `metadata` retoned; no fabricated figures.

**Files (modify copy + `metadata` in each; skip legal boilerplate bodies):**
- `blog/` (index + `[slug]` + `state-nil-rules/[stateSlug]`), `business/case-studies/` (+ `[slug]`), `compare/`, `discover/`, `help/`, `opportunities/`, `solutions/` (index, `ads`, `brands` + sub-verticals `fitness`/`fmv`/`local-restaurant`/`local-retail`/`templates`/`training-facility`/`tutoring`, `parents`, `state-ads`).
- Legal (`privacy`, `terms`, `subscription-terms`): **metadata + any GradeUp/StatStaq brand references only** — do not rewrite legal clauses.
- `src/app/es/` marketing layout + pages: mirror the retone in Spanish.

**Retone rules (apply per page):**
1. Replace any marketplace/"list yourself"/"GPA is worth money" framing with the layer framing: StatStaq runs the agency; GradeUp is the verified-GPA gate.
2. Attribute the four jobs to StatStaq using the canonical list + order.
3. Strip every fabricated metric (`$127,450`, `847`, any invented count/dollar). Keep only seg-sourced numbers.
4. Brand voice: GradeUp leads; "part of StatStaq" endorsement fits naturally where a parent credential helps.
5. Keep each page's component tree and section order intact — text edits only.

**Interfaces:**
- Consumes: tone from Tasks 4–6; canonical strings.
- Produces: fully consistent positioning across all marketing surfaces.

- [ ] **Step 1: Retone in dependency-safe batches, one commit per batch**

Batch A — `solutions/*` (all remaining under solutions). Batch B — `blog/*` + `business/case-studies/*`. Batch C — `compare`, `discover`, `help`, `opportunities`. Batch D — `es/*`. Batch E — legal metadata/brand only.
For each batch: retone → `npm run build` (passes) → `npm test` (green) → commit `copy: retone <batch> to StatStaq-layer positioning`.

- [ ] **Step 2: Repo-wide fabricated-metric sweep**

Run: `grep -rnE '127,?450|\b847\b' src/app "src/app/(marketing)" src/components || echo "CLEAN: no fabricated metrics remain"`
Expected: `CLEAN: no fabricated metrics remain`. If any hit remains, fix it in its page and re-run before proceeding.

- [ ] **Step 3: Final consistency commit (if sweep required fixes)**

```bash
git add -A
git commit -m "copy: final fabricated-metric sweep across marketing surfaces"
```

---

## Task 9: About endorsement + full browser verification pass

**Files:**
- Modify: the About surface (locate via `grep -ril "about" src/app/(marketing)`), if present, else fold endorsement sentence into home closing section.

**Interfaces:**
- Consumes: everything prior.
- Produces: ship-ready branch, verified in a real browser.

- [ ] **Step 1: Add the endorsement sentence**

On the About surface, add one plain sentence: `GradeUp is the scholar-athlete layer of StatStaq — StatStaq represents the athletes GradeUp qualifies.` Structure-preserving.

- [ ] **Step 2: Full-suite gate**

Run: `npm run lint` (no new errors), `npm test` (green), `npm run build` (passes).

- [ ] **Step 3: Browser verification pass**

Via claude-in-chrome, screenshot: `/`, `/solutions/athletes`, `/pricing`, `/compare`, one auth page, one `es/` page. Verify for each: dark cobalt single-accent, Inter body + Bebas hero, "part of StatStaq" present, no fabricated numbers, no cyan/lime/gold/magenta, legible contrast. Note any contrast miss and fix its token before finishing.

- [ ] **Step 4: Commit + push preview**

```bash
git add -A
git commit -m "brand: about-page StatStaq endorsement; verified reskin pass"
git push -u origin feat/statstaq-agency-reskin
```

Vercel builds a preview deployment for the branch. Review the preview URL before any merge to `main`. Merge to `main` is a **separate, explicit** step (auto-deploys to production) — do not merge without seg's go-ahead.

---

## Self-Review

- **Spec coverage:** §4 visual → Tasks 1–2. §5 messaging (four jobs, gate, endorsement) → Tasks 4–9. §6 SEO → Tasks 3, 8. §7 verification/rollout → Tasks 1/5/9 screenshots + Task 9 push. §8 units (token/font/copy/SEO) → Tasks 1/2, 3/8, 4–9. Brand lockup (§1) → Tasks 3, 7, 9. Honesty rule → Tasks 3, 4, 8 (guard test + sweep). All covered.
- **Placeholder scan:** copy tasks provide canonical strings + worked examples + explicit retone rules; the one deliberate token `⟨percent?⟩` (Task 6) is a code-comment flag for seg, not shipped copy. No "TBD/handle edge cases".
- **Type/string consistency:** canonical four-jobs list, "part of StatStaq", cobalt `#2563EB`/`#3B82F6`, and the frame line are identical everywhere they appear.
