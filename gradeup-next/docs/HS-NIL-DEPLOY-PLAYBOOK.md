# HS-NIL Preview-Deploy Playbook

**Purpose:** Flip `FEATURE_HS_NIL` in a Vercel preview environment without breaking production, validate the Phase 1 surface end-to-end, then (when it holds up) flip the same switch in production.

**Audience:** You (co-founder on the deploy) + anyone pairing on the launch.

**Status check before you start:** Phase 0 + Phase 1 code is landed as of April 18, 2026. Runtime enablement is still blocked by three things: env vars, migrations, and the flag itself. This playbook walks them in order.

---

## 1. Pre-flight Checklist

Verify each of these before doing anything:

- [ ] You are on branch `main` at HEAD. `git log --oneline -15` should show commits from `chore(auth): remove Google/Apple social login` through `feat(hs-nil): wire Resend`.
- [ ] `npx tsc --noEmit` exits 0. (It does — each commit enforced this — but re-verify after any rebase.)
- [ ] `npx jest --silent` passes. At minimum `src/__tests__/integration/auth-flow.test.tsx` should be 30/30 green.
- [ ] Vercel CLI is authenticated (`vercel whoami`) and you can see the GradeUp project (`vercel ls`).
- [ ] Supabase CLI is authenticated (`supabase projects list` shows the project) and the correct project is linked in `supabase/`.

If any of these fail, stop. Fix before proceeding.

---

## 2. Environment Variables

These must exist in the target Vercel environment (preview OR production). Set them via `vercel env add <NAME> <environment>` or the Vercel dashboard.

### Required for HS-NIL to function

| Variable | Value | Notes |
|----------|-------|-------|
| `FEATURE_HS_NIL` | `true` | The flag itself. `false` or missing = everything HS 404s. |
| `RESEND_API_KEY` | Resend dashboard key | Missing = emails warn-and-skip, not crash. |
| `EMAIL_FROM_ADDRESS` | `hs@gradeupnil.com` | Domain must be verified in Resend. |
| `EMAIL_FROM_NAME` | `GradeUp HS` | Display name on outgoing mail. |
| `EMAIL_SUPPORT_ADDRESS` | `support@gradeupnil.com` | `replyTo` for all HS mail. |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://preview-hs.gradeupnil.com` | Used to build signing + referral URLs. Must be HTTPS. |

### Already required (must also be present)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | pending_consents writes bypass RLS; service role required. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting. Falls back to in-memory if missing, but in-memory is per-instance = weak protection in multi-instance deploys. |

**Preview deploy recommendation:** set `FEATURE_HS_NIL=true` ONLY in the preview environment. Leave production flag at `false` (or unset) until smoke tests pass.

```bash
# Preview only
vercel env add FEATURE_HS_NIL preview
# Value: true
```

---

## 3. Apply Migrations

**Order matters.** Four migrations land in this window; apply them in timestamp order against Supabase.

```
20260418_001_conversations_rls_fix.sql     # security P0 — closes conversations_insert hole
20260418_002_hs_nil_foundations.sql        # 4 HS tables + state_nil_rules seed (9 states)
20260418_003_hs_waitlist.sql               # hs_waitlist table
20260418_004_pending_consents.sql          # pending_consents + RLS
```

### Apply

```bash
cd /path/to/gradeup-nil/gradeup-next
supabase link --project-ref <your-preview-ref>   # or prod ref, depending on target
supabase db push
```

### Verify

After push, run a smoke-check query:

```sql
select table_name from information_schema.tables where table_schema='public' and table_name in ('state_nil_rules','hs_athlete_profiles','parental_consents','hs_deal_disclosures','hs_waitlist','pending_consents');
-- Expect: 6 rows

select count(*) from state_nil_rules;
-- Expect: 9 (CA, FL, GA, TX, AL, HI, IN, MI, WY)

select policyname from pg_policies where tablename='conversations';
-- Expect: new conversations_insert_party_or_adhoc policy present, old permissive policy gone.
```

---

## 4. Deploy to Preview

```bash
git push origin main          # if not already on remote
vercel --prod=false            # deploy to preview; returns a URL
```

Note the preview URL — everything below runs against it.

---

## 5. Smoke-Test Checklist

Run through in this order. Each item is ~30 seconds.

### 5.1 Flag-off non-regression (DO THIS FIRST)

On a branch where `FEATURE_HS_NIL=false`:

- [ ] `/` marketing landing loads. No HS banner visible. Subhead "8th grade through senior year" is still present (that's static copy, not gated).
- [ ] `/signup` shows the classic athlete/brand/director role picker. No HS vs College bracket choice.
- [ ] `/hs` returns 404.
- [ ] `/api/hs/waitlist` POST returns 404.
- [ ] Existing college flows unchanged: `/login`, `/discover`, athlete dashboard.

If any of these fail when the flag is off, STOP. Do not proceed to flag-on testing.

### 5.2 Flag-on, unauthenticated surfaces

Flip `FEATURE_HS_NIL=true` in the preview env, redeploy or wait for env propagation.

- [ ] `/` marketing landing shows the HS announcement banner at the top.
- [ ] Banner dismissal persists across reloads (check localStorage key `gradeup.hs-banner.dismissed.v1`).
- [ ] `/hs` landing renders with "Phase 0 — Waitlist" badge and 3 feature cards.
- [ ] Waitlist form renders below the feature cards. Input fields are 44px tall (touch-target compliance).
- [ ] Submit form with a valid CA email + athlete role + grad year 2028. Expect navigation to `/hs/thanks?position=N`.
- [ ] Check Supabase `hs_waitlist` — row exists.
- [ ] Check Resend dashboard — confirmation email sent. (If `RESEND_API_KEY` is unset in preview, check server logs for the warn+skip message.)
- [ ] Submit same email+role again — expect success with `alreadyOnList=true`, NO duplicate email sent.
- [ ] Submit with `state_code=AL` (prohibited) — expect rejection.
- [ ] Submit 31 times within a minute (same IP) — expect HTTP 429 on the 31st. Rate limiter working.

### 5.3 Flag-on, signup branch

- [ ] `/signup` shows the HS-vs-College bracket picker.
- [ ] Select "College" → classic role picker appears, URL becomes `/signup?bracket=college`.
- [ ] Select "High School" → routes to `/hs/signup`.
- [ ] `/hs/signup` shows 5 role cards. Back-link returns to `/signup?bracket=college`.
- [ ] `/hs/signup/athlete` form: enter DOB making age 12 → blocked. Age 16 → allowed, flag set in auth metadata.
- [ ] Complete signup → user created, `hs_athlete_profiles` row inserted, redirect to `/hs/onboarding/next-steps` (that page 404s — it's a TODO).

### 5.4 Flag-on, consent flow

This requires an authenticated HS athlete. Use the account created in 5.3 or seed one manually.

- [ ] Call `POST /api/hs/consent/initiate` with `{ parentEmail, parentFullName, scope }`. Expect `{ ok: true }` — **no token returned to athlete** (self-signing prevention).
- [ ] Check `pending_consents` — row exists with a hex token.
- [ ] Check Resend — parent signing email sent.
- [ ] Click the signing URL (or construct it manually: `/hs/consent/<token>`). Page loads, shows scope + athlete name.
- [ ] Fill out ConsentSignForm, submit. Expect success page.
- [ ] Check `parental_consents` — signed row exists with `identity_verified=true` (dev stub).
- [ ] Check `pending_consents` — the row has `consumed_at` set.
- [ ] Check Resend — athlete-notification email sent.

### 5.5 Production regression guard

Before flipping the production flag:

- [ ] CSP: load `/` on prod preview, open devtools. No CSP violations. No `unsafe-inline` in the script-src header (should be `'self' 'nonce-...' 'strict-dynamic' ...`).
- [ ] Existing college signup/login still works end-to-end (create a test college athlete, browse discover, verify GPA badge renders).
- [ ] `/api/deals` POST rate-limits at 30/min per user.
- [ ] Browser Lighthouse on `/hs` landing — score should be >85 accessibility (test the real a11y, not the cached report).

---

## 6. Flipping Production

Only after 5.1 through 5.5 pass clean:

```bash
vercel env add FEATURE_HS_NIL production
# Value: true
vercel --prod
```

Apply the same 4 migrations to the production Supabase project (if not already):

```bash
supabase link --project-ref <prod-ref>
supabase db push
```

Monitor for 30 minutes post-flip:

- Sentry for new errors (especially in `/api/hs/*` routes)
- Supabase logs for RLS policy denials (expected: a few from the new conversations policy during rollout; unexpected: anything on `hs_*` tables unless people are actively signing up)
- Resend dashboard for bounce rates
- Vercel analytics for `/hs` traffic

---

## 7. Rollback Plan

If anything is wrong post-flip:

### Option A: flag flip only (preferred, fast)

```bash
vercel env rm FEATURE_HS_NIL production
# or set to false
vercel --prod
```

Time to rollback: <2 minutes. All HS surfaces 404 again. Data in `hs_*` tables persists (harmless — nothing reads it when flag is off).

### Option B: full revert

If a migration corrupted existing tables (shouldn't — migrations are additive — but defense-in-depth):

```bash
git revert <commit-sha-range>
git push origin main
vercel --prod
```

Note: migrations are not auto-reverted by Vercel. If a migration needs reverting, write a manual rollback SQL file and apply it via `supabase db push` after the revert.

---

## 8. First 30 Days Signals to Watch

Past "does it work," watch these to know if the bet is landing:

- **Waitlist signup rate** — goal: 100+ signups in the first 2 weeks with no paid promotion. Organic = thesis is landing.
- **Parent-to-athlete ratio** — goal: parents should be ≥40% of signups. Parents signing up on their own means the "scholarship-story" narrative is working.
- **State breakdown** — CA should dominate, FL and GA together ~20%. "My state isn't listed" volume tells you the next expansion order.
- **Consent email open rate** — target 60%+. Parents ignoring consent emails = onboarding drag that kills Phase 2.
- **Concierge MVP deal completion rate** — of the 20 CA parents you broker for manually, how many complete a deal? Target 10+. Below 5 = product-market-fit question.

---

## 9. Known Phase 1 Gaps (Not Blockers for Preview)

These are deliberate deferrals, not bugs:

- `hs_parent_profiles` table doesn't exist — parent signup writes only auth metadata. Next migration.
- `/hs/onboarding/next-steps` and `/hs/onboarding/parent-next` routes don't exist — signup redirects 404. Acceptable for preview; design the onboarding in Phase 2.
- Notarized-upload and video-attestation signature methods on ConsentSignForm are disabled ("coming soon"). E-signature only for Phase 1.
- No athlete-side UI to trigger consent initiate. Must be done via direct API POST for now (use Postman or curl). Phase 2 adds the athlete dashboard flow.
- No consent-revocation endpoint. Parents can't withdraw consent via the product today; they have to email support.
- No compliance-disclosure pipeline. State-mandated post-signature disclosures aren't auto-emitted — Phase 2 work.
- No Tier B (user-submitted transcript) verification. All GPAs are "self-reported" until Phase 2.

---

## 10. Things That Should NOT Be Done in This Window

- Do NOT promote `/hs` publicly until Phase 2 onboarding exists. Users who signup now land on a TODO page after submit.
- Do NOT run the concierge MVP (20 CA parents) until the consent flow is manually walked end-to-end at least 3 times by you.
- Do NOT migrate the remaining `--marketing-gray-*` tokens in this deploy window. Visual regression risk is higher than the benefit.
- Do NOT push the `FEATURE_HS_NIL=true` commit to main with the flag hardcoded. The flag MUST come from env.
