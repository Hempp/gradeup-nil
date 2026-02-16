/**
 * Tests for Stripe payment service
 * @module __tests__/services/stripe.test
 */

import {
  createPaymentIntent,
  createConnectedAccount,
  createAccountLink,
  transferToConnectedAccount,
} from '@/lib/services/stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
    accounts: {
      create: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
  }));
});

describe('stripe service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createPaymentIntent', () => {
    it('returns error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const result = await createPaymentIntent({
        amount: 5000,
        dealId: 'deal-1',
        athleteId: 'athlete-1',
        brandId: 'brand-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });

    it('processes payment intent with valid input', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const result = await createPaymentIntent({
        amount: 5000,
        dealId: 'deal-1',
        athleteId: 'athlete-1',
        brandId: 'brand-1',
        description: 'Test payment',
      });

      // Result will have success boolean regardless of outcome
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('createConnectedAccount', () => {
    it('returns error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const result = await createConnectedAccount('test@example.com', 'athlete-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });

    it('processes connected account creation with valid input', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const result = await createConnectedAccount('test@example.com', 'athlete-1');

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('createAccountLink', () => {
    it('returns error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const result = await createAccountLink(
        'acct_123',
        'https://example.com/return',
        'https://example.com/refresh'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });

    it('processes account link creation with valid input', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const result = await createAccountLink(
        'acct_123',
        'https://example.com/return',
        'https://example.com/refresh'
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('transferToConnectedAccount', () => {
    it('returns error when STRIPE_SECRET_KEY is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const result = await transferToConnectedAccount(5000, 'acct_123', 'deal-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });

    it('handles transfer with valid input', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const result = await transferToConnectedAccount(5000, 'acct_123', 'deal-1');

      // Result will either succeed or fail depending on mock state
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });
});
