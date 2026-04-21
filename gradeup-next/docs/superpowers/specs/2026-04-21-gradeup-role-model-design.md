# GradeUp NIL — Role Model Consolidation

**Date:** 2026-04-21
**Author:** seg (with Claude)
**Status:** Draft, pending user review
**Spec type:** Architecture / UX refactor

---

## 1. Context & Motivation

GradeUp NIL currently ships with **six or more distinct dashboard surfaces** spread across two Next.js route groups (`(dashboard)` and `(hs)`):

- `/athlete`, `/brand`, `/director` (original college-focused product)
- `/admin` (platform operations, undocumented in README)
- `/hs/athlete`, `/hs/brand`, `/hs/parent`, `/hs/admin`, `/hs/ad-portal` (HS-focused product built out since March 2026)

The README describes a three-role product (Athlete / Brand / Athletic Director). The code does not match. The HS surface is richer than the college surface (28-page admin console, parent-consent flow, state-AD digest, SMS fallbacks). This has caused role-model drift, confused navigation, and a growing maintenance tax.

**Question that triggered this spec:** *"Why is there an admin portal? Shouldn't there be only three dashboards?"*

**Answer developed through brainstorm:**

- Customer-facing surfaces should be exactly three: **Athlete, Brand, Director**.
- Admin is a platform-operator surface, not a customer role — it stays in the codebase but is isolated (separate layout, middleware guard, module boundary, SEO invisibility).
- Parent is not a role — it is a *signer on a consent artifact* addressed by token URL. No parent dashboard.
- State-level Athletic Directors are Directors with `scope = 'state'`, not a separate role.
- College vs HS is a *level* attribute on the user profile, not a URL prefix. One unified route per role, context-aware at the page level.

Competitive research (Opendorse, Framework NIL, GamePlan NIL) confirmed two durable moats: (1) academic/GPA identity as a first-class element (no competitor has an academic axis), and (2) deep HS + parent-consent product (Opendorse's HS is blog-deep; Framework and GamePlan are narrower than GradeUp's existing surface). The consolidation preserves both.

---

## 2. Decisions Summary

| Decision | Choice |
|---|---|
| How many customer dashboards? | Three: Athlete, Brand, Director |
| College vs HS modeled as? | Level field on profile, not URL prefix |
| Parent role? | Removed. Parent = signer on token-linked consent only |
| State AD? | Director with `scope = 'state'` |
| Admin portal? | Kept in-bundle, isolated (layout + middleware + module boundary + SEO) |
| Admin domain split (`admin.gradeup.com`)? | Deferred to future spec; not in this one |
| Migration style? | In-place incremental (Approach 2), not big-bang or domain split |
| Execution style? | Phased with parallel subagents in Wave 3 (Agent A/B/C) |
| Token URLs? | Frozen at current paths forever (`/hs/*/[token]`) |

---

## 3. Role & Context Model

### 3.1 Roles

Three roles only:

```
athlete   — earns money on the platform
brand     — pays money on the platform
director  — approves/oversees athletes
```

### 3.2 Context fields (database-level)

```ts
// On the athlete profile
athlete_level: 'college' | 'hs'          // required; derived from attached school

// On the brand profile
targets_levels: Array<'college' | 'hs'>  // defaults to ['college', 'hs']

// On the director profile
director_scope: 'school' | 'state'       // school = single-school AD; state = state association admin
director_level: 'college' | 'hs'         // which level they oversee
```

**Note on `director_level`:** In practice nearly all `scope = 'state'` directors will be `level = 'hs'`, because HS athletics is governed by state associations (Texas UIL, California CIF, etc.) while college is governed nationally by the NCAA. The field is modeled flexibly to future-proof for any college conference-level role that emerges, but MVP-day expectation is that state-scope directors are HS-only.

### 3.3 What each field unlocks

| Field | UI effect |
|---|---|
| `athlete_level = 'hs'` | Parent-consent banner on Deals/Earnings when consent missing; custodial payout rail; minor-compliant disclosures |
| `targets_levels` | Discover filter chips default state; compliance copy variants |
| `director_scope = 'state'` | Director dashboard switches to multi-school aggregate; Digest nav item appears |
| `director_level = 'hs'` | State-NIL rules surfacing; parent-consent audit log |

### 3.4 What we are NOT modeling

- No `user_type = 'parent'`. Parent is not a user; parent is a consent signer.
- No `is_minor` boolean; derivable from birthdate if needed.
- No multi-role users. One user = one role. Future concern.

### 3.5 Migration requirement

Every existing HS profile must have `athlete_level = 'hs'` backfilled **before** any unified-route UI ships. Every existing director in `/hs/ad-portal` must have `scope = 'state'` backfilled. Done in Phase 1.

---

## 4. Route Consolidation Map

**Guiding rule:** the richer surface (HS) wins; the poorer (original college) absorbs into it.

### 4.1 Customer dashboards

| Today | → | After |
|---|---|---|
| `/athlete/dashboard` + `/hs/athlete` | → | `/athlete` |
| `/athlete/deals` + `/hs/deals` | → | `/athlete/deals` (`/hs/deals/[id]` → `/athlete/deals/[id]`) |
| `/athlete/earnings` + `/hs/athlete/earnings` + `/hs/athlete/deferred-earnings` | → | `/athlete/earnings` (deferred = tab, HS-only) |
| `/hs/athlete/{mentor-sessions,trajectory,transition,privacy,public-profile,campaigns}` | → | `/athlete/<same-slug>` |
| `/brand/dashboard` + `/hs/brand` | → | `/brand` |
| `/hs/brand/{campaigns,shortlist,suggested,performance,payment-method,public-profile}` | → | `/brand/<same-slug>` |
| `/director/dashboard` + `/hs/ad-portal` | → | `/director` (scope drives view) |
| `/hs/ad-portal/{deals,disclosures,settings}` | → | `/director/{deals,compliance,settings}` |

### 4.2 Parent → flow, not dashboard

| Today | → | After |
|---|---|---|
| `/hs/parent` (dashboard) | → | **DELETE** (redirect to `/hs/consent/manage`) |
| `/hs/parent/{referrals,rewards}` | → | **DELETE** or fold into athlete surface |
| `/hs/consent/[token]` | → | **KEEP AT PATH FOREVER** |
| `/hs/consent/manage` | → | **KEEP** (token-auth parent self-serve) |
| `/hs/consent/request` | → | `/athlete/consent/request` (athlete-initiated) |

### 4.3 Admin

| Today | → | After |
|---|---|---|
| `/admin/{deals,performance,users}` (3 stubs) | → | Merge into HS-admin set or delete |
| `/hs/admin/*` (28 pages) | → | `/admin/*` (move up one level) |

Admin URL breakage is acceptable (internal); mitigated by a 30-day in-admin changelog banner.

### 4.4 Onboarding & signup

| Today | → | After |
|---|---|---|
| `/hs/signup/{athlete,parent,brand}` | → | `/signup/<role>?level=hs` (with 301 from old URLs for ≥12 months) |
| `/hs/onboarding/{next-steps,parent-next,payouts,verify-gpa}` | → | `/onboarding/<slug>` (conditionally rendered by `athlete_level`) |

### 4.5 Token/public URLs — frozen

These stay at their current path forever:

- `/hs/consent/[token]`
- `/hs/invite/[token]`
- `/hs/state-ad-invite/[token]`
- `/hs/trajectory/[token]`
- `/hs/unsubscribe/[token]`
- `/hs/valuation`
- `/hs/page.tsx` (the `/hs` marketing root)

These move into a new `(public)` route group for organizational clarity, but URLs are unchanged.

### 4.6 Alumni mentorship

| Today | → | After |
|---|---|---|
| `/hs/alumni`, `/hs/alumni/[mentorId]`, `/hs/alumni/sessions`, `/hs/alumni/setup` | → | `/athlete/mentorship/*` |

### 4.7 Marketing & public profiles

Untouched: `(marketing)/*`, `/athletes/[username]`, `/brands/[slug]`, `/es/*`, `/blog/*`.

### 4.8 End state

```
src/app/
  (marketing)/       ← unchanged
  (auth)/            ← unchanged
  (dashboard)/
    athlete/         ← 3 roles, context-aware
    brand/
    director/
    admin/           ← in-place, guarded, invisible
  (public)/          ← NEW: token-based flows, no login
    hs/
      consent/[token]/
      consent/manage/
      invite/[token]/
      state-ad-invite/[token]/
      trajectory/[token]/
      unsubscribe/[token]/
      valuation/
      page.tsx       ← /hs marketing landing
  api/               ← unchanged paths
```

`(hs)` route group is deleted.

---

## 5. Navigation & Entry-Point UX

### 5.1 Nav shape (all 3 roles)

- Desktop: left sidebar (4-5 items) + top bar (search, notifications, avatar)
- Mobile: bottom tab bar (same 4-5 items) + top bar (notifications + avatar only)
- No role switcher
- No marketing chrome inside dashboards

### 5.2 Athlete surface (earnings-and-scholar forward)

Primary nav:

1. **Home** — scholar-athlete card (GPA + earnings + next deadline + 1-2 suggested actions)
2. **Deals** — inbox (new / active / pending / completed); HS sees deferred-payout tab
3. **Earnings** — payouts, tax docs; HS adds deferred-earnings tab (existing feature at `/hs/athlete/deferred-earnings`); custodial-account surfacing only if already present in the current HS payout rail — this spec does not build new custodial features
4. **Profile** — public profile, stats, GPA, sport, socials

Behind avatar: Settings, Mentorship, Privacy, Log out.

**Differentiator:** the Home scholar-athlete card surfaces GPA as a first-class metric on every open. Opendorse has no academic axis — this is the single most distinctive UX bet in the spec.

**HS context:** level badge (`HS`/`College`) in top-bar avatar area; parent-consent status banner appears on Deals/Earnings when consent missing or expiring.

### 5.3 Brand surface (GPA-filter-forward Discover)

Primary nav:

1. **Home** — campaigns at a glance + ROI tile + suggested athletes
2. **Discover** — athlete search; **primary filter chips at top: Sport, Level, Location, Scholar-athlete (GPA ≥ 3.5)**
3. **Campaigns**
4. **Deals**

Behind avatar: Payment method, Team, Settings, Log out.

**Differentiator:** Scholar-athlete chip is a first-class filter at the top of the filter bar. Default state: off (discoverable, not forced). Result cards show GPA alongside sport/followers. A/B testing of the default state is a future experiment, not part of this spec.

### 5.4 Director surface (compliance-inbox forward, scope-aware)

Primary nav:

1. **Home** — compliance inbox (disclosures awaiting review, flagged deals, violations)
2. **Athletes** (school scope) / **Programs** (state scope) — roster or school-by-school aggregate
3. **Disclosures** — review queue
4. **Deals** — cross-reference
5. **Digest** — weekly state digest, **only visible when `director_scope = 'state'`**

**Scope pill in top-bar header:** `School view` / `State view`. Switcher only for directors with both; static label otherwise.

### 5.5 First-run entry points

- Athlete login → `/athlete` (not `/athlete/dashboard`)
- Brand login → `/brand`; prompt-at-top if payment method missing (not a gate)
- Director login → `/director`; onboarding modal if no school/association assigned
- HS athlete (consent missing) → `/athlete` with hard-visible consent banner + CTA in Home hero

### 5.6 Simplification principles

1. 4-5 primary nav items per role. No exceptions.
2. Plain English: "Deals" not "Opportunities"; "Earnings" not "Wallet"; "Profile" not "Identity".
3. One primary action per page (Home hero has one CTA).
4. Context is automatic — no level switcher.
5. No marketing chrome inside dashboards.
6. Token links never require login.

---

## 6. Admin Isolation

### 6.1 Route guard — Next.js middleware

- `middleware.ts` intercepts every `/admin/*` request.
- Reads Supabase session, looks up role in a **separate `admins` table** (distinct from `users`/`athletes`/`brands`/`directors`).
- On no session: `redirect('/login?next=/admin/...')`
- On wrong role: `redirect('/404')` (do not confirm route exists)
- On success: set `x-admin-id` request header as authoritative downstream.

**Separate admins table rationale:** different lifecycle (internal hires), different auth policy (force MFA), different audit. Separate table eliminates entire classes of privilege-escalation bugs.

### 6.2 Layout separation

`(dashboard)/admin/layout.tsx` does NOT extend the customer dashboard layout. It has:

- Top bar: "GradeUp Admin" badge, env indicator, admin email, logout
- Left nav: flat list (Users, Deals, Consents, Disputes, Payouts, Audit, Reports, etc.)
- No marketing links, no Spanish switcher, no customer analytics scripts

### 6.3 Module boundary

```
src/lib/admin/*     ← admin-only; importable only from (dashboard)/admin or /api/admin
src/lib/shared/*    ← shared; importable anywhere
src/lib/customer/*  ← customer-only; importable only from non-admin routes
```

Enforced via `eslint-plugin-import` `no-restricted-paths` rule. CI fails on cross-boundary imports.

### 6.4 SEO invisibility

- `sitemap.ts` never emits `/admin/*` paths
- `robots.txt`: `Disallow: /admin/`
- All admin pages: `export const metadata = { robots: { index: false, follow: false } }`
- No OG image generation for admin routes

### 6.5 URL migration inside admin

- `/hs/admin/consents` → `/admin/consents`
- `/hs/admin/disputes` → `/admin/disputes`
- ... (all 28 HS admin pages move up one level)
- Existing `/admin/{deals,performance,users}` stubs merge into the richer HS versions or get deleted.
- 30-day in-admin changelog banner for internal-team awareness.

### 6.6 Out of this section

- `admin.gradeup.com` domain split: deferred to future spec.
- Admin UX redesign: out of scope.
- New admin features: out of scope.

---

## 7. Phased Migration Plan

Eight phases. Each ships independently. Wave 3 parallelizable.

### Phase 0 — Clean baseline (solo, blocks all)

- Review 25 uncommitted files on `main`. Commit in logical chunks or discard.
- Confirm `npm run validate` green on clean `main`.
- **Exit:** `git status` clean, validate green, Vercel preview deploys.
- **Est:** 1-2h.

### Phase 1 — Data model + backfill (solo, no UI change)

- Supabase migration: add `athlete_level`, `targets_levels`, `director_scope`, `director_level`.
- Backfill from existing state (HS routes → `level = 'hs'`, ad-portal → `scope = 'state'`, etc.).
- TypeScript types + RLS policy updates.
- **Exit:** every non-admin profile has non-null level; types compile.
- **Est:** ½ day.

### Phase 2 — Admin isolation (Wave 3, Agent A)

- Move `(hs)/hs/admin/**` → `(dashboard)/admin/**` (up one level).
- Merge or delete the three existing admin stubs.
- Separate layout, middleware guard, `no-restricted-paths` lint rule, sitemap/robots exclusion.
- `admins` table + RLS.
- 301 redirects `/hs/admin/*` → `/admin/*`.
- 30-day changelog banner.
- **Exit:** customer routes have zero admin imports; non-admins 404 on `/admin`.
- **Est:** 1 day.

### Phase 3 — Athlete shell unification (Wave 3, Agent B, first half)

- Unified `(dashboard)/athlete/layout.tsx` reads `athlete_level` from session profile.
- Migrate `/hs/athlete/*` into `/athlete/*`. Pages branch internally on level.
- 301 redirects from all `/hs/athlete/*` → `/athlete/*`.
- Scholar-athlete Home hero card.
- Parent-consent banner on Deals/Earnings.
- **Exit:** Both populations land at `/athlete`; no `/hs/athlete` traffic.
- **Est:** 2-3 days.

### Phase 4 — Brand shell unification (Wave 3, Agent B, second half)

- Mirror Phase 3 for brand.
- Migrate `/hs/brand/*` → `/brand/*`.
- Add Scholar-athlete filter chip to Discover as primary filter.
- 301 redirects.
- **Exit:** `/brand` serves both levels; Discover shows GPA axis.
- **Est:** 2 days.

### Phase 5 — Director unification + state-AD fold-in (Wave 3, Agent C, first third)

- Director layout reads `director_scope` + `director_level`.
- Migrate `/hs/ad-portal/*` → `/director/*` with state scope.
- `/hs/state-ad-invite/[token]` URL unchanged; invite flow sets `scope = 'state'`.
- Digest page at `/director/digest` for state-scope.
- **Exit:** both school and state directors served at `/director`.
- **Est:** 2 days.

### Phase 6 — Parent cleanup (Wave 3, Agent C, second third)

- Delete `/hs/parent`, `/hs/parent/referrals`, `/hs/parent/rewards`.
- Move referral/reward logic into athlete surface.
- 301 `/hs/parent*` → `/hs/consent/manage`.
- **Exit:** no authenticated parent dashboard exists.
- **Est:** 1 day.

### Phase 7 — Public/token route reorganization (Wave 3, Agent C, final third)

- New route group `(public)/hs/*` containing: `consent/[token]`, `consent/manage`, `invite/[token]`, `state-ad-invite/[token]`, `trajectory/[token]`, `unsubscribe/[token]`, `valuation`, `page.tsx`.
- URLs unchanged; only folder structure moves.
- Minimal `(public)` layout — no auth dependency.
- **Exit:** token URLs resolve identically; old email links still open correct page.
- **Est:** ½ day.

### Phase 8 — Final sweep (solo, after all)

- Delete the now-empty `(hs)` route group.
- Remove `(hs)` references from middleware, sitemap, types.
- Update `README.md`.
- Spot-check Vercel analytics for residual traffic.
- Remove non-token 301 redirects older than 90 days (keep token redirects forever).
- **Est:** ½ day.

### 7.1 Execution waves

```
Wave 1: Phase 0                                                    SOLO
Wave 2: Phase 1                                                    SOLO
Wave 3: Phase 2 (Agent A) | Phase 3+4 (Agent B) | Phase 5+6+7 (Agent C)
Wave 4: Phase 8                                                    SOLO
```

Wave 3 subagents work in isolated git worktrees, merge serially into `main` via PR.

### 7.2 Total estimate

~10 working days solo sequential; ~5-6 calendar days with Wave 3 parallelization (plus review cycles). Realistically 2-3 weeks calendar.

### 7.3 Rollback

Every phase = single PR (or small PR series). Rollback = `git revert` + redeploy. Phase 1 migrations are additive-only until Phase 8. Old `/hs/*` URLs work throughout via 301 redirects; removing a redirect is never destructive.

---

## 8. Scope Guardrails

### 8.1 In scope

- 3-role consolidation (Athlete/Brand/Director)
- Context fields + backfill
- Admin isolation in place
- Parent dashboard removal
- State-AD fold-in
- Route consolidation per §4
- 301 redirects for customer URLs
- Token URLs preserved
- README update

### 8.2 Out of scope (explicitly deferred)

1. `admin.gradeup.com` domain split (future spec)
2. UI visual redesign / design system overhaul
3. Full accessibility audit
4. Full security audit
5. Performance audit
6. Competitive-research features: one-tap social publish, 1099 automation, branded school subdomains, scholar-tier pricing, state-digest as product
7. GPA/scholar filter beyond the placeholder chip in §5.3
8. Pricing changes
9. Marketing routes, Spanish locale, blog
10. Alumni mentorship feature changes (only folder move)
11. Signup UX overhaul (URL redirects only)
12. API route restructuring (`/api/hs/*` prefix stays)
13. Email template rewrites
14. Mobile apps (if separate)
15. Multi-role users

### 8.3 Hard constraints (invariants)

- Token URLs never change
- No breaking API contracts
- No auth migration
- Next.js 16 + React 19 stay
- No new top-level dependencies unless justified in-phase
- `npm run validate` green at end of every phase

### 8.4 Risks + mitigations

| Risk | Mitigation |
|---|---|
| 301 redirect chains long/slow | Single-hop only; audit `next.config.ts` after each phase |
| Session/profile read N+1 | Centralized `getProfile()` helper, memoized per request |
| Agents collide on `Navbar.tsx` | Agent B owns Navbar; A and C consume via typed props only |
| Admin bookmarks break for ops team | 30-day in-admin changelog banner |
| Supabase backfill touches live data | Transactional migration, `--dry-run` flag, pre-snapshot |
| HS parents bookmarking `/hs/parent` | 301 → `/hs/consent/manage` |

---

## 9. Success Criteria

Spec is delivered when all of the following are true:

1. `src/app/(hs)` directory deleted; only `(public)/hs/*` remains for token URLs.
2. Three customer route groups exist: `(dashboard)/athlete`, `(dashboard)/brand`, `(dashboard)/director`, each context-aware on profile fields.
3. `(dashboard)/admin` is guarded by middleware with a separate `admins` table, has its own layout, and is excluded from sitemap/robots.
4. `eslint-plugin-import` rule enforces admin/shared/customer module boundary; CI fails on violation.
5. Every `/hs/*` customer URL (except frozen token URLs) returns 301 to its unified equivalent.
6. Every token URL under `/hs/*/[token]` still resolves and works end-to-end.
7. `athlete_level`, `targets_levels`, `director_scope`, `director_level` non-null on all non-admin profiles.
8. Athlete Home surfaces a scholar-athlete card with GPA as primary metric.
9. Brand Discover surfaces a "Scholar-athlete" filter chip at primary level.
10. Director Home serves both `scope=school` and `scope=state` from the same route.
11. Parent dashboard does not exist (no authenticated `/parent` surface).
12. README documents the three-role model and admin isolation.
13. `npm run validate` green on `main` after each phase merge.
14. No customer-facing URL serves fewer visits post-consolidation than pre (Vercel Analytics monitored).

---

## 10. Open Questions

None at time of writing. Questions that came up during brainstorming have been resolved:

- *Admin in-bundle vs split subdomain?* → in-bundle for this spec; split deferred.
- *Parent as a role?* → no; consent signer only.
- *State AD as a role?* → no; director with `scope = 'state'`.
- *College vs HS split by route or by profile field?* → profile field.
- *Richer surface direction?* → HS absorbs college, not the reverse.
- *All phases parallel?* → no; Wave 3 parallel only, with file-ownership boundaries.

If any question surfaces during implementation, pause and amend this spec before proceeding.

---

## 11. Next Step

After user approval of this spec, invoke `superpowers:writing-plans` to produce a detailed task-level implementation plan for Wave-1 through Wave-4 execution.
