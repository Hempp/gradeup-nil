# HS-NIL Concierge 5-Parent Playbook

**Purpose:** First-cohort, de-risked validation of the viral-loop thesis. Same structure as the [20-parent playbook](./HS-NIL-CONCIERGE-MVP-PLAYBOOK.md) at 75% less investment and ~25% shorter clock-to-signal.

**Status:** Pre-cohort. Condensed from the 20-parent version.

**Audience:** You (the founder). No ops partner required at this cohort size.

**Timeline:** ~2 weeks pipeline-building + 30 days concierge = **45 days to go/no-go**.

---

## 1. Why 5, not 20

The 20-parent version takes ~4 weeks to build pipeline and ~4 weeks to run the concierge — 60 days before the viral-loop signal is legible. A 5-parent cohort compresses that to ~2 weeks of pipeline-building plus 30 days of concierge: 45 days to signal, with 75% less capital and founder time at risk.

If the viral loop fires at 5, you scale to 20 next cohort with materially higher conviction. If it does not fire at 5, you have saved 75% of the investment and caught the same negative signal. Either path, you learn faster and cheaper.

---

## 2. The Thesis We're Testing

Parents will amplify their scholar-athlete's first NIL deal as a scholarship-adjacent story. If a 3.8-GPA freshman's $250 deal prompts their mother to post unprompted — on Instagram, LinkedIn, or in a group chat — HS-NIL is the company. If the deal closes and the loop dies in the parent's own gratitude, it is a feature and we redirect energy to AD compliance. This cohort is the cheapest legible test of which universe we are in.

---

## 3. Success / Failure Criteria (Scaled-Down Thresholds)

| Criterion | 20-parent threshold | 5-parent threshold |
|---|---|---|
| Deals completed | ≥15 of 20 (75%) | **≥4 of 5 (80%)** |
| Organic shares | ≥10 | **≥3** |
| Unprompted referrals | ≥5 | **≥2** |
| Parent NPS | ≥50 | **≥50** |

**Why these thresholds:** a 5-parent cohort is a statistically weaker signal than 20, so you compensate by requiring a proportionally higher completion rate (80% vs 75%). Shares and referrals scale linearly. NPS stays constant because it is a per-respondent metric and does not weaken with smaller N.

---

## 4. Pre-Work — 14 Days Compressed

See §3 of [HS-NIL-CONCIERGE-MVP-PLAYBOOK.md](./HS-NIL-CONCIERGE-MVP-PLAYBOOK.md) for full detail. Compressed here.

### Engineering (founder, 2 days)
- Apply migrations to preview Supabase: `node scripts/check-migrations.mjs && supabase db push`.
- Smoke-test platform end-to-end per [Deploy Playbook §5](./HS-NIL-DEPLOY-PLAYBOOK.md).
- Apply migrations to prod. Flip `FEATURE_HS_NIL=true`.
- Run `node scripts/preflight-env.mjs --target=prod` — all critical and concierge vars present.

### Legal (founder + counsel, ~2 weeks, runs in parallel)
- Engage CA sports-law counsel per [HS-NIL-LEGAL-CHECKLIST.md](./HS-NIL-LEGAL-CHECKLIST.md).
- Get **Tier 1 items only** reviewed: consent template, brand MSA, minor ToS addendum, deliverable template.
- Expected cost: **$3–5K for Tier 1**. Tier 2 waits for the 20-parent cohort.

### Stripe (founder, ~1 week, runs in parallel)
- Apply for Stripe Connect platform account.
- Wait for approval.
- Set `HS_PAYOUT_PROVIDER=stripe` plus webhook secrets.

### Brand pipeline (founder, this week)
- **3 brand partners** with signed MSA and agreed $100–$500 spend. Not 10 — 3.
- Use [HS-NIL-BRAND-OUTREACH-TEMPLATES.md](./HS-NIL-BRAND-OUTREACH-TEMPLATES.md).
- Vertical diversification: 1 training facility + 1 tutoring service + 1 local restaurant.

### Parent pipeline (founder, this week, runs in parallel)
- 3 warm AD intros → 8–12 parent leads → **5 green-flag-qualified parents**.
- Use [HS-NIL-PARENT-INTAKE-SCRIPT.md](./HS-NIL-PARENT-INTAKE-SCRIPT.md).

---

## 5. Sourcing the 5

Same target profile as the 20-parent version:

- CA parent of an HS 14–17-year-old scholar-athlete.
- GPA ≥3.5 self-reported.
- Parent has ≥300 followers on at least one social platform.
- Lives within 25mi of the 3 brand partners.

**Diversification target:** 3 different sports + 3 different grade years + 3 different schools across the 5 parents. This prevents a same-school echo chamber distorting the signal.

---

## 6. Running the Concierge (30 Days)

### Cadence
- **Daily:** 15 min ops-tracker review. Identify 1–3 actions for today.
- **Weekly Friday:** 60 min retro. Fill retro checkpoint in [HS-NIL-CONCIERGE-OPS-TRACKER.md](./HS-NIL-CONCIERGE-OPS-TRACKER.md).

### Per-parent journey
- **Week 1:** consent signed + first brand intro.
- **Week 2:** first deal offer → athlete accepts.
- **Week 3:** deliverable submitted → brand approves → payout.
- **Week 4:** observation + NPS survey.

### Parallel brand activity
- Founder manually matches each parent's athlete to one of the 3 brand partners.
- Rough balance: 1 brand runs 2 deals, the other 2 brands run 1–2 deals each.
- No self-serve matching during the cohort. You are the matching engine.

---

## 7. What to Measure (Simplified)

### Daily, per parent (logged in ops tracker)
- Status progression.
- Response latency (hours between your message and the parent's reply).
- Any friction points.

### Weekly aggregates (compared to 5-parent thresholds in §3)
- % through each funnel stage.
- Share count observed.
- Referrals attributed.

---

## 8. Day-30 Decision

Same GREEN / YELLOW / RED branches as the 20-parent version, adjusted to 5-parent thresholds.

### GREEN — ≥4 deals, ≥3 shares, ≥2 referrals, NPS ≥50
Scale to a 20-parent cohort next. Open a second city (SF or San Diego). Engage counsel for Tier 2 and Tier 3 legal items. Begin drafting the "HS NIL at 1" report from [HS-NIL-AT-1-TEMPLATE.md](./HS-NIL-AT-1-TEMPLATE.md).

### YELLOW — partial hit
Iterate for 2 weeks on the specific friction identified. Re-run the concierge with another 5 parents. **Do not scale to 20 yet.**

### RED — thresholds missed
Pause HS-NIL. 30-min call with each of the 5 parents to capture qualitative feedback. Decide pivot vs re-design.

---

## 9. What Stays the Same vs 20-Parent Version

- Thesis framing.
- Parental-consent gating (Phase 1 architecture).
- State-rule validation at deal creation.
- Brand escrow at contract signing.
- PII discipline.
- Retro template format — [HS-NIL-POST-CONCIERGE-RETRO-TEMPLATE.md](./HS-NIL-POST-CONCIERGE-RETRO-TEMPLATE.md).

---

## 10. What Changes from 20-Parent Version

| Dimension | 20-parent | 5-parent |
|---|---|---|
| Brand partners | 10 | 3 |
| Parents | 20 | 5 |
| Concierge duration | 30 days | 30 days |
| Pipeline prep duration | 4 weeks | 2 weeks |
| Deal-cost budget | ~$6,000 | ~$1,500 |
| Legal scope | Tier 1–2 | Tier 1 only |
| Signal confidence | Higher | Lower but faster |

---

## 11. Exit Criteria — When to Stop the Cohort Early

Stop and re-plan if **any** of the following occur:

- 2 or more parents disengage in the first 10 days.
- The first deal causes a compliance incident (state AD complaint, school complaint, media flag).
- Founder burnout signal — logging <15 min per day on the tracker suggests the work is not sustainable even at 5 parents.

---

## 12. Reference Documents

- [HS-NIL-BRIEF.md](./HS-NIL-BRIEF.md) — strategic framing.
- [HS-NIL-CONCIERGE-MVP-PLAYBOOK.md](./HS-NIL-CONCIERGE-MVP-PLAYBOOK.md) — the full 20-parent version.
- [HS-NIL-POST-CONCIERGE-RETRO-TEMPLATE.md](./HS-NIL-POST-CONCIERGE-RETRO-TEMPLATE.md) — fill at day 30.
- [HS-NIL-BRAND-OUTREACH-TEMPLATES.md](./HS-NIL-BRAND-OUTREACH-TEMPLATES.md) — outreach scripts.
- [HS-NIL-PARENT-INTAKE-SCRIPT.md](./HS-NIL-PARENT-INTAKE-SCRIPT.md) — intake call script.
- [HS-NIL-LEGAL-CHECKLIST.md](./HS-NIL-LEGAL-CHECKLIST.md) — counsel engagement.
- [HS-NIL-CONCIERGE-OPS-TRACKER.md](./HS-NIL-CONCIERGE-OPS-TRACKER.md) — Google Sheets schema.
- [HS-NIL-DEPLOY-PLAYBOOK.md](./HS-NIL-DEPLOY-PLAYBOOK.md) — preview deployment.
