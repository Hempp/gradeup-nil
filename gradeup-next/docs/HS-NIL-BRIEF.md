# GradeUp HS-NIL — Product Brief

**Status:** Strategic bet. Phase 0 scaffolding landed April 18, 2026.
**Author:** Founder's Mind audit swarm (NEXUS-PRIME)
**Audience:** Co-founders, engineering leads, future investors.

---

## The Bet

GradeUp is the scholar-athlete platform from 8th grade through senior year of college. NCAA NIL is the existing product; HS-NIL is net-new TAM that extends — not replaces — it. The wedge ("verified GPA + NIL") carries through both.

The HS market is ~16x larger than NCAA by athlete count (~8M vs ~500K). Grades are already central to the HS conversation. Parents are the decision-makers, which means retail-like behavior, emotional pull, and organic virality that a pure AD-centric NCAA tool will never generate. And no national platform currently owns the HS NIL category — it is structural whitespace.

The strategic significance is two-fold:

1. **Near-term:** HS expands who GradeUp serves without cannibalizing the existing college side. NCAA features (discover, deals, dashboards, GradeUp Score, referrals) continue shipping on their current trajectory. HS gets its own flows where the rules demand it (parental consent, per-state compliance, minor-appropriate UX) and shares infrastructure where it can (identity, payouts, brand onboarding, design system).
2. **Long-term:** HS athletes who matriculate into college flow naturally into the NCAA product with GPA history preserved. GradeUp becomes the only platform that carries the athlete's verified academic narrative across the full 8-year arc. That's the pipeline lock-in Opendorse / INFLCR / Altius cannot replicate without starting over.

The AD compliance SaaS (original Track 1) becomes the enterprise upsell *after* we own the pipeline at both ends, not the wedge.

---

## Evidence Base

### Regulatory (as of April 2026)

- **41 states + DC** fully permit HS NIL.
- **5 states limited** (AR, KS, MS, MO, TX).
- **5 states prohibit** (AL, HI, IN, MI, WY).
- **Ohio** in transition.
- **Trajectory is one-way:** no permitting state has reversed. 9 states flipped or expanded 2024–25. WV and GA extended NIL to middle school.
- **Federal preemption risk** lives in the college layer (Trump EO April 3, 2026; CARA pending), not yet HS.

### Universal Constraints

Every permitting state shares roughly these guardrails:

1. **School-IP firewall** — athlete cannot use team logos, mascots, uniforms, school marks.
2. **Pay-for-play prohibition** — compensation cannot be contingent on enrollment or athletic performance.
3. **Banned categories** — gambling, alcohol, tobacco, cannabis, adult content, weapons.
4. **Parental consent** required for minors.
5. **Post-signature disclosure window** — typically 72 hours to 14 days, to the state athletic association or school.

### Academic Verification Landscape

- **No national HS transcript repository exists.** Parchment covers a meaningful fraction but not a majority.
- **NSC dominates postsecondary,** gated behind BD-heavy partnerships (6–18mo).
- **FERPA permits student-initiated sharing** — so a consumer-facing upload flow is lawful.
- **COPPA** applies to minors but we target 14+ which is the lighter end.
- **MaxPreps, Hudl, Common App, Naviance** — no third-party academic APIs.

### Pilot State Selection

**Ranked by permissiveness × TAM × brand density × regulatory stability:**

1. **California** — largest HS athlete TAM, clear rule set, unmatched brand ecosystem and media gravity.
2. **Florida** — clear state-law backing, strong HS football market. Watch: FL DBPR agent registry requires legal review of our onboarding flow.
3. **Georgia** — most permissive rules (no age minimum, 7-day disclosure), low current adoption = first-mover upside.

**Explicitly defer:** Texas (17+ minimum + payment-deferred escrow is a UX trap).
**Explicitly avoid:** AL, HI, IN, MI, WY.

---

## MVP Scope (90-Day Target)

### Phase 0 — Foundations (today → week 2)

**Landed in this commit:**
- `FEATURE_FLAG.HS_NIL` gate system.
- Per-state rules engine data structure (CA, FL, GA encoded; rest stubbed).
- Database migration for: `hs_athlete_profiles`, `parental_consents`, `state_nil_rules`.
- Route shells under `src/app/(hs)/` behind the flag.
- Marketing-page placeholder for waitlist capture.

**Still to build in Phase 0:**
- Waitlist capture form → Resend email confirmation.
- Per-state copy pack (legal disclosure text — needs legal review).

### Phase 1 — Verified Identity + Consent (weeks 3–6)

- **Parental consent flow:** dual-signature (athlete + parent/guardian), age-gate at 13, identity proofing via Stripe Identity or Persona.
- **Academic verification tiers:**
  - Tier A: `self-reported` (user enters GPA — shown with disclaimer badge).
  - Tier B: `user-submitted transcript` (parent uploads PDF → manual or OCR review → "user-provided" badge).
  - Tier C: `institution-verified` (future: Parchment / NSC MyHub / district SSO — "verified" badge).
- **Wallet + payouts:** Stripe Connect with parent-as-custodian for minors; no direct athlete payouts until 18.
- **School-IP content moderation:** text + image classifier on deal creatives (reject team logos, mascots, uniform likenesses).

### Phase 2 — Deal Flow (weeks 7–12)

- **Brand onboarding for local businesses** (pilot-state-specific): gyms, restaurants, local retail, training facilities. Lower deal-size threshold than NCAA (typical HS deals are $50–$1,500, not $5K+).
- **Post-signature disclosure pipeline:** auto-generate state-athletic-association compliance report within each state's window. Per-state JSON contract.
- **Parent dashboard** as the primary UX surface. Athlete dashboard is secondary — parents approve, monitor earnings, track grade-linked bonus structures.

### Phase 3 — Bridge to College (quarter 2+)

This is the unique lock-in HS expansion unlocks. Every other platform starts an NCAA athlete from scratch on signup. GradeUp's HS athletes arrive at college with a full academic narrative already under management.

- **Auto-migration:** HS athletes who matriculate get a one-tap transition to the college product, preserving GPA history, verified deals, brand relationships, and audience.
- **Carry-over GPA:** 4 years of verified HS GPA history continues to display on the college profile as "Academic Trajectory," which is the kind of trust signal brands and recruiting offices actively want.
- **D1 recruiting feedback loop:** introduce relationships with college recruiting offices where GradeUp HS athletes show up as "GPA-pre-verified" leads. Creates an outbound value flow that college programs pay attention to.
- **Two-way traffic:** college athletes can also mentor HS athletes on the platform (verified alumni program), which drives HS-side trust and college-side engagement simultaneously.

---

## Architecture Implications

1. **Per-state rules engine, not hardcoded.** `state_nil_rules` table keyed by USPS state code. Any deal creation goes through `evaluateDeal(state, deal)` which returns `{ allowed, violations[], disclosureWindow, parentalConsentRequired }`.
2. **Tiered verification labels** are a first-class UI concept — never show a GPA without its verification tier.
3. **Feature flag gating** at the middleware level — HS routes 404 for non-flagged users; pilot state is determined by user location + explicit opt-in.
4. **Parental consent is a data model concern,** not a form. Every athlete record under 18 links to a `parental_consent_id` that must be valid (signed, unexpired, scope-matching) for any deal to be active.
5. **Compliance disclosure is an outbound event pipeline,** not a one-shot API call. Every signed deal fires a scheduled job (per state's window) that emits a compliance packet to the state athletic association or school.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| State rule change revokes a deal mid-flight | H | Snapshot `state_rules_version_id` on every deal; deals signed under previous rules are grandfathered. |
| Parental consent forgery | H | Identity-proof parent via Stripe Identity / Persona; require notarized upload or live video attestation for disputed cases. |
| School-IP violation slips through moderation | M | Human-in-the-loop review for first 200 deals in each pilot state; train classifier on violations. |
| Clearinghouse partnership stalls past Phase 1 | M | MVP does not depend on NSC/Parchment — Tier A+B covers the first 6 months. |
| Federal preemption extends to HS | L | Architecture is already per-state; federal preemption would simplify, not invalidate, our rules engine. |
| Legal exposure from advice-shaped content | M | Retain state-specialized sports law counsel in each pilot state; gate all legal-sounding copy on legal review. |

---

## The One Big Assumption to Validate Next

**Will parents pay?** Our entire wedge theory rests on parents treating a verified GPA-linked NIL deal as a mini-scholarship story worth sharing. A $50 deal for a 14-year-old with a 3.9 GPA generating a LinkedIn post from mom + a local-paper feature is the viral loop.

**Validation move (next 30 days):** run a concierge MVP with 20 HS parents in California — no platform, just a Google Form + manual deal-brokering against a handful of local brands GradeUp onboards by hand. Track: does each deal generate an organic share? Does a parent tell another parent?

If the viral loop fires, HS-NIL is the company. If it doesn't, we pivot back to NCAA + AD compliance.

---

## References

- Regulatory research: `/tmp/hs-nil-regulatory.md`
- Academic verification research: `/tmp/academic-verification-infra.md`
- Strategic audit: `/tmp/gradeup-audit-strategic.md`
