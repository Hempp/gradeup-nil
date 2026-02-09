/**
 * GradeUp NIL Platform - Payments Service
 * Stripe Connect integration for marketplace payments
 *
 * Revenue Model:
 * - 12% platform fee on all transactions
 * - Brand subscriptions: $99-$999/month
 *
 * @module services/payments
 * @nexus CIPHER + SUPA-MASTER deployment
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';
import { getMyAthleteId, getMyBrandId } from './helpers.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  REQUIRES_ACTION: 'requires_action',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise',
};

export const PLATFORM_FEE_PERCENT = 12.0;

// ============================================================================
// STRIPE CONNECTED ACCOUNTS (Athletes)
// ============================================================================

/**
 * Check if athlete has a connected Stripe account
 * @returns {Promise<{hasAccount: boolean, account: object | null, error: Error | null}>}
 */
export async function getConnectedAccount() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { hasAccount: false, account: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('stripe_connected_accounts')
    .select('*')
    .eq('athlete_id', athleteId)
    .single();

  return {
    hasAccount: !!data,
    account: data,
    error: data ? null : error,
  };
}

/**
 * Create Stripe Connect onboarding link for athlete
 * @param {string} returnUrl - URL to redirect after onboarding
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function createConnectOnboardingLink(returnUrl) {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { url: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
    body: { return_url: returnUrl },
  });

  if (error) {
    return { url: null, error };
  }

  return { url: data.url, error: null };
}

/**
 * Get Stripe Connect dashboard link for athlete
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function getConnectDashboardLink() {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { url: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('stripe-connect-dashboard', {
    body: {},
  });

  if (error) {
    return { url: null, error };
  }

  return { url: data.url, error: null };
}

/**
 * Get athlete's available and pending balance
 * @returns {Promise<{balance: object | null, error: Error | null}>}
 */
export async function getAthleteBalance() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { balance: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('stripe_connected_accounts')
    .select('available_balance, pending_balance, payouts_enabled')
    .eq('athlete_id', athleteId)
    .single();

  if (error) {
    return { balance: null, error };
  }

  return {
    balance: {
      available: data.available_balance,
      pending: data.pending_balance,
      payoutsEnabled: data.payouts_enabled,
    },
    error: null,
  };
}

// ============================================================================
// PAYMENTS (Brands paying for deals)
// ============================================================================

/**
 * Create payment intent for a deal
 * @param {string} dealId - Deal to pay for
 * @returns {Promise<{clientSecret: string | null, paymentId: string | null, error: Error | null}>}
 */
export async function createPaymentIntent(dealId) {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { clientSecret: null, paymentId: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { deal_id: dealId },
  });

  if (error) {
    return { clientSecret: null, paymentId: null, error };
  }

  return {
    clientSecret: data.client_secret,
    paymentId: data.payment_id,
    error: null,
  };
}

/**
 * Get payment status for a deal
 * @param {string} dealId - Deal ID
 * @returns {Promise<{payment: object | null, error: Error | null}>}
 */
export async function getPaymentForDeal(dealId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return { payment: data, error };
}

/**
 * Get all payments made by brand
 * @param {object} filters - Filter options
 * @returns {Promise<{payments: object[] | null, error: Error | null}>}
 */
export async function getBrandPayments(filters = {}) {
  const supabase = await getSupabaseClient();
  const brandId = await getMyBrandId();

  if (!brandId) {
    return { payments: null, error: new Error('Brand profile not found') };
  }

  let query = supabase
    .from('payments')
    .select(`
      *,
      deal:deals(id, title, deal_type),
      athlete:athletes(id, profile_id, profiles:profile_id(first_name, last_name, avatar_url))
    `)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  return { payments: data, error };
}

/**
 * Get all payments received by athlete
 * @param {object} filters - Filter options
 * @returns {Promise<{payments: object[] | null, error: Error | null}>}
 */
export async function getAthletePayments(filters = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { payments: null, error: new Error('Athlete profile not found') };
  }

  let query = supabase
    .from('payments')
    .select(`
      *,
      deal:deals(id, title, deal_type),
      brand:brands(id, company_name, logo_url)
    `)
    .eq('athlete_id', athleteId)
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  return { payments: data, error };
}

// ============================================================================
// PAYOUTS (Athletes receiving money)
// ============================================================================

/**
 * Get athlete's payout history
 * @returns {Promise<{payouts: object[] | null, error: Error | null}>}
 */
export async function getAthletePayouts() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { payouts: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  return { payouts: data, error };
}

/**
 * Request instant payout (if available)
 * @returns {Promise<{payout: object | null, error: Error | null}>}
 */
export async function requestInstantPayout() {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { payout: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('request-instant-payout', {
    body: {},
  });

  if (error) {
    return { payout: null, error };
  }

  return { payout: data.payout, error: null };
}

// ============================================================================
// EARNINGS & ANALYTICS
// ============================================================================

/**
 * Get athlete's earnings summary
 * @param {number} year - Filter by year (optional)
 * @returns {Promise<{earnings: object | null, error: Error | null}>}
 */
export async function getAthleteEarnings(year) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { earnings: null, error: new Error('Athlete profile not found') };
  }

  let query = supabase
    .from('athlete_earnings')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query;

  if (error) {
    return { earnings: null, error };
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      grossEarnings: acc.grossEarnings + (row.gross_earnings_cents || 0),
      platformFees: acc.platformFees + (row.platform_fees_cents || 0),
      netEarnings: acc.netEarnings + (row.net_earnings_cents || 0),
      dealsCompleted: acc.dealsCompleted + (row.deals_completed || 0),
    }),
    { grossEarnings: 0, platformFees: 0, netEarnings: 0, dealsCompleted: 0 }
  );

  return {
    earnings: {
      monthly: data,
      totals: {
        grossEarnings: totals.grossEarnings / 100,
        platformFees: totals.platformFees / 100,
        netEarnings: totals.netEarnings / 100,
        dealsCompleted: totals.dealsCompleted,
      },
    },
    error: null,
  };
}

/**
 * Get earnings chart data for visualization
 * @param {number} months - Number of months to include
 * @returns {Promise<{chartData: object[] | null, error: Error | null}>}
 */
export async function getEarningsChartData(months = 12) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { chartData: null, error: new Error('Athlete profile not found') };
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from('athlete_earnings')
    .select('year, month, net_earnings_cents, deals_completed')
    .eq('athlete_id', athleteId)
    .gte('year', startDate.getFullYear())
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    return { chartData: null, error };
  }

  // Format for charts
  const chartData = data.map(row => ({
    label: `${row.month}/${row.year}`,
    earnings: row.net_earnings_cents / 100,
    deals: row.deals_completed,
  }));

  return { chartData, error: null };
}

// ============================================================================
// BRAND SUBSCRIPTIONS
// ============================================================================

/**
 * Get available subscription plans
 * @returns {Promise<{plans: object[] | null, error: Error | null}>}
 */
export async function getSubscriptionPlans() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return { plans: null, error };
  }

  // Format for display
  const plans = data.map(plan => ({
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    description: plan.description,
    priceMonthly: plan.price_cents_monthly / 100,
    priceYearly: plan.price_cents_yearly ? plan.price_cents_yearly / 100 : null,
    features: {
      maxAthleteConnections: plan.max_athlete_connections,
      maxActiveCampaigns: plan.max_active_campaigns,
      apiAccess: plan.api_access,
      prioritySupport: plan.priority_support,
      customBranding: plan.custom_branding,
      analyticsDashboard: plan.analytics_dashboard,
    },
  }));

  return { plans, error: null };
}

/**
 * Get brand's current subscription
 * @returns {Promise<{subscription: object | null, error: Error | null}>}
 */
export async function getBrandSubscription() {
  const supabase = await getSupabaseClient();
  const brandId = await getMyBrandId();

  if (!brandId) {
    return { subscription: null, error: new Error('Brand profile not found') };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('brand_id', brandId)
    .in('status', ['active', 'trialing', 'past_due'])
    .single();

  if (error && error.code !== 'PGRST116') {
    return { subscription: null, error };
  }

  if (!data) {
    // Return free tier if no subscription
    const { plans } = await getSubscriptionPlans();
    const freePlan = plans?.find(p => p.tier === 'free');
    return {
      subscription: {
        tier: 'free',
        plan: freePlan,
        status: 'active',
        usage: { athleteConnections: 0, campaigns: 0 },
      },
      error: null,
    };
  }

  return {
    subscription: {
      id: data.id,
      tier: data.plan.tier,
      plan: data.plan,
      status: data.status,
      billingCycle: data.billing_cycle,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      usage: {
        athleteConnections: data.athlete_connections_used,
        campaigns: data.campaigns_used,
      },
    },
    error: null,
  };
}

/**
 * Create checkout session for subscription
 * @param {string} planId - Plan to subscribe to
 * @param {string} billingCycle - 'monthly' or 'yearly'
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function createSubscriptionCheckout(planId, billingCycle = 'monthly') {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { url: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
    body: { plan_id: planId, billing_cycle: billingCycle },
  });

  if (error) {
    return { url: null, error };
  }

  return { url: data.url, error: null };
}

/**
 * Cancel subscription at period end
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function cancelSubscription() {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { success: false, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('cancel-subscription', {
    body: {},
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Get billing portal URL for managing payment methods
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function getBillingPortalUrl() {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) {
    return { url: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase.functions.invoke('create-billing-portal', {
    body: {},
  });

  if (error) {
    return { url: null, error };
  }

  return { url: data.url, error: null };
}

// ============================================================================
// TAX DOCUMENTS
// ============================================================================

/**
 * Get athlete's tax forms
 * @returns {Promise<{forms: object[] | null, error: Error | null}>}
 */
export async function getTaxForms() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { forms: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('tax_forms_1099')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('tax_year', { ascending: false });

  return { forms: data, error };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format cents to currency string
 * @param {number} cents - Amount in cents
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Calculate platform fee for an amount
 * @param {number} amount - Deal amount in dollars
 * @returns {object} Fee breakdown
 */
export function calculateFeeBreakdown(amount) {
  const amountCents = Math.round(amount * 100);
  const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
  const athleteAmountCents = amountCents - platformFeeCents;

  return {
    total: amount,
    platformFee: platformFeeCents / 100,
    athleteAmount: athleteAmountCents / 100,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Connected Accounts
  getConnectedAccount,
  createConnectOnboardingLink,
  getConnectDashboardLink,
  getAthleteBalance,

  // Payments
  createPaymentIntent,
  getPaymentForDeal,
  getBrandPayments,
  getAthletePayments,

  // Payouts
  getAthletePayouts,
  requestInstantPayout,

  // Earnings
  getAthleteEarnings,
  getEarningsChartData,

  // Subscriptions
  getSubscriptionPlans,
  getBrandSubscription,
  createSubscriptionCheckout,
  cancelSubscription,
  getBillingPortalUrl,

  // Tax
  getTaxForms,

  // Utilities
  formatCurrency,
  calculateFeeBreakdown,

  // Constants
  PAYMENT_STATUS,
  SUBSCRIPTION_TIERS,
  PLATFORM_FEE_PERCENT,
};
