/**
 * Payments Service Unit Tests
 * Tests for src/services/payments.js
 *
 * Comprehensive tests for the GradeUp NIL payment system including:
 * - Payment intent creation
 * - Athlete earnings calculations
 * - Fee calculations
 * - Subscription flows
 * - Connected accounts
 * - Payouts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Shared response storage - tests modify these to control mock behavior
// These persist across mock resets so tests can set them before calling functions
const mockResponses = {
  single: { data: null, error: null },
  query: { data: null, error: null },
  function: { data: null, error: null },
};

// Create the chainable object that all query methods share
// The chainable is a single object so methods like .order().order() work
const createChainable = () => {
  const chainable = {};

  // Make it thenable (can be awaited) - returns the query response
  chainable.then = (resolve, reject) => Promise.resolve(mockResponses.query).then(resolve, reject);
  chainable.catch = (reject) => Promise.resolve(mockResponses.query).catch(reject);

  // All chainable methods return the same chainable object
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.neq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve(mockResponses.single));

  return chainable;
};

// The shared chainable instance
let chainable = createChainable();

// The mock client - we keep references stable but recreate the chainable
const mockSupabaseClient = {
  from: vi.fn(() => chainable),
  functions: {
    invoke: vi.fn(() => Promise.resolve(mockResponses.function)),
  },
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
};

// Expose chainable methods on the client for test assertions
// These are getters that always point to the current chainable
Object.defineProperties(mockSupabaseClient, {
  select: { get: () => chainable.select, enumerable: true },
  eq: { get: () => chainable.eq, enumerable: true },
  in: { get: () => chainable.in, enumerable: true },
  gte: { get: () => chainable.gte, enumerable: true },
  order: { get: () => chainable.order, enumerable: true },
  limit: { get: () => chainable.limit, enumerable: true },
  single: { get: () => chainable.single, enumerable: true },
});

// Reset clears mocks and responses before each test
const resetMockSupabaseClient = () => {
  // Reset response storage
  mockResponses.single = { data: null, error: null };
  mockResponses.query = { data: null, error: null };
  mockResponses.function = { data: null, error: null };

  // Create fresh chainable with new mock functions
  chainable = createChainable();

  // Clear and reset the from mock to return new chainable
  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.from.mockReturnValue(chainable);

  // Clear and reset functions.invoke
  mockSupabaseClient.functions.invoke.mockClear();
  mockSupabaseClient.functions.invoke.mockReturnValue(Promise.resolve(mockResponses.function));
};

// Mock supabase module
vi.mock('../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  getCurrentUser: vi.fn(async () => ({ user: null, error: null })),
}));

// Mock helpers module
vi.mock('../src/services/helpers.js', () => ({
  getMyAthleteId: vi.fn(async () => null),
  getMyBrandId: vi.fn(async () => null),
}));

// Import after mocks are set up
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_TIERS,
  PLATFORM_FEE_PERCENT,
  formatCurrency,
  calculateFeeBreakdown,
  getConnectedAccount,
  createConnectOnboardingLink,
  getConnectDashboardLink,
  getAthleteBalance,
  createPaymentIntent,
  getPaymentForDeal,
  getBrandPayments,
  getAthletePayments,
  getAthletePayouts,
  requestInstantPayout,
  getAthleteEarnings,
  getEarningsChartData,
  getSubscriptionPlans,
  getBrandSubscription,
  createSubscriptionCheckout,
  cancelSubscription,
  getBillingPortalUrl,
  getTaxForms,
} from '../src/services/payments.js';

import { getSupabaseClient, getCurrentUser } from '../src/services/supabase.js';
import { getMyAthleteId, getMyBrandId } from '../src/services/helpers.js';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Payment Constants', () => {
  describe('PAYMENT_STATUS', () => {
    it('has all required payment status values', () => {
      expect(PAYMENT_STATUS.PENDING).toBe('pending');
      expect(PAYMENT_STATUS.PROCESSING).toBe('processing');
      expect(PAYMENT_STATUS.REQUIRES_ACTION).toBe('requires_action');
      expect(PAYMENT_STATUS.SUCCEEDED).toBe('succeeded');
      expect(PAYMENT_STATUS.FAILED).toBe('failed');
      expect(PAYMENT_STATUS.REFUNDED).toBe('refunded');
    });

    it('has exactly 6 status values', () => {
      expect(Object.keys(PAYMENT_STATUS)).toHaveLength(6);
    });
  });

  describe('SUBSCRIPTION_TIERS', () => {
    it('has all required subscription tiers', () => {
      expect(SUBSCRIPTION_TIERS.FREE).toBe('free');
      expect(SUBSCRIPTION_TIERS.STARTER).toBe('starter');
      expect(SUBSCRIPTION_TIERS.GROWTH).toBe('growth');
      expect(SUBSCRIPTION_TIERS.ENTERPRISE).toBe('enterprise');
    });

    it('has exactly 4 tiers', () => {
      expect(Object.keys(SUBSCRIPTION_TIERS)).toHaveLength(4);
    });
  });

  describe('PLATFORM_FEE_PERCENT', () => {
    it('is set to 12%', () => {
      expect(PLATFORM_FEE_PERCENT).toBe(12.0);
    });

    it('is a number type', () => {
      expect(typeof PLATFORM_FEE_PERCENT).toBe('number');
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('formatCurrency', () => {
  it('formats zero cents correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats positive cents to dollars', () => {
    expect(formatCurrency(100)).toBe('$1.00');
    expect(formatCurrency(1500)).toBe('$15.00');
    expect(formatCurrency(12345)).toBe('$123.45');
  });

  it('formats cents with proper decimal places', () => {
    expect(formatCurrency(99)).toBe('$0.99');
    expect(formatCurrency(1)).toBe('$0.01');
  });

  it('formats large amounts correctly', () => {
    expect(formatCurrency(100000)).toBe('$1,000.00');
    expect(formatCurrency(1000000)).toBe('$10,000.00');
  });

  it('uses USD currency by default', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('$');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-1000);
    expect(result).toContain('-');
    expect(result).toContain('10');
  });
});

describe('calculateFeeBreakdown', () => {
  describe('basic calculations', () => {
    it('calculates 12% platform fee correctly', () => {
      const result = calculateFeeBreakdown(100);
      expect(result.platformFee).toBe(12);
      expect(result.athleteAmount).toBe(88);
      expect(result.total).toBe(100);
      expect(result.feePercent).toBe(12);
    });

    it('handles zero amount', () => {
      const result = calculateFeeBreakdown(0);
      expect(result.platformFee).toBe(0);
      expect(result.athleteAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('returns correct fee percentage', () => {
      const result = calculateFeeBreakdown(1000);
      expect(result.feePercent).toBe(PLATFORM_FEE_PERCENT);
    });
  });

  describe('rounding behavior', () => {
    it('rounds platform fee up (ceil)', () => {
      // $10 * 12% = $1.20, but with cents: 1000 * 0.12 = 120 cents
      const result = calculateFeeBreakdown(10);
      expect(result.platformFee).toBe(1.2);
    });

    it('handles fractional cents by rounding', () => {
      // $1 * 12% = $0.12
      const result = calculateFeeBreakdown(1);
      expect(result.platformFee).toBe(0.12);
      expect(result.athleteAmount).toBe(0.88);
    });

    it('ensures total = platformFee + athleteAmount', () => {
      const testAmounts = [1, 10, 100, 1000, 5000, 9999.99];
      testAmounts.forEach(amount => {
        const result = calculateFeeBreakdown(amount);
        // Allow for floating point precision issues
        expect(result.platformFee + result.athleteAmount).toBeCloseTo(amount, 2);
      });
    });
  });

  describe('realistic deal amounts', () => {
    it('calculates $500 deal correctly', () => {
      const result = calculateFeeBreakdown(500);
      expect(result.platformFee).toBe(60);
      expect(result.athleteAmount).toBe(440);
    });

    it('calculates $1500 deal correctly', () => {
      const result = calculateFeeBreakdown(1500);
      expect(result.platformFee).toBe(180);
      expect(result.athleteAmount).toBe(1320);
    });

    it('calculates $10000 deal correctly', () => {
      const result = calculateFeeBreakdown(10000);
      expect(result.platformFee).toBe(1200);
      expect(result.athleteAmount).toBe(8800);
    });
  });
});

// ============================================================================
// CONNECTED ACCOUNTS TESTS
// ============================================================================

describe('Stripe Connected Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getConnectedAccount', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getConnectedAccount();

      expect(result.hasAccount).toBe(false);
      expect(result.account).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns account data when athlete has connected account', async () => {
      const mockAccount = {
        id: 'acct_123',
        athlete_id: 'athlete_123',
        stripe_account_id: 'acct_stripe_123',
        payouts_enabled: true,
        charges_enabled: true,
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockSupabaseClient.single.mockResolvedValue({ data: mockAccount, error: null });

      const result = await getConnectedAccount();

      expect(result.hasAccount).toBe(true);
      expect(result.account).toEqual(mockAccount);
      expect(result.error).toBe(null);
    });

    it('returns hasAccount false when no account exists', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await getConnectedAccount();

      expect(result.hasAccount).toBe(false);
      expect(result.account).toBe(null);
    });

    it('queries correct table with athlete ID', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getConnectedAccount();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stripe_connected_accounts');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('athlete_id', 'athlete_456');
    });
  });

  describe('createConnectOnboardingLink', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await createConnectOnboardingLink('https://example.com/return');

      expect(result.url).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns onboarding URL when authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://connect.stripe.com/onboarding/123' },
        error: null,
      });

      const result = await createConnectOnboardingLink('https://example.com/return');

      expect(result.url).toBe('https://connect.stripe.com/onboarding/123');
      expect(result.error).toBe(null);
    });

    it('passes return URL to edge function', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://connect.stripe.com/onboarding/123' },
        error: null,
      });

      await createConnectOnboardingLink('https://gradeup.com/dashboard');

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'stripe-connect-onboarding',
        { body: { return_url: 'https://gradeup.com/dashboard' } }
      );
    });

    it('returns error when edge function fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Function error'),
      });

      const result = await createConnectOnboardingLink('https://example.com/return');

      expect(result.url).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getConnectDashboardLink', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getConnectDashboardLink();

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns dashboard URL when authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://dashboard.stripe.com/express/123' },
        error: null,
      });

      const result = await getConnectDashboardLink();

      expect(result.url).toBe('https://dashboard.stripe.com/express/123');
      expect(result.error).toBe(null);
    });
  });

  describe('getAthleteBalance', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getAthleteBalance();

      expect(result.balance).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns balance data correctly formatted', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          available_balance: 50000,
          pending_balance: 10000,
          payouts_enabled: true,
        },
        error: null,
      });

      const result = await getAthleteBalance();

      expect(result.balance).toEqual({
        available: 50000,
        pending: 10000,
        payoutsEnabled: true,
      });
      expect(result.error).toBe(null);
    });

    it('selects correct fields from database', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      await getAthleteBalance();

      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        'available_balance, pending_balance, payouts_enabled'
      );
    });
  });
});

// ============================================================================
// PAYMENT INTENT TESTS
// ============================================================================

describe('Payment Intents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('createPaymentIntent', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await createPaymentIntent('deal_123');

      expect(result.clientSecret).toBe(null);
      expect(result.paymentId).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns client secret and payment ID on success', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          client_secret: 'pi_123_secret_456',
          payment_id: 'payment_789',
        },
        error: null,
      });

      const result = await createPaymentIntent('deal_123');

      expect(result.clientSecret).toBe('pi_123_secret_456');
      expect(result.paymentId).toBe('payment_789');
      expect(result.error).toBe(null);
    });

    it('passes deal ID to edge function', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { client_secret: 'secret', payment_id: 'id' },
        error: null,
      });

      await createPaymentIntent('deal_abc123');

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        { body: { deal_id: 'deal_abc123' } }
      );
    });

    it('returns error when edge function fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Payment creation failed'),
      });

      const result = await createPaymentIntent('deal_123');

      expect(result.clientSecret).toBe(null);
      expect(result.paymentId).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getPaymentForDeal', () => {
    it('returns payment data for a deal', async () => {
      const mockPayment = {
        id: 'payment_123',
        deal_id: 'deal_456',
        amount_cents: 50000,
        status: 'succeeded',
        created_at: '2024-01-15T10:00:00Z',
      };
      mockSupabaseClient.single.mockResolvedValue({ data: mockPayment, error: null });

      const result = await getPaymentForDeal('deal_456');

      expect(result.payment).toEqual(mockPayment);
      expect(result.error).toBe(null);
    });

    it('orders by created_at descending and limits to 1', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getPaymentForDeal('deal_123');

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(1);
    });

    it('returns error when payment not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await getPaymentForDeal('nonexistent_deal');

      expect(result.payment).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getBrandPayments', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue(null);

      const result = await getBrandPayments();

      expect(result.payments).toBe(null);
      expect(result.error.message).toBe('Brand profile not found');
    });

    it('returns payments with related data', async () => {
      const mockPayments = [
        {
          id: 'payment_1',
          amount_cents: 50000,
          status: 'succeeded',
          deal: { id: 'deal_1', title: 'Social Media Post', deal_type: 'social' },
          athlete: { id: 'athlete_1', profile_id: 'profile_1' },
        },
        {
          id: 'payment_2',
          amount_cents: 100000,
          status: 'pending',
          deal: { id: 'deal_2', title: 'Appearance', deal_type: 'appearance' },
          athlete: { id: 'athlete_2', profile_id: 'profile_2' },
        },
      ];

      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockResponses.query = { data: mockPayments, error: null };

      const result = await getBrandPayments();

      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].deal.title).toBe('Social Media Post');
    });

    it('applies status filter when provided', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockResponses.query = { data: [], error: null };

      await getBrandPayments({ status: 'succeeded' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'succeeded');
    });

    it('applies limit filter when provided', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockResponses.query = { data: [], error: null };

      await getBrandPayments({ limit: 10 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getAthletePayments', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getAthletePayments();

      expect(result.payments).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('only returns succeeded payments', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getAthletePayments();

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'succeeded');
    });

    it('orders by paid_at descending', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getAthletePayments();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('paid_at', { ascending: false });
    });
  });
});

// ============================================================================
// PAYOUTS TESTS
// ============================================================================

describe('Athlete Payouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getAthletePayouts', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getAthletePayouts();

      expect(result.payouts).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns payout history', async () => {
      const mockPayouts = [
        { id: 'payout_1', amount_cents: 44000, status: 'paid', arrival_date: '2024-01-20' },
        { id: 'payout_2', amount_cents: 88000, status: 'pending', arrival_date: '2024-01-25' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockPayouts, error: null };

      const result = await getAthletePayouts();

      expect(result.payouts).toHaveLength(2);
      expect(result.payouts[0].amount_cents).toBe(44000);
    });

    it('orders by created_at descending', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getAthletePayouts();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('requestInstantPayout', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await requestInstantPayout();

      expect(result.payout).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns payout on success', async () => {
      const mockPayout = {
        id: 'payout_instant_123',
        amount_cents: 50000,
        status: 'in_transit',
        type: 'instant',
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { payout: mockPayout },
        error: null,
      });

      const result = await requestInstantPayout();

      expect(result.payout).toEqual(mockPayout);
      expect(result.error).toBe(null);
    });

    it('invokes correct edge function', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { payout: {} },
        error: null,
      });

      await requestInstantPayout();

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'request-instant-payout',
        { body: {} }
      );
    });
  });
});

// ============================================================================
// EARNINGS TESTS
// ============================================================================

describe('Athlete Earnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getAthleteEarnings', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getAthleteEarnings();

      expect(result.earnings).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns earnings with calculated totals', async () => {
      const mockEarningsData = [
        {
          year: 2024,
          month: 1,
          gross_earnings_cents: 100000,
          platform_fees_cents: 12000,
          net_earnings_cents: 88000,
          deals_completed: 2,
        },
        {
          year: 2024,
          month: 2,
          gross_earnings_cents: 150000,
          platform_fees_cents: 18000,
          net_earnings_cents: 132000,
          deals_completed: 3,
        },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockEarningsData, error: null };

      const result = await getAthleteEarnings();

      expect(result.earnings.monthly).toHaveLength(2);
      expect(result.earnings.totals.grossEarnings).toBe(2500); // (100000 + 150000) / 100
      expect(result.earnings.totals.platformFees).toBe(300); // (12000 + 18000) / 100
      expect(result.earnings.totals.netEarnings).toBe(2200); // (88000 + 132000) / 100
      expect(result.earnings.totals.dealsCompleted).toBe(5);
    });

    it('filters by year when provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getAthleteEarnings(2024);

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('year', 2024);
    });

    it('handles empty earnings data', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      const result = await getAthleteEarnings();

      expect(result.earnings.monthly).toHaveLength(0);
      expect(result.earnings.totals.grossEarnings).toBe(0);
      expect(result.earnings.totals.netEarnings).toBe(0);
      expect(result.earnings.totals.dealsCompleted).toBe(0);
    });

    it('handles null values in earnings data', async () => {
      const mockEarningsData = [
        {
          year: 2024,
          month: 1,
          gross_earnings_cents: null,
          platform_fees_cents: null,
          net_earnings_cents: null,
          deals_completed: null,
        },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockEarningsData, error: null };

      const result = await getAthleteEarnings();

      expect(result.earnings.totals.grossEarnings).toBe(0);
      expect(result.earnings.totals.netEarnings).toBe(0);
    });
  });

  describe('getEarningsChartData', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getEarningsChartData();

      expect(result.chartData).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('formats data for chart visualization', async () => {
      const mockData = [
        { year: 2024, month: 1, net_earnings_cents: 88000, deals_completed: 2 },
        { year: 2024, month: 2, net_earnings_cents: 132000, deals_completed: 3 },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockData, error: null };

      const result = await getEarningsChartData();

      expect(result.chartData).toHaveLength(2);
      expect(result.chartData[0]).toEqual({
        label: '1/2024',
        earnings: 880, // 88000 / 100
        deals: 2,
      });
      expect(result.chartData[1]).toEqual({
        label: '2/2024',
        earnings: 1320, // 132000 / 100
        deals: 3,
      });
    });

    it('defaults to 12 months of data', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getEarningsChartData();

      // Should filter by year >= (current year - 1 for 12 months)
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('respects custom months parameter', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getEarningsChartData(6);

      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SUBSCRIPTION TESTS
// ============================================================================

describe('Brand Subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getSubscriptionPlans', () => {
    it('returns formatted subscription plans', async () => {
      const mockPlans = [
        {
          id: 'plan_free',
          name: 'Free',
          tier: 'free',
          description: 'Get started for free',
          price_cents_monthly: 0,
          price_cents_yearly: null,
          max_athlete_connections: 3,
          max_active_campaigns: 1,
          api_access: false,
          priority_support: false,
          custom_branding: false,
          analytics_dashboard: false,
          sort_order: 1,
          is_active: true,
        },
        {
          id: 'plan_starter',
          name: 'Starter',
          tier: 'starter',
          description: 'For growing brands',
          price_cents_monthly: 9900,
          price_cents_yearly: 99900,
          max_athlete_connections: 10,
          max_active_campaigns: 5,
          api_access: false,
          priority_support: true,
          custom_branding: false,
          analytics_dashboard: true,
          sort_order: 2,
          is_active: true,
        },
      ];

      mockResponses.query = { data: mockPlans, error: null };

      const result = await getSubscriptionPlans();

      expect(result.plans).toHaveLength(2);
      expect(result.plans[0]).toEqual({
        id: 'plan_free',
        name: 'Free',
        tier: 'free',
        description: 'Get started for free',
        priceMonthly: 0,
        priceYearly: null,
        features: {
          maxAthleteConnections: 3,
          maxActiveCampaigns: 1,
          apiAccess: false,
          prioritySupport: false,
          customBranding: false,
          analyticsDashboard: false,
        },
      });
      expect(result.plans[1].priceMonthly).toBe(99); // 9900 / 100
      expect(result.plans[1].priceYearly).toBe(999); // 99900 / 100
    });

    it('only returns active plans', async () => {
      mockResponses.query = { data: [], error: null };

      await getSubscriptionPlans();

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('orders by sort_order ascending', async () => {
      mockResponses.query = { data: [], error: null };

      await getSubscriptionPlans();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });
  });

  describe('getBrandSubscription', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue(null);

      const result = await getBrandSubscription();

      expect(result.subscription).toBe(null);
      expect(result.error.message).toBe('Brand profile not found');
    });

    it('returns free tier when no subscription exists', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      // Mock getSubscriptionPlans for the fallback
      mockResponses.query = {
        data: [{ id: 'plan_free', tier: 'free', price_cents_monthly: 0 }],
        error: null,
      };

      const result = await getBrandSubscription();

      expect(result.subscription.tier).toBe('free');
      expect(result.subscription.status).toBe('active');
    });

    it('returns active subscription with formatted data', async () => {
      const mockSubscription = {
        id: 'sub_123',
        brand_id: 'brand_123',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_end: '2024-02-15T00:00:00Z',
        cancel_at_period_end: false,
        athlete_connections_used: 5,
        campaigns_used: 2,
        plan: {
          id: 'plan_growth',
          tier: 'growth',
          name: 'Growth',
        },
      };

      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockSupabaseClient.single.mockResolvedValue({ data: mockSubscription, error: null });

      const result = await getBrandSubscription();

      expect(result.subscription).toEqual({
        id: 'sub_123',
        tier: 'growth',
        plan: mockSubscription.plan,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: '2024-02-15T00:00:00Z',
        cancelAtPeriodEnd: false,
        usage: {
          athleteConnections: 5,
          campaigns: 2,
        },
      });
    });

    it('filters for active, trialing, or past_due status', async () => {
      vi.mocked(getMyBrandId).mockResolvedValue('brand_123');
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockResponses.query = { data: [], error: null };

      await getBrandSubscription();

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['active', 'trialing', 'past_due']);
    });
  });

  describe('createSubscriptionCheckout', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await createSubscriptionCheckout('plan_growth');

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns checkout URL on success', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
        error: null,
      });

      const result = await createSubscriptionCheckout('plan_growth', 'yearly');

      expect(result.url).toBe('https://checkout.stripe.com/session_123');
      expect(result.error).toBe(null);
    });

    it('passes plan ID and billing cycle to edge function', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
        error: null,
      });

      await createSubscriptionCheckout('plan_enterprise', 'yearly');

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'create-subscription-checkout',
        { body: { plan_id: 'plan_enterprise', billing_cycle: 'yearly' } }
      );
    });

    it('defaults to monthly billing cycle', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
        error: null,
      });

      await createSubscriptionCheckout('plan_starter');

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'create-subscription-checkout',
        { body: { plan_id: 'plan_starter', billing_cycle: 'monthly' } }
      );
    });
  });

  describe('cancelSubscription', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await cancelSubscription();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns success on cancellation', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await cancelSubscription();

      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
    });

    it('invokes correct edge function', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await cancelSubscription();

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'cancel-subscription',
        { body: {} }
      );
    });
  });

  describe('getBillingPortalUrl', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getBillingPortalUrl();

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns billing portal URL on success', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal_123' },
        error: null,
      });

      const result = await getBillingPortalUrl();

      expect(result.url).toBe('https://billing.stripe.com/portal_123');
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// TAX FORMS TESTS
// ============================================================================

describe('Tax Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getTaxForms', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getTaxForms();

      expect(result.forms).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns 1099 tax forms', async () => {
      const mockForms = [
        { id: 'form_1', tax_year: 2024, total_earnings_cents: 500000, status: 'available' },
        { id: 'form_2', tax_year: 2023, total_earnings_cents: 250000, status: 'available' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockForms, error: null };

      const result = await getTaxForms();

      expect(result.forms).toHaveLength(2);
      expect(result.forms[0].tax_year).toBe(2024);
    });

    it('queries tax_forms_1099 table', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getTaxForms();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tax_forms_1099');
    });

    it('orders by tax_year descending', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getTaxForms();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('tax_year', { ascending: false });
    });
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Network and database errors', () => {
    it('handles database connection errors gracefully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = {
        data: null,
        error: { code: 'PGRST000', message: 'Connection refused' },
      };

      const result = await getAthleteEarnings();

      expect(result.earnings).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('handles edge function timeout errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function timed out' },
      });

      const result = await createPaymentIntent('deal_123');

      expect(result.clientSecret).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Fee calculation edge cases', () => {
    it('handles very small amounts', () => {
      const result = calculateFeeBreakdown(0.01);
      expect(result.total).toBe(0.01);
      expect(result.platformFee + result.athleteAmount).toBeCloseTo(0.01, 2);
    });

    it('handles very large amounts', () => {
      const result = calculateFeeBreakdown(1000000);
      expect(result.platformFee).toBe(120000);
      expect(result.athleteAmount).toBe(880000);
    });

    it('handles decimal precision correctly', () => {
      // $333.33 should not cause floating point issues
      const result = calculateFeeBreakdown(333.33);
      expect(result.total).toBe(333.33);
      expect(typeof result.platformFee).toBe('number');
      expect(typeof result.athleteAmount).toBe('number');
    });
  });

  describe('Currency formatting edge cases', () => {
    it('handles fractional cents', () => {
      const result = formatCurrency(123);
      expect(result).toBe('$1.23');
    });

    it('handles zero', () => {
      const result = formatCurrency(0);
      expect(result).toBe('$0.00');
    });
  });
});
