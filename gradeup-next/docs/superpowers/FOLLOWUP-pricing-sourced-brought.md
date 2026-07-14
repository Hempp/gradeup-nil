# Follow-up: StatStaq sourced/brought pricing model

**Decision (2026-07-13):** seg chose to switch pricing from GradeUp's take-rate
(free athletes; 8% <$500, 6% ≥$500; Brand+ $149/mo→5%) to StatStaq's model:
**free to join · X% on deals StatStaq sources · Y% on deals athlete brings.**

**Blocked on:** the actual X and Y percentages (not yet provided).

**Scope when unblocked:**
1. Rewrite `/pricing` (`src/app/(marketing)/pricing/page.tsx`) + `es/pricing`
   (`src/app/es/pricing/page.tsx` + `src/lib/i18n/dictionaries/es.ts`) copy to the
   sourced/brought model with real X/Y.
2. **Take-rate LOGIC follow-up (seg said YES to flag):** the 8%/6% is wired into
   real payment/take-rate calculation. Page copy alone would misrepresent charges.
   Update the calc to sourced/brought before/with the copy, or the page lies.
   Find the take-rate logic (grep `0.08|0.06|take.?rate|takeRate|platformFee`).
3. Reconcile `en.ts` `athletesFeature4: 'Parent custodian receives 92–94% of gross'`
   (inverse of old fee) to the new model.

Until then: `/pricing` retains the real, accurate 8%/6% terms (NOT reskin-blocking).
