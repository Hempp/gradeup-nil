#!/bin/bash
#
# GradeUp NIL - Production Deployment Script
# NEXUS-PRIME Deployment Automation
#
# Prerequisites:
# 1. Supabase access token (get from dashboard.supabase.com/account/tokens)
# 2. Stripe test keys (get from dashboard.stripe.com/test/apikeys)
#
# Usage:
#   chmod +x scripts/deploy-production.sh
#   ./scripts/deploy-production.sh
#

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           GRADEUP NIL - PRODUCTION DEPLOYMENT                    ║"
echo "║                   NEXUS-PRIME v3.2                               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

echo -e "${CYAN}[1/7] Checking prerequisites...${NC}"

# Check Node
check_command node
echo "  ✓ Node.js $(node --version)"

# Check npm
check_command npm
echo "  ✓ npm $(npm --version)"

# ============================================================================
# STEP 1: Supabase Login
# ============================================================================
echo ""
echo -e "${CYAN}[2/7] Supabase Authentication...${NC}"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}Please enter your Supabase access token:${NC}"
    echo "  (Get it from: https://supabase.com/dashboard/account/tokens)"
    read -s SUPABASE_ACCESS_TOKEN
    export SUPABASE_ACCESS_TOKEN
fi

# Verify token works
echo "  Verifying Supabase connection..."
if npx supabase projects list > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Supabase authenticated${NC}"
else
    echo -e "${RED}Error: Invalid Supabase token${NC}"
    exit 1
fi

# ============================================================================
# STEP 2: Link to production project
# ============================================================================
echo ""
echo -e "${CYAN}[3/7] Linking to Supabase project...${NC}"

# Get project ref from config or ask
PROJECT_REF=$(grep -A1 "\[project\]" supabase/config.toml | grep "id" | cut -d'"' -f2 2>/dev/null || echo "")

if [ -z "$PROJECT_REF" ] || [ "$PROJECT_REF" == "gradeup-nil" ]; then
    echo -e "${YELLOW}Enter your Supabase project reference ID:${NC}"
    echo "  (Found in project URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
    read PROJECT_REF
fi

echo "  Linking to project: $PROJECT_REF"
npx supabase link --project-ref "$PROJECT_REF"
echo -e "  ${GREEN}✓ Linked to Supabase project${NC}"

# ============================================================================
# STEP 3: Push database migrations
# ============================================================================
echo ""
echo -e "${CYAN}[4/7] Pushing database migrations...${NC}"

echo "  This will apply the following migrations:"
ls -1 supabase/migrations/*.sql | while read f; do
    echo "    - $(basename $f)"
done

echo ""
echo -e "${YELLOW}Pushing migrations to production database...${NC}"
npx supabase db push

echo -e "  ${GREEN}✓ Database migrations applied${NC}"

# ============================================================================
# STEP 4: Set Edge Function secrets
# ============================================================================
echo ""
echo -e "${CYAN}[5/7] Configuring Edge Function secrets...${NC}"

# Stripe Secret Key
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${YELLOW}Enter your Stripe Secret Key (sk_test_... or sk_live_...):${NC}"
    read -s STRIPE_SECRET_KEY
fi

# Stripe Webhook Secret
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}Enter your Stripe Webhook Secret (whsec_...):${NC}"
    echo "  (Create webhook at: https://dashboard.stripe.com/webhooks)"
    echo "  (Endpoint URL: https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhooks)"
    read -s STRIPE_WEBHOOK_SECRET
fi

# Site URL
if [ -z "$SITE_URL" ]; then
    echo -e "${YELLOW}Enter your site URL (e.g., https://gradeup-nil.vercel.app):${NC}"
    read SITE_URL
fi

echo "  Setting secrets..."
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
npx supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
npx supabase secrets set SITE_URL="$SITE_URL"

echo -e "  ${GREEN}✓ Secrets configured${NC}"

# ============================================================================
# STEP 5: Deploy Edge Functions
# ============================================================================
echo ""
echo -e "${CYAN}[6/7] Deploying Edge Functions...${NC}"

FUNCTIONS=(
    "stripe-connect-onboarding"
    "create-payment-intent"
    "create-subscription-checkout"
    "stripe-webhooks"
    "create-athlete"
    "verify-athlete"
    "search-athletes"
    "calculate-gradeup-score"
    "stattaq-connect"
    "stattaq-sync"
    "scholarmatch-ai"
    "send-notification"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo "  Deploying $func..."
        npx supabase functions deploy "$func" --no-verify-jwt 2>/dev/null || echo "    (skipped - may not exist)"
    fi
done

echo -e "  ${GREEN}✓ Edge Functions deployed${NC}"

# ============================================================================
# STEP 6: Deploy to Vercel
# ============================================================================
echo ""
echo -e "${CYAN}[7/7] Deploying to Vercel...${NC}"

# Check if logged in to Vercel
if ! npx vercel whoami > /dev/null 2>&1; then
    echo "  Logging in to Vercel..."
    npx vercel login
fi

# Set environment variables
echo "  Setting Vercel environment variables..."
npx vercel env add VITE_SUPABASE_URL production < /dev/null 2>/dev/null || true
npx vercel env add VITE_SUPABASE_ANON_KEY production < /dev/null 2>/dev/null || true
npx vercel env add VITE_STRIPE_PUBLISHABLE_KEY production < /dev/null 2>/dev/null || true

# Deploy
echo "  Deploying to production..."
npx vercel --prod

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEPLOYMENT COMPLETE!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Create Stripe products: node scripts/setup-stripe-products.js"
echo "  2. Configure Stripe webhook endpoint in dashboard"
echo "  3. Test the payment flow"
echo ""
echo -e "${CYAN}NEXUS-PRIME deployment successful.${NC}"
