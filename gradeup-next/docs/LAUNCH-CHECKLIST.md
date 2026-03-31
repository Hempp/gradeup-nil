# GradeUp NIL — Production Launch Checklist

## Prerequisites

### 1. Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run ALL migrations
supabase db push

# Verify tables exist
supabase db dump --schema public
```

### 2. Environment Variables
Copy `.env.local.example` to `.env.local` and configure:

```env
# CRITICAL — Required for app to function
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CRITICAL — Disable demo mode for production
NEXT_PUBLIC_DEMO_MODE=false

# PAYMENTS — Required for revenue
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# EMAIL — Required for transactional emails (pick one)
RESEND_API_KEY=re_...
# OR
SENDGRID_API_KEY=SG...
EMAIL_FROM_ADDRESS=hello@gradeupnil.com
EMAIL_FROM_NAME=GradeUp NIL

# PUSH NOTIFICATIONS — Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:hello@gradeupnil.com

# ERROR MONITORING
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# STATSTAQ — When API becomes available
# NEXT_PUBLIC_STATSTAQ_API_URL=https://api.statstaq.com/v1
# STATSTAQ_API_KEY=...
```

### 3. Stripe Webhook
```bash
# Create webhook endpoint in Stripe Dashboard
# URL: https://your-domain.com/api/webhooks/stripe
# Events: payment_intent.succeeded, payment_intent.failed,
#          account.updated, transfer.created
```

### 4. Domain & DNS
- [ ] Custom domain configured in Vercel
- [ ] SSL certificate active
- [ ] Update `metadataBase` in `src/app/layout.tsx` to production URL

---

## Launch Sequence

### Phase 1: Infrastructure (Day 1)
- [ ] Run Supabase migrations
- [ ] Configure all environment variables
- [ ] Deploy to Vercel with `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] Verify Stripe webhook receives test events
- [ ] Send test email via Resend/SendGrid
- [ ] Verify Sentry receives test error

### Phase 2: Seed Data (Day 1-2)
- [ ] Create admin account
- [ ] Create 3-5 test athlete accounts with real data
- [ ] Create 2-3 test brand accounts
- [ ] Create 1 athletic director account
- [ ] Upload sample avatars and documents
- [ ] Create 2-3 test deals to verify payment flow

### Phase 3: Smoke Test (Day 2)
- [ ] Sign up as new athlete → verify email → complete profile
- [ ] Sign up as new brand → browse athletes → send deal offer
- [ ] Accept deal as athlete → sign contract → verify payment
- [ ] Test password reset flow
- [ ] Test notification delivery (email + push)
- [ ] Test on mobile device (iPhone + Android)
- [ ] Test on tablet (iPad)
- [ ] Run E2E tests against production: `BASE_URL=https://your-domain.com npx playwright test`

### Phase 4: Go Live (Day 3)
- [ ] Remove any remaining test/demo data
- [ ] Enable Google Analytics in production
- [ ] Set up uptime monitoring (e.g., Vercel Analytics)
- [ ] Announce to first cohort of athletes
- [ ] Monitor Sentry for errors in first 24 hours

---

## Post-Launch Monitoring

### Daily (Week 1)
- [ ] Check Sentry for new errors
- [ ] Review Stripe dashboard for failed payments
- [ ] Check Supabase usage metrics
- [ ] Monitor Vercel deployment logs

### Weekly (Month 1)
- [ ] Review user signups and activation rate
- [ ] Check deal completion rate
- [ ] Review email delivery rates (Resend dashboard)
- [ ] Analyze page load performance (Vercel Analytics)

---

## StatsTaq Integration (When API Available)

1. Get API credentials from StatsTaq team
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_STATSTAQ_API_URL=https://api.statstaq.com/v1
   STATSTAQ_API_KEY=your-key
   ```
3. The integration layer is already built — it will automatically
   switch from mock data to real StatsTaq API data
4. Athletes can also self-report stats in the meantime
