# HS-NIL Concierge MVP — 30-Day Retrospective Template

**Use when:** 30 days after the first concierge parent signs up, OR 30 days after the last concierge deal closes — whichever is later.

**Purpose:** convert raw concierge-era data into a decision document. The output of this retrospective decides Phase 18 direction: scale concierge, iterate concierge, or pause HS-NIL.

**Fill this document in your own voice.** Numbers are programmatically extractable via `/hs/admin/annual-report/data` (see the "Number sourcing" section at the bottom). Narrative is not.

---

## 1. Cohort summary

| Metric | Value | Source |
|---|---|---|
| Parents recruited | | Concierge tracker + `hs_waitlist` is_concierge count |
| Parents who signed up | | count(hs_parent_profiles) joined to is_concierge |
| Athletes linked + consent signed | | count(parental_consents where revoked_at is null AND is_concierge-parent) |
| Deals offered (manually brokered) | | count(deals) with hs_campaign_id null + brand_id in concierge-brand allowlist |
| Deals accepted by athlete | | count(deals) status in ('accepted','fully_signed','approved','paid','completed') |
| Deals reaching fully_signed | | count(deals) status in ('approved','paid','completed') |
| Deals with paid payout | | count(hs_deal_parent_payouts) status='paid' |
| Total compensation paid to parents | | sum(compensation_amount) on paid deals |
| Concierge duration (days) | | today − first_is_concierge_signup |

## 2. The viral-loop question (only question that actually matters)

From `docs/HS-NIL-CONCIERGE-MVP-PLAYBOOK.md` section 2, we committed to these thresholds:

- Success: ≥15 of 20 deals complete AND ≥10 organic shares AND ≥5 unprompted referrals AND parent NPS ≥50.
- Yellow: 10-14 deals AND <5 organic shares.
- Failure: <10 deals complete OR <3 organic shares OR 0 unprompted referrals.

Fill in:

| Criterion | Threshold | Actual | Met? |
|---|---|---|---|
| Deals completed | ≥15/20 | | |
| Organic shares | ≥10 | | |
| Prompted shares (excluded from gold signal) | — | | informational |
| Unprompted parent-to-parent referrals | ≥5 | | |
| Parent NPS (post-deal survey) | ≥50 | | |
| Red-flag incidents | 0 | | |

**Verdict:** □ GREEN · □ YELLOW · □ RED

## 3. What worked

Describe 3-5 specific things that went well. Candidates:
- Which sourcing channel (AD intros / club coaches / newsletters / other) produced highest-quality parents?
- Which brand vertical was easiest to close?
- Which deliverable type drove the most shares?
- Any copy/email that had unusually high engagement?

## 4. What didn't work

Describe 3-5 specific friction points:
- Where in the funnel did parents drop off?
- Which compliance edge-case surprised you?
- What brand-side complaints appeared?
- What infrastructure held together vs. cracked (list any production bugs)?

## 5. Qualitative parent quotes

Pull 5-10 quotes from the post-deal survey + concierge-intake calls. Parents' own words are the narrative spine of the "HS NIL at 1" annual report and of future investor conversations. Mask last names to first-initial.

- "..." — [Parent A., CA, basketball]
- "..." — [Parent B., FL, football]

## 6. Counter-intuitive findings

List 2-4 things you learned that contradicted assumptions. These are the insights that matter — most of what went as expected was already priced in.

- Finding:
  Implication for Phase 18:

## 7. Decision

Based on the verdict in Section 2:

### If GREEN:
- Open concierge to state 2 (pick: FL, GA, IL, NJ, or NY based on brand pipeline strength).
- Ship Phase 18: remaining engineering deferred during concierge (TX escrow UI activation, webhook retry queue, status page, match-ranker v2).
- Begin "HS NIL at 1" annual report draft using `/hs/admin/annual-report`.
- Raise or extend runway conversation.

### If YELLOW:
- Do NOT expand state count.
- Iterate for 2 more weeks on the specific friction points identified in Section 4.
- Re-run concierge with 10 new parents using iterated approach.
- Re-fill this template after the second pass.

### If RED:
- Pause HS-NIL product work.
- Do 30-minute wrap-up calls with all concierge parents — capture feedback.
- Pivot evaluation: AD compliance SaaS, collective-alternative ranker, or exit.
- Keep the codebase; 12 months from now the NCAA House settlement effects may reopen the HS market structurally.

**My decision (dated):**

Chosen path:
Rationale in one paragraph:
Commitment (what I'll do differently in the next 30 days):

## 8. Open tasks exiting concierge

List code, ops, or product tasks that emerged from this concierge that need immediate attention in Phase 18. Use the task-ID scheme from the rest of the project (#87, #88, ...).

## 9. Number sourcing (reference for future retros)

Every metric in Section 1 can be pulled programmatically:

- **Admin data endpoint:** `GET /api/hs/admin/annual-report/collect?rangeStart={concierge_start}&rangeEnd={concierge_end}` returns full `AnnualReportData` JSON.
- **Admin preview page:** `/hs/admin/annual-report/preview` renders exec summary + findings + tables against the same data.
- **CSV export:** `/api/hs/admin/annual-report/export/csv?section={athletes|deals|compliance|referrals|shares|...}` streams per-section CSVs.
- **Direct queries (for verification):** see `src/lib/hs-nil/annual-report.ts` — each section aggregator has inline SQL-origin comments.

Qualitative data (Sections 3-6) is not extractable. It has to come from the 30-day founder's-notebook. Keep notes as you go; don't try to reconstruct quotes from memory after the fact.

---

**After completion:** commit this filled template to `docs/retros/HS-NIL-CONCIERGE-<date>.md` and reference in the "HS NIL at 1" annual report. Don't throw it away — future concierges benefit from the pattern-matching.
