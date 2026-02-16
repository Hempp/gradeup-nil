/**
 * Tests for the brand service
 * @module __tests__/services/brand.test
 */

import {
  getMyBrandProfile,
  updateBrandProfile,
  getBrandCampaigns,
  createCampaign,
  updateCampaign,
  getBrandAnalytics,
  getShortlistedAthletes,
  addToShortlist,
  removeFromShortlist,
  type Brand,
  type Campaign,
  type BrandAnalytics,
} from '@/lib/services/brand';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'delete', 'range', 'limit', 'single'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable)
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockBrand: Brand = {
  id: 'brand-123',
  profile_id: 'profile-123',
  company_name: 'Nike',
  company_type: 'corporation',
  industry: 'sports',
  website_url: 'https://nike.com',
  logo_url: 'https://example.com/nike-logo.png',
  description: 'Leading sports brand',
  city: 'Portland',
  state: 'OR',
  contact_name: 'John Smith',
  contact_title: 'Marketing Director',
  contact_email: 'john@nike.com',
  contact_phone: '555-123-4567',
  is_verified: true,
  subscription_tier: 'enterprise',
};

const mockCampaign: Campaign = {
  id: 'campaign-123',
  brand_id: 'brand-123',
  title: 'Summer 2024 Campaign',
  description: 'Summer marketing campaign targeting college athletes',
  budget: 100000,
  start_date: '2024-06-01',
  end_date: '2024-08-31',
  status: 'active',
  target_sports: ['football', 'basketball'],
  target_divisions: ['D1'],
};

describe('brand service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyBrandProfile', () => {
    it('returns brand profile for authenticated user', async () => {
      const mockQuery = createChainableQuery({ data: mockBrand, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyBrandProfile();

      expect(result.data).toEqual(mockBrand);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('brands');
      expect(mockQuery.eq).toHaveBeenCalledWith('profile_id', 'profile-123');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyBrandProfile();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when auth fails', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' },
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyBrandProfile();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('returns error when brand profile not found', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyBrandProfile();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('handles unexpected errors gracefully', async () => {
      const mockAuth = {
        getUser: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyBrandProfile();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('updateBrandProfile', () => {
    it('updates brand profile successfully', async () => {
      const updatedBrand = { ...mockBrand, company_name: 'Nike Inc.' };
      const mockQuery = createChainableQuery({ data: updatedBrand, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateBrandProfile({ company_name: 'Nike Inc.' });

      expect(result.data).toEqual(updatedBrand);
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith({ company_name: 'Nike Inc.' });
    });

    it('strips id and profile_id from updates', async () => {
      const mockQuery = createChainableQuery({ data: mockBrand, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await updateBrandProfile({
        id: 'hacker-id',
        profile_id: 'hacker-profile',
        company_name: 'Nike Inc.',
      });

      expect(mockQuery.update).toHaveBeenCalledWith({ company_name: 'Nike Inc.' });
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateBrandProfile({ company_name: 'Nike Inc.' });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error on update failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateBrandProfile({ company_name: 'Nike Inc.' });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('getBrandCampaigns', () => {
    it('returns campaigns for provided brand ID', async () => {
      const mockCampaigns = [mockCampaign];
      const mockQuery = createChainableQuery({ data: mockCampaigns, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandCampaigns('brand-123');

      expect(result.data).toEqual(mockCampaigns);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockQuery.eq).toHaveBeenCalledWith('brand_id', 'brand-123');
    });

    it('returns campaigns for current user brand when no ID provided', async () => {
      const mockCampaigns = [mockCampaign];
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const campaignsQuery = createChainableQuery({ data: mockCampaigns, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return campaignsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandCampaigns();

      expect(result.data).toEqual(mockCampaigns);
      expect(result.error).toBeNull();
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandCampaigns();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Brand not found');
    });

    it('returns empty array when no campaigns exist', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandCampaigns('brand-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('createCampaign', () => {
    const campaignInput = {
      title: 'New Campaign',
      description: 'Campaign description',
      budget: 50000,
      start_date: '2024-07-01',
      end_date: '2024-09-30',
      status: 'draft' as const,
      target_sports: ['football'],
      target_divisions: ['D1', 'D2'],
    };

    it('creates campaign successfully', async () => {
      const createdCampaign = { id: 'new-campaign-123', brand_id: 'brand-123', ...campaignInput };
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const insertQuery = createChainableQuery({ data: createdCampaign, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return insertQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createCampaign(campaignInput);

      expect(result.data).toEqual(createdCampaign);
      expect(result.error).toBeNull();
      expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        brand_id: 'brand-123',
        title: 'New Campaign',
        budget: 50000,
      }));
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createCampaign(campaignInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Brand not found');
    });

    it('returns error on insert failure', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const insertQuery = createChainableQuery({ data: null, error: { message: 'Insert failed' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return insertQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createCampaign(campaignInput);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('updateCampaign', () => {
    it('updates campaign successfully', async () => {
      const updatedCampaign = { ...mockCampaign, title: 'Updated Campaign' };
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const updateQuery = createChainableQuery({ data: updatedCampaign, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return updateQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateCampaign('campaign-123', { title: 'Updated Campaign' });

      expect(result.data).toEqual(updatedCampaign);
      expect(result.error).toBeNull();
    });

    it('strips id and brand_id from updates', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const updateQuery = createChainableQuery({ data: mockCampaign, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return updateQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await updateCampaign('campaign-123', {
        id: 'hacker-id',
        brand_id: 'hacker-brand',
        title: 'Updated Campaign',
      });

      expect(updateQuery.update).toHaveBeenCalledWith({ title: 'Updated Campaign' });
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateCampaign('campaign-123', { title: 'Updated' });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Brand not found');
    });
  });

  describe('getBrandAnalytics', () => {
    const mockDeals = [
      { id: 'deal-1', status: 'completed', compensation_amount: 5000 },
      { id: 'deal-2', status: 'active', compensation_amount: 3000 },
      { id: 'deal-3', status: 'completed', compensation_amount: 7000 },
    ];

    const mockAnalyticsData = {
      total_impressions: 50000,
      total_engagements: 2500,
      avg_roi: 2.5,
    };

    it('calculates analytics correctly', async () => {
      const dealsQuery = createChainableQuery({ data: mockDeals, error: null });
      // Override eq to resolve directly for deals query
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: mockDeals, error: null });

      const analyticsQuery = createChainableQuery({ data: mockAnalyticsData, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deals' || callCount === 1) {
            return dealsQuery;
          }
          return analyticsQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandAnalytics('brand-123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();

      const analytics = result.data as BrandAnalytics;
      expect(analytics.total_deals).toBe(3);
      expect(analytics.active_deals).toBe(1); // only active
      expect(analytics.total_spent).toBe(12000); // completed deals: 5000 + 7000
      expect(analytics.total_impressions).toBe(50000);
      expect(analytics.total_engagements).toBe(2500);
      expect(analytics.avg_roi).toBe(2.5);
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandAnalytics();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Brand not found');
    });

    it('handles missing analytics table gracefully', async () => {
      const dealsQuery = createChainableQuery({ data: mockDeals, error: null });
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: mockDeals, error: null });

      const analyticsQuery = createChainableQuery({ data: null, error: { message: 'Table not found' } });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deals' || callCount === 1) {
            return dealsQuery;
          }
          return analyticsQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getBrandAnalytics('brand-123');

      // Should still return analytics with zeroed out analytics values
      expect(result.error).toBeNull();
      expect(result.data?.total_impressions).toBe(0);
      expect(result.data?.total_engagements).toBe(0);
      expect(result.data?.avg_roi).toBe(0);
    });
  });

  describe('getShortlistedAthletes', () => {
    const mockShortlist = [
      {
        athlete: {
          id: 'athlete-1',
          first_name: 'John',
          last_name: 'Doe',
          school: { name: 'State University' },
          sport: { name: 'Football' },
        },
      },
    ];

    it('returns shortlisted athletes', async () => {
      const shortlistQuery = createChainableQuery({ data: mockShortlist, error: null });
      shortlistQuery.eq = jest.fn().mockResolvedValue({ data: mockShortlist, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(shortlistQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getShortlistedAthletes('brand-123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data![0].name).toBe('John Doe');
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getShortlistedAthletes();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Brand not found');
    });
  });

  describe('addToShortlist', () => {
    it('adds athlete to shortlist successfully', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const insertQuery = createChainableQuery({ data: null, error: null });
      insertQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return insertQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addToShortlist('athlete-123');

      expect(result.error).toBeNull();
    });

    it('returns error when athlete already shortlisted', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const insertQuery = createChainableQuery({ data: null, error: null });
      insertQuery.insert = jest.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return insertQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addToShortlist('athlete-123');

      expect(result.error?.message).toBe('Athlete is already in your shortlist');
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addToShortlist('athlete-123');

      expect(result.error?.message).toBe('Brand not found');
    });
  });

  describe('removeFromShortlist', () => {
    it('removes athlete from shortlist successfully', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const deleteQuery = createChainableQuery({ data: null, error: null });
      deleteQuery.delete = jest.fn().mockReturnValue(deleteQuery);
      // Make eq chainable - return deleteQuery for first call, then resolve for second
      let eqCallCount = 0;
      deleteQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return deleteQuery;
        }
        return Promise.resolve({ error: null });
      });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return deleteQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeFromShortlist('athlete-123');

      expect(result.error).toBeNull();
    });

    it('returns error when delete fails', async () => {
      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });
      const deleteQuery = createChainableQuery({ data: null, error: null });
      deleteQuery.delete = jest.fn().mockReturnValue(deleteQuery);
      // Make eq chainable - return deleteQuery for first call, then resolve with error for second
      let eqCallCount = 0;
      deleteQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return deleteQuery;
        }
        return Promise.resolve({ error: { message: 'Delete failed' } });
      });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'brands' || callCount === 1) {
            return brandQuery;
          }
          return deleteQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeFromShortlist('athlete-123');

      expect(result.error).not.toBeNull();
    });

    it('returns error when brand not found', async () => {
      const brandQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(brandQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeFromShortlist('athlete-123');

      expect(result.error?.message).toBe('Brand not found');
    });
  });
});
