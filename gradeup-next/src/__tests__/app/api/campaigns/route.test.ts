/**
 * Tests for the campaigns API route
 * @module __tests__/app/api/campaigns/route.test
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/campaigns/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'order', 'range', 'insert'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  mockQuery.single = jest.fn().mockResolvedValue(finalResult);
  mockQuery.then = (resolve: (value: unknown) => void) => {
    resolve({ ...finalResult, count: finalResult.count ?? 0 });
  };

  return mockQuery;
}

// Helper to create a mock request
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options));
}

describe('Campaigns API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/campaigns', () => {
    it('returns campaigns for authenticated user', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Summer Campaign',
          budget: 10000,
          status: 'active',
          brand: { id: 'brand-1', company_name: 'Nike', logo_url: null },
        },
      ];

      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignsQuery = createChainableQuery({
        data: mockCampaigns,
        error: null,
        count: 1,
      });

      let queryCount = 0;
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          queryCount++;
          return campaignsQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns).toHaveLength(1);
      expect(data.pagination).toEqual({
        page: 1,
        page_size: 10,
        total: 1,
        total_pages: 1,
      });
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('uses provided brand_id parameter', async () => {
      const campaignsQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(campaignsQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns?brand_id=brand-1');
      await GET(request);

      expect(campaignsQuery.eq).toHaveBeenCalledWith('brand_id', 'brand-1');
    });

    it('filters by multiple statuses', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignsQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignsQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns?status=active,draft');
      await GET(request);

      expect(campaignsQuery.in).toHaveBeenCalledWith('status', ['active', 'draft']);
    });

    it('applies pagination parameters', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignsQuery = createChainableQuery({
        data: [],
        error: null,
        count: 50,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignsQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns?page=2&page_size=15');
      const response = await GET(request);
      const data = await response.json();

      expect(campaignsQuery.range).toHaveBeenCalledWith(15, 29);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.page_size).toBe(15);
    });

    it('returns 500 on database error', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignsQuery = createChainableQuery({
        data: null,
        error: { message: 'Database error' },
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignsQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });

    it('handles no brand found for user', async () => {
      const brandQuery = createChainableQuery({
        data: null,
        error: null,
      });

      const campaignsQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignsQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns');
      const response = await GET(request);

      // Should still return 200 with empty results
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/campaigns', () => {
    const validCampaignData = {
      title: 'Summer Campaign',
      budget: 10000,
      start_date: '2024-06-01',
    };

    it('creates a campaign successfully', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        ...validCampaignData,
        status: 'draft',
        brand: { id: 'brand-1', company_name: 'Nike', logo_url: null },
      };

      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignQuery = createChainableQuery({
        data: mockCampaign,
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('campaign-1');
      expect(data.status).toBe('draft');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when user has no brand', async () => {
      const brandQuery = createChainableQuery({
        data: null,
        error: { message: 'Not found' },
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(brandQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Brand not found');
    });

    it('returns 400 when missing required fields', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(brandQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ title: 'Campaign' }), // Missing budget and start_date
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('returns 400 when budget is missing', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(brandQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ title: 'Campaign', start_date: '2024-01-01' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('budget');
    });

    it('sets default status to draft', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignQuery = createChainableQuery({
        data: { id: 'campaign-1', status: 'draft' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(campaignQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('accepts custom status', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignQuery = createChainableQuery({
        data: { id: 'campaign-1', status: 'active' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...validCampaignData, status: 'active' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(campaignQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('returns 400 on database insert error', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignQuery = createChainableQuery({
        data: null,
        error: { message: 'Constraint violation' },
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Constraint violation');
    });

    it('handles optional targeting fields', async () => {
      const brandQuery = createChainableQuery({
        data: { id: 'brand-1' },
        error: null,
      });

      const campaignQuery = createChainableQuery({
        data: { id: 'campaign-1' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'brands') return brandQuery;
          return campaignQuery;
        }),
      } as unknown as ReturnType<typeof createClient>);

      const campaignWithTargeting = {
        ...validCampaignData,
        description: 'A great campaign',
        end_date: '2024-12-31',
        target_sports: ['basketball', 'football'],
        target_divisions: ['D1'],
        target_min_gpa: 3.0,
        target_min_followers: 10000,
      };

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignWithTargeting),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(campaignQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'A great campaign',
          end_date: '2024-12-31',
          target_sports: ['basketball', 'football'],
          target_divisions: ['D1'],
          target_min_gpa: 3.0,
          target_min_followers: 10000,
        })
      );
    });

    it('handles exception gracefully', async () => {
      mockCreateClient.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(validCampaignData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
    });
  });
});
