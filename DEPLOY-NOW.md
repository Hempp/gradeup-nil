# GradeUp NIL - Deploy to Production NOW

Run these commands in your terminal one by one.

---

## STEP 1: Set Supabase Token

Get your token from: https://supabase.com/dashboard/account/tokens

```bash
cd /Users/seg/gradeup-nil
export SUPABASE_ACCESS_TOKEN=sbp_YOUR_TOKEN_HERE
```

Verify it works:
```bash
npx supabase projects list
```

---

## STEP 2: Link to Your Supabase Project

Get your project ref from the URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

---

## STEP 3: Push Database Migrations

```bash
npx supabase db push
```

This will apply all migrations including the payment system (007_payments_subscriptions.sql).

---

## STEP 4: Set Stripe Secrets

Get your Stripe keys from: https://dashboard.stripe.com/test/apikeys

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
npx supabase secrets set SITE_URL=https://gradeup-nil.vercel.app
```

---

## STEP 5: Deploy Edge Functions

```bash
npx supabase functions deploy stripe-connect-onboarding --no-verify-jwt
npx supabase functions deploy create-payment-intent --no-verify-jwt
npx supabase functions deploy create-subscription-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhooks --no-verify-jwt
```

---

## STEP 6: Create Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhooks`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
   - `payout.paid`
   - `payout.failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and update:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET
   ```

---

## STEP 7: Create Stripe Products

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY node scripts/setup-stripe-products.js
```

Then run the SQL output to update your database.

---

## STEP 8: Deploy to Vercel

```bash
npx vercel login
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `VITE_STRIPE_PUBLISHABLE_KEY` = pk_test_xxx

---

## DONE! 🎉

Your GradeUp NIL platform is now live with:
- ✅ Payment processing (Stripe Connect)
- ✅ Athlete payouts
- ✅ Brand subscriptions
- ✅ 12% platform fee collection

Test the flow:
1. Create an athlete account → Set up payouts
2. Create a brand account → Subscribe
3. Create a deal → Process payment
4. Verify athlete receives funds (minus 12%)

---

*NEXUS-PRIME Deployment Complete*
