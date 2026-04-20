# HS NIL at 1 — Annual Report Template

> **Status:** scaffolding template. Populated automatically from
> `src/lib/hs-nil/annual-report.ts::collectAnnualReportData`.
> Placeholders `{{FIELD_NAME}}` are replaced from the JSON blob at
> generation time. Founder writes narrative on top of the auto-seeded
> exec summary, findings, and section intros.

**Report title:** {{META_REPORT_LABEL}}
**Window:** {{META_RANGE_START}} — {{META_RANGE_END}}
**Generated at:** {{META_GENERATED_AT}}
**Schema version:** {{META_SCHEMA_VERSION}}
**Publisher:** GradeUp

---

## Executive Summary

> Auto-seeded by `generateExecutiveSummary(data)`. Edit by hand.

{{EXEC_SUMMARY_PARAGRAPH_1}}

{{EXEC_SUMMARY_PARAGRAPH_2}}

{{EXEC_SUMMARY_PARAGRAPH_3}}

---

## Key Findings

> Auto-seeded top 5 from `generateKeyFindings(data)`. Edit + reorder
> for maximum quotability.

1. **{{FINDING_1_TITLE}}** — {{FINDING_1_BODY}}
2. **{{FINDING_2_TITLE}}** — {{FINDING_2_BODY}}
3. **{{FINDING_3_TITLE}}** — {{FINDING_3_BODY}}
4. **{{FINDING_4_TITLE}}** — {{FINDING_4_BODY}}
5. **{{FINDING_5_TITLE}}** — {{FINDING_5_BODY}}

---

## Part 1 — The Market

> *Narrative prompt: Who are these {{ATHLETES_TOTAL}} athletes? Where
> do they live? What sports? What academic tier do they carry into the
> platform? Compare against Opendorse's college cohort composition to
> set up the "HS is structurally different" thesis.*

**Headline figures:**
- Total HS scholar-athletes onboarded: **{{ATHLETES_TOTAL}}**
- Top state: **{{ATHLETES_TOP_STATE_CODE}}** with {{ATHLETES_TOP_STATE_COUNT}} signups
- Top sport: **{{ATHLETES_TOP_SPORT}}** with {{ATHLETES_TOP_SPORT_COUNT}} athletes
- Institution-verified GPA rate: **{{ATHLETES_INSTITUTION_VERIFIED_PCT}}**

### 1.1 Geographic distribution
*Insert CSV export of `athletes_by_state` here, or paste table from preview.*

### 1.2 Sport mix
*Insert CSV export of `athletes_by_sport` here.*

### 1.3 Verification tier distribution
*Insert CSV export of `athletes_by_tier` here.*

### 1.4 Graduation-year pipeline
*Insert CSV export of `athletes_by_grad_year` here.*

---

## Part 2 — The Pilot

> *Narrative prompt: Is it working? Compare deal volume, completion
> rate, deal size to Opendorse's college figures at equivalent stage.
> Highlight that HS deal sizes are an order of magnitude smaller — and
> that this is the point (local-business economy, not collective spend).*

**Headline figures:**
- Total deals: **{{DEALS_TOTAL}}**
- Completed deals: **{{DEALS_COMPLETED}}** ({{DEALS_COMPLETED_RATE}} completion rate)
- Total gross compensation: **{{DEALS_TOTAL_GROSS_USD}}**
- Average completion days: **{{DEALS_AVG_COMPLETION_DAYS}}**

### 2.1 Deal volume by state
*Insert CSV export of `deals_by_state`.*

### 2.2 Top 10 brands
*Insert CSV export of `deals_top_brands`.*

### 2.3 Top sports by deal volume
*Insert CSV export of `deals_top_sports`.*

### 2.4 Brand participation
- HS-enabled brands: **{{BRANDS_TOTAL}}**
- Leading vertical: **{{BRANDS_TOP_VERTICAL}}** ({{BRANDS_TOP_VERTICAL_COUNT}} brands)
- Average deal size: **{{BRANDS_AVG_DEAL_USD}}**

---

## Part 3 — Compliance

> *Narrative prompt: Frame compliance as an architectural advantage,
> not a burden. The HS NIL product literally cannot ship without
> parental consent, state disclosure, and parent-custodial payouts
> as first-class primitives. Contrast with Opendorse's HS blog post
> (April 2026 Wyoming County 17) which describes a 3-year enterprise
> district contract with no visible parent consent data model.*

**Headline figures:**
- Parental consents signed: **{{COMPLIANCE_CONSENTS_TOTAL}}**
- Disclosure success rate: **{{COMPLIANCE_DISCLOSURE_SUCCESS_RATE}}**
- Disclosures sent: **{{COMPLIANCE_DISCLOSURES_SENT}}** of {{COMPLIANCE_DISCLOSURES_ATTEMPTED}} attempted
- Disputes raised: **{{COMPLIANCE_DISPUTES_RAISED}}**

### 3.1 Disclosure performance by state
*Insert CSV export of `compliance_disclosures_by_state`.*

### 3.2 Dispute categories + resolutions
*Insert CSV exports of `compliance_disputes_by_category` and
`dispute_resolution_outcomes`.*

### 3.3 Parental consent by age bucket
*Insert CSV export of `compliance_consents_by_age`.*

### 3.4 Consent scope categories
*Insert CSV export of `compliance_consents_by_scope`.*

---

## Part 4 — Viral Growth

> *Narrative prompt: The parent-to-parent loop is the flywheel.
> Quantify it. Show referred-vs-organic conversion delta. Show
> share-triggered secondary signups. Claim the HS NIL category
> compounds through trust networks, not enterprise sales.*

**Headline figures:**
- Referrals attributed: **{{REFERRALS_ATTRIBUTED}}**
- Referral conversion rate (click → signup): **{{REFERRALS_CONVERSION_RATE}}**
- Referred vs organic consent conversion: **{{REFERRALS_REFERRED_CONSENT}}** vs **{{REFERRALS_ORGANIC_CONSENT}}**
- Share events: **{{SHARES_TOTAL}}**
- Avg shares per completed deal: **{{SHARES_AVG_PER_DEAL}}**
- Share-triggered secondary signups (24h window): **{{SHARES_TRIGGERED_SIGNUPS}}**

### 4.1 Referrer tier distribution
*Insert CSV export of `referrals_tier_distribution`.*

### 4.2 Share events by platform
*Insert CSV export of `shares_by_platform`.*

---

## Part 5 — The Bridge to College

> *Narrative prompt: GradeUp captures the athlete 18–24 months before
> matriculation with a verified academic record and verified deal
> history already in place. Frame this as the college NIL on-ramp.
> Institutional-GPA verification is the moat — colleges recruit
> students, not just athletes, and GradeUp's scholar-athlete
> positioning creates a defensible funnel upstream.*

**Headline figures:**
- Trajectory profiles created: **{{TRAJECTORY_PROFILES}}**
- Public trajectory URLs generated: **{{TRAJECTORY_PUBLIC_TOKENS}}**
- Public URL views: **{{TRAJECTORY_PUBLIC_VIEWS}}**
- Institution-verified GPA rate: **{{TRAJECTORY_INSTITUTION_VERIFIED_PCT}}**

### 5.1 Per-state activation
*Insert CSV export of `states_per_state`.*

---

## Methodology

> Auto-seeded by `generateMethodologyNote(data)`. Edit for tone + add
> any human-noted caveats not captured programmatically.

{{METHODOLOGY_TEXT}}

---

## About GradeUp

GradeUp is the first NIL platform built for high-school scholar-athletes
and their custodial parents. The model rewards verified academic
excellence alongside athletic performance. The product is architected
with parental consent, state-disclosure, and parent-custodial-payout as
first-class primitives — not bolted-on compliance.

- **Founded:** *(fill in)*
- **Headquarters:** *(fill in)*
- **Team size:** *(fill in)*
- **Funding:** *(fill in or omit for pre-seed)*
- **Contact:** press@gradeup.app *(or current press address)*
- **Product URL:** https://gradeup.app/hs

---

## Citations

Every number in this report is generated by
`src/lib/hs-nil/annual-report.ts::collectAnnualReportData` from the
GradeUp production Postgres schema. Each section's data source is
documented inline in that file:

| Section | Function | Source tables |
|---|---|---|
| Athletes | `collectAthleteFigures` | `hs_athlete_profiles`, `hs_athlete_gpa_snapshots` |
| Deals | `collectDealFigures` | `deals`, `brands`, `athletes` |
| Compliance | `collectComplianceFigures` | `hs_deal_disclosures`, `deal_disputes`, `parental_consents`, `hs_athlete_profiles` |
| Referrals | `collectReferralFigures` | `referral_attributions`, `referral_conversion_events`, `parental_consents`, `hs_athlete_profiles` |
| Shares | `collectShareFigures` | `deal_share_events`, `deals`, `referral_attributions` |
| Trajectory | `collectTrajectoryFigures` | `hs_athlete_trajectory_shares`, `hs_athlete_gpa_snapshots` |
| Brands | `collectBrandFigures` | `brands`, `deals` |
| States | `collectStateFigures` | `state_pilot_activations`, `hs_waitlist`, `hs_athlete_profiles`, `deals`, `case_studies` |

Published snapshots are immutable records stored in
`annual_report_snapshots` (migration
`supabase/migrations/20260420_004_annual_report_snapshots.sql`). The
partial unique index guarantees exactly one published row per
`report_year`.

---

## Appendix A — Pitch list (press + podcasts + conferences)

> **Use this list when the report drops.** Warm pitches > cold pitches.
> Tier 1 = flagship outlets; Tier 2 = vertical; Tier 3 = audience-
> specific. Owner column is the GradeUp team member running the pitch;
> status tracked in a Notion board separately.

### Tier 1 — Flagship business + sports-business press

1. **Sports Business Journal (SBJ)** — NIL beat. Cited Opendorse's NIL at 3 and 4. Target: a dedicated article on HS NIL with our state-by-state pilot numbers.
2. **Sportico** — Athletes + business coverage. Often runs companion pieces after Opendorse reports drop.
3. **Front Office Sports** — Newsletter + podcast reach. Younger audience; hungry for HS NIL stories that haven't been told.
4. **On3 NIL** — Dominant college NIL outlet. Establish the HS beat before they do.
5. **ESPN NIL** — Long tail. Pitch as a milestone: "First HS NIL annual report ever published."

### Tier 2 — Education + youth-athletics press

6. **Athletic Business** — Facilities + administration audience; district-level decision-makers.
7. **CoachAD** (Coach Athletic Director) — Athletic directors are the referral graph's upstream node. Report = leverage.
8. **USA Today Sports / High School Sports** — Parent-facing audience.
9. **MaxPreps** — Largest HS athletics audience in the US. Partnership angle > pitch angle.
10. **CalMatters** — California-specific education reporting; leads the state-press tier given our CA concentration. Opendorse cited for context in their CA NIL coverage.

### Tier 3 — Podcasts + newsletters + conferences

11. **The NIL Podcast** (On3) — Hosts frequently interview founders with data-backed narratives.
12. **The Business of NIL** (Opendorse's own podcast, arguably) — Pitch the first-HS-NIL-annual-report angle; they may cover it for completeness.
13. **Extra Points by Matt Brown** — Influential college-sports newsletter; HS NIL is his adjacent beat.
14. **NIL Summit** — Annual industry conference. Submit a speaker application for Year 2 with the report as proof-of-traction.
15. **The Athletic** — Sports long-form. Pitch as a feature on "the parents building a shadow NIL economy for minors."

### Pitch order
Run Tier 1 first (embargoed). Release to Tier 2 next day. Tier 3 gets
early access to podcast + newsletter versions 48h post-publication.

### Pitch materials needed
- 200-word press release (exec summary + top 3 findings)
- PDF of full report (final designed version)
- Plaintext version of quoted figures + their source fields (for
  fact-check)
- Founder headshot + company logo
- One narrative anecdote per state pilot (top 3 minimum) — case studies
  feed this
