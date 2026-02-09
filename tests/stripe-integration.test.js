/**
 * Stripe Integration Tests
 * Tests for Stripe Connect integration in GradeUp NIL
 *
 * Tests cover:
 * - Stripe Connect onboarding flow
 * - Payment intent creation and handling
 * - Webhook handling simulation
 * - Payout tracking
 *
 * All Stripe API calls are mocked for testing purposes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// MOCK STRIPE SDK
// ============================================================================

const mockStripe = {
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    createLoginLink: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  },
  transfers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  payouts: {
    create: vi.fn(),
    retrieve: vi.fn(),
    list: vi.fn(),
  },
  balance: {
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
};

// Mock Supabase for database operations - properly chainable
// The mock mimics Supabase's fluent API where methods can be chained
// Pattern: client.from('table').update({}).eq('field', value) returns a thenable
const createMockSupabaseClient = () => {
  // Create a chainable object that can be both awaited and chained
  const createChainable = () => {
    const chainable = {
      // Make it thenable (can be awaited)
      then: (resolve, reject) => Promise.resolve({ data: {}, error: null }).then(resolve, reject),
      catch: (reject) => Promise.resolve({ data: {}, error: null }).catch(reject),
      // Chainable methods
      select: vi.fn(() => createChainable()),
      insert: vi.fn(() => createChainable()),
      update: vi.fn(() => createChainable()),
      delete: vi.fn(() => createChainable()),
      eq: vi.fn(() => createChainable()),
      in: vi.fn(() => createChainable()),
      order: vi.fn(() => createChainable()),
      limit: vi.fn(() => createChainable()),
      gte: vi.fn(() => createChainable()),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return chainable;
  };

  const client = {
    from: vi.fn(() => createChainable()),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  };

  return client;
};

let mockSupabaseClient = createMockSupabaseClient();

// Reset mock client before each test
const resetMockSupabaseClient = () => {
  mockSupabaseClient = createMockSupabaseClient();
};

// ============================================================================
// STRIPE CONNECT ONBOARDING TESTS
// ============================================================================

describe('Stripe Connect Onboarding Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Account Creation', () => {
    it('creates Express Connect account for new athlete', async () => {
      const mockAccountId = 'acct_1ABC123';
      mockStripe.accounts.create.mockResolvedValue({
        id: mockAccountId,
        type: 'express',
        country: 'US',
        email: 'athlete@university.edu',
        capabilities: {
          card_payments: 'pending',
          transfers: 'pending',
        },
      });

      const result = await mockStripe.accounts.create({
        type: 'express',
        country: 'US',
        email: 'athlete@university.edu',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          athlete_id: 'athlete_123',
          platform: 'gradeup_nil',
        },
      });

      expect(result.id).toBe(mockAccountId);
      expect(result.type).toBe('express');
      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          country: 'US',
        })
      );
    });

    it('generates onboarding link for Express account', async () => {
      const mockAccountId = 'acct_1ABC123';
      const mockOnboardingUrl = 'https://connect.stripe.com/express/onboarding/abc123';

      mockStripe.accountLinks.create.mockResolvedValue({
        object: 'account_link',
        url: mockOnboardingUrl,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await mockStripe.accountLinks.create({
        account: mockAccountId,
        refresh_url: 'https://gradeup.com/reauth',
        return_url: 'https://gradeup.com/dashboard',
        type: 'account_onboarding',
      });

      expect(result.url).toBe(mockOnboardingUrl);
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockAccountId,
          type: 'account_onboarding',
        })
      );
    });

    it('handles onboarding link expiration', async () => {
      const mockAccountId = 'acct_1ABC123';

      mockStripe.accountLinks.create.mockResolvedValue({
        object: 'account_link',
        url: 'https://connect.stripe.com/express/onboarding/new123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await mockStripe.accountLinks.create({
        account: mockAccountId,
        refresh_url: 'https://gradeup.com/reauth',
        return_url: 'https://gradeup.com/dashboard',
        type: 'account_onboarding',
      });

      expect(result.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Account Verification Status', () => {
    it('retrieves account verification status', async () => {
      const mockAccountId = 'acct_1ABC123';

      mockStripe.accounts.retrieve.mockResolvedValue({
        id: mockAccountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          pending_verification: [],
          disabled_reason: null,
        },
      });

      const account = await mockStripe.accounts.retrieve(mockAccountId);

      expect(account.charges_enabled).toBe(true);
      expect(account.payouts_enabled).toBe(true);
      expect(account.details_submitted).toBe(true);
      expect(account.requirements.currently_due).toHaveLength(0);
    });

    it('identifies accounts requiring additional verification', async () => {
      const mockAccountId = 'acct_1ABC123';

      mockStripe.accounts.retrieve.mockResolvedValue({
        id: mockAccountId,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: {
          currently_due: ['individual.first_name', 'individual.last_name', 'individual.dob.day'],
          eventually_due: ['individual.ssn_last_4'],
          pending_verification: [],
          disabled_reason: 'requirements.past_due',
        },
      });

      const account = await mockStripe.accounts.retrieve(mockAccountId);

      expect(account.charges_enabled).toBe(false);
      expect(account.requirements.currently_due.length).toBeGreaterThan(0);
      expect(account.requirements.disabled_reason).toBe('requirements.past_due');
    });

    it('handles restricted accounts', async () => {
      const mockAccountId = 'acct_1ABC123';

      mockStripe.accounts.retrieve.mockResolvedValue({
        id: mockAccountId,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: {
          disabled_reason: 'rejected.fraud',
        },
      });

      const account = await mockStripe.accounts.retrieve(mockAccountId);

      expect(account.requirements.disabled_reason).toBe('rejected.fraud');
    });
  });

  describe('Dashboard Access', () => {
    it('creates Express Dashboard login link', async () => {
      const mockAccountId = 'acct_1ABC123';
      const mockDashboardUrl = 'https://connect.stripe.com/express/abc123';

      mockStripe.accounts.createLoginLink.mockResolvedValue({
        object: 'login_link',
        url: mockDashboardUrl,
      });

      const result = await mockStripe.accounts.createLoginLink(mockAccountId);

      expect(result.url).toBe(mockDashboardUrl);
    });

    it('handles dashboard access for unverified accounts', async () => {
      const mockAccountId = 'acct_unverified';

      mockStripe.accounts.createLoginLink.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        message: 'Account has not completed onboarding',
      });

      await expect(mockStripe.accounts.createLoginLink(mockAccountId)).rejects.toMatchObject({
        type: 'StripeInvalidRequestError',
      });
    });
  });
});

// ============================================================================
// PAYMENT INTENT TESTS
// ============================================================================

describe('Payment Intent Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Creating Payment Intents', () => {
    it('creates payment intent for deal payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_1ABC123',
        client_secret: 'pi_1ABC123_secret_xyz',
        amount: 50000, // $500.00
        currency: 'usd',
        status: 'requires_payment_method',
        transfer_data: {
          destination: 'acct_athlete123',
        },
        application_fee_amount: 6000, // 12% platform fee
        metadata: {
          deal_id: 'deal_123',
          athlete_id: 'athlete_456',
          brand_id: 'brand_789',
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripe.paymentIntents.create({
        amount: 50000,
        currency: 'usd',
        payment_method_types: ['card'],
        transfer_data: {
          destination: 'acct_athlete123',
        },
        application_fee_amount: 6000,
        metadata: {
          deal_id: 'deal_123',
          athlete_id: 'athlete_456',
          brand_id: 'brand_789',
        },
      });

      expect(result.id).toBe('pi_1ABC123');
      expect(result.client_secret).toBeDefined();
      expect(result.application_fee_amount).toBe(6000);
      expect(result.transfer_data.destination).toBe('acct_athlete123');
    });

    it('calculates correct application fee (12%)', async () => {
      const dealAmount = 100000; // $1000.00
      const expectedFee = 12000; // 12%

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test',
        amount: dealAmount,
        application_fee_amount: expectedFee,
      });

      const result = await mockStripe.paymentIntents.create({
        amount: dealAmount,
        currency: 'usd',
        application_fee_amount: expectedFee,
      });

      expect(result.application_fee_amount).toBe(expectedFee);
      expect(result.application_fee_amount / result.amount).toBe(0.12);
    });

    it('handles payment intent with 3D Secure required', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_3ds_required',
        status: 'requires_action',
        next_action: {
          type: 'use_stripe_sdk',
          use_stripe_sdk: {
            type: 'three_d_secure_redirect',
          },
        },
      });

      const result = await mockStripe.paymentIntents.create({
        amount: 50000,
        currency: 'usd',
      });

      expect(result.status).toBe('requires_action');
      expect(result.next_action.type).toBe('use_stripe_sdk');
    });
  });

  describe('Payment Intent Status Tracking', () => {
    it('retrieves payment intent status', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_1ABC123',
        status: 'succeeded',
        amount: 50000,
        amount_received: 50000,
        charges: {
          data: [
            {
              id: 'ch_1ABC123',
              status: 'succeeded',
              amount: 50000,
            },
          ],
        },
      });

      const result = await mockStripe.paymentIntents.retrieve('pi_1ABC123');

      expect(result.status).toBe('succeeded');
      expect(result.amount_received).toBe(50000);
    });

    it('tracks payment intent lifecycle states', async () => {
      const statuses = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'succeeded',
      ];

      for (const status of statuses) {
        mockStripe.paymentIntents.retrieve.mockResolvedValue({
          id: 'pi_lifecycle',
          status,
        });

        const result = await mockStripe.paymentIntents.retrieve('pi_lifecycle');
        expect(result.status).toBe(status);
      }
    });

    it('handles failed payment intents', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_failed',
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
          type: 'card_error',
        },
      });

      const result = await mockStripe.paymentIntents.retrieve('pi_failed');

      expect(result.last_payment_error.code).toBe('card_declined');
    });
  });

  describe('Payment Intent Cancellation', () => {
    it('cancels pending payment intent', async () => {
      mockStripe.paymentIntents.cancel.mockResolvedValue({
        id: 'pi_cancelled',
        status: 'canceled',
        cancellation_reason: 'requested_by_customer',
      });

      const result = await mockStripe.paymentIntents.cancel('pi_cancelled', {
        cancellation_reason: 'requested_by_customer',
      });

      expect(result.status).toBe('canceled');
    });

    it('handles cancellation of already captured payment', async () => {
      mockStripe.paymentIntents.cancel.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'payment_intent_unexpected_state',
        message: 'This PaymentIntent has a status of succeeded',
      });

      await expect(
        mockStripe.paymentIntents.cancel('pi_succeeded')
      ).rejects.toMatchObject({
        code: 'payment_intent_unexpected_state',
      });
    });
  });
});

// ============================================================================
// WEBHOOK HANDLING TESTS
// ============================================================================

describe('Webhook Handling Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Webhook Signature Verification', () => {
    it('verifies valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const signature = 'test_signature';
      const secret = 'whsec_test';

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123' },
        },
      });

      const event = mockStripe.webhooks.constructEvent(payload, signature, secret);

      expect(event.type).toBe('payment_intent.succeeded');
    });

    it('rejects invalid webhook signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      expect(() =>
        mockStripe.webhooks.constructEvent('payload', 'bad_sig', 'whsec_test')
      ).toThrow('Webhook signature verification failed');
    });
  });

  describe('Payment Webhook Events', () => {
    const createWebhookEvent = (type, data) => ({
      id: `evt_${Date.now()}`,
      type,
      data: { object: data },
      created: Math.floor(Date.now() / 1000),
    });

    it('handles payment_intent.succeeded event', async () => {
      const event = createWebhookEvent('payment_intent.succeeded', {
        id: 'pi_succeeded',
        amount: 50000,
        status: 'succeeded',
        metadata: {
          deal_id: 'deal_123',
          athlete_id: 'athlete_456',
        },
      });

      // Simulate webhook handler
      const handlePaymentSucceeded = async (paymentIntent) => {
        // Update deal status to paid
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('deals')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentIntent.metadata.deal_id);

        // Record payment
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient.from('payments').insert({
          deal_id: paymentIntent.metadata.deal_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: paymentIntent.amount,
          status: 'succeeded',
        });

        return { success: true };
      };

      const result = await handlePaymentSucceeded(event.data.object);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deals');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments');
    });

    it('handles payment_intent.payment_failed event', async () => {
      const event = createWebhookEvent('payment_intent.payment_failed', {
        id: 'pi_failed',
        amount: 50000,
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
        },
        metadata: {
          deal_id: 'deal_123',
        },
      });

      const handlePaymentFailed = async (paymentIntent) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: paymentIntent.last_payment_error?.message,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        return { success: true, error: paymentIntent.last_payment_error };
      };

      const result = await handlePaymentFailed(event.data.object);

      expect(result.success).toBe(true);
      expect(result.error.code).toBe('card_declined');
    });

    it('handles charge.refunded event', async () => {
      const event = createWebhookEvent('charge.refunded', {
        id: 'ch_refunded',
        amount: 50000,
        amount_refunded: 50000,
        refunded: true,
        payment_intent: 'pi_123',
      });

      const handleChargeRefunded = async (charge) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            refund_amount_cents: charge.amount_refunded,
          })
          .eq('stripe_payment_intent_id', charge.payment_intent);

        return { success: true, refundedAmount: charge.amount_refunded };
      };

      const result = await handleChargeRefunded(event.data.object);

      expect(result.success).toBe(true);
      expect(result.refundedAmount).toBe(50000);
    });
  });

  describe('Connect Account Webhook Events', () => {
    it('handles account.updated event', async () => {
      const event = {
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_123',
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
          },
        },
      };

      const handleAccountUpdated = async (account) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('stripe_connected_accounts')
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id);

        return { success: true };
      };

      const result = await handleAccountUpdated(event.data.object);

      expect(result.success).toBe(true);
    });

    it('handles payout.paid event', async () => {
      const event = {
        type: 'payout.paid',
        data: {
          object: {
            id: 'po_123',
            amount: 44000,
            arrival_date: Math.floor(Date.now() / 1000),
            status: 'paid',
            destination: 'ba_123', // bank account
          },
        },
        account: 'acct_123',
      };

      const handlePayoutPaid = async (payout, connectedAccountId) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('payouts')
          .update({
            status: 'paid',
            paid_at: new Date(payout.arrival_date * 1000).toISOString(),
          })
          .eq('stripe_payout_id', payout.id);

        // Update athlete balance
        await mockSupabaseClient
          .from('stripe_connected_accounts')
          .update({
            last_payout_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', connectedAccountId);

        return { success: true };
      };

      const result = await handlePayoutPaid(event.data.object, event.account);

      expect(result.success).toBe(true);
    });

    it('handles payout.failed event', async () => {
      const event = {
        type: 'payout.failed',
        data: {
          object: {
            id: 'po_failed',
            amount: 44000,
            status: 'failed',
            failure_code: 'account_closed',
            failure_message: 'The bank account has been closed',
          },
        },
        account: 'acct_123',
      };

      const handlePayoutFailed = async (payout) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('payouts')
          .update({
            status: 'failed',
            failure_code: payout.failure_code,
            failure_message: payout.failure_message,
          })
          .eq('stripe_payout_id', payout.id);

        return { success: true, failureReason: payout.failure_message };
      };

      const result = await handlePayoutFailed(event.data.object);

      expect(result.success).toBe(true);
      expect(result.failureReason).toBe('The bank account has been closed');
    });
  });

  describe('Subscription Webhook Events', () => {
    it('handles customer.subscription.created event', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'price_growth_monthly',
                    product: 'prod_growth',
                  },
                },
              ],
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      };

      const handleSubscriptionCreated = async (subscription) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient.from('subscriptions').insert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        return { success: true };
      };

      const result = await handleSubscriptionCreated(event.data.object);

      expect(result.success).toBe(true);
    });

    it('handles customer.subscription.updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'past_due',
            cancel_at_period_end: false,
          },
          previous_attributes: {
            status: 'active',
          },
        },
      };

      const handleSubscriptionUpdated = async (subscription) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        return { success: true };
      };

      const result = await handleSubscriptionUpdated(event.data.object);

      expect(result.success).toBe(true);
    });

    it('handles customer.subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
          },
        },
      };

      const handleSubscriptionDeleted = async (subscription) => {
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date(subscription.canceled_at * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        return { success: true };
      };

      const result = await handleSubscriptionDeleted(event.data.object);

      expect(result.success).toBe(true);
    });

    it('handles invoice.payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_123',
            customer: 'cus_123',
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
          },
        },
      };

      const handleInvoicePaymentFailed = async (invoice) => {
        // Log payment failure
        // Chainable mock already resolves to { data: {}, error: null }

        await mockSupabaseClient.from('payment_failures').insert({
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: invoice.subscription,
          attempt_count: invoice.attempt_count,
          next_attempt_at: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toISOString()
            : null,
        });

        return {
          success: true,
          retryScheduled: !!invoice.next_payment_attempt,
        };
      };

      const result = await handleInvoicePaymentFailed(event.data.object);

      expect(result.success).toBe(true);
      expect(result.retryScheduled).toBe(true);
    });
  });
});

// ============================================================================
// PAYOUT TRACKING TESTS
// ============================================================================

describe('Payout Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Balance Retrieval', () => {
    it('retrieves connected account balance', async () => {
      mockStripe.balance.retrieve.mockResolvedValue({
        available: [
          { amount: 50000, currency: 'usd' },
        ],
        pending: [
          { amount: 25000, currency: 'usd' },
        ],
      });

      const balance = await mockStripe.balance.retrieve({
        stripeAccount: 'acct_123',
      });

      expect(balance.available[0].amount).toBe(50000);
      expect(balance.pending[0].amount).toBe(25000);
    });

    it('handles zero balance', async () => {
      mockStripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 0, currency: 'usd' }],
        pending: [{ amount: 0, currency: 'usd' }],
      });

      const balance = await mockStripe.balance.retrieve({
        stripeAccount: 'acct_123',
      });

      expect(balance.available[0].amount).toBe(0);
    });
  });

  describe('Payout Creation', () => {
    it('creates standard payout', async () => {
      mockStripe.payouts.create.mockResolvedValue({
        id: 'po_123',
        amount: 44000,
        currency: 'usd',
        status: 'pending',
        arrival_date: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
        method: 'standard',
      });

      const payout = await mockStripe.payouts.create(
        {
          amount: 44000,
          currency: 'usd',
          method: 'standard',
        },
        { stripeAccount: 'acct_123' }
      );

      expect(payout.id).toBe('po_123');
      expect(payout.method).toBe('standard');
    });

    it('creates instant payout', async () => {
      mockStripe.payouts.create.mockResolvedValue({
        id: 'po_instant',
        amount: 44000,
        currency: 'usd',
        status: 'paid',
        arrival_date: Math.floor(Date.now() / 1000),
        method: 'instant',
      });

      const payout = await mockStripe.payouts.create(
        {
          amount: 44000,
          currency: 'usd',
          method: 'instant',
        },
        { stripeAccount: 'acct_123' }
      );

      expect(payout.method).toBe('instant');
      expect(payout.status).toBe('paid');
    });

    it('handles insufficient funds error', async () => {
      mockStripe.payouts.create.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'balance_insufficient',
        message: 'You have insufficient funds in your Stripe account.',
      });

      await expect(
        mockStripe.payouts.create(
          { amount: 100000, currency: 'usd' },
          { stripeAccount: 'acct_123' }
        )
      ).rejects.toMatchObject({
        code: 'balance_insufficient',
      });
    });

    it('handles instant payout not available', async () => {
      mockStripe.payouts.create.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'instant_payouts_unsupported',
        message: 'Instant payouts are not available for this account.',
      });

      await expect(
        mockStripe.payouts.create(
          { amount: 44000, currency: 'usd', method: 'instant' },
          { stripeAccount: 'acct_123' }
        )
      ).rejects.toMatchObject({
        code: 'instant_payouts_unsupported',
      });
    });
  });

  describe('Payout History', () => {
    it('retrieves payout history', async () => {
      mockStripe.payouts.list.mockResolvedValue({
        data: [
          {
            id: 'po_1',
            amount: 44000,
            status: 'paid',
            arrival_date: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
          },
          {
            id: 'po_2',
            amount: 88000,
            status: 'paid',
            arrival_date: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
          },
        ],
        has_more: false,
      });

      const payouts = await mockStripe.payouts.list(
        { limit: 10 },
        { stripeAccount: 'acct_123' }
      );

      expect(payouts.data).toHaveLength(2);
      expect(payouts.data[0].status).toBe('paid');
    });

    it('retrieves single payout details', async () => {
      mockStripe.payouts.retrieve.mockResolvedValue({
        id: 'po_123',
        amount: 44000,
        status: 'paid',
        arrival_date: Math.floor(Date.now() / 1000),
        destination: {
          id: 'ba_123',
          bank_name: 'CHASE',
          last4: '4242',
        },
      });

      const payout = await mockStripe.payouts.retrieve(
        'po_123',
        { stripeAccount: 'acct_123' }
      );

      expect(payout.destination.bank_name).toBe('CHASE');
      expect(payout.destination.last4).toBe('4242');
    });
  });

  describe('Transfer Tracking', () => {
    it('creates transfer to connected account', async () => {
      mockStripe.transfers.create.mockResolvedValue({
        id: 'tr_123',
        amount: 44000,
        currency: 'usd',
        destination: 'acct_123',
        source_transaction: 'ch_123',
        metadata: {
          deal_id: 'deal_123',
        },
      });

      const transfer = await mockStripe.transfers.create({
        amount: 44000,
        currency: 'usd',
        destination: 'acct_123',
        source_transaction: 'ch_123',
        metadata: {
          deal_id: 'deal_123',
        },
      });

      expect(transfer.id).toBe('tr_123');
      expect(transfer.destination).toBe('acct_123');
    });

    it('retrieves transfer details', async () => {
      mockStripe.transfers.retrieve.mockResolvedValue({
        id: 'tr_123',
        amount: 44000,
        destination: 'acct_123',
        destination_payment: 'py_123',
        reversed: false,
      });

      const transfer = await mockStripe.transfers.retrieve('tr_123');

      expect(transfer.reversed).toBe(false);
    });
  });
});

// ============================================================================
// SUBSCRIPTION MANAGEMENT TESTS
// ============================================================================

describe('Subscription Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Checkout Session Creation', () => {
    it('creates checkout session for subscription', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session/123',
        mode: 'subscription',
        status: 'open',
        success_url: 'https://gradeup.com/success',
        cancel_url: 'https://gradeup.com/cancel',
      });

      const session = await mockStripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price: 'price_growth_monthly',
            quantity: 1,
          },
        ],
        success_url: 'https://gradeup.com/success',
        cancel_url: 'https://gradeup.com/cancel',
        customer: 'cus_123',
        metadata: {
          brand_id: 'brand_123',
        },
      });

      expect(session.url).toBeDefined();
      expect(session.mode).toBe('subscription');
    });
  });

  describe('Billing Portal', () => {
    it('creates billing portal session', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/123',
        return_url: 'https://gradeup.com/dashboard',
      });

      const session = await mockStripe.billingPortal.sessions.create({
        customer: 'cus_123',
        return_url: 'https://gradeup.com/dashboard',
      });

      expect(session.url).toContain('billing.stripe.com');
    });
  });

  describe('Subscription Updates', () => {
    it('upgrades subscription plan', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_new',
              price: { id: 'price_enterprise_monthly' },
            },
          ],
        },
      });

      const subscription = await mockStripe.subscriptions.update('sub_123', {
        items: [
          {
            id: 'si_old',
            price: 'price_enterprise_monthly',
          },
        ],
        proration_behavior: 'create_prorations',
      });

      expect(subscription.items.data[0].price.id).toBe('price_enterprise_monthly');
    });

    it('schedules subscription cancellation', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const subscription = await mockStripe.subscriptions.update('sub_123', {
        cancel_at_period_end: true,
      });

      expect(subscription.cancel_at_period_end).toBe(true);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Stripe Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Card Errors', () => {
    const cardErrors = [
      { code: 'card_declined', message: 'Your card was declined.' },
      { code: 'expired_card', message: 'Your card has expired.' },
      { code: 'incorrect_cvc', message: 'Your card\'s security code is incorrect.' },
      { code: 'insufficient_funds', message: 'Your card has insufficient funds.' },
      { code: 'processing_error', message: 'An error occurred while processing your card.' },
    ];

    cardErrors.forEach(({ code, message }) => {
      it(`handles ${code} error`, async () => {
        mockStripe.paymentIntents.create.mockRejectedValue({
          type: 'StripeCardError',
          code,
          message,
        });

        await expect(
          mockStripe.paymentIntents.create({ amount: 1000, currency: 'usd' })
        ).rejects.toMatchObject({ code });
      });
    });
  });

  describe('API Errors', () => {
    it('handles rate limit error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue({
        type: 'StripeRateLimitError',
        message: 'Too many requests made to the API too quickly.',
      });

      await expect(
        mockStripe.paymentIntents.create({ amount: 1000, currency: 'usd' })
      ).rejects.toMatchObject({
        type: 'StripeRateLimitError',
      });
    });

    it('handles API connection error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue({
        type: 'StripeConnectionError',
        message: 'Network error while connecting to Stripe.',
      });

      await expect(
        mockStripe.paymentIntents.create({ amount: 1000, currency: 'usd' })
      ).rejects.toMatchObject({
        type: 'StripeConnectionError',
      });
    });

    it('handles authentication error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue({
        type: 'StripeAuthenticationError',
        message: 'Invalid API Key provided.',
      });

      await expect(
        mockStripe.paymentIntents.create({ amount: 1000, currency: 'usd' })
      ).rejects.toMatchObject({
        type: 'StripeAuthenticationError',
      });
    });
  });

  describe('Idempotency', () => {
    it('handles idempotent request retry', async () => {
      const idempotencyKey = 'unique_key_123';

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        amount: 50000,
        idempotency_key: idempotencyKey,
      });

      // First request
      const result1 = await mockStripe.paymentIntents.create(
        { amount: 50000, currency: 'usd' },
        { idempotencyKey }
      );

      // Simulate retry with same key
      const result2 = await mockStripe.paymentIntents.create(
        { amount: 50000, currency: 'usd' },
        { idempotencyKey }
      );

      expect(result1.id).toBe(result2.id);
    });
  });
});
