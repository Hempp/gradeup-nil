# GradeUp Role Model Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 6+ dashboard surfaces across `(dashboard)` and `(hs)` route groups into exactly three customer-facing dashboards (Athlete, Brand, Director), fold parent/state-AD into flow/scope respectively, isolate admin in place, and preserve all token URLs.

**Architecture:** Level is profile data, not URL. Admin is gated by middleware + separate module boundary. Token URLs move to a new `(public)` route group with URLs unchanged. Wave-3 phases run in parallel via git worktrees with explicit file ownership.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase (SSR + Postgres), Tailwind 4, Jest 30 + Playwright, `eslint-plugin-import`.

**Spec:** `docs/superpowers/specs/2026-04-21-gradeup-role-model-design.md`

---

## 0. Pre-Execution Setup

**Worktree strategy** (for Wave 3 parallel execution):

```bash
# From repo root (/Users/seg/gradeup-nil)
git worktree add ../gradeup-wave3-agent-a main  # Admin isolation
git worktree add ../gradeup-wave3-agent-b main  # Athlete + Brand
git worktree add ../gradeup-wave3-agent-c main  # Director + Parent + Public routes
```

Worktrees are created **only after Wave 1 (Phase 0) and Wave 2 (Phase 1) have merged to `main`.** Wave-3 agents branch from post-Wave-2 `main`.

**File ownership in Wave 3:**

| File path | Owner |
|---|---|
| `src/app/(dashboard)/admin/**`, `middleware.ts` (admin block only), `robots.txt`, `.eslintrc` (admin rules) | Agent A |
| `src/app/(dashboard)/athlete/**`, `src/app/(dashboard)/brand/**`, `src/components/shell/Navbar.tsx`, `src/components/shell/DashboardLayout.tsx`, athlete+brand-specific hooks | Agent B |
| `src/app/(dashboard)/director/**`, `src/app/(public)/**` (new), `src/app/(hs)/hs/parent/**` (deletion), director-specific hooks | Agent C |
| `next.config.ts` (redirects) | **B and C append only, never edit same lines**; A owns admin redirects section |

**Wave-3 merge order:** Agent A → Agent B → Agent C (admin first, then content, then cleanup). Each merges to `main` via PR before the next rebases.

---

## Wave 1 — Phase 0: Clean Baseline

**Owner:** Solo (whoever runs Wave 1).
**Goal:** Empty working tree + lint-green validation + recorded test baseline. No refactor starts on dirty state.
**Exit criteria (amended 2026-04-21):** `git status` clean on `main`; `npm run type-check` green; `npm run lint` reports **0 errors**; `npm run test` baseline **recorded at 82 failures / 2872 passing / 8 failed suites / 22 skipped**; `npm run dev` boots; Vercel preview deploys.

**Regression rule for subsequent phases:** Every subsequent phase MUST NOT increase the failing-test count above the 82 baseline. Any phase that ships with 83+ failures is introducing regressions, not inheriting them. Pre-existing test rot is tracked for a separate grooming session and is *not* in scope for any consolidation phase.

### Task 0.1: Inventory the 25 uncommitted files

**Files:**
- Read only: output of `git status --short` and `git diff --stat`

- [ ] **Step 1: List unstaged changes**

Run from repo root: `git status --short | grep -v "^??"`

Expected: ~25 `M` entries concentrated under `gradeup-next/src/app/(dashboard)`, `gradeup-next/src/app/(hs)`, `gradeup-next/src/app/(marketing)`, `gradeup-next/src/components`.

- [ ] **Step 2: Bucket changes by theme**

For each modified file, run `git diff <file>` and categorize:
- Navbar/Footer changes → "shell" bucket
- Page copy/layout tweaks → "copy" bucket  
- HS flow changes → "hs-nil" bucket
- Unrelated → "orphan" bucket

Write the bucket assignments inline in a scratch list (not committed).

- [ ] **Step 3: Decide commit strategy per bucket**

Options:
- **Commit as-is** (intentional, reviewed work)
- **Revert** (accidental, stale, or unrelated to current direction)
- **Defer** (keep in stash, not shipped in Phase 0)

No code written yet. Just decisions.

### Task 0.2: Commit or discard in logical chunks

**Files:**
- Stage specific files per bucket (`git add <paths>`)

- [ ] **Step 1: For each "commit as-is" bucket, stage and commit**

Example pattern — shell bucket:

```bash
git add gradeup-next/src/components/marketing/Navbar.tsx \
        gradeup-next/src/components/marketing/Footer.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
chore(shell): pre-consolidation navbar/footer tweaks

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Repeat for each bucket. Use conventional-commit prefixes (`feat`, `fix`, `chore`, `docs`).

- [ ] **Step 2: Revert stale/orphan changes**

```bash
git restore <path-to-file>
```

Do NOT use `git checkout .` or `git restore .` — always name files explicitly.

- [ ] **Step 3: Verify clean state**

Run: `git status`
Expected: `nothing to commit, working tree clean`

### Task 0.3: Validate and deploy preview

- [ ] **Step 1: Install deps fresh**

Run: `cd gradeup-next && npm ci`
Expected: successful install, no peer-dep errors.

- [ ] **Step 2: Type-check, lint, test**

Run: `npm run validate`
Expected: all three green. If any red: fix in the bucket that introduced it, or note as known-bad and create a tracking issue before proceeding.

- [ ] **Step 3: Boot dev server**

Run: `npm run dev`
Expected: server starts on :3000, `/`, `/login`, `/athlete/dashboard`, `/hs/athlete` all 200 or expected redirect.

- [ ] **Step 4: Confirm Vercel preview**

Push the cleanup commits and confirm Vercel builds + deploys the preview without error.

### Task 0.4: Record test baseline (amended)

- [ ] **Step 1: Capture current test stats**

Run: `npm test 2>&1 | tail -5`

Record the line `Tests: N failed, M skipped, K passed, T total` and `Test Suites: N failed, ...`.

- [ ] **Step 2: Add a `TEST-BASELINE.md` tracking doc**

Create `docs/TEST-BASELINE.md`:

```markdown
# Test baseline — 2026-04-21 (Phase 0 checkpoint)

**At the start of the role-model consolidation refactor:**

- Tests: **82 failed**, 22 skipped, 2872 passed, 2976 total
- Test Suites: **8 failed**, 1 skipped, 136 passed, 144 of 145 total

Every phase of the consolidation must ship with ≤ 82 failing tests and ≤ 8
failing suites. Exceeding either count is a regression, not inherited debt.

**Failing suites (for future grooming work):**
- `src/__tests__/components/ui/button.test.tsx`
- `tests/services/auth.test.js` (if Vitest root tests are in the run)
- `tests/services/opportunities.test.js`
- `tests/validation.test.js`
- (list others as seen in local run)

Test rot is tracked separately from this refactor. A dedicated grooming
session addresses stale component-vs-test drift (e.g., Button size class
change for WCAG AA touch targets that never propagated to tests).
```

- [ ] **Step 3: Commit**

```bash
git add gradeup-next/docs/TEST-BASELINE.md
git -c commit.gpgsign=false commit -m "docs: record Phase 0 test baseline (82 fail / 2872 pass)"
```

---

## Wave 2 — Phase 1: Unified Profile Reader (Option α, amended 2026-04-21)

**Schema reality discovered during Phase 0:** HS and college are separate data products with parallel tables (`athletes` vs `hs_athlete_profiles`, `athletic_directors` vs `state_ad_assignments`, a dedicated `hs_parent_profiles`). State-AD and HS-parent are already roles in the `user_role` enum. The original "add `athlete_level` column" plan does not work because HS athletes are not in the `athletes` table at all.

**Option α (chosen):** unify at the app layer only. Keep parallel tables. Build one profile reader that joins across them and returns a normalized shape. No SQL migration. Level is *derived* from which table has a row, not stored as a column.

**Owner:** Solo.
**Goal:** Single `getProfile()` function any server component, client hook, or API route can call to get a normalized `UserContext` regardless of which role/level the user is.
**Exit criteria:** `getProfile()` lands; types cover all 6 roles; every future phase reads profile through this single entry point; no schema migration ships in this phase.

### Tasks 1.1-1.3 (original SQL-migration tasks) — DEPRECATED

The original Phase 1 was rewritten under Option α. Skip Tasks 1.1 / 1.2 / 1.3 as written below — keep them in the doc as rationale for why we did not go the SQL route. Execute the new Tasks 1.α.1 → 1.α.4 instead.

---

### Task 1.α.1: Expand the `UserRole` type to match schema reality

**Files:**
- Modify: `src/lib/services/auth.ts` (existing `UserRole` type export)
- Create: `src/types/user-context.ts` (new normalized shape)

- [ ] **Step 1: Expand `UserRole` in `src/lib/services/auth.ts`**

```ts
export type UserRole =
  | 'athlete'
  | 'brand'
  | 'athletic_director'
  | 'state_ad'
  | 'hs_parent'
  | 'admin';
```

The existing `'athlete' | 'brand' | 'athletic_director' | 'admin'` type is stale — it predates the HS rollout that added `state_ad` and `hs_parent` to the `user_role` Postgres enum. Align the TS type with the DB enum.

- [ ] **Step 2: Write the normalized `UserContext` shape**

```ts
// src/types/user-context.ts
export type AthleteLevel = 'college' | 'hs';
export type DirectorScope = 'school' | 'state';

export type UserContext =
  | { role: 'athlete'; level: AthleteLevel; userId: string; athlete: AthleteContext }
  | { role: 'brand'; userId: string; brand: BrandContext }
  | { role: 'athletic_director'; scope: 'school'; userId: string; director: DirectorContext }
  | { role: 'state_ad'; scope: 'state'; userId: string; director: StateDirectorContext }
  | { role: 'hs_parent'; userId: string; parent: ParentContext }
  | { role: 'admin'; userId: string };

export interface AthleteContext {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;   // unified: schools.name for college, hs_athlete_profiles.school_name for HS
  sport: string | null;
  gpa: number | null;
  gradYear: number | null;
}

export interface BrandContext {
  id: string;
  companyName: string;
  /** Which levels this brand actively targets. Derived, not stored:
   *  'college' if any non-HS campaigns exist; 'hs' if any `hs_brand_campaigns` row exists;
   *  both possible. */
  targetsLevels: AthleteLevel[];
}

export interface DirectorContext {
  id: string;
  schoolId: string | null;
  title: string | null;
  department: string | null;
}

export interface StateDirectorContext {
  assignmentId: string;
  stateCode: string;
  organizationName: string | null;
}

export interface ParentContext {
  id: string;
  athleteIds: string[];  // via hs_parent_athlete_links
}
```

The discriminated union forces callers to narrow by role before touching role-specific fields — a small but real type-safety win.

- [ ] **Step 3: Commit**

```bash
git add gradeup-next/src/lib/services/auth.ts gradeup-next/src/types/user-context.ts
git -c commit.gpgsign=false commit -m "feat(types): UserRole + UserContext align with schema (Option α)"
```

### Task 1.α.2: Write the unified profile reader

**Files:**
- Create: `src/lib/shared/get-profile.ts`
- Create: `src/__tests__/lib/shared/get-profile.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/lib/shared/get-profile.test.ts
import { getProfile } from '@/lib/shared/get-profile';
import { makeSupabaseMock } from '@/__tests__/helpers/supabase-mock';

describe('getProfile', () => {
  it('returns athlete (college) when athletes row exists and hs_athlete_profiles does not', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-1': { role: 'athlete' },
      'athletes:user-1': { id: 'a1', first_name: 'Sam', last_name: 'Lee' },
    });
    const ctx = await getProfile(supabase, 'user-1');
    expect(ctx).toMatchObject({ role: 'athlete', level: 'college' });
  });

  it('returns athlete (hs) when hs_athlete_profiles row exists', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-2': { role: 'athlete' },
      'hs_athlete_profiles:user-2': { id: 'h1', school_name: 'Central HS', gpa: 3.8 },
    });
    const ctx = await getProfile(supabase, 'user-2');
    expect(ctx).toMatchObject({ role: 'athlete', level: 'hs' });
  });

  it('returns state_ad with scope=state when state_ad_assignments row exists', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-3': { role: 'state_ad' },
      'state_ad_assignments:user-3': { id: 's1', state_code: 'TX' },
    });
    const ctx = await getProfile(supabase, 'user-3');
    expect(ctx).toMatchObject({ role: 'state_ad', scope: 'state', director: { stateCode: 'TX' } });
  });

  it('throws when profiles row is missing', async () => {
    const supabase = makeSupabaseMock({});
    await expect(getProfile(supabase, 'user-404')).rejects.toThrow(/profile not found/i);
  });
});
```

If `makeSupabaseMock` helper doesn't exist, create it in the same test file or in `src/__tests__/helpers/`. A minimal implementation returns pre-keyed rows from the provided map.

- [ ] **Step 2: Implement `getProfile`**

```ts
// src/lib/shared/get-profile.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContext, AthleteContext } from '@/types/user-context';

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(`profile not found for user ${userId}`);
  }

  switch (profile.role) {
    case 'athlete':
      return buildAthleteContext(supabase, userId);
    case 'brand':
      return buildBrandContext(supabase, userId);
    case 'athletic_director':
      return buildDirectorContext(supabase, userId);
    case 'state_ad':
      return buildStateAdContext(supabase, userId);
    case 'hs_parent':
      return buildParentContext(supabase, userId);
    case 'admin':
      return { role: 'admin', userId };
    default:
      throw new Error(`unknown role: ${profile.role}`);
  }
}

async function buildAthleteContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  // HS first — if a row exists here, user is an HS athlete.
  const { data: hs } = await supabase
    .from('hs_athlete_profiles')
    .select('id, school_name, sport, gpa, graduation_year')
    .eq('user_id', userId)
    .maybeSingle();

  if (hs) {
    return {
      role: 'athlete',
      level: 'hs',
      userId,
      athlete: {
        id: hs.id,
        firstName: '', // hs_athlete_profiles doesn't split name; consider extending later
        lastName: '',
        schoolName: hs.school_name,
        sport: hs.sport,
        gpa: hs.gpa,
        gradYear: hs.graduation_year,
      },
    };
  }

  const { data: college } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, sport_id, gpa, expected_graduation, school_id, schools(name)')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!college) {
    throw new Error(`athlete profile missing for ${userId}`);
  }

  return {
    role: 'athlete',
    level: 'college',
    userId,
    athlete: {
      id: college.id,
      firstName: college.first_name,
      lastName: college.last_name,
      schoolName: (college.schools as { name: string } | null)?.name ?? null,
      sport: null, // join sports if needed later
      gpa: college.gpa,
      gradYear: college.expected_graduation ? parseInt(college.expected_graduation, 10) : null,
    },
  };
}

async function buildBrandContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, company_name')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!brand) throw new Error(`brand profile missing for ${userId}`);

  // Derive targetsLevels from campaign presence. Cheap scan:
  //   - has any hs_brand_campaigns row → targets HS
  //   - has any regular campaign row → targets college (assumption; adjust if the
  //     college campaigns table has its own discriminator)
  const { count: hsCount } = await supabase
    .from('hs_brand_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand.id);

  const targetsLevels: Array<'college' | 'hs'> = ['college'];
  if ((hsCount ?? 0) > 0) targetsLevels.push('hs');

  return {
    role: 'brand',
    userId,
    brand: {
      id: brand.id,
      companyName: brand.company_name,
      targetsLevels,
    },
  };
}

async function buildDirectorContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: director } = await supabase
    .from('athletic_directors')
    .select('id, school_id, title, department')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!director) throw new Error(`director profile missing for ${userId}`);

  return {
    role: 'athletic_director',
    scope: 'school',
    userId,
    director: {
      id: director.id,
      schoolId: director.school_id,
      title: director.title,
      department: director.department,
    },
  };
}

async function buildStateAdContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: assignment } = await supabase
    .from('state_ad_assignments')
    .select('id, state_code, organization_name')
    .eq('user_id', userId)
    .is('deactivated_at', null)
    .maybeSingle();

  if (!assignment) throw new Error(`state_ad assignment missing for ${userId}`);

  return {
    role: 'state_ad',
    scope: 'state',
    userId,
    director: {
      assignmentId: assignment.id,
      stateCode: assignment.state_code,
      organizationName: assignment.organization_name,
    },
  };
}

async function buildParentContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: links } = await supabase
    .from('hs_parent_athlete_links')
    .select('athlete_id')
    .eq('parent_user_id', userId);

  return {
    role: 'hs_parent',
    userId,
    parent: {
      id: userId,
      athleteIds: (links ?? []).map((l: { athlete_id: string }) => l.athlete_id),
    },
  };
}
```

**Performance note:** this makes up to 3 DB round-trips for athletes (profile → hs_athlete_profiles → athletes) and 2 for brands (brands → count). That's acceptable for initial shipping but memoize per-request in Next.js with `React.cache()` (for server) or a request-scoped memo (for API routes). Add that optimization in a follow-up task, not this one.

- [ ] **Step 3: Re-run tests, verify green**

- [ ] **Step 4: Commit**

```bash
git add gradeup-next/src/lib/shared/get-profile.ts gradeup-next/src/__tests__/lib/shared/get-profile.test.ts
git -c commit.gpgsign=false commit -m "feat(profile): unified getProfile reader across 6 role/level combos"
```

### Task 1.α.3: Server + client convenience wrappers

**Files:**
- Create: `src/lib/shared/profile-server.ts` (thin wrapper for server components + API routes)
- Create: `src/hooks/useProfile.ts` (client hook for client components)

- [ ] **Step 1: Server helper**

```ts
// src/lib/shared/profile-server.ts
import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server'; // use existing server client helper
import { getProfile } from './get-profile';
import type { UserContext } from '@/types/user-context';

export const getServerProfile = cache(async (): Promise<UserContext | null> => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfile(supabase, user.id);
});
```

`React.cache()` deduplicates the reads within a single request — same-request calls from layout + page + child components hit the DB once.

- [ ] **Step 2: Client hook**

```ts
// src/hooks/useProfile.ts
'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client'; // use existing browser client
import { getProfile } from '@/lib/shared/get-profile';
import type { UserContext } from '@/types/user-context';

export function useProfile() {
  const [profile, setProfile] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setProfile(null); setLoading(false); }
          return;
        }
        const ctx = await getProfile(supabase, user.id);
        if (!cancelled) { setProfile(ctx); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e as Error); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { profile, loading, error };
}
```

- [ ] **Step 3: Commit**

```bash
git add gradeup-next/src/lib/shared/profile-server.ts gradeup-next/src/hooks/useProfile.ts
git -c commit.gpgsign=false commit -m "feat(profile): server (React.cache) + client (useProfile) wrappers"
```

### Task 1.α.4: Validate baseline holds

- [ ] **Step 1: Run validate**

```bash
cd gradeup-next && npm run validate 2>&1 | tail -5
```

Expected: type-check green, lint 0 errors, tests ≤ 82 failures (per `TEST-BASELINE.md`). Any *new* failure is a regression — fix before merging.

- [ ] **Step 2: Smoke-test locally**

Run: `npm run dev`

Log in as athlete (college), brand, athletic director, state-AD, admin. Confirm no page crashes on session boot. At this phase the new `getProfile` is defined but not yet consumed by routes — it's a library add. Smoke check is about confirming no existing import broke.

---



**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_role_context_fields.sql`

- [ ] **Step 1: Draft migration — add columns, defer defaults**

```sql
-- Add level context to athlete profile
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS athlete_level TEXT
    CHECK (athlete_level IN ('college', 'hs'));

-- Add target-levels to brand profile
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS targets_levels TEXT[] DEFAULT ARRAY['college','hs']::TEXT[]
    CHECK (targets_levels <@ ARRAY['college','hs']::TEXT[] AND array_length(targets_levels, 1) >= 1);

-- Add scope + level to director profile
ALTER TABLE public.directors
  ADD COLUMN IF NOT EXISTS director_scope TEXT
    CHECK (director_scope IN ('school', 'state'));
ALTER TABLE public.directors
  ADD COLUMN IF NOT EXISTS director_level TEXT
    CHECK (director_level IN ('college', 'hs'));
```

(If `athletes`/`brands`/`directors` table names differ, verify from `supabase/schema.sql` before running.)

- [ ] **Step 2: Add backfill block (idempotent)**

Append to the same migration:

```sql
-- Backfill athlete_level
--   hs athletes: those with an HS school attachment OR those who used the HS signup flow
--   college: everyone else
UPDATE public.athletes a
SET athlete_level = 'hs'
WHERE athlete_level IS NULL
  AND EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = a.school_id AND s.level = 'hs'
  );

UPDATE public.athletes
SET athlete_level = 'college'
WHERE athlete_level IS NULL;

-- Backfill targets_levels: no-op (default handles it)

-- Backfill director fields
UPDATE public.directors
SET director_scope = 'state',
    director_level = 'hs'
WHERE director_scope IS NULL
  AND is_state_ad = TRUE;  -- if this column exists; otherwise detect via role/invite source

UPDATE public.directors
SET director_scope = 'school',
    director_level = COALESCE(director_level, 'college')
WHERE director_scope IS NULL;
```

**If the `schools.level` or `directors.is_state_ad` columns do not exist**, inspect `supabase/schema.sql` and adapt the detection logic. Acceptable alternatives:
- Join to the signup source recorded on the user (e.g., `source = 'hs-signup'`)
- Detect via the route the profile was created from (if logged)
- Flag rows for manual review by setting `athlete_level = NULL` and failing the CI gate (Step 4 below)

- [ ] **Step 3: Add NOT NULL constraint (deferred to after backfill proves clean)**

Do NOT add `NOT NULL` in the same migration. That goes in a follow-up migration AFTER the backfill is verified in production (Task 1.3).

- [ ] **Step 4: Run migration against local dev DB**

Run: `cd gradeup-next && npx supabase db reset` (if using local Supabase) OR apply against your dev project.

Expected: migration applies cleanly; `SELECT COUNT(*) FROM athletes WHERE athlete_level IS NULL` returns 0.

- [ ] **Step 5: Commit**

```bash
git add gradeup-next/supabase/migrations/YYYYMMDDHHMMSS_add_role_context_fields.sql
git -c commit.gpgsign=false commit -m "feat(db): add role context fields + backfill

Adds athlete_level, targets_levels, director_scope, director_level to
respective profile tables. Backfills from existing school/signup-source
state. NOT NULL constraints deferred to a follow-up migration after
production backfill verification."
```

### Task 1.2: Update TypeScript types + RLS policies

**Files:**
- Modify: `src/types/database.ts` (or wherever Supabase-generated types live — check `src/lib/supabase/`)
- Modify: `src/types/profile.ts` or equivalent hand-rolled types
- Modify: `supabase/migrations/...` (add RLS policies if any reference the new columns)

- [ ] **Step 1: Regenerate Supabase types**

Run: `npx supabase gen types typescript --local > src/types/database.ts` (adjust command per existing project setup)

Expected: `AthleteRow`, `BrandRow`, `DirectorRow` now include the new fields.

- [ ] **Step 2: Update hand-rolled types**

Find the canonical `Athlete`, `Brand`, `Director` domain types. Add the new fields:

```ts
// src/types/profile.ts (adjust path)
export type AthleteLevel = 'college' | 'hs';
export type DirectorScope = 'school' | 'state';

export interface AthleteProfile {
  // ...existing fields
  athlete_level: AthleteLevel;
}

export interface BrandProfile {
  // ...existing fields
  targets_levels: AthleteLevel[];
}

export interface DirectorProfile {
  // ...existing fields
  director_scope: DirectorScope;
  director_level: AthleteLevel;
}
```

- [ ] **Step 3: Run type-check, fix fan-out errors**

Run: `npm run type-check`
Expected: some compile errors in places that destructure profile objects and expect specific shapes. Fix each by either:
- Adding the field where it's genuinely needed
- Using optional spread where the new field is unused

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/lib/supabase/
git -c commit.gpgsign=false commit -m "feat(types): role context fields in profile types"
```

### Task 1.3: Production backfill verification

- [ ] **Step 1: Apply migration to staging/prod**

Run your normal migration pipeline (`supabase db push` or CI).

- [ ] **Step 2: Verify zero NULLs**

In the Supabase SQL editor or via psql:

```sql
SELECT 'athletes' AS tbl, COUNT(*) AS null_level FROM athletes WHERE athlete_level IS NULL
UNION ALL
SELECT 'directors', COUNT(*) FROM directors WHERE director_scope IS NULL;
```

Expected: both counts = 0.

- [ ] **Step 3: Add NOT NULL follow-up migration**

Create `supabase/migrations/YYYYMMDDHHMMSS_enforce_not_null_role_context.sql`:

```sql
ALTER TABLE public.athletes ALTER COLUMN athlete_level SET NOT NULL;
ALTER TABLE public.directors ALTER COLUMN director_scope SET NOT NULL;
ALTER TABLE public.directors ALTER COLUMN director_level SET NOT NULL;
```

- [ ] **Step 4: Apply and commit**

```bash
git add gradeup-next/supabase/migrations/YYYYMMDDHHMMSS_enforce_not_null_role_context.sql
git -c commit.gpgsign=false commit -m "chore(db): enforce NOT NULL on role context fields"
```

---

## Wave 3 — Parallel Execution

Wave 3 runs three agents concurrently in isolated git worktrees. Each agent owns its file set exclusively; no agent edits another's files. Merges are serial (A → B → C) to keep `main` always deployable.

---

## Wave 3A — Phase 2: Admin Isolation

**Agent:** A (worktree `../gradeup-wave3-agent-a`)
**Goal:** Move HS admin up a level, add middleware guard, module boundary, SEO invisibility.
**Exit criteria:** Non-admins 404 on `/admin/*`; customer code has zero admin imports; sitemap/robots exclude admin; HS admin URLs 301 to new paths.

### Task A.1: Create `admins` table + RLS

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_admins_table.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'support', 'ops_lead')),
  mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX admins_user_id_idx ON public.admins(user_id);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admins table
CREATE POLICY admins_self_read ON public.admins
  FOR SELECT
  USING (user_id = auth.uid());
```

- [ ] **Step 2: Seed existing admin accounts**

Identify currently privileged users. For each, insert into `admins`. (Do this in a one-off migration or via Supabase dashboard — do not write a generic "everyone with role='admin' becomes an admin" rule without reviewing the list.)

- [ ] **Step 3: Apply + commit**

```bash
git add gradeup-next/supabase/migrations/YYYYMMDDHHMMSS_create_admins_table.sql
git -c commit.gpgsign=false commit -m "feat(db): separate admins table with RLS"
```

### Task A.2: Add admin middleware guard

**Files:**
- Modify: `src/middleware.ts` (append an admin-path section)
- Create: `src/lib/admin/auth.ts` (helper to check admin role)

- [ ] **Step 1: Write failing test for the admin guard**

Create `src/__tests__/middleware.admin.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('admin middleware', () => {
  it('redirects unauthenticated requests to /login with next= param', async () => {
    const req = new NextRequest(new URL('http://localhost/admin/deals'));
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('next=%2Fadmin%2Fdeals');
  });

  it('404s authenticated non-admin users', async () => {
    // mock session with non-admin user
    // ...
    const req = new NextRequest(new URL('http://localhost/admin/deals'));
    const res = await middleware(req);
    expect(res.status).toBe(404);
  });

  it('allows authenticated admin users and sets x-admin-id header', async () => {
    // mock session with admin user
    const req = new NextRequest(new URL('http://localhost/admin/deals'));
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-admin-id')).toBeTruthy();
  });
});
```

Run: `npm test -- middleware.admin`
Expected: 3 failing tests.

- [ ] **Step 2: Implement `isAdmin` helper**

```ts
// src/lib/admin/auth.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminRecord {
  id: string;
  user_id: string;
  email: string;
  role: 'operator' | 'support' | 'ops_lead';
}

export async function getAdminRecord(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminRecord | null> {
  const { data, error } = await supabase
    .from('admins')
    .select('id, user_id, email, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminRecord;
}
```

- [ ] **Step 3: Add admin block to `middleware.ts`**

Insert after the existing auth block, before i18n handling:

```ts
// src/middleware.ts — inside middleware()
if (request.nextUrl.pathname.startsWith('/admin')) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  const { getAdminRecord } = await import('@/lib/admin/auth');
  const admin = await getAdminRecord(supabase, user.id);
  if (!admin) {
    // Do not confirm /admin/* exists to non-admins — return a plain 404
    return new NextResponse(null, { status: 404 });
  }
  const res = NextResponse.next();
  res.headers.set('x-admin-id', admin.id);
  return res;
}
```

- [ ] **Step 4: Re-run tests**

Run: `npm test -- middleware.admin`
Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/lib/admin/auth.ts src/__tests__/middleware.admin.test.ts
git -c commit.gpgsign=false commit -m "feat(admin): middleware role guard + x-admin-id header"
```

### Task A.3: Move 28 HS admin pages up one level

**Files:**
- Move: `src/app/(hs)/hs/admin/**` → `src/app/(dashboard)/admin/**`
- Decide: merge or delete existing `src/app/(dashboard)/admin/{deals,performance,users}/`

- [ ] **Step 1: Inventory existing `/admin/*` stub pages**

List: `/admin/deals`, `/admin/performance`, `/admin/users` (3 pages).
Read each; compare to the richer HS admin equivalent at `/hs/admin/deals` etc.

For each stub:
- If HS version is a superset: delete the stub, HS version moves in.
- If stub has unique features: merge manually (spec allows minor merge work in this task).
- If stub is dead: delete it.

- [ ] **Step 2: Move HS admin pages**

```bash
git mv src/app/\(hs\)/hs/admin/analytics src/app/\(dashboard\)/admin/analytics
git mv src/app/\(hs\)/hs/admin/annual-report src/app/\(dashboard\)/admin/annual-report
# ... (repeat for all 28 subdirectories)
git mv src/app/\(hs\)/hs/admin/page.tsx src/app/\(dashboard\)/admin/page.tsx  # replace old stub
```

(If a subdirectory name collides with an existing `/admin/*` stub, move into a renamed sub-path or merge content first.)

- [ ] **Step 3: Update internal imports inside moved pages**

Each moved page likely imports from `@/lib/hs-nil/*`. Those paths stay valid (the module moves to admin boundary in Task A.5). For now, run:

Run: `npm run type-check`
Expected: green or trivially fixable (mostly relative-import adjustments).

- [ ] **Step 4: Commit**

```bash
git add -u
git add src/app/\(dashboard\)/admin/
git -c commit.gpgsign=false commit -m "refactor(admin): move HS admin pages to /admin/*"
```

### Task A.4: Create admin-specific layout + changelog banner

**Files:**
- Create: `src/app/(dashboard)/admin/layout.tsx` (if not already present)
- Create: `src/components/admin/ChangelogBanner.tsx`

- [ ] **Step 1: Write admin layout**

```tsx
// src/app/(dashboard)/admin/layout.tsx
import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { ChangelogBanner } from '@/components/admin/ChangelogBanner';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold">GradeUp Admin</span>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {process.env.VERCEL_ENV === 'production' ? 'PROD' : 'STAGING'}
            </span>
          </div>
          {/* admin email + logout wired via session */}
        </div>
      </header>
      <ChangelogBanner />
      <div className="grid grid-cols-[240px_1fr]">
        <AdminNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the 30-day changelog banner**

```tsx
// src/components/admin/ChangelogBanner.tsx
const CHANGELOG_START = new Date('2026-04-21T00:00:00Z'); // set to PR merge date
const DAYS_VISIBLE = 30;

export function ChangelogBanner() {
  const daysSince = Math.floor(
    (Date.now() - CHANGELOG_START.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince > DAYS_VISIBLE) return null;

  return (
    <div className="border-b bg-amber-50 px-6 py-2 text-sm text-amber-900">
      <strong>Heads up:</strong> Admin URLs moved from <code>/hs/admin/*</code> to{' '}
      <code>/admin/*</code>. Update your bookmarks. Banner hides after{' '}
      {DAYS_VISIBLE - daysSince} days.
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run dev`, open `/admin` as an admin, confirm layout + banner render. Open as non-admin, confirm 404.

```bash
git add src/app/\(dashboard\)/admin/layout.tsx src/components/admin/
git -c commit.gpgsign=false commit -m "feat(admin): isolated layout + migration changelog banner"
```

### Task A.5: Enforce module boundary via ESLint

**Files:**
- Modify: `eslint.config.mjs`
- Create (if needed): `src/lib/admin/` (move admin-specific utilities here from `src/lib/hs-nil/` or `src/lib/services/`)
- Create (if needed): `src/lib/customer/` (customer-only code)

- [ ] **Step 1: Add `no-restricted-paths` rule**

Append to `eslint.config.mjs`:

```js
import importPlugin from 'eslint-plugin-import';

export default [
  // ...existing config
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './src/app/!(dashboard)/**',
            from: './src/lib/admin/**',
            message: 'Admin code cannot be imported outside the admin route group.',
          },
          {
            target: './src/app/(dashboard)/!(admin)/**',
            from: './src/lib/admin/**',
            message: 'Customer dashboards cannot import admin code.',
          },
          {
            target: './src/app/(dashboard)/admin/**',
            from: './src/lib/customer/**',
            message: 'Admin cannot import customer-only helpers.',
          },
        ],
      }],
    },
  },
];
```

- [ ] **Step 2: Move admin-only utilities into `src/lib/admin/`**

Identify utilities used only by admin routes (likely under `src/lib/hs-nil/admin/*` or `src/lib/services/admin-*`). Move them:

```bash
git mv src/lib/hs-nil/admin src/lib/admin/hs
# ... adjust imports in moved + importing files
```

- [ ] **Step 3: Run lint, fix violations**

Run: `npm run lint`
Expected: violations where customer code imports from admin (or vice versa). Fix each by either:
- Moving the shared utility into `src/lib/shared/` (create if missing)
- Refactoring the import chain to pass data through props instead

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs src/lib/
git -c commit.gpgsign=false commit -m "feat(boundary): enforce admin/customer/shared import zones"
```

### Task A.6: SEO invisibility + sitemap exclusion

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `public/robots.txt`

- [ ] **Step 1: Filter `/admin/*` from sitemap**

Edit `src/app/sitemap.ts`:

```ts
// ensure the sitemap generator never emits /admin paths
// (most sitemap generators enumerate routes — add a filter)
const routes = [...].filter((r) => !r.startsWith('/admin'));
```

- [ ] **Step 2: Disallow `/admin/` in robots.txt**

Edit `public/robots.txt`:

```
User-agent: *
Disallow: /admin/
Disallow: /api/admin/
```

- [ ] **Step 3: Verify**

Run: `curl http://localhost:3000/sitemap.xml | grep admin`
Expected: no output.

Run: `curl http://localhost:3000/robots.txt`
Expected: Disallow lines visible.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts public/robots.txt
git -c commit.gpgsign=false commit -m "feat(admin): exclude from sitemap and robots"
```

### Task A.7: Add 301 redirects for `/hs/admin/*` → `/admin/*`

**Files:**
- Modify: `next.config.ts` (redirects section — admin block only)

- [ ] **Step 1: Append redirects**

```ts
// next.config.ts
async redirects() {
  return [
    // ... existing redirects
    {
      source: '/hs/admin/:path*',
      destination: '/admin/:path*',
      permanent: true, // 308 (treat like 301 for SEO)
    },
  ];
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm start`
Run: `curl -I http://localhost:3000/hs/admin/deals`
Expected: `308` status with `Location: /admin/deals`.

- [ ] **Step 3: Commit + PR**

```bash
git add next.config.ts
git -c commit.gpgsign=false commit -m "feat(admin): 301 legacy /hs/admin to /admin"
```

Open PR titled: `Wave 3A — Admin isolation`. Merge after review.

---

## Wave 3B — Phases 3+4: Athlete + Brand Unification

**Agent:** B (worktree `../gradeup-wave3-agent-b`)
**Goal:** Unified `/athlete` and `/brand` routes that read level from profile; HS pages absorbed; scholar-athlete UX differentiation landed.
**Exit criteria:** `/hs/athlete/*` and `/hs/brand/*` serve zero traffic (all 301'd); scholar-athlete hero card live on `/athlete`; GPA filter chip live on `/brand/discover`.

### Task B.1: Central profile hook + level-context provider

**Files:**
- Create: `src/hooks/useProfile.ts` (or extend if exists)
- Create: `src/components/shell/LevelContext.tsx`

- [ ] **Step 1: Write failing test for profile hook**

```ts
// src/__tests__/hooks/useProfile.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from '@/hooks/useProfile';

describe('useProfile', () => {
  it('returns athlete profile with athlete_level', async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(result.current.profile?.athlete_level).toMatch(/^(college|hs)$/);
  });
});
```

- [ ] **Step 2: Implement hook**

```ts
// src/hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { AthleteProfile, BrandProfile, DirectorProfile } from '@/types/profile';

type Profile = AthleteProfile | BrandProfile | DirectorProfile;

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      // Try each profile table in order; the one that returns a row wins
      const tables = ['athletes', 'brands', 'directors'] as const;
      for (const tbl of tables) {
        const { data } = await supabase.from(tbl).select('*').eq('user_id', user.id).maybeSingle();
        if (data) { setProfile(data as Profile); break; }
      }
      setLoading(false);
    })();
  }, []);

  return { profile, loading };
}
```

- [ ] **Step 3: Create `<LevelContext>` provider for server components**

```tsx
// src/components/shell/LevelContext.tsx
'use client';
import { createContext, useContext } from 'react';
import type { AthleteLevel } from '@/types/profile';

const LevelContext = createContext<AthleteLevel | null>(null);

export function LevelProvider({ level, children }: { level: AthleteLevel; children: React.ReactNode }) {
  return <LevelContext.Provider value={level}>{children}</LevelContext.Provider>;
}

export function useLevel() {
  const ctx = useContext(LevelContext);
  if (!ctx) throw new Error('useLevel must be used inside LevelProvider');
  return ctx;
}
```

- [ ] **Step 4: Tests pass; commit**

```bash
git add src/hooks/useProfile.ts src/components/shell/LevelContext.tsx src/__tests__/
git -c commit.gpgsign=false commit -m "feat(shell): central profile hook + level context"
```

### Task B.2: Unified `/athlete` layout + home (scholar-athlete card)

**Files:**
- Create/modify: `src/app/(dashboard)/athlete/layout.tsx`
- Modify: `src/app/(dashboard)/athlete/page.tsx` (was `athlete/dashboard/page.tsx`)
- Create: `src/components/athlete/ScholarAthleteCard.tsx`

- [ ] **Step 1: Write the Home page test**

```tsx
// src/__tests__/app/athlete-home.test.tsx
import { render, screen } from '@testing-library/react';
import AthleteHome from '@/app/(dashboard)/athlete/page';

it('shows scholar-athlete card with GPA when level=hs', () => {
  // mock profile = { ..., athlete_level: 'hs', gpa: 3.8, earnings_ytd: 1200 }
  render(<AthleteHome />);
  expect(screen.getByText('3.8')).toBeInTheDocument();
  expect(screen.getByText(/scholar-athlete/i)).toBeInTheDocument();
});

it('shows parent-consent banner when consent missing', () => {
  // mock profile with consent_status = 'missing'
  render(<AthleteHome />);
  expect(screen.getByRole('alert')).toHaveTextContent(/parent consent/i);
});
```

- [ ] **Step 2: Build `<ScholarAthleteCard>`**

```tsx
// src/components/athlete/ScholarAthleteCard.tsx
interface Props {
  name: string;
  sport: string;
  classYear: string;
  gpa: number;
  earningsYtd: number;
  avatarUrl?: string;
}

export function ScholarAthleteCard({ name, sport, classYear, gpa, earningsYtd, avatarUrl }: Props) {
  return (
    <article className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {avatarUrl && <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full" />}
        <div>
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="text-sm text-zinc-600">{sport} · Class of {classYear}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase text-zinc-500">GPA</dt>
          <dd className="text-2xl font-bold text-indigo-700">{gpa.toFixed(2)}</dd>
          <p className="text-xs text-indigo-600">Scholar-athlete</p>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Earnings YTD</dt>
          <dd className="text-2xl font-bold">${earningsYtd.toLocaleString()}</dd>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Wire `/athlete/page.tsx`**

```tsx
// src/app/(dashboard)/athlete/page.tsx
import { getServerProfile } from '@/lib/shared/profile-server';
import { ScholarAthleteCard } from '@/components/athlete/ScholarAthleteCard';
import { ParentConsentBanner } from '@/components/athlete/ParentConsentBanner';

export default async function AthleteHome() {
  const profile = await getServerProfile();
  if (profile.role !== 'athlete') redirect('/');
  return (
    <>
      {profile.athlete_level === 'hs' && <ParentConsentBanner status={profile.consent_status} />}
      <ScholarAthleteCard {...profile} />
      {/* next-deadline tile, suggested-actions, etc. */}
    </>
  );
}
```

- [ ] **Step 4: Run tests; commit**

```bash
git add src/app/\(dashboard\)/athlete/ src/components/athlete/ src/__tests__/
git -c commit.gpgsign=false commit -m "feat(athlete): unified home + scholar-athlete card"
```

### Task B.3: Migrate HS athlete sub-pages into `/athlete/*`

**Files (each sub-page is its own micro-task):**
- Move `src/app/(hs)/hs/athlete/campaigns/page.tsx` → `src/app/(dashboard)/athlete/campaigns/page.tsx`
- Same for: `deferred-earnings`, `earnings`, `mentor-sessions`, `privacy`, `public-profile`, `trajectory`, `transition`

For **each** sub-page, repeat:

- [ ] **Move the file**

```bash
git mv src/app/\(hs\)/hs/athlete/campaigns src/app/\(dashboard\)/athlete/campaigns
```

- [ ] **Inside the moved page, branch on level**

If the page was HS-only and has no college equivalent (e.g., `mentor-sessions`, `deferred-earnings`), add a guard at top:

```tsx
import { redirect } from 'next/navigation';
import { getServerProfile } from '@/lib/shared/profile-server';

export default async function MentorSessionsPage() {
  const profile = await getServerProfile();
  if (profile.athlete_level !== 'hs') redirect('/athlete');
  // ... existing page body
}
```

If the page has a college equivalent (e.g., `earnings`), merge the two:

```tsx
export default async function EarningsPage() {
  const profile = await getServerProfile();
  return (
    <>
      <EarningsSummary />
      {profile.athlete_level === 'hs' && <DeferredEarningsTab />}
      <PayoutHistory />
    </>
  );
}
```

- [ ] **Update imports** (relative paths may need fixing)
- [ ] **Run the page locally**, confirm render
- [ ] **Commit per sub-page**

```bash
git add -A src/app/\(dashboard\)/athlete/campaigns src/app/\(hs\)/hs/athlete/campaigns
git -c commit.gpgsign=false commit -m "refactor(athlete): move HS campaigns to unified /athlete/campaigns"
```

### Task B.4: `/athlete/*` redirects from `/hs/athlete/*`

**Files:**
- Modify: `next.config.ts` (append to redirects, **before** any Agent C additions — append-only discipline)

- [ ] **Step 1: Add redirect block**

```ts
{ source: '/hs/athlete', destination: '/athlete', permanent: true },
{ source: '/hs/athlete/:path*', destination: '/athlete/:path*', permanent: true },
```

- [ ] **Step 2: Verify**

Run: `curl -I http://localhost:3000/hs/athlete/earnings`
Expected: `308 Location: /athlete/earnings`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git -c commit.gpgsign=false commit -m "feat(athlete): 301 redirects from legacy /hs/athlete"
```

### Task B.5: Unified `/brand` layout + home

**Files:**
- Create/modify: `src/app/(dashboard)/brand/layout.tsx`
- Modify: `src/app/(dashboard)/brand/page.tsx` (absorbs `/brand/dashboard/page.tsx` if still separate)
- Create: `src/components/brand/CampaignsTile.tsx`, `src/components/brand/RoiTile.tsx`, `src/components/brand/SuggestedAthletes.tsx`

- [ ] **Step 1: Brand layout reads profile + `targets_levels`**

```tsx
// src/app/(dashboard)/brand/layout.tsx
import { getServerProfile } from '@/lib/shared/profile-server';
import { Navbar } from '@/components/shell/Navbar';
import { redirect } from 'next/navigation';

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile();
  if (profile.role !== 'brand') redirect('/');
  return (
    <div className="grid grid-cols-[240px_1fr]">
      <Navbar role="brand" level={profile.targets_levels[0] ?? 'college'} />
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Brand Home assembles three tiles**

```tsx
// src/app/(dashboard)/brand/page.tsx
import { getServerProfile } from '@/lib/shared/profile-server';
import { CampaignsTile } from '@/components/brand/CampaignsTile';
import { RoiTile } from '@/components/brand/RoiTile';
import { SuggestedAthletes } from '@/components/brand/SuggestedAthletes';

export default async function BrandHome() {
  const profile = await getServerProfile();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CampaignsTile brandId={profile.id} />
      <RoiTile brandId={profile.id} />
      <SuggestedAthletes brandId={profile.id} levels={profile.targets_levels} className="lg:col-span-2" />
    </div>
  );
}
```

Each tile is a server component that fetches its own data. Reuse existing data-fetch helpers from the HS brand page — most of them already exist in `src/lib/hs-nil/` or `src/lib/services/`. If a helper is HS-specific, move it up to `src/lib/shared/` and have it accept a `levels` parameter.

- [ ] **Step 3: Write smoke test**

```tsx
// src/__tests__/app/brand-home.test.tsx
it('renders three tiles for a brand targeting both levels', async () => {
  // mock profile with targets_levels = ['college', 'hs']
  const page = await BrandHome();
  const { getByTestId } = render(page);
  expect(getByTestId('campaigns-tile')).toBeInTheDocument();
  expect(getByTestId('roi-tile')).toBeInTheDocument();
  expect(getByTestId('suggested-athletes')).toBeInTheDocument();
});
```

Add matching `data-testid` attributes to each tile component.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/brand/ src/components/brand/ src/__tests__/app/brand-home.test.tsx
git -c commit.gpgsign=false commit -m "feat(brand): unified home with tiles"
```

### Task B.6: Migrate HS brand sub-pages into `/brand/*`

**Files (each sub-page is its own micro-task):**
- Move: `src/app/(hs)/hs/brand/campaigns/page.tsx` → `src/app/(dashboard)/brand/campaigns/page.tsx` (merge if college version exists)
- Move: `src/app/(hs)/hs/brand/shortlist/page.tsx` → `src/app/(dashboard)/brand/shortlist/page.tsx`
- Move: `src/app/(hs)/hs/brand/suggested/page.tsx` → `src/app/(dashboard)/brand/suggested/page.tsx`
- Move: `src/app/(hs)/hs/brand/performance/page.tsx` → `src/app/(dashboard)/brand/performance/page.tsx` (merge with existing `/brand/analytics` if equivalent)
- Move: `src/app/(hs)/hs/brand/payment-method/page.tsx` → `src/app/(dashboard)/brand/payment-method/page.tsx`
- Move: `src/app/(hs)/hs/brand/public-profile/page.tsx` → `src/app/(dashboard)/brand/public-profile/page.tsx`

For **each** sub-page repeat this pattern:

- [ ] **Step 1: Diff against any existing college equivalent**

```bash
diff src/app/\(dashboard\)/brand/campaigns/page.tsx \
     src/app/\(hs\)/hs/brand/campaigns/page.tsx
```

If college version is a stub or subset: HS version wins, overwrite. If both have unique logic: merge, branching on `profile.targets_levels.includes('hs')` where behavior differs.

- [ ] **Step 2: Move (or overwrite)**

```bash
git mv src/app/\(hs\)/hs/brand/campaigns/page.tsx src/app/\(dashboard\)/brand/campaigns/page.tsx
```

- [ ] **Step 3: Branch on `targets_levels` where needed**

```tsx
import { getServerProfile } from '@/lib/shared/profile-server';

export default async function BrandCampaignsPage() {
  const profile = await getServerProfile();
  const targetsHs = profile.targets_levels.includes('hs');
  // use targetsHs to show HS-specific campaign templates, consent-aware briefs, etc.
}
```

- [ ] **Step 4: Run page locally to confirm render**
- [ ] **Step 5: Commit per sub-page**

```bash
git -c commit.gpgsign=false commit -m "refactor(brand): move HS campaigns to unified /brand/campaigns"
```

Repeat for shortlist, suggested, performance, payment-method, public-profile.

### Task B.7: Scholar-athlete filter chip on `/brand/discover`

**Files:**
- Modify: `src/app/(dashboard)/brand/discover/page.tsx`
- Create: `src/components/brand/DiscoverFilters.tsx`

- [ ] **Step 1: Write test for filter behavior**

```tsx
// src/__tests__/components/discover-filters.test.tsx
it('toggles scholar-athlete filter and updates results', async () => {
  render(<DiscoverPage />);
  const chip = await screen.findByRole('button', { name: /scholar-athlete/i });
  await userEvent.click(chip);
  expect(chip).toHaveAttribute('aria-pressed', 'true');
  // assert results list re-renders with GPA >= 3.5 only
});
```

- [ ] **Step 2: Build the filter bar**

```tsx
// src/components/brand/DiscoverFilters.tsx
'use client';
import { useState } from 'react';

const FILTERS = ['Sport', 'Level', 'Location', 'Scholar-athlete'] as const;

export function DiscoverFilters({ onChange }: { onChange: (filters: Record<string, unknown>) => void }) {
  const [active, setActive] = useState<Record<string, boolean>>({ 'Scholar-athlete': false });

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={active[f] ?? false}
          onClick={() => {
            const next = { ...active, [f]: !active[f] };
            setActive(next);
            onChange(next);
          }}
          className={`rounded-full px-3 py-1 text-sm border ${
            active[f] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire into Discover page; filter query**

Apply the `Scholar-athlete` filter server-side when active: `WHERE athletes.gpa >= 3.5`. GPA is returned in the athlete card.

- [ ] **Step 4: Commit**

```bash
git add src/components/brand/DiscoverFilters.tsx src/app/\(dashboard\)/brand/discover/ src/__tests__/
git -c commit.gpgsign=false commit -m "feat(brand): scholar-athlete filter chip on Discover"
```

### Task B.8: `/brand/*` redirects from `/hs/brand/*`

**Files:**
- Modify: `next.config.ts` (append to redirects — Agent B section; do not edit Agent A or C blocks)

- [ ] **Step 1: Append redirect block**

```ts
{ source: '/hs/brand', destination: '/brand', permanent: true },
{ source: '/hs/brand/:path*', destination: '/brand/:path*', permanent: true },
```

- [ ] **Step 2: Verify**

Run: `curl -I http://localhost:3000/hs/brand/campaigns`
Expected: `308 Location: /brand/campaigns`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git -c commit.gpgsign=false commit -m "feat(brand): 301 redirects from legacy /hs/brand"
```

### Task B.9: Update Navbar for 3 roles

**Files:**
- Modify: `src/components/shell/Navbar.tsx` (Agent B owns this; A and C consume via props only)

- [ ] **Step 1: Define role-aware nav items**

```tsx
// src/components/shell/Navbar.tsx
import type { Role } from '@/types/profile';

const NAV_BY_ROLE: Record<Role, Array<{ href: string; label: string }>> = {
  athlete: [
    { href: '/athlete', label: 'Home' },
    { href: '/athlete/deals', label: 'Deals' },
    { href: '/athlete/earnings', label: 'Earnings' },
    { href: '/athlete/profile', label: 'Profile' },
  ],
  brand: [
    { href: '/brand', label: 'Home' },
    { href: '/brand/discover', label: 'Discover' },
    { href: '/brand/campaigns', label: 'Campaigns' },
    { href: '/brand/deals', label: 'Deals' },
  ],
  director: [
    { href: '/director', label: 'Home' },
    { href: '/director/athletes', label: 'Athletes' },
    { href: '/director/disclosures', label: 'Disclosures' },
    { href: '/director/deals', label: 'Deals' },
    // digest added conditionally in director layout
  ],
};
```

- [ ] **Step 2: Render items; level badge in avatar area**

```tsx
export function Navbar({ role, level }: { role: Role; level: AthleteLevel }) {
  const items = NAV_BY_ROLE[role];
  return (
    <nav aria-label="primary">
      <ul className="flex gap-4">
        {items.map((item) => (
          <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
        ))}
      </ul>
      <div className="ml-auto flex items-center gap-2">
        <span className="rounded bg-zinc-100 px-2 text-xs uppercase">{level}</span>
        {/* avatar */}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Commit; open PR**

```bash
git add src/components/shell/Navbar.tsx
git -c commit.gpgsign=false commit -m "feat(shell): role-aware navbar with level badge"
```

Open PR titled: `Wave 3B — Athlete + Brand unification`. Rebase on Agent A's merge; merge after review.

---

## Wave 3C — Phases 5+6+7: Director + Parent + Public Routes

**Agent:** C (worktree `../gradeup-wave3-agent-c`)
**Goal:** Director dashboard is scope-aware; parent dashboard deleted; token URLs move to `(public)` route group at unchanged paths.
**Exit criteria:** `/hs/ad-portal/*` → `/director/*` (301); `/hs/parent*` → `/hs/consent/manage` (301); token URLs at `/hs/consent/[token]` etc. still resolve and serve from `(public)` folder.

### Task C.1: Unified `/director` layout — scope-aware

**Files:**
- Modify/create: `src/app/(dashboard)/director/layout.tsx`
- Modify: `src/app/(dashboard)/director/page.tsx`

- [ ] **Step 1: Scope-aware layout**

```tsx
// src/app/(dashboard)/director/layout.tsx
import { getServerProfile } from '@/lib/shared/profile-server';
import { DirectorNav } from '@/components/director/DirectorNav';
import { ScopePill } from '@/components/director/ScopePill';

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile();
  if (profile.role !== 'director') redirect('/');
  return (
    <div className="grid grid-cols-[240px_1fr]">
      <DirectorNav scope={profile.director_scope} />
      <main>
        <header className="flex justify-between p-4">
          <ScopePill scope={profile.director_scope} />
        </header>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Nav includes Digest only for state scope**

```tsx
// src/components/director/DirectorNav.tsx
export function DirectorNav({ scope }: { scope: DirectorScope }) {
  const items = [
    { href: '/director', label: 'Home' },
    { href: '/director/athletes', label: scope === 'state' ? 'Programs' : 'Athletes' },
    { href: '/director/disclosures', label: 'Disclosures' },
    { href: '/director/deals', label: 'Deals' },
    ...(scope === 'state' ? [{ href: '/director/digest', label: 'Digest' }] : []),
  ];
  return (/* render */);
}
```

- [ ] **Step 3: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(director): scope-aware layout + nav"
```

### Task C.2: Migrate `/hs/ad-portal/*` into `/director/*`

**Files:**
- Move: `src/app/(hs)/hs/ad-portal/{deals,disclosures,settings}` → merge into existing `src/app/(dashboard)/director/{deals,compliance,settings}`
- Move: `src/app/(hs)/hs/ad-portal/page.tsx` → merge logic into `/director/page.tsx` (scope=state branch)

- [ ] **Step 1: For each sub-page, diff the existing college-director version vs the HS ad-portal version**

If the ad-portal version has state-specific logic, fold it into the unified page branching on `director_scope === 'state'`.

- [ ] **Step 2: Move remaining HS-admin-derived director pages**

From `(hs)/hs/admin/state-ad-digest` → `(dashboard)/director/digest/page.tsx` (note: this was under `/hs/admin/*` but semantically belongs to directors with state scope; Agent A moved it under `/admin/*` — Agent C pulls it OUT of admin and into director if it was customer-facing, or leaves it if it was operator-only).

**Ambiguity guard:** Check the current page content. If it's a digest viewer for state-AD customers, it belongs under `/director/digest`. If it's an admin tool for managing digest content, it stays under `/admin/*`.

- [ ] **Step 3: Commit each move**

```bash
git -c commit.gpgsign=false commit -m "refactor(director): merge ad-portal into unified /director"
```

### Task C.3: Delete parent dashboard; fold features

**Files:**
- Delete: `src/app/(hs)/hs/parent/` (entire directory)
- Modify: `src/app/(dashboard)/athlete/` — surface referral/reward info
- Modify: `next.config.ts` — redirect

- [ ] **Step 1: Inventory parent dashboard content**

Read `src/app/(hs)/hs/parent/page.tsx`, `.../referrals/page.tsx`, `.../rewards/page.tsx`. Determine which features have code that belongs on the athlete side (referrals tracked on athlete's account, rewards credited to athlete).

- [ ] **Step 2: Migrate referral/reward display to athlete Home or Earnings**

If referrals and rewards are a feature of the athlete's earnings, surface them on `/athlete/earnings` (as a section) OR on `/athlete/profile` (as a stat). Choose based on existing data model.

- [ ] **Step 3: Delete parent dashboard**

```bash
git rm -r src/app/\(hs\)/hs/parent/
```

- [ ] **Step 4: Add redirects**

```ts
// next.config.ts
{ source: '/hs/parent', destination: '/hs/consent/manage', permanent: true },
{ source: '/hs/parent/:path*', destination: '/hs/consent/manage', permanent: true },
```

- [ ] **Step 5: Commit**

```bash
git -c commit.gpgsign=false commit -m "refactor(parent): remove dashboard, redirect to consent manage"
```

### Task C.4: Create `(public)` route group for token URLs

**Files:**
- Create: `src/app/(public)/layout.tsx`
- Move: token URL pages from `(hs)/hs/*` into `(public)/hs/*`

- [ ] **Step 1: Create minimal `(public)` layout**

```tsx
// src/app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4">
        <a href="/" aria-label="GradeUp home">
          <img src="/logo.svg" alt="GradeUp" className="h-6" />
        </a>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

No auth dependency. No customer or admin nav.

- [ ] **Step 2: Move token pages**

```bash
git mv src/app/\(hs\)/hs/consent src/app/\(public\)/hs/consent
git mv src/app/\(hs\)/hs/invite src/app/\(public\)/hs/invite
git mv src/app/\(hs\)/hs/state-ad-invite src/app/\(public\)/hs/state-ad-invite
git mv src/app/\(hs\)/hs/trajectory src/app/\(public\)/hs/trajectory
git mv src/app/\(hs\)/hs/unsubscribe src/app/\(public\)/hs/unsubscribe
git mv src/app/\(hs\)/hs/valuation src/app/\(public\)/hs/valuation
git mv src/app/\(hs\)/hs/page.tsx src/app/\(public\)/hs/page.tsx
# Also move thanks if it's token-driven:
git mv src/app/\(hs\)/hs/thanks src/app/\(public\)/hs/thanks
```

**URLs do NOT change.** Route groups are invisible to the URL.

- [ ] **Step 3: Verify token URLs still resolve**

Run: `npm run dev`
Run: `curl -I http://localhost:3000/hs/consent/ANY_TOKEN`
Expected: 200 (or 404 if token invalid — but NOT a route-missing error).

Also check: `/hs/invite/TOKEN`, `/hs/trajectory/TOKEN`, `/hs/unsubscribe/TOKEN`, `/hs/valuation`.

- [ ] **Step 4: Commit**

```bash
git add -A
git -c commit.gpgsign=false commit -m "refactor(public): move token URL pages to (public) route group"
```

### Task C.5: Move alumni mentorship pages

**Files:**
- Move: `src/app/(hs)/hs/alumni/*` → `src/app/(dashboard)/athlete/mentorship/*`
- Modify: internal links and API calls

- [ ] **Step 1: Move pages**

```bash
git mv src/app/\(hs\)/hs/alumni src/app/\(dashboard\)/athlete/mentorship
```

- [ ] **Step 2: Update internal links**

Grep for `/hs/alumni` strings and update to `/athlete/mentorship`. Skip email templates and anywhere pointing to a user-facing link — those should use the new path.

Token URLs or hardcoded links from emails do NOT apply (these are dashboard-internal links).

- [ ] **Step 3: Add redirect**

```ts
{ source: '/hs/alumni/:path*', destination: '/athlete/mentorship/:path*', permanent: true },
```

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -m "refactor(mentorship): fold alumni pages into /athlete/mentorship"
```

### Task C.6: Move remaining HS root pages

**Files:**
- Move or delete: `src/app/(hs)/hs/onboarding/*`, `src/app/(hs)/hs/settings/*`

- [ ] **Step 1: `/hs/onboarding/*` → `/onboarding/<slug>` with level-aware rendering**

Each onboarding step (`next-steps`, `parent-next`, `payouts`, `verify-gpa`) moves to `src/app/(dashboard)/onboarding/<slug>/page.tsx`.

The `parent-next` page should only render for `athlete_level === 'hs'`; redirect otherwise.

- [ ] **Step 2: `/hs/settings/*` → fold into `/athlete/settings/*` or `/brand/settings/*`**

Check which role uses each settings page. Move accordingly. If shared, make it role-aware.

- [ ] **Step 3: Redirects**

```ts
{ source: '/hs/onboarding/:path*', destination: '/onboarding/:path*', permanent: true },
{ source: '/hs/settings/:path*', destination: '/athlete/settings/:path*', permanent: true },
```

- [ ] **Step 4: Commit; open PR**

```bash
git -c commit.gpgsign=false commit -m "refactor(hs): move onboarding + settings to role namespaces"
```

Open PR titled: `Wave 3C — Director + Parent + Public routes`. Rebase on Agent B's merge; merge after review.

---

## Wave 4 — Phase 8: Final Sweep

**Owner:** Solo.
**Goal:** Delete empty `(hs)` group, update types, update README, remove stale redirects, confirm analytics shows zero traffic to deprecated paths.

### Task 8.1: Delete empty `(hs)` route group

- [ ] **Step 1: Confirm empty**

Run: `find src/app/\(hs\) -type f -name "*.tsx"`
Expected: zero files (all moved in Wave 3).

- [ ] **Step 2: Delete**

```bash
git rm -r src/app/\(hs\)
```

- [ ] **Step 3: Remove `(hs)` references from codebase**

Run: `grep -rn "(hs)" src/`
Expected: no results (or only in test fixtures, which should also be cleaned).

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -m "chore(cleanup): remove empty (hs) route group"
```

### Task 8.2: Update README to describe 3-role model

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the "Overview" section**

```markdown
## Overview

GradeUp NIL is a marketplace connecting student-athletes with brands, built on three
customer-facing dashboards:

- **Athlete** (college and high-school) — manage NIL profile, track deals, view earnings
- **Brand** — discover athletes (filter by sport, level, location, academic tier),
  manage campaigns, approve deliverables
- **Director** (school-level or state-level via `scope`) — compliance inbox, disclosures,
  per-school or per-state aggregate views

High-school athletes, parents, and state athletic directors are served by the same
three dashboards via profile-level context, not separate surfaces. Parent consent is
handled through token-authenticated flows; state-level directors see a state-scope
view of the Director dashboard.

Platform operators use a separate `/admin` surface guarded by middleware and excluded
from the public sitemap.
```

- [ ] **Step 2: Remove any mentions of `/hs/*` routes as dashboards**

- [ ] **Step 3: Commit**

```bash
git add README.md
git -c commit.gpgsign=false commit -m "docs(readme): describe consolidated 3-role model"
```

### Task 8.3: Audit Vercel Analytics for residual traffic

- [ ] **Step 1: Open Vercel Analytics**

Filter by path prefix `/hs/` for the past 30 days.

Expected traffic pattern:
- Token URLs (`/hs/consent/[token]` etc.): steady traffic
- `/hs/athlete`, `/hs/brand`, `/hs/parent`, `/hs/ad-portal`: should be zero or single-digit (bots + stale bookmarks hitting 301s)
- `/hs/admin`: should be near zero (only internal team)

- [ ] **Step 2: If legacy non-token path has nontrivial traffic, investigate**

Probably means some email template, external site, or cached page links to the old path. Fix at source if possible.

- [ ] **Step 3: Document findings in release notes**

### Task 8.4: Remove non-token 301 redirects older than 90 days

**Note:** this task runs ≥ 90 days after merge, NOT in the initial ship.

After 90 days:

- [ ] **Step 1: Remove customer-URL redirects**

Edit `next.config.ts`, remove:
- `/hs/athlete/*` → `/athlete/*`
- `/hs/brand/*` → `/brand/*`
- `/hs/parent*` → `/hs/consent/manage`
- `/hs/ad-portal/*` → `/director/*`
- `/hs/alumni/*` → `/athlete/mentorship/*`
- `/hs/onboarding/*`, `/hs/settings/*` redirects
- `/hs/admin/*` → `/admin/*`

- [ ] **Step 2: KEEP token redirects forever**

Do NOT remove:
- `/hs/consent/[token]` (still serves from `(public)`)
- `/hs/invite/[token]`, `/hs/trajectory/[token]`, `/hs/state-ad-invite/[token]`, `/hs/unsubscribe/[token]`

These URLs are in user inboxes; they resolve directly (no redirect) because they live at the same path in `(public)`.

- [ ] **Step 3: Commit**

```bash
git -c commit.gpgsign=false commit -m "chore(cleanup): remove 90-day legacy redirects, keep token paths"
```

---

## Success Criteria (from spec §9)

After Wave 4:

- [ ] `src/app/(hs)` deleted; only `(public)/hs/*` remains.
- [ ] Three customer route groups live: `(dashboard)/{athlete,brand,director}`, each context-aware.
- [ ] `(dashboard)/admin` guarded by middleware; separate `admins` table.
- [ ] ESLint `no-restricted-paths` enforces module boundaries; CI fails on violation.
- [ ] All customer `/hs/*` URLs return 301 (or deleted after 90 days).
- [ ] Token URLs under `/hs/*/[token]` resolve and work end-to-end.
- [ ] Profile tables have non-null `athlete_level`, `director_scope`, `director_level`.
- [ ] Athlete `/athlete` Home surfaces scholar-athlete card with GPA.
- [ ] Brand `/brand/discover` has scholar-athlete filter chip.
- [ ] Director `/director` serves both `scope=school` and `scope=state`.
- [ ] Parent dashboard does not exist.
- [ ] README documents the model.
- [ ] `npm run validate` green after each phase.
- [ ] Vercel Analytics shows no residual customer traffic on legacy `/hs/*` paths.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-gradeup-role-model-consolidation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task; review between tasks; fast iteration. Wave 3 uses 3 parallel subagents in git worktrees, merged serially (A → B → C).

**2. Inline Execution** — Execute tasks in the current session via `superpowers:executing-plans` with batched checkpoints for review.

Which approach?
