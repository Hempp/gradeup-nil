# Follow-up: StatStaq sourced/brought pricing model

**Decision (2026-07-13):** seg chose to switch pricing from GradeUp's take-rate
(free athletes; 8% <$500, 6% ≥$500; Brand+ $149/mo→5%) to StatStaq's model:
**free to join · X% on deals StatStaq sources · Y% on deals athlete brings.**

**Numbers (2026-07-13, = StatStaq's published pricing):** free to join · **15%** on deals StatStaq's desk sources & closes · **0%** on deals you bring. Page copy done. REMAINING follow-up = the TAKE-RATE CODE (still computes 8%/6% by deal size) must change to 15%-sourced / 0%-brought, or charges won't match the page.

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
