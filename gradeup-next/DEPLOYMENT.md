# GradeUp NIL Deployment Guide

This guide covers deploying the GradeUp NIL platform to production, including all required services, environment configuration, and post-deployment verification.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment Methods](#deployment-methods)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Node.js 20+ | Runtime environment | [nodejs.org](https://nodejs.org/) |
| Vercel account | Hosting & deployment | [vercel.com](https://vercel.com/) |
| Supabase project | Database, auth, storage | [supabase.com](https://supabase.com/) |

### Optional Services (Enable Features)

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Stripe account | Payment processing | [stripe.com](https://stripe.com/) |
| Resend account | Transactional emails | [resend.com](https://resend.com/) |
| Sentry account | Error monitoring | [sentry.io](https://sentry.io/) |
| Google Analytics | Usage analytics | [analytics.google.com](https://analytics.google.com/) |

### Local Development Requirements

```bash
# Verify Node.js version (20+ required)
node --version

# Verify npm version (10+ recommended)
npm --version

# Install dependencies
npm install
```

---

## Environment Variables

Create a `.env.local` file in the project root. Copy from `.env.local.example` and configure:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Settings > API |

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Production Mode

```bash
# IMPORTANT: Set these for production
SKIP_AUTH_CHECK=false
NEXT_PUBLIC_DEMO_MODE=false
```

### Supabase Admin (Server-side Operations)

```bash
# Only needed for admin functionality - keep secret!
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Payment Processing (Stripe)

```bash
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx

# Get from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

### Email Notifications (Resend)

```bash
# Get API key from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=GradeUp NIL <noreply@gradeupnil.com>
```

### Push Notifications (Web Push)

```bash
# Generate VAPID keys with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:support@gradeupnil.com
```

### Error Monitoring (Sentry)

```bash
# Get DSN from: https://sentry.io/settings/[org]/projects/[project]/keys/
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_DSN=https://your-key@sentry.io/your-project-id

# For source map uploads (optional, for better stack traces)
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Analytics (Google Analytics)

```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Application Settings

```bash
# Override the default site URL (useful for preview deployments)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# App version for release tracking
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## Database Setup

### Supabase Project Setup

1. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Navigate to SQL Editor** in your Supabase dashboard

3. **Run migrations in order**. Execute each file from `/supabase/migrations/`:

   | Order | Migration File | Description |
   |-------|----------------|-------------|
   | 1 | `001_initial_schema.sql` | Core tables, enums, RLS policies |
   | 2 | `002_seed_data.sql` | Initial seed data (schools, sports, etc.) |
   | 3 | `003_highlight_urls.sql` | Highlight video URL fields |
   | 4 | `004_notifications_enhancements.sql` | Notification system enhancements |
   | 5 | `004_testimonials.sql` | Testimonials table |
   | 6 | `005_deliverables_table.sql` | Deal deliverables tracking |
   | 7 | `006_push_subscriptions.sql` | Web push notification subscriptions |

4. **Verify extensions are enabled**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

### Enable Realtime (Optional)

For real-time messaging features, enable Realtime for these tables in Supabase Dashboard > Database > Replication:

- `messages`
- `notifications`
- `deals`

---

## Deployment Methods

### Method 1: Vercel (Recommended)

#### Via Vercel Dashboard

1. **Import your repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Connect your GitHub account
   - Import the `gradeup-nil` repository

2. **Configure build settings**
   - Framework Preset: Next.js
   - Root Directory: `gradeup-next`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set environment variables**
   - Go to Project Settings > Environment Variables
   - Add all required variables from [Environment Variables](#environment-variables)
   - Set variables for Production, Preview, and Development as needed

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy

#### Via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Method 2: Manual Deployment

For self-hosted or custom infrastructure:

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

#### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "gradeup-nil" -- start

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

#### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t gradeup-nil .
docker run -p 3000:3000 --env-file .env.local gradeup-nil
```

---

## Post-Deployment Checklist

### Critical Configuration

- [ ] Set `NEXT_PUBLIC_DEMO_MODE=false` in production
- [ ] Set `SKIP_AUTH_CHECK=false` in production
- [ ] Verify all database migrations have been run
- [ ] Verify Supabase connection is working

### Authentication

- [ ] Test user registration flow (athlete, brand, director)
- [ ] Test login/logout functionality
- [ ] Test password reset flow
- [ ] Verify role-based access control

### Integrations

- [ ] Configure Stripe webhooks to point to production URL
  - Endpoint: `https://your-domain.com/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.failed`
- [ ] Test email sending via Resend
- [ ] Verify Sentry is receiving error reports
- [ ] Test push notification subscription

### Security

- [ ] Verify HTTPS is enforced
- [ ] Check security headers are present (see `next.config.ts`)
- [ ] Verify RLS policies are active in Supabase
- [ ] Ensure service role key is not exposed client-side

### Performance

- [ ] Run Lighthouse audit (target: 90+ performance score)
- [ ] Verify image optimization is working
- [ ] Check CDN caching is configured

---

## Monitoring and Maintenance

### Error Monitoring (Sentry)

Once Sentry is configured, errors are automatically captured. Access the dashboard at:
- [sentry.io](https://sentry.io/) > Your Project

Configure alerts for:
- High error rate
- New issue types
- Performance degradation

### Health Checks

Monitor these endpoints:
- `GET /` - Main application
- `GET /api/health` - API health (if implemented)

### Log Monitoring

Vercel provides built-in logs:
- Runtime logs: Vercel Dashboard > Project > Logs
- Build logs: Vercel Dashboard > Project > Deployments

### Database Monitoring

Monitor Supabase dashboard for:
- Database size and growth
- Query performance
- Auth metrics
- Storage usage

### Backup Strategy

1. **Database backups**: Supabase provides automatic daily backups on Pro plan
2. **Manual backups**: Export data via Supabase Dashboard > Database > Backups
3. **Code backups**: Ensure all code is committed to Git

---

## Troubleshooting

### Common Issues

#### Build Fails with TypeScript Errors

```bash
# Run type checking locally to identify issues
npm run type-check

# Fix lint errors
npm run lint:fix
```

#### Supabase Connection Issues

1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check the anon key matches your project
3. Ensure RLS policies allow the operation
4. Check Supabase service status at [status.supabase.com](https://status.supabase.com)

#### Environment Variables Not Loading

- Vercel: Variables must be added to the Vercel dashboard, not just `.env.local`
- Ensure variables starting with `NEXT_PUBLIC_` are used for client-side code
- Redeploy after adding new environment variables

#### Stripe Webhooks Not Working

1. Verify webhook endpoint URL is correct
2. Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Ensure Stripe webhook is active (not disabled)
4. Check Vercel logs for webhook errors

#### 500 Errors in Production

1. Check Sentry for detailed error information
2. Review Vercel function logs
3. Verify all environment variables are set
4. Check Supabase service status

### Rollback Procedure

#### Vercel

```bash
# List deployments
vercel ls

# Promote a previous deployment to production
vercel promote [deployment-url]
```

Or via dashboard:
1. Go to Vercel Dashboard > Project > Deployments
2. Find the last working deployment
3. Click "..." > "Promote to Production"

### Support Resources

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint             # Run linter
npm run type-check       # Check TypeScript

# Testing
npm test                 # Run unit tests
npm run test:e2e         # Run E2E tests
npm run validate         # Run all checks

# Production
npm run build            # Build for production
npm start                # Start production server

# Deployment
vercel                   # Deploy preview
vercel --prod            # Deploy production

# VAPID Keys (for push notifications)
npx web-push generate-vapid-keys
```

---

*Last updated: February 2025*
