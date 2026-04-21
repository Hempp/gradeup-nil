# HS-NIL Concierge Ops Tracker Template

You will live in this sheet for 30 days. It is the source of truth for parents, brands, and deals during the concierge phase — everything else is downstream of it. Copy this file into Google Sheets as three tabs and wire up the formulas at the bottom. Do not let the platform's database be your operational memory during concierge; the sheet moves faster than any dashboard you could build.

## Sheet setup

- **Three tabs.** Parents, Brands, Deals.
- **Access.** Read-write restricted to you and your ops co-founder. No athlete or parent has view access. Sharing with counsel is fine.
- **Location.** Shared Drive location TBD — create a "GradeUp Concierge" folder on Drive before day one.
- **Backup.** Export each tab to CSV every Friday and drop the files in `~/gradeup-concierge/`. Timestamp the filenames (`parents-2026-04-17.csv`). This is your audit trail if the sheet is ever corrupted or share-toggled.
- **Naming.** One sheet, not three separate files. Cross-tab formulas break when you split them.

## Parents tab — column schema

Each row is one parent-athlete pair. A parent with two athletes gets two rows.

| # | Column | Type | Populated when |
|---|---|---|---|
| A | parent_id | number, 1-indexed | First contact |
| B | first_name | text | Intake |
| C | last_initial | text | Intake |
| D | parent_email | text | Intake |
| E | parent_phone | text | Intake |
| F | source | enum: AD / club / newsletter / referral / other | First contact |
| G | athlete_first_name | text | Intake |
| H | athlete_school | text | Intake |
| I | athlete_sport | text | Intake |
| J | athlete_graduation | year (YYYY) | Intake |
| K | athlete_gpa_self_reported | number | Intake |
| L | intake_call_date | date | After intake call |
| M | green_flag_count | 0–3 | After intake call |
| N | signup_platform_date | date | After platform signup |
| O | consent_signed_date | date | After consent signing |
| P | first_brand_intro_date | date | After matching |
| Q | first_deal_signed_date | date | After signed |
| R | first_share_observed_date | date | After organic share |
| S | referral_generated_count | number | Rolling |
| T | post_deal_nps | 0–100 | Deal complete + 7 days |
| U | status | enum: prospect / intake / consented / matched / signed / paid / completed / exited | Updated per event |
| V | notes | text | Rolling |

### CSV template for Parents

Paste this into the first row of the Parents tab.

```
parent_id,first_name,last_initial,parent_email,parent_phone,source,athlete_first_name,athlete_school,athlete_sport,athlete_graduation,athlete_gpa_self_reported,intake_call_date,green_flag_count,signup_platform_date,consent_signed_date,first_brand_intro_date,first_deal_signed_date,first_share_observed_date,referral_generated_count,post_deal_nps,status,notes
1,,,,,,,,,,,,,,,,,,0,,prospect,
```

## Brands tab — column schema

Each row is one brand contact. Multi-brand conglomerates get one row per deciding contact.

| # | Column | Type |
|---|---|---|
| A | brand_id | number, 1-indexed |
| B | company_name | text |
| C | contact_name | text |
| D | contact_email | text |
| E | vertical | text (e.g., QSR, apparel, tutoring) |
| F | city | text |
| G | outreach_date | date |
| H | response_date | date |
| I | status | enum: cold / replied / call_scheduled / msa_signed / first_deal / paused / declined |
| J | first_deal_date | date |
| K | deal_count | number |
| L | budget_committed_cents | number (cents, integer — match the platform schema) |
| M | notes | text |

### CSV template for Brands

```
brand_id,company_name,contact_name,contact_email,vertical,city,outreach_date,response_date,status,first_deal_date,deal_count,budget_committed_cents,notes
1,,,,,,,,cold,,0,0,
```

## Deals tab — column schema

Each row is one signed or in-flight deal. Not one per offer — an offer that never accepts does not get a row, it gets a note on the parent or brand row.

| # | Column | Type |
|---|---|---|
| A | deal_id | number, 1-indexed |
| B | athlete_parent_id | FK to Parents (use VLOOKUP) |
| C | brand_id | FK to Brands (use VLOOKUP) |
| D | offer_date | date |
| E | compensation_cents | number (cents, integer) |
| F | deliverable_type | enum: instagram_post / tiktok_post / appearance / multi_post / other |
| G | state_code | text (2-letter, e.g., CA) |
| H | consent_id_platform | text (UUID from the platform's parental_consents table) |
| I | contract_signed_date | date |
| J | content_submitted_date | date |
| K | content_approved_date | date |
| L | paid_date | date |
| M | shared_platforms | text (comma-separated: instagram,tiktok,x,linkedin) |
| N | share_observed_urls | text (newline-separated URLs) |
| O | complete_date | date |
| P | status | enum: offered / accepted / signed / delivered / approved / paid / completed / disputed / cancelled |

### CSV template for Deals

```
deal_id,athlete_parent_id,brand_id,offer_date,compensation_cents,deliverable_type,state_code,consent_id_platform,contract_signed_date,content_submitted_date,content_approved_date,paid_date,shared_platforms,share_observed_urls,complete_date,status
1,,,,,,CA,,,,,,,,,offered
```

## Daily ritual — 15 minutes each morning

You run this before anything else. Coffee first, then the sheet.

1. Open the sheet.
2. Scan every parent row whose status changed yesterday. Confirm the date fields got updated. Consent signed? Content posted? Payout cleared?
3. Check the share-observation signal: Google Alerts on the parent's athlete first name + school, plus a manual Instagram handle sweep if the athlete has given you their handle. Record any new organic share URLs in the Deals tab.
4. Update the sheet with everything you touched. A field changed without a date is a lie.
5. Pull one to three specific actions into Linear or Notion for today. Do not let the sheet be your to-do list — it is your ledger.

## Weekly review — Friday, 60 minutes

Block the calendar. Do not skip it even on quiet weeks.

1. Count the week: deals signed, shares observed, referrals generated, consents signed. Write the numbers at the top of a notes cell — you will want them for the retro.
2. Fill in the Day 7, 14, 21, or 30 checkpoint of the retro template, whichever you are on this week.
3. Name one friction point you hit this week. One. Pick the highest-cost one. Put the fix into next week's plan.
4. If this is Day 30: complete `docs/HS-NIL-POST-CONCIERGE-RETRO-TEMPLATE.md` end-to-end and use it to decide whether to run a second concierge cohort or flip to self-serve.

## Green-flag dashboard formulas

Drop these in a Dashboard tab or at the top of the Parents tab. They power the Friday review.

- Consented parents: `=COUNTIFS(Parents!U:U, "consented")`
- Deals past signed (signed + paid + completed): `=COUNTIF(Deals!P:P, "signed") + COUNTIF(Deals!P:P, "paid") + COUNTIF(Deals!P:P, "completed")`
- Shares observed: `=COUNTA(Parents!R:R) - 1` (subtract the header row)
- Parents generating at least one referral: `=COUNTIF(Parents!S:S, ">0")`
- Rolling NPS: `=AVERAGE(Parents!T:T)`
- Total committed brand budget (USD): `=SUM(Brands!L:L) / 100`
- Deal close rate: `=COUNTIF(Deals!P:P, "completed") / COUNTA(Parents!P:P)`

If any formula returns `#N/A` or an empty count, check that your enum values in the data cells match the formulas exactly — `Consented` and `consented` do not match.

## Color coding

One conditional-formatting rule per status color. Applied across every tab's status column and any date column that encodes urgency.

- **Green.** On-track or complete. Consent signed within 48 hours of intake; deal delivered on time; brand paid within 7 days.
- **Yellow.** Pending and needs founder action in the next 48 hours. Intake scheduled but no call yet; content submitted but not approved; share expected but not observed.
- **Red.** Blocked, overdue, or a risk signal. Consent stalled past 5 days; deal flagged for dispute; parent stopped responding; brand missed payout.
- **Gray.** Archived — parent exited the cohort, brand declined permanently, deal cancelled. Gray rows stay in the sheet for the audit trail; they do not count in formulas unless you want them to.

Set up each rule once at the sheet level, not per-cell, so adding rows does not break the formatting.
