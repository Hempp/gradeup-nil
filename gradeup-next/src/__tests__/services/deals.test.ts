/**
 * Tests for the deals service
 * @module __tests__/services/deals.test
 */

import {
  getOpportunities,
  getAthleteDeals,
  getBrandDeals,
  getDealById,
  acceptDeal,
  rejectDeal,
  updateDealStatus,
  createDeal,
  completeDeal,
  cancelDeal,
  submitCounterOffer,
  type Deal,
  type DealFilters,
  type DealStatus,
  type DealType,
  type CreateDealInput,
} from '@/lib/services/deals';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder that properly tracks all calls
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  // All methods return the same mockQuery object for chaining
  // In Supabase, even range() returns a chainable query that can be awaited
  const chainableMethods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'range'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable) to return the final result when awaited
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockDeal: Deal = {
  id: 'deal-123',
  athlete_id: 'athlete-123',
  brand_id: 'brand-123',
  opportunity_id: null,
  title: 'Social Media Campaign',
  description: 'Instagram post promoting brand products',
  deal_type: 'social_post',
  status: 'pending',
  compensation_amount: 5000,
  compensation_type: 'fixed',
  start_date: '2024-01-15',
  end_date: '2024-02-15',
  created_at: '2024-01-01T00:00:00Z',
  brand: {
    company_name: 'Nike',
    logo_url: 'https://example.com/nike-logo.png',
  },
};

const mockOpportunity = {
  id: 'opp-123',
  brand_id: 'brand-123',
  title: 'Summer Campaign',
  description: 'Looking for athletes for summer campaign',
  deal_type: 'social_post' as DealType,
  compensation_amount: 3000,
  status: 'active' as const,
  brand: {
    company_name: 'Adidas',
    logo_url: 'https://example.com/adidas-logo.png',
  },
};

describe('deals service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOpportunities', () => {
    it('returns opportunities with default pagination', async () => {
      const mockQuery = createChainableQuery({ data: [mockOpportunity], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOpportunities();

      expect(result.opportunities).toEqual([mockOpportunity]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(10);
      expect(result.total_pages).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunities');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('applies deal type filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: [mockOpportunity], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: DealFilters = {
        deal_types: ['social_post', 'endorsement'],
      };

      await getOpportunities(filters);

      expect(mockQuery.in).toHaveBeenCalledWith('deal_type', ['social_post', 'endorsement']);
    });

    it('applies pagination correctly', async () => {
      const mockQuery = createChainableQuery({ data: [mockOpportunity], error: null, count: 50 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: DealFilters = {
        page: 2,
        page_size: 25,
      };

      const result = await getOpportunities(filters);

      // page 2 with page_size 25 means offset 25 to 49
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49);
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(25);
      expect(result.total_pages).toBe(2);
    });

    it('returns empty array when no opportunities found', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOpportunities();

      expect(result.opportunities).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.total_pages).toBe(0);
    });

    it('throws error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database connection error' }, count: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(getOpportunities()).rejects.toThrow('Failed to fetch opportunities');
    });
  });

  describe('getAthleteDeals', () => {
    it('returns deals for a specific athlete', async () => {
      const mockQuery = createChainableQuery({ data: [mockDeal], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteDeals('athlete-123');

      expect(result.deals).toEqual([mockDeal]);
      expect(result.total).toBe(1);
      expect(mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'athlete-123');
    });

    it('applies status filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: [mockDeal], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: DealFilters = {
        status: ['pending', 'active'],
      };

      await getAthleteDeals('athlete-123', filters);

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['pending', 'active']);
    });

    it('applies deal type filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: [mockDeal], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: DealFilters = {
        deal_types: ['social_post'],
      };

      await getAthleteDeals('athlete-123', filters);

      expect(mockQuery.in).toHaveBeenCalledWith('deal_type', ['social_post']);
    });

    it('throws error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' }, count: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(getAthleteDeals('athlete-123')).rejects.toThrow('Failed to fetch athlete deals');
    });
  });

  describe('getBrandDeals', () => {
    it('returns deals for a specific brand', async () => {
      const mockQuery = createChainableQuery({ data: [mockDeal], error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandDeals('brand-123');

      expect(result.deals).toEqual([mockDeal]);
      expect(result.total).toBe(1);
      expect(mockQuery.eq).toHaveBeenCalledWith('brand_id', 'brand-123');
    });

    it('throws error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' }, count: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(getBrandDeals('brand-123')).rejects.toThrow('Failed to fetch brand deals');
    });
  });

  describe('getDealById', () => {
    it('returns a single deal', async () => {
      const mockQuery = createChainableQuery({ data: mockDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDealById('deal-123');

      expect(result).toEqual(mockDeal);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'deal-123');
    });

    it('throws error when deal not found', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(getDealById('nonexistent')).rejects.toThrow('Failed to fetch deal');
    });
  });

  describe('acceptDeal', () => {
    it('updates deal status to accepted', async () => {
      const acceptedDeal = { ...mockDeal, status: 'accepted' as DealStatus };
      const mockQuery = createChainableQuery({ data: acceptedDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await acceptDeal('deal-123');

      expect(result.status).toBe('accepted');
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'accepted' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'deal-123');
    });

    it('throws error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(acceptDeal('deal-123')).rejects.toThrow('Failed to accept deal');
    });
  });

  describe('rejectDeal', () => {
    it('updates deal status to cancelled', async () => {
      const rejectedDeal = { ...mockDeal, status: 'cancelled' as DealStatus };
      const mockQuery = createChainableQuery({ data: rejectedDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectDeal('deal-123');

      expect(result.status).toBe('cancelled');
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'cancelled' });
    });

    it('includes rejection reason when provided', async () => {
      const rejectedDeal = { ...mockDeal, status: 'cancelled' as DealStatus };
      const mockQuery = createChainableQuery({ data: rejectedDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await rejectDeal('deal-123', 'Terms not acceptable');

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'cancelled',
        rejection_reason: 'Terms not acceptable',
      });
    });

    it('throws error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(rejectDeal('deal-123')).rejects.toThrow('Failed to reject deal');
    });
  });

  describe('updateDealStatus', () => {
    it('updates deal to any valid status', async () => {
      const statuses: DealStatus[] = ['draft', 'pending', 'negotiating', 'accepted', 'active', 'completed', 'cancelled', 'expired', 'rejected', 'paused'];

      for (const status of statuses) {
        const updatedDeal = { ...mockDeal, status };
        const mockQuery = createChainableQuery({ data: updatedDeal, error: null });
        const mockSupabase = {
          from: jest.fn().mockReturnValue(mockQuery),
        };
        mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

        const result = await updateDealStatus('deal-123', status);

        expect(result.status).toBe(status);
      }
    });

    it('throws error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await expect(updateDealStatus('deal-123', 'active')).rejects.toThrow('Failed to update deal status');
    });
  });

  describe('createDeal', () => {
    const dealInput: CreateDealInput = {
      athlete_id: 'athlete-123',
      brand_id: 'brand-123',
      title: 'New Campaign',
      deal_type: 'social_post',
      compensation_amount: 2500,
      compensation_type: 'fixed',
    };

    it('creates a new deal with pending status', async () => {
      const createdDeal = { ...mockDeal, ...dealInput, status: 'pending' as DealStatus };
      const mockQuery = createChainableQuery({ data: createdDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeal(dealInput);

      expect(result.data).toEqual(createdDeal);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...dealInput,
        status: 'pending',
      });
    });

    it('creates deal with optional fields', async () => {
      const fullInput: CreateDealInput = {
        ...dealInput,
        opportunity_id: 'opp-123',
        description: 'Full description',
        start_date: '2024-01-15',
        end_date: '2024-02-15',
        deliverables: '3 Instagram posts',
      };

      const createdDeal = { ...mockDeal, ...fullInput, status: 'pending' as DealStatus };
      const mockQuery = createChainableQuery({ data: createdDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeal(fullInput);

      expect(result.data).toEqual(createdDeal);
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...fullInput,
        status: 'pending',
      });
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Insert failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeal(dealInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to create deal');
    });
  });

  describe('completeDeal', () => {
    it('marks deal as completed', async () => {
      const completedDeal = { ...mockDeal, status: 'completed' as DealStatus };
      const mockQuery = createChainableQuery({ data: completedDeal, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await completeDeal('deal-123');

      expect(result.data?.status).toBe('completed');
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await completeDeal('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to complete deal');
    });
  });

  describe('cancelDeal', () => {
    it('cancels deal with reason', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Override eq to resolve directly for the cancel operation
      mockQuery.eq = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await cancelDeal('deal-123', 'Budget constraints');

      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancellation_reason: 'Budget constraints',
        })
      );
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await cancelDeal('deal-123', 'Some reason');

      expect(result.error?.message).toContain('Failed to cancel deal');
    });
  });

  describe('submitCounterOffer', () => {
    it('submits counter offer successfully', async () => {
      // Mock for history insert
      const historyQuery = createChainableQuery({ data: null, error: null });
      historyQuery.insert = jest.fn().mockResolvedValue({ error: null });

      // Mock for deal update
      const updateQuery = createChainableQuery({ data: { ...mockDeal, status: 'negotiating', compensation_amount: 6000 }, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deal_history' || callCount === 1) {
            return historyQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitCounterOffer('deal-123', {
        compensation_amount: 6000,
        counter_notes: 'Higher compensation requested',
      });

      expect(result.data?.status).toBe('negotiating');
      expect(result.data?.compensation_amount).toBe(6000);
      expect(result.error).toBeNull();
    });

    it('continues even if history logging fails', async () => {
      // Mock for history insert to fail
      const historyQuery = createChainableQuery({ data: null, error: null });
      historyQuery.insert = jest.fn().mockResolvedValue({ error: { message: 'History insert failed' } });

      // Mock for deal update to succeed
      const updateQuery = createChainableQuery({ data: { ...mockDeal, status: 'negotiating' }, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deal_history' || callCount === 1) {
            return historyQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitCounterOffer('deal-123', {
        compensation_amount: 6000,
      });

      // Should still succeed
      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns error on deal update failure', async () => {
      const historyQuery = createChainableQuery({ data: null, error: null });
      historyQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const updateQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deal_history' || callCount === 1) {
            return historyQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitCounterOffer('deal-123', {
        compensation_amount: 6000,
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to submit counter offer');
    });
  });
});
