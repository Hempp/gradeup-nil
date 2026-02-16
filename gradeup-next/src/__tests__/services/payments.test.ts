/**
 * Tests for the payments service
 * @module __tests__/services/payments.test
 */

import {
  getAthletePayments,
  getPaymentById,
  getEarningsSummary,
  getPaymentAccounts,
  addPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  requestPayout,
  type Payment,
  type PaymentStatus,
  type PaymentMethod,
  type PaymentAccount,
} from '@/lib/services/payments';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Sample test data
const mockPayment: Payment = {
  id: 'payment-123',
  deal_id: 'deal-123',
  amount: 5000,
  status: 'completed',
  payment_method: 'bank_transfer',
  scheduled_date: '2024-01-20',
  paid_at: '2024-01-20T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  deal: {
    title: 'Social Media Campaign',
    brand: {
      company_name: 'Nike',
      logo_url: 'https://example.com/nike-logo.png',
    },
  },
};

const mockPaymentAccount: PaymentAccount = {
  id: 'account-123',
  user_id: 'user-123',
  account_type: 'bank_transfer',
  account_details: {
    routing_number: '****1234',
    account_number: '****5678',
  },
  is_primary: true,
  is_verified: true,
};

// Helper to create chainable query mock
function createChainableQuery(finalResult: { data?: unknown; error?: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'neq', 'update', 'insert', 'delete', 'order'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Helper to create mock Supabase client
function createMockSupabase(options: {
  userId?: string | null;
  athleteId?: string | null;
  queryResult?: { data?: unknown; error?: unknown };
}) {
  const mockQuery = createChainableQuery(options.queryResult || { data: null, error: null });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.userId ? { id: options.userId } : null },
        error: null,
      }),
    },
    from: jest.fn().mockImplementation((table) => {
      if (table === 'athletes' && options.athleteId) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: options.athleteId },
            error: null,
          }),
        };
      }
      return mockQuery;
    }),
    mockQuery,
  };
}

describe('payments service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAthletePayments', () => {
    it('returns payments for authenticated athlete', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        athleteId: 'athlete-123',
        queryResult: { data: [mockPayment], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthletePayments();

      expect(result.data).toEqual([mockPayment]);
      expect(result.error).toBeNull();
    });

    it('returns payments for specific athlete ID', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        queryResult: { data: [mockPayment], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthletePayments('specific-athlete-id');

      expect(result.data).toEqual([mockPayment]);
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'specific-athlete-id');
    });

    it('returns error when athlete not found', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'athletes') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return createChainableQuery({ data: null, error: null });
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthletePayments();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Athlete not found');
    });

    it('handles database error', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        athleteId: 'athlete-123',
        queryResult: { data: null, error: { message: 'Database error' } },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthletePayments();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch payments');
    });
  });

  describe('getPaymentById', () => {
    it('returns payment by ID', async () => {
      const mockSupabase = createMockSupabase({
        queryResult: { data: mockPayment, error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPaymentById('payment-123');

      expect(result.data).toEqual(mockPayment);
      expect(result.error).toBeNull();
    });

    it('handles payment not found', async () => {
      const mockSupabase = createMockSupabase({
        queryResult: { data: null, error: { message: 'Not found' } },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPaymentById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch payment');
    });
  });

  describe('getEarningsSummary', () => {
    it('returns earnings summary for authenticated athlete', async () => {
      const now = new Date();
      const thisMonth = now.toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

      const payments = [
        { amount: 5000, status: 'completed', paid_at: thisMonth, created_at: thisMonth },
        { amount: 3000, status: 'completed', paid_at: lastMonth, created_at: lastMonth },
        { amount: 2000, status: 'pending', paid_at: null, created_at: thisMonth },
      ];

      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        athleteId: 'athlete-123',
        queryResult: { data: payments, error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getEarningsSummary();

      expect(result.data).toBeDefined();
      expect(result.data?.total_earned).toBeGreaterThan(0);
      expect(result.data?.pending_amount).toBe(2000);
      expect(result.error).toBeNull();
    });

    it('returns zero totals for no payments', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        athleteId: 'athlete-123',
        queryResult: { data: [], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getEarningsSummary();

      expect(result.data?.total_earned).toBe(0);
      expect(result.data?.pending_amount).toBe(0);
      expect(result.data?.this_month).toBe(0);
      expect(result.data?.last_month).toBe(0);
    });

    it('handles database error', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        athleteId: 'athlete-123',
        queryResult: { data: null, error: { message: 'Database error' } },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getEarningsSummary();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch earnings');
    });
  });

  describe('getPaymentAccounts', () => {
    it('returns payment accounts for authenticated user', async () => {
      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        queryResult: { data: [mockPaymentAccount], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPaymentAccounts();

      expect(result.data).toEqual([mockPaymentAccount]);
      expect(result.error).toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = createMockSupabase({
        userId: null,
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPaymentAccounts();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('addPaymentAccount', () => {
    it('adds a new payment account', async () => {
      const newAccount: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'> = {
        account_type: 'paypal',
        account_details: { email: 'user@example.com' },
        is_primary: false,
      };

      const mockSupabase = createMockSupabase({
        userId: 'user-123',
        queryResult: { data: { ...mockPaymentAccount, ...newAccount }, error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addPaymentAccount(newAccount);

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('sets other accounts to non-primary when adding primary', async () => {
      const primaryAccount: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'> = {
        account_type: 'bank_transfer',
        account_details: {},
        is_primary: true,
      };

      const mockQuery = createChainableQuery({ data: mockPaymentAccount, error: null });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await addPaymentAccount(primaryAccount);

      // Should have updated existing accounts to non-primary
      expect(mockQuery.update).toHaveBeenCalledWith({ is_primary: false });
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = createMockSupabase({ userId: null });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addPaymentAccount({
        account_type: 'paypal',
        account_details: {},
        is_primary: false,
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('updatePaymentAccount', () => {
    it('updates payment account', async () => {
      const updates = { is_primary: true };

      const mockQuery = createChainableQuery({
        data: { ...mockPaymentAccount, ...updates },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updatePaymentAccount('account-123', updates);

      expect(result.data?.is_primary).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = createMockSupabase({ userId: null });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updatePaymentAccount('account-123', { is_primary: true });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('deletePaymentAccount', () => {
    it('deletes payment account', async () => {
      // Create a properly chained delete mock
      const deleteChain = {
        eq: jest.fn().mockReturnThis(),
        then: function (onFulfilled: (value: unknown) => unknown) {
          return Promise.resolve({ error: null }).then(onFulfilled);
        },
      };

      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.delete = jest.fn().mockReturnValue(deleteChain);

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deletePaymentAccount('account-123');

      expect(result.error).toBeNull();
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = createMockSupabase({ userId: null });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deletePaymentAccount('account-123');

      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('requestPayout', () => {
    it('creates payout request for completed deal', async () => {
      const deal = {
        id: 'deal-123',
        compensation_amount: 5000,
        status: 'completed',
        athlete_id: 'athlete-123',
      };

      let fromCallCount = 0;
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          fromCallCount++;
          if (table === 'athletes') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { id: 'athlete-123' }, error: null }),
            };
          }
          if (table === 'deals') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: deal, error: null }),
            };
          }
          if (table === 'payments' && fromCallCount === 3) {
            // Check for existing payment
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };
          }
          // Create payment
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockPayment, error: null }),
          };
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestPayout('deal-123');

      expect(result.data).toEqual(mockPayment);
      expect(result.error).toBeNull();
    });

    it('returns error when deal not found', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'athletes') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { id: 'athlete-123' }, error: null }),
            };
          }
          if (table === 'deals') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            };
          }
          return createChainableQuery({ data: null, error: null });
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestPayout('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Deal not found');
    });

    it('returns error when deal not completed', async () => {
      const deal = {
        id: 'deal-123',
        compensation_amount: 5000,
        status: 'active',
        athlete_id: 'athlete-123',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'athletes') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { id: 'athlete-123' }, error: null }),
            };
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: deal, error: null }),
          };
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestPayout('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('must be completed');
    });

    it('returns error when payout already exists', async () => {
      const deal = {
        id: 'deal-123',
        compensation_amount: 5000,
        status: 'completed',
        athlete_id: 'athlete-123',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table) => {
          if (table === 'athletes') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { id: 'athlete-123' }, error: null }),
            };
          }
          if (table === 'deals') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: deal, error: null }),
            };
          }
          // Existing payment found
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockPayment, error: null }),
          };
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestPayout('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('already exists');
    });
  });

  describe('payment types', () => {
    it('handles all payment statuses', () => {
      const statuses: PaymentStatus[] = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      statuses.forEach((status) => {
        const payment: Payment = { ...mockPayment, status };
        expect(payment.status).toBe(status);
      });
    });

    it('handles all payment methods', () => {
      const methods: PaymentMethod[] = ['bank_transfer', 'paypal', 'venmo', 'check'];
      methods.forEach((method) => {
        const payment: Payment = { ...mockPayment, payment_method: method };
        expect(payment.payment_method).toBe(method);
      });
    });
  });
});
