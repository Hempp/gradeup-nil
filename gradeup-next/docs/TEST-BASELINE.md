# Test baseline — 2026-04-21 (Phase 0 checkpoint)

**At the start of the role-model consolidation refactor** (spec: `docs/superpowers/specs/2026-04-21-gradeup-role-model-design.md`, plan: `docs/superpowers/plans/2026-04-21-gradeup-role-model-consolidation.md`):

```
Test Suites: 8 failed, 1 skipped, 136 passed, 144 of 145 total
Tests:       82 failed, 22 skipped, 2872 passed, 2976 total
```

Every phase of the consolidation MUST ship with:

- **≤ 82 failing tests**
- **≤ 8 failing suites**

Exceeding either count is a regression, not inherited debt. Phase PRs should include the current test count in the PR description so the reviewer can enforce this gate.

## Failing suites snapshot

At time of baseline, the following test files had failures. Listed for future grooming work — these are *not* in scope for any consolidation phase.

- `src/__tests__/components/ui/button.test.tsx` — expects `h-10` (medium size); component renders `h-11 min-h-[44px]` (WCAG AA touch-target). Likely fix: update test expectations to match current component.
- Additional suites captured from Phase 0 `npm run validate` output — consult git history at commit `6335847` for the complete list.

## Why this isn't being fixed now

Pre-existing test rot from legitimate component evolution (design tokens, touch-target sizes, mock drift in services) accumulated before the consolidation started. Fixing it right requires per-test decisions (update test vs. revert component) that aren't load-bearing for the 3-dashboard consolidation.

Treat test health as a separate grooming stream. When the grooming session happens, reset this baseline to a new lower floor.

## How to verify a phase hasn't regressed

```bash
cd gradeup-next && npm test 2>&1 | tail -5
```

Compare the `Tests:` line to the baseline. If failures increased, find what changed and fix before merging.
