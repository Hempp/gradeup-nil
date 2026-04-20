# HS-NIL Concierge Import Guide

One-page field reference for the concierge CSV. Use this with
`/docs/HS-NIL-CONCIERGE-IMPORT-TEMPLATE.csv`.

## Why this exists

The pilot's first cohort is 20 hand-sourced CA parents. Clicking through
the regular signup flow 40 times (athlete + parent) is untenable. This
tool is admin-only and requires that the founder has already vetted each
parent relationship out-of-band.

## CSV schema

All columns are required except `athlete_claimed_gpa`, `parent_phone`,
and `notes`. Column order does not matter; the parser keys on header
names (lower-case, exact match).

| Column | Type | Rules |
| --- | --- | --- |
| `athlete_first_name` | text | Required. |
| `athlete_last_name` | text | Required. |
| `athlete_email` | email | Required. Valid email. Must differ from parent email. |
| `athlete_dob` | date | Required. `YYYY-MM-DD`. Past, <100y old. |
| `athlete_sport` | enum | Required. One of: Football, Basketball, Baseball, Soccer, Track & Field, Swimming, Volleyball, Tennis, Golf, Wrestling, Softball, Lacrosse, Hockey, Other. |
| `athlete_school` | text | Required. Non-empty. |
| `athlete_grade_year` | int | Required. `9`..`12`. |
| `athlete_claimed_gpa` | decimal | Optional. `0.0`..`5.0`. |
| `parent_first_name` | text | Required. |
| `parent_last_name` | text | Required. |
| `parent_email` | email | Required. Valid email. |
| `parent_phone` | text | Optional. Free-form (E.164 recommended). |
| `parent_relationship` | enum | Required. `parent` or `legal_guardian`. |
| `consent_scope_categories` | enum list | Required. Comma-separated, one or more of: `apparel`, `food_beverage`, `local_business`, `training`, `autograph`, `social_media_promo`. Wrap the cell in double quotes if it contains a comma. |
| `consent_max_deal_cents` | int | Required. `≥ 1`. `100` = $1.00. |
| `consent_duration_months` | int | Required. `1`..`24`. |
| `notes` | text | Optional. Surfaces on the per-row detail view. |

## What the apply step does

For every valid row, clicking **Apply** performs:

1. `auth.users` create for athlete (role=`hs_athlete`).
2. `auth.users` create for parent (role=`hs_parent`).
3. `ensureAthleteRow` + `profiles` row for the athlete.
4. `hs_athlete_profiles` row with the state/school/sport/gpa data.
5. `hs_parent_profiles` row with relationship + phone.
6. `hs_parent_athlete_links` row, verified + `verification_method='manual_support'`.
7. `parental_consents` row with `signature_method='notarized_upload'` and `identity_verified=true`. The scope's `deal_categories` matches `consent_scope_categories`.
8. Stamps the CSV row with every created ID and `applied_at=now()`.
9. Fires a password-reset email to both users. Users set their own
   password from the email link — they never see a temporary password.

## Per-row atomicity (important)

If row 5 fails, rows 1-4 still land and rows 6-20 still proceed. The
failure is stored as `apply_error` on the row. **Re-clicking Apply**
retries only failed rows — already-successful rows are skipped. This
is safe to run multiple times.

## Pilot state gate

An upload is rejected at the API layer if `pilot_state_code` is not in
the current pilot set (CA, FL, GA, IL, NJ, NY, TX). The same code is
applied to every row in the batch — do not mix states in one CSV.

## Common validation errors to avoid

- `athlete_dob` not in `YYYY-MM-DD` (`3/14/2009` fails; `2009-03-14` works).
- `athlete_sport` spelling/casing drift (`basketball` fails; `Basketball` works).
- `athlete_grade_year` out of range (must be 9, 10, 11, or 12).
- `consent_scope_categories` containing a category outside the enum
  (e.g. `alcohol` — banned everywhere) or missing the comma between
  items when the cell wasn't quoted.
- `athlete_email` identical to `parent_email`.
- `consent_max_deal_cents` given in dollars (use cents — `100` = $1.00).

## Cancellation

Cancelling a batch marks it `cancelled` but does **not** roll back any
rows already applied. Use it to stop a batch that has partial failures
from showing as actionable on the admin dashboard.
