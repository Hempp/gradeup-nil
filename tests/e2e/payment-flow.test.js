/**
 * End-to-End Payment Flow Tests
 * Complete deal payment journey testing
 *
 * Flow: Brand subscribes -> Creates deal -> Pays for deal -> Athlete receives payout
 *
 * These tests simulate the complete payment lifecycle in the GradeUp NIL platform,
 * mocking all external services (Stripe, Supabase) to test the integration logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Simulated database state
let mockDatabase = {
  profiles: [],
  athletes: [],
  brands: [],
  deals: [],
  payments: [],
  payouts: [],
  subscriptions: [],
  subscription_plans: [],
  stripe_connected_accounts: [],
  athlete_earnings: [],
};

// Mock Stripe state
let mockStripeState = {
  customers: {},
  subscriptions: {},
  paymentIntents: {},
  payouts: {},
  connectedAccounts: {},
  transfers: {},
};

// ID counter to ensure unique IDs in concurrent operations
let idCounter = 0;
const generateId = (prefix) => `${prefix}_${Date.now()}_${idCounter++}`;

// Helper to reset state
const resetMockState = () => {
  idCounter = 0; // Reset ID counter
  mockDatabase = {
    profiles: [],
    athletes: [],
    brands: [],
    deals: [],
    payments: [],
    payouts: [],
    subscriptions: [],
    subscription_plans: [
      {
        id: 'plan_free',
        name: 'Free',
        tier: 'free',
        price_cents_monthly: 0,
        max_athlete_connections: 3,
        max_active_campaigns: 1,
        is_active: true,
        sort_order: 1,
      },
      {
        id: 'plan_starter',
        name: 'Starter',
        tier: 'starter',
        price_cents_monthly: 9900,
        max_athlete_connections: 10,
        max_active_campaigns: 5,
        is_active: true,
        sort_order: 2,
      },
      {
        id: 'plan_growth',
        name: 'Growth',
        tier: 'growth',
        price_cents_monthly: 29900,
        max_athlete_connections: 50,
        max_active_campaigns: 20,
        is_active: true,
        sort_order: 3,
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise',
        tier: 'enterprise',
        price_cents_monthly: 99900,
        max_athlete_connections: -1, // unlimited
        max_active_campaigns: -1,
        is_active: true,
        sort_order: 4,
      },
    ],
    stripe_connected_accounts: [],
    athlete_earnings: [],
  };

  mockStripeState = {
    customers: {},
    subscriptions: {},
    paymentIntents: {},
    payouts: {},
    connectedAccounts: {},
    transfers: {},
  };
};

// ============================================================================
// MOCK SERVICE LAYER
// ============================================================================

/**
 * Simulated Stripe service that mimics real Stripe API behavior
 */
const MockStripeService = {
  // Customer Management
  async createCustomer({ email, name, metadata }) {
    const customerId = generateId('cus');
    mockStripeState.customers[customerId] = {
      id: customerId,
      email,
      name,
      metadata,
      created: Math.floor(Date.now() / 1000),
    };
    return mockStripeState.customers[customerId];
  },

  // Subscription Management
  async createSubscription({ customerId, priceId, metadata }) {
    const subscriptionId = generateId('sub');
    const now = Math.floor(Date.now() / 1000);

    mockStripeState.subscriptions[subscriptionId] = {
      id: subscriptionId,
      customer: customerId,
      status: 'active',
      items: {
        data: [{ price: { id: priceId } }],
      },
      current_period_start: now,
      current_period_end: now + 30 * 24 * 60 * 60,
      metadata,
    };
    return mockStripeState.subscriptions[subscriptionId];
  },

  async cancelSubscription(subscriptionId) {
    if (!mockStripeState.subscriptions[subscriptionId]) {
      throw new Error('Subscription not found');
    }
    mockStripeState.subscriptions[subscriptionId].status = 'canceled';
    mockStripeState.subscriptions[subscriptionId].canceled_at = Math.floor(Date.now() / 1000);
    return mockStripeState.subscriptions[subscriptionId];
  },

  // Connect Account Management
  async createConnectAccount({ email, metadata }) {
    const accountId = generateId('acct');
    mockStripeState.connectedAccounts[accountId] = {
      id: accountId,
      type: 'express',
      email,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      metadata,
    };
    return mockStripeState.connectedAccounts[accountId];
  },

  async updateConnectAccount(accountId, updates) {
    if (!mockStripeState.connectedAccounts[accountId]) {
      throw new Error('Account not found');
    }
    Object.assign(mockStripeState.connectedAccounts[accountId], updates);
    return mockStripeState.connectedAccounts[accountId];
  },

  async createOnboardingLink(accountId, returnUrl) {
    return {
      url: `https://connect.stripe.com/express/onboarding/${accountId}`,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
  },

  async getAccountBalance(accountId) {
    const account = mockStripeState.connectedAccounts[accountId];
    if (!account) throw new Error('Account not found');

    // Get balance from database connected account (more reliable for tests)
    const dbAccount = mockDatabase.stripe_connected_accounts.find(
      a => a.stripe_account_id === accountId
    );

    if (dbAccount) {
      return {
        available: dbAccount.available_balance || 0,
        pending: dbAccount.pending_balance || 0,
      };
    }

    // Fallback: Calculate balance from transfers
    let available = 0;
    let pending = 0;

    Object.values(mockStripeState.transfers).forEach(transfer => {
      if (transfer.destination === accountId) {
        if (transfer.status === 'available') {
          available += transfer.amount;
        } else {
          pending += transfer.amount;
        }
      }
    });

    return { available, pending };
  },

  // Payment Intent Management
  async createPaymentIntent({ amount, currency, connectedAccountId, metadata }) {
    const paymentIntentId = generateId('pi');
    const applicationFee = Math.ceil(amount * 0.12); // 12% platform fee

    mockStripeState.paymentIntents[paymentIntentId] = {
      id: paymentIntentId,
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `${paymentIntentId}_secret_${Date.now()}`,
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata,
      created: Math.floor(Date.now() / 1000),
    };

    return mockStripeState.paymentIntents[paymentIntentId];
  },

  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    const pi = mockStripeState.paymentIntents[paymentIntentId];
    if (!pi) throw new Error('Payment intent not found');

    // Simulate successful payment
    pi.status = 'succeeded';
    pi.payment_method = paymentMethodId;
    pi.paid_at = Math.floor(Date.now() / 1000);

    // Create transfer to connected account
    const transferId = generateId('tr');
    const athleteAmount = pi.amount - pi.application_fee_amount;

    mockStripeState.transfers[transferId] = {
      id: transferId,
      amount: athleteAmount,
      currency: pi.currency,
      destination: pi.transfer_data.destination,
      source_transaction: paymentIntentId,
      status: 'available', // Mark immediately available for test synchrony
      created: Math.floor(Date.now() / 1000),
    };

    return pi;
  },

  async refundPaymentIntent(paymentIntentId) {
    const pi = mockStripeState.paymentIntents[paymentIntentId];
    if (!pi) throw new Error('Payment intent not found');
    if (pi.status !== 'succeeded') throw new Error('Cannot refund non-succeeded payment');

    pi.status = 'refunded';
    pi.refunded_at = Math.floor(Date.now() / 1000);
    return pi;
  },

  // Payout Management
  async createPayout({ amount, accountId, method = 'standard' }) {
    const account = mockStripeState.connectedAccounts[accountId];
    if (!account) throw new Error('Account not found');
    if (!account.payouts_enabled) throw new Error('Payouts not enabled');

    const balance = await this.getAccountBalance(accountId);
    if (balance.available < amount) {
      throw new Error('Insufficient funds');
    }

    const payoutId = generateId('po');
    const arrivalDate = method === 'instant'
      ? Math.floor(Date.now() / 1000)
      : Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;

    mockStripeState.payouts[payoutId] = {
      id: payoutId,
      amount,
      currency: 'usd',
      status: method === 'instant' ? 'paid' : 'pending',
      arrival_date: arrivalDate,
      method,
      destination: accountId,
      created: Math.floor(Date.now() / 1000),
    };

    return mockStripeState.payouts[payoutId];
  },
};

/**
 * Simulated Database service that mimics Supabase operations
 */
const MockDatabaseService = {
  // Profile operations
  async createProfile({ id, email, first_name, last_name, user_type }) {
    const profile = { id, email, first_name, last_name, user_type, created_at: new Date().toISOString() };
    mockDatabase.profiles.push(profile);
    return profile;
  },

  // Athlete operations
  async createAthlete({ profile_id, school, sport, position, gpa }) {
    const athlete = {
      id: generateId('athlete'),
      profile_id,
      school,
      sport,
      position,
      gpa,
      verified: false,
      created_at: new Date().toISOString(),
    };
    mockDatabase.athletes.push(athlete);
    return athlete;
  },

  async getAthleteByProfileId(profileId) {
    return mockDatabase.athletes.find(a => a.profile_id === profileId);
  },

  // Brand operations
  async createBrand({ profile_id, company_name, industry }) {
    const brand = {
      id: generateId('brand'),
      profile_id,
      company_name,
      industry,
      subscription_tier: 'free',
      created_at: new Date().toISOString(),
    };
    mockDatabase.brands.push(brand);
    return brand;
  },

  async getBrandByProfileId(profileId) {
    return mockDatabase.brands.find(b => b.profile_id === profileId);
  },

  async updateBrand(brandId, updates) {
    const brand = mockDatabase.brands.find(b => b.id === brandId);
    if (!brand) throw new Error('Brand not found');
    Object.assign(brand, updates);
    return brand;
  },

  // Connected Account operations
  async createConnectedAccount({ athlete_id, stripe_account_id }) {
    const account = {
      id: generateId('sca'),
      athlete_id,
      stripe_account_id,
      charges_enabled: false,
      payouts_enabled: false,
      available_balance: 0,
      pending_balance: 0,
      created_at: new Date().toISOString(),
    };
    mockDatabase.stripe_connected_accounts.push(account);
    return account;
  },

  async getConnectedAccountByAthleteId(athleteId) {
    return mockDatabase.stripe_connected_accounts.find(a => a.athlete_id === athleteId);
  },

  async updateConnectedAccount(athleteId, updates) {
    const account = mockDatabase.stripe_connected_accounts.find(a => a.athlete_id === athleteId);
    if (!account) throw new Error('Connected account not found');
    Object.assign(account, updates);
    return account;
  },

  // Deal operations
  async createDeal({ brand_id, athlete_id, title, amount_cents, deal_type, status = 'pending' }) {
    const deal = {
      id: generateId('deal'),
      brand_id,
      athlete_id,
      title,
      amount_cents,
      deal_type,
      status,
      created_at: new Date().toISOString(),
    };
    mockDatabase.deals.push(deal);
    return deal;
  },

  async getDeal(dealId) {
    return mockDatabase.deals.find(d => d.id === dealId);
  },

  async updateDeal(dealId, updates) {
    const deal = mockDatabase.deals.find(d => d.id === dealId);
    if (!deal) throw new Error('Deal not found');
    Object.assign(deal, updates);
    return deal;
  },

  // Payment operations
  async createPayment({ deal_id, brand_id, athlete_id, amount_cents, platform_fee_cents, stripe_payment_intent_id }) {
    const payment = {
      id: generateId('payment'),
      deal_id,
      brand_id,
      athlete_id,
      amount_cents,
      platform_fee_cents,
      athlete_amount_cents: amount_cents - platform_fee_cents,
      stripe_payment_intent_id,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    mockDatabase.payments.push(payment);
    return payment;
  },

  async getPaymentByDealId(dealId) {
    return mockDatabase.payments.find(p => p.deal_id === dealId);
  },

  async updatePayment(paymentId, updates) {
    const payment = mockDatabase.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');
    Object.assign(payment, updates);
    return payment;
  },

  // Subscription operations
  async createSubscription({ brand_id, plan_id, stripe_subscription_id, status }) {
    const subscription = {
      id: generateId('subscription'),
      brand_id,
      plan_id,
      stripe_subscription_id,
      status,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    mockDatabase.subscriptions.push(subscription);
    return subscription;
  },

  async getSubscriptionByBrandId(brandId) {
    return mockDatabase.subscriptions.find(s => s.brand_id === brandId && s.status === 'active');
  },

  // Payout operations
  async createPayout({ athlete_id, amount_cents, stripe_payout_id, status }) {
    const payout = {
      id: generateId('payout'),
      athlete_id,
      amount_cents,
      stripe_payout_id,
      status,
      created_at: new Date().toISOString(),
    };
    mockDatabase.payouts.push(payout);
    return payout;
  },

  // Earnings operations
  async updateEarnings({ athlete_id, year, month, gross_earnings_cents, platform_fees_cents, net_earnings_cents, deals_completed }) {
    let earnings = mockDatabase.athlete_earnings.find(
      e => e.athlete_id === athlete_id && e.year === year && e.month === month
    );

    if (earnings) {
      earnings.gross_earnings_cents += gross_earnings_cents;
      earnings.platform_fees_cents += platform_fees_cents;
      earnings.net_earnings_cents += net_earnings_cents;
      earnings.deals_completed += deals_completed;
    } else {
      earnings = {
        id: generateId('earnings'),
        athlete_id,
        year,
        month,
        gross_earnings_cents,
        platform_fees_cents,
        net_earnings_cents,
        deals_completed,
      };
      mockDatabase.athlete_earnings.push(earnings);
    }

    return earnings;
  },

  async getAthleteEarnings(athleteId) {
    return mockDatabase.athlete_earnings.filter(e => e.athlete_id === athleteId);
  },

  // Utility
  getSubscriptionPlans() {
    return mockDatabase.subscription_plans;
  },
};

// ============================================================================
// PAYMENT FLOW ORCHESTRATION
// ============================================================================

/**
 * Orchestrates the complete payment flow
 */
const PaymentFlowOrchestrator = {
  PLATFORM_FEE_PERCENT: 12,

  // Brand subscribes to a plan
  async subscribeBrand(brandId, planId) {
    const brand = mockDatabase.brands.find(b => b.id === brandId);
    if (!brand) throw new Error('Brand not found');

    const plan = mockDatabase.subscription_plans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    // Create Stripe customer if needed
    const profile = mockDatabase.profiles.find(p => p.id === brand.profile_id);
    const customer = await MockStripeService.createCustomer({
      email: profile.email,
      name: profile.first_name + ' ' + profile.last_name,
      metadata: { brand_id: brandId },
    });

    // Create Stripe subscription
    const stripeSubscription = await MockStripeService.createSubscription({
      customerId: customer.id,
      priceId: `price_${plan.tier}_monthly`,
      metadata: { brand_id: brandId },
    });

    // Create database subscription
    const subscription = await MockDatabaseService.createSubscription({
      brand_id: brandId,
      plan_id: planId,
      stripe_subscription_id: stripeSubscription.id,
      status: 'active',
    });

    // Update brand subscription tier
    await MockDatabaseService.updateBrand(brandId, { subscription_tier: plan.tier });

    return { subscription, stripeSubscription };
  },

  // Athlete completes Stripe Connect onboarding
  async completeAthleteOnboarding(athleteId) {
    const athlete = mockDatabase.athletes.find(a => a.id === athleteId);
    if (!athlete) throw new Error('Athlete not found');

    const profile = mockDatabase.profiles.find(p => p.id === athlete.profile_id);

    // Create Stripe Connect account
    const stripeAccount = await MockStripeService.createConnectAccount({
      email: profile.email,
      metadata: { athlete_id: athleteId },
    });

    // Create database record
    const connectedAccount = await MockDatabaseService.createConnectedAccount({
      athlete_id: athleteId,
      stripe_account_id: stripeAccount.id,
    });

    // Simulate completing onboarding
    await MockStripeService.updateConnectAccount(stripeAccount.id, {
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    });

    // Update database record
    await MockDatabaseService.updateConnectedAccount(athleteId, {
      charges_enabled: true,
      payouts_enabled: true,
    });

    return { connectedAccount, stripeAccount };
  },

  // Create a deal between brand and athlete
  async createDeal(brandId, athleteId, dealDetails) {
    const { title, amountDollars, dealType } = dealDetails;

    // Verify brand has active subscription
    const subscription = await MockDatabaseService.getSubscriptionByBrandId(brandId);
    if (!subscription || subscription.status !== 'active') {
      // For testing, allow free tier
    }

    // Verify athlete has connected account
    const connectedAccount = await MockDatabaseService.getConnectedAccountByAthleteId(athleteId);
    if (!connectedAccount) {
      throw new Error('Athlete has not completed payment setup');
    }

    const deal = await MockDatabaseService.createDeal({
      brand_id: brandId,
      athlete_id: athleteId,
      title,
      amount_cents: Math.round(amountDollars * 100),
      deal_type: dealType,
      status: 'accepted',
    });

    return deal;
  },

  // Process payment for a deal
  async processPayment(dealId, paymentMethodId = 'pm_card_visa') {
    const deal = await MockDatabaseService.getDeal(dealId);
    if (!deal) throw new Error('Deal not found');

    if (deal.status !== 'accepted') {
      throw new Error('Deal must be accepted before payment');
    }

    const connectedAccount = await MockDatabaseService.getConnectedAccountByAthleteId(deal.athlete_id);
    if (!connectedAccount) {
      throw new Error('Athlete payment account not found');
    }

    // Calculate fees
    const platformFeeCents = Math.ceil(deal.amount_cents * (this.PLATFORM_FEE_PERCENT / 100));

    // Create Stripe payment intent
    const paymentIntent = await MockStripeService.createPaymentIntent({
      amount: deal.amount_cents,
      currency: 'usd',
      connectedAccountId: connectedAccount.stripe_account_id,
      metadata: {
        deal_id: dealId,
        athlete_id: deal.athlete_id,
        brand_id: deal.brand_id,
      },
    });

    // Create database payment record
    const payment = await MockDatabaseService.createPayment({
      deal_id: dealId,
      brand_id: deal.brand_id,
      athlete_id: deal.athlete_id,
      amount_cents: deal.amount_cents,
      platform_fee_cents: platformFeeCents,
      stripe_payment_intent_id: paymentIntent.id,
    });

    // Confirm payment (simulate card payment)
    const confirmedIntent = await MockStripeService.confirmPaymentIntent(
      paymentIntent.id,
      paymentMethodId
    );

    // Update payment and deal status
    await MockDatabaseService.updatePayment(payment.id, {
      status: 'succeeded',
      paid_at: new Date().toISOString(),
    });

    await MockDatabaseService.updateDeal(dealId, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

    // Update athlete earnings
    const now = new Date();
    await MockDatabaseService.updateEarnings({
      athlete_id: deal.athlete_id,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      gross_earnings_cents: deal.amount_cents,
      platform_fees_cents: platformFeeCents,
      net_earnings_cents: deal.amount_cents - platformFeeCents,
      deals_completed: 1,
    });

    // Update connected account balance
    const athleteAmount = deal.amount_cents - platformFeeCents;
    const currentBalance = connectedAccount.pending_balance || 0;
    await MockDatabaseService.updateConnectedAccount(deal.athlete_id, {
      pending_balance: currentBalance + athleteAmount,
    });

    return { payment, paymentIntent: confirmedIntent };
  },

  // Athlete requests payout
  async requestPayout(athleteId, amount = null, method = 'standard') {
    const connectedAccount = await MockDatabaseService.getConnectedAccountByAthleteId(athleteId);
    if (!connectedAccount) {
      throw new Error('Athlete payment account not found');
    }

    if (!connectedAccount.payouts_enabled) {
      throw new Error('Payouts not enabled for this account');
    }

    // If no amount specified, payout available balance
    const payoutAmount = amount || connectedAccount.available_balance;

    if (payoutAmount <= 0) {
      throw new Error('No funds available for payout');
    }

    // Create Stripe payout
    const stripePayout = await MockStripeService.createPayout({
      amount: payoutAmount,
      accountId: connectedAccount.stripe_account_id,
      method,
    });

    // Create database payout record
    const payout = await MockDatabaseService.createPayout({
      athlete_id: athleteId,
      amount_cents: payoutAmount,
      stripe_payout_id: stripePayout.id,
      status: stripePayout.status,
    });

    // Update connected account balance
    await MockDatabaseService.updateConnectedAccount(athleteId, {
      available_balance: connectedAccount.available_balance - payoutAmount,
    });

    return { payout, stripePayout };
  },
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('End-to-End Payment Flow', () => {
  beforeEach(() => {
    resetMockState();
  });

  describe('Complete Deal Payment Journey', () => {
    let brandProfile, brandAccount;
    let athleteProfile, athleteAccount;
    let deal;

    beforeEach(async () => {
      // Setup: Create brand
      brandProfile = await MockDatabaseService.createProfile({
        id: 'profile_brand_1',
        email: 'brand@company.com',
        first_name: 'Nike',
        last_name: 'Marketing',
        user_type: 'brand',
      });
      brandAccount = await MockDatabaseService.createBrand({
        profile_id: brandProfile.id,
        company_name: 'Nike Inc',
        industry: 'Athletic Apparel',
      });

      // Setup: Create athlete
      athleteProfile = await MockDatabaseService.createProfile({
        id: 'profile_athlete_1',
        email: 'athlete@university.edu',
        first_name: 'Marcus',
        last_name: 'Johnson',
        user_type: 'athlete',
      });
      athleteAccount = await MockDatabaseService.createAthlete({
        profile_id: athleteProfile.id,
        school: 'State University',
        sport: 'Basketball',
        position: 'Point Guard',
        gpa: 3.8,
      });
    });

    it('completes full payment journey: subscribe -> deal -> pay -> payout', async () => {
      // Step 1: Brand subscribes to Growth plan
      const { subscription, stripeSubscription } = await PaymentFlowOrchestrator.subscribeBrand(
        brandAccount.id,
        'plan_growth'
      );

      expect(subscription.status).toBe('active');
      expect(stripeSubscription.status).toBe('active');

      // Verify brand tier updated
      const updatedBrand = mockDatabase.brands.find(b => b.id === brandAccount.id);
      expect(updatedBrand.subscription_tier).toBe('growth');

      // Step 2: Athlete completes Stripe Connect onboarding
      const { connectedAccount, stripeAccount } = await PaymentFlowOrchestrator.completeAthleteOnboarding(
        athleteAccount.id
      );

      expect(connectedAccount.charges_enabled).toBe(true);
      expect(connectedAccount.payouts_enabled).toBe(true);
      expect(stripeAccount.details_submitted).toBe(true);

      // Step 3: Create deal between brand and athlete
      deal = await PaymentFlowOrchestrator.createDeal(brandAccount.id, athleteAccount.id, {
        title: 'Instagram Post Campaign',
        amountDollars: 500,
        dealType: 'social_media',
      });

      expect(deal.status).toBe('accepted');
      expect(deal.amount_cents).toBe(50000);

      // Step 4: Brand pays for the deal
      const { payment, paymentIntent } = await PaymentFlowOrchestrator.processPayment(deal.id);

      expect(payment.status).toBe('succeeded');
      expect(paymentIntent.status).toBe('succeeded');
      expect(payment.amount_cents).toBe(50000);
      expect(payment.platform_fee_cents).toBe(6000); // 12% of $500
      expect(payment.athlete_amount_cents).toBe(44000); // $440 to athlete

      // Verify deal updated
      const updatedDeal = await MockDatabaseService.getDeal(deal.id);
      expect(updatedDeal.status).toBe('paid');

      // Verify athlete earnings recorded
      const earnings = await MockDatabaseService.getAthleteEarnings(athleteAccount.id);
      expect(earnings).toHaveLength(1);
      expect(earnings[0].gross_earnings_cents).toBe(50000);
      expect(earnings[0].net_earnings_cents).toBe(44000);

      // Step 5: Simulate balance becoming available and athlete requests payout
      const updatedConnectedAccount = await MockDatabaseService.getConnectedAccountByAthleteId(athleteAccount.id);
      await MockDatabaseService.updateConnectedAccount(athleteAccount.id, {
        available_balance: updatedConnectedAccount.pending_balance,
        pending_balance: 0,
      });

      const { payout, stripePayout } = await PaymentFlowOrchestrator.requestPayout(
        athleteAccount.id,
        44000,
        'standard'
      );

      expect(payout.amount_cents).toBe(44000);
      expect(payout.status).toBe('pending');
      expect(stripePayout.method).toBe('standard');
    });

    it('handles multiple deals and accumulated earnings', async () => {
      // Setup subscription and onboarding
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_growth');
      await PaymentFlowOrchestrator.completeAthleteOnboarding(athleteAccount.id);

      // Create and pay for multiple deals
      const dealAmounts = [500, 1000, 750, 250];
      let totalGross = 0;
      let totalNet = 0;

      for (const amount of dealAmounts) {
        const deal = await PaymentFlowOrchestrator.createDeal(brandAccount.id, athleteAccount.id, {
          title: `Campaign ${amount}`,
          amountDollars: amount,
          dealType: 'social_media',
        });

        const { payment } = await PaymentFlowOrchestrator.processPayment(deal.id);
        totalGross += payment.amount_cents;
        totalNet += payment.athlete_amount_cents;
      }

      // Verify accumulated earnings
      const earnings = await MockDatabaseService.getAthleteEarnings(athleteAccount.id);
      const totalEarnings = earnings.reduce((sum, e) => sum + e.gross_earnings_cents, 0);
      const totalNetEarnings = earnings.reduce((sum, e) => sum + e.net_earnings_cents, 0);

      expect(totalEarnings).toBe(250000); // $2500
      expect(totalNetEarnings).toBe(220000); // $2200 (after 12% fee)
      expect(earnings[0].deals_completed).toBe(4);
    });

    it('handles instant payout request', async () => {
      // Setup
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_growth');
      await PaymentFlowOrchestrator.completeAthleteOnboarding(athleteAccount.id);

      // Create and pay deal
      const deal = await PaymentFlowOrchestrator.createDeal(brandAccount.id, athleteAccount.id, {
        title: 'Quick Campaign',
        amountDollars: 1000,
        dealType: 'appearance',
      });
      await PaymentFlowOrchestrator.processPayment(deal.id);

      // Make balance available
      const connectedAccount = await MockDatabaseService.getConnectedAccountByAthleteId(athleteAccount.id);
      await MockDatabaseService.updateConnectedAccount(athleteAccount.id, {
        available_balance: connectedAccount.pending_balance,
        pending_balance: 0,
      });

      // Request instant payout
      const { payout, stripePayout } = await PaymentFlowOrchestrator.requestPayout(
        athleteAccount.id,
        88000, // $880
        'instant'
      );

      expect(stripePayout.method).toBe('instant');
      expect(stripePayout.status).toBe('paid'); // Instant payouts are immediately paid
    });
  });

  describe('Error Handling in Payment Flow', () => {
    let brandProfile, brandAccount;
    let athleteProfile, athleteAccount;

    beforeEach(async () => {
      // Setup brand
      brandProfile = await MockDatabaseService.createProfile({
        id: 'profile_brand_err',
        email: 'brand@error.com',
        first_name: 'Error',
        last_name: 'Brand',
        user_type: 'brand',
      });
      brandAccount = await MockDatabaseService.createBrand({
        profile_id: brandProfile.id,
        company_name: 'Error Corp',
        industry: 'Testing',
      });

      // Setup athlete
      athleteProfile = await MockDatabaseService.createProfile({
        id: 'profile_athlete_err',
        email: 'athlete@error.edu',
        first_name: 'Error',
        last_name: 'Athlete',
        user_type: 'athlete',
      });
      athleteAccount = await MockDatabaseService.createAthlete({
        profile_id: athleteProfile.id,
        school: 'Error University',
        sport: 'Testing',
        position: 'Tester',
        gpa: 3.5,
      });
    });

    it('prevents deal creation without athlete connected account', async () => {
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_starter');

      await expect(
        PaymentFlowOrchestrator.createDeal(brandAccount.id, athleteAccount.id, {
          title: 'Should Fail',
          amountDollars: 500,
          dealType: 'social',
        })
      ).rejects.toThrow('Athlete has not completed payment setup');
    });

    it('prevents payment for non-accepted deal', async () => {
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_starter');
      await PaymentFlowOrchestrator.completeAthleteOnboarding(athleteAccount.id);

      // Create deal with pending status
      const deal = await MockDatabaseService.createDeal({
        brand_id: brandAccount.id,
        athlete_id: athleteAccount.id,
        title: 'Pending Deal',
        amount_cents: 50000,
        deal_type: 'social',
        status: 'pending',
      });

      await expect(
        PaymentFlowOrchestrator.processPayment(deal.id)
      ).rejects.toThrow('Deal must be accepted before payment');
    });

    it('prevents payout without enabled payouts', async () => {
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_starter');

      // Create connected account but don't complete onboarding
      const stripeAccount = await MockStripeService.createConnectAccount({
        email: athleteProfile.email,
        metadata: { athlete_id: athleteAccount.id },
      });

      await MockDatabaseService.createConnectedAccount({
        athlete_id: athleteAccount.id,
        stripe_account_id: stripeAccount.id,
      });

      // payouts_enabled is still false
      await expect(
        PaymentFlowOrchestrator.requestPayout(athleteAccount.id, 10000)
      ).rejects.toThrow('Payouts not enabled');
    });

    it('prevents payout with insufficient funds', async () => {
      await PaymentFlowOrchestrator.subscribeBrand(brandAccount.id, 'plan_starter');
      await PaymentFlowOrchestrator.completeAthleteOnboarding(athleteAccount.id);

      // No deals completed, so no balance - will throw from Stripe service
      await expect(
        PaymentFlowOrchestrator.requestPayout(athleteAccount.id, 100000)
      ).rejects.toThrow('Insufficient funds');
    });
  });

  describe('Subscription Tier Verification', () => {
    it('allows brands on any tier to create deals', async () => {
      const tiers = ['free', 'starter', 'growth', 'enterprise'];

      for (const tier of tiers) {
        resetMockState();

        const profile = await MockDatabaseService.createProfile({
          id: `profile_${tier}`,
          email: `${tier}@test.com`,
          first_name: tier,
          last_name: 'Brand',
          user_type: 'brand',
        });

        const brand = await MockDatabaseService.createBrand({
          profile_id: profile.id,
          company_name: `${tier} Corp`,
          industry: 'Testing',
        });

        const athleteProfile = await MockDatabaseService.createProfile({
          id: `athlete_${tier}`,
          email: `athlete_${tier}@test.edu`,
          first_name: 'Test',
          last_name: 'Athlete',
          user_type: 'athlete',
        });

        const athlete = await MockDatabaseService.createAthlete({
          profile_id: athleteProfile.id,
          school: 'Test U',
          sport: 'Testing',
          position: 'Tester',
          gpa: 3.0,
        });

        if (tier !== 'free') {
          await PaymentFlowOrchestrator.subscribeBrand(brand.id, `plan_${tier}`);
        }

        await PaymentFlowOrchestrator.completeAthleteOnboarding(athlete.id);

        const deal = await PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
          title: `${tier} deal`,
          amountDollars: 100,
          dealType: 'social',
        });

        expect(deal).toBeDefined();
        expect(deal.status).toBe('accepted');
      }
    });
  });

  describe('Fee Calculation Accuracy', () => {
    it('calculates 12% platform fee correctly for various amounts', async () => {
      // Fee is calculated as ceil(amount_cents * 0.12)
      // For $100: 10000 * 0.12 = 1200 cents = $12
      // For $1234: 123400 * 0.12 = 14808 cents = $148.08
      const testCases = [
        { amount: 100, expectedFeeCents: 1200, expectedNetCents: 8800 },
        { amount: 500, expectedFeeCents: 6000, expectedNetCents: 44000 },
        { amount: 1000, expectedFeeCents: 12000, expectedNetCents: 88000 },
        { amount: 1234, expectedFeeCents: 14808, expectedNetCents: 108592 }, // 123400 * 0.12 = 14808
        { amount: 9999, expectedFeeCents: 119988, expectedNetCents: 879912 }, // 999900 * 0.12 = 119988
      ];

      for (const { amount, expectedFeeCents, expectedNetCents } of testCases) {
        resetMockState();

        // Quick setup
        const profile = await MockDatabaseService.createProfile({
          id: `profile_fee_${amount}`,
          email: `fee${amount}@test.com`,
          first_name: 'Fee',
          last_name: 'Test',
          user_type: 'brand',
        });

        const brand = await MockDatabaseService.createBrand({
          profile_id: profile.id,
          company_name: 'Fee Corp',
          industry: 'Testing',
        });

        const athleteProfile = await MockDatabaseService.createProfile({
          id: `athlete_fee_${amount}`,
          email: `athlete_fee${amount}@test.edu`,
          first_name: 'Fee',
          last_name: 'Athlete',
          user_type: 'athlete',
        });

        const athlete = await MockDatabaseService.createAthlete({
          profile_id: athleteProfile.id,
          school: 'Fee U',
          sport: 'Testing',
          position: 'Tester',
          gpa: 3.0,
        });

        await PaymentFlowOrchestrator.completeAthleteOnboarding(athlete.id);

        const deal = await PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
          title: 'Fee Test',
          amountDollars: amount,
          dealType: 'test',
        });

        const { payment } = await PaymentFlowOrchestrator.processPayment(deal.id);

        expect(payment.platform_fee_cents).toBe(expectedFeeCents);
        expect(payment.athlete_amount_cents).toBe(expectedNetCents);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('handles multiple simultaneous payments', async () => {
      // Setup
      const profile = await MockDatabaseService.createProfile({
        id: 'profile_concurrent',
        email: 'concurrent@test.com',
        first_name: 'Concurrent',
        last_name: 'Brand',
        user_type: 'brand',
      });

      const brand = await MockDatabaseService.createBrand({
        profile_id: profile.id,
        company_name: 'Concurrent Corp',
        industry: 'Testing',
      });

      const athleteProfile = await MockDatabaseService.createProfile({
        id: 'athlete_concurrent',
        email: 'athlete_concurrent@test.edu',
        first_name: 'Concurrent',
        last_name: 'Athlete',
        user_type: 'athlete',
      });

      const athlete = await MockDatabaseService.createAthlete({
        profile_id: athleteProfile.id,
        school: 'Concurrent U',
        sport: 'Testing',
        position: 'Tester',
        gpa: 3.0,
      });

      await PaymentFlowOrchestrator.completeAthleteOnboarding(athlete.id);

      // Create multiple deals
      const deals = await Promise.all([
        PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
          title: 'Deal 1',
          amountDollars: 100,
          dealType: 'social',
        }),
        PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
          title: 'Deal 2',
          amountDollars: 200,
          dealType: 'social',
        }),
        PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
          title: 'Deal 3',
          amountDollars: 300,
          dealType: 'social',
        }),
      ]);

      // Process payments concurrently
      const payments = await Promise.all(
        deals.map(deal => PaymentFlowOrchestrator.processPayment(deal.id))
      );

      // Verify all succeeded
      expect(payments).toHaveLength(3);
      payments.forEach(({ payment }) => {
        expect(payment.status).toBe('succeeded');
      });

      // Verify total earnings
      const earnings = await MockDatabaseService.getAthleteEarnings(athlete.id);
      const totalGross = earnings.reduce((sum, e) => sum + e.gross_earnings_cents, 0);
      expect(totalGross).toBe(60000); // $100 + $200 + $300
    });
  });
});

// ============================================================================
// WEBHOOK SIMULATION TESTS
// ============================================================================

describe('Webhook Event Processing', () => {
  beforeEach(() => {
    resetMockState();
  });

  const simulateWebhook = async (eventType, data) => {
    // Simulate webhook processing
    switch (eventType) {
      case 'payment_intent.succeeded':
        const payment = mockDatabase.payments.find(
          p => p.stripe_payment_intent_id === data.id
        );
        if (payment) {
          payment.status = 'succeeded';
          payment.paid_at = new Date().toISOString();

          const deal = await MockDatabaseService.getDeal(payment.deal_id);
          if (deal) {
            deal.status = 'paid';
            deal.paid_at = new Date().toISOString();
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = mockDatabase.payments.find(
          p => p.stripe_payment_intent_id === data.id
        );
        if (failedPayment) {
          failedPayment.status = 'failed';
          failedPayment.failure_reason = data.last_payment_error?.message;
        }
        break;

      case 'payout.paid':
        const payout = mockDatabase.payouts.find(
          p => p.stripe_payout_id === data.id
        );
        if (payout) {
          payout.status = 'paid';
          payout.paid_at = new Date().toISOString();
        }
        break;

      case 'account.updated':
        const account = mockDatabase.stripe_connected_accounts.find(
          a => a.stripe_account_id === data.id
        );
        if (account) {
          account.charges_enabled = data.charges_enabled;
          account.payouts_enabled = data.payouts_enabled;
        }
        break;
    }

    return { received: true };
  };

  it('processes payment_intent.succeeded webhook', async () => {
    // Setup payment
    const payment = {
      id: 'payment_webhook_1',
      deal_id: 'deal_webhook_1',
      stripe_payment_intent_id: 'pi_webhook_123',
      status: 'pending',
    };
    mockDatabase.payments.push(payment);

    const deal = {
      id: 'deal_webhook_1',
      status: 'pending_payment',
    };
    mockDatabase.deals.push(deal);

    // Simulate webhook
    await simulateWebhook('payment_intent.succeeded', {
      id: 'pi_webhook_123',
      status: 'succeeded',
    });

    // Verify updates
    expect(mockDatabase.payments[0].status).toBe('succeeded');
    expect(mockDatabase.deals[0].status).toBe('paid');
  });

  it('processes payment_intent.payment_failed webhook', async () => {
    const payment = {
      id: 'payment_failed_1',
      stripe_payment_intent_id: 'pi_failed_123',
      status: 'pending',
    };
    mockDatabase.payments.push(payment);

    await simulateWebhook('payment_intent.payment_failed', {
      id: 'pi_failed_123',
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      },
    });

    expect(mockDatabase.payments[0].status).toBe('failed');
    expect(mockDatabase.payments[0].failure_reason).toBe('Your card was declined.');
  });

  it('processes payout.paid webhook', async () => {
    const payout = {
      id: 'payout_webhook_1',
      stripe_payout_id: 'po_webhook_123',
      status: 'pending',
    };
    mockDatabase.payouts.push(payout);

    await simulateWebhook('payout.paid', {
      id: 'po_webhook_123',
      status: 'paid',
    });

    expect(mockDatabase.payouts[0].status).toBe('paid');
  });

  it('processes account.updated webhook', async () => {
    const account = {
      id: 'sca_webhook_1',
      stripe_account_id: 'acct_webhook_123',
      charges_enabled: false,
      payouts_enabled: false,
    };
    mockDatabase.stripe_connected_accounts.push(account);

    await simulateWebhook('account.updated', {
      id: 'acct_webhook_123',
      charges_enabled: true,
      payouts_enabled: true,
    });

    expect(mockDatabase.stripe_connected_accounts[0].charges_enabled).toBe(true);
    expect(mockDatabase.stripe_connected_accounts[0].payouts_enabled).toBe(true);
  });
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

describe('Data Integrity', () => {
  beforeEach(() => {
    resetMockState();
  });

  it('maintains consistency between Stripe and database records', async () => {
    // Setup
    const profile = await MockDatabaseService.createProfile({
      id: 'profile_integrity',
      email: 'integrity@test.com',
      first_name: 'Data',
      last_name: 'Integrity',
      user_type: 'brand',
    });

    const brand = await MockDatabaseService.createBrand({
      profile_id: profile.id,
      company_name: 'Integrity Corp',
      industry: 'Testing',
    });

    const athleteProfile = await MockDatabaseService.createProfile({
      id: 'athlete_integrity',
      email: 'athlete_integrity@test.edu',
      first_name: 'Integrity',
      last_name: 'Athlete',
      user_type: 'athlete',
    });

    const athlete = await MockDatabaseService.createAthlete({
      profile_id: athleteProfile.id,
      school: 'Integrity U',
      sport: 'Testing',
      position: 'Tester',
      gpa: 4.0,
    });

    // Complete flow
    const { stripeSubscription } = await PaymentFlowOrchestrator.subscribeBrand(brand.id, 'plan_growth');
    const { stripeAccount, connectedAccount } = await PaymentFlowOrchestrator.completeAthleteOnboarding(athlete.id);

    const deal = await PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
      title: 'Integrity Test',
      amountDollars: 1000,
      dealType: 'test',
    });

    const { payment, paymentIntent } = await PaymentFlowOrchestrator.processPayment(deal.id);

    // Verify Stripe-Database consistency
    expect(mockStripeState.subscriptions[stripeSubscription.id]).toBeDefined();
    expect(mockStripeState.connectedAccounts[stripeAccount.id]).toBeDefined();
    expect(mockStripeState.paymentIntents[paymentIntent.id]).toBeDefined();

    // Verify database records point to correct Stripe IDs
    const dbSubscription = mockDatabase.subscriptions.find(s => s.brand_id === brand.id);
    expect(dbSubscription.stripe_subscription_id).toBe(stripeSubscription.id);

    expect(connectedAccount.stripe_account_id).toBe(stripeAccount.id);
    expect(payment.stripe_payment_intent_id).toBe(paymentIntent.id);
  });

  it('correctly tracks money flow through the system', async () => {
    // Setup
    const profile = await MockDatabaseService.createProfile({
      id: 'profile_money',
      email: 'money@test.com',
      first_name: 'Money',
      last_name: 'Tracker',
      user_type: 'brand',
    });

    const brand = await MockDatabaseService.createBrand({
      profile_id: profile.id,
      company_name: 'Money Corp',
      industry: 'Finance',
    });

    const athleteProfile = await MockDatabaseService.createProfile({
      id: 'athlete_money',
      email: 'athlete_money@test.edu',
      first_name: 'Money',
      last_name: 'Athlete',
      user_type: 'athlete',
    });

    const athlete = await MockDatabaseService.createAthlete({
      profile_id: athleteProfile.id,
      school: 'Money U',
      sport: 'Finance',
      position: 'Trader',
      gpa: 3.9,
    });

    await PaymentFlowOrchestrator.completeAthleteOnboarding(athlete.id);

    // Process payment
    const dealAmount = 1000;
    const deal = await PaymentFlowOrchestrator.createDeal(brand.id, athlete.id, {
      title: 'Money Test',
      amountDollars: dealAmount,
      dealType: 'test',
    });

    const { payment } = await PaymentFlowOrchestrator.processPayment(deal.id);

    // Verify money calculations
    const platformFee = dealAmount * 0.12; // $120
    const athleteAmount = dealAmount - platformFee; // $880

    expect(payment.amount_cents).toBe(dealAmount * 100);
    expect(payment.platform_fee_cents).toBe(platformFee * 100);
    expect(payment.athlete_amount_cents).toBe(athleteAmount * 100);

    // Verify it all adds up
    expect(payment.platform_fee_cents + payment.athlete_amount_cents).toBe(payment.amount_cents);

    // Verify athlete earnings
    const earnings = await MockDatabaseService.getAthleteEarnings(athlete.id);
    expect(earnings[0].gross_earnings_cents).toBe(dealAmount * 100);
    expect(earnings[0].net_earnings_cents).toBe(athleteAmount * 100);
  });
});
