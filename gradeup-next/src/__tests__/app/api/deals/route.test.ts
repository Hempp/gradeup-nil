/**
 * Tests for the deals API route
 * @module __tests__/app/api/deals/route.test
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/deals/route';

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

describe('Deals API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/deals', () => {
    it('returns deals with default pagination for authenticated user', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Social Media Campaign',
          status: 'active',
          compensation_amount: 5000,
          brand: { id: 'brand-1', company_name: 'Nike' },
          athlete: { id: 'athlete-1', profile: { first_name: 'John', last_name: 'Doe' } },
        },
      ];

      const mockQuery = createChainableQuery({
        data: mockDeals,
        error: null,
        count: 1,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deals).toHaveLength(1);
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

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('filters by athlete_id', async () => {
      const mockQuery = createChainableQuery({
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
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals?athlete_id=athlete-1');
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'athlete-1');
    });

    it('filters by brand_id', async () => {
      const mockQuery = createChainableQuery({
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
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals?brand_id=brand-1');
      await GET(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('brand_id', 'brand-1');
    });

    it('filters by multiple statuses', async () => {
      const mockQuery = createChainableQuery({
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
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals?status=active,pending');
      await GET(request);

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['active', 'pending']);
    });

    it('filters by deal_type', async () => {
      const mockQuery = createChainableQuery({
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
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals?deal_type=sponsorship,appearance');
      await GET(request);

      expect(mockQuery.in).toHaveBeenCalledWith('deal_type', ['sponsorship', 'appearance']);
    });

    it('applies pagination parameters', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 100,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals?page=3&page_size=25');
      const response = await GET(request);
      const data = await response.json();

      expect(mockQuery.range).toHaveBeenCalledWith(50, 74);
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.page_size).toBe(25);
    });

    it('returns 500 on database error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('POST /api/deals', () => {
    const validDealData = {
      athlete_id: 'athlete-1',
      brand_id: 'brand-1',
      title: 'Social Media Campaign',
      deal_type: 'sponsorship',
      compensation_amount: 5000,
    };

    it('creates a deal successfully', async () => {
      const mockDeal = {
        id: 'deal-1',
        ...validDealData,
        status: 'pending',
        brand: { id: 'brand-1', company_name: 'Nike', logo_url: null },
        athlete: { id: 'athlete-1', profile: { first_name: 'John', last_name: 'Doe' } },
      };

      const mockQuery = createChainableQuery({
        data: mockDeal,
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('deal-1');
      expect(data.status).toBe('pending');
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

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when missing required fields', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify({ athlete_id: 'athlete-1' }), // Missing required fields
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('returns 400 when compensation_amount is missing', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify({
          athlete_id: 'athlete-1',
          brand_id: 'brand-1',
          title: 'Campaign',
          deal_type: 'sponsorship',
          // Missing compensation_amount
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('compensation_amount');
    });

    it('sets default compensation_type to fixed', async () => {
      const mockQuery = createChainableQuery({
        data: { id: 'deal-1', compensation_type: 'fixed' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ compensation_type: 'fixed' })
      );
    });

    it('sets status to pending for new deals', async () => {
      const mockQuery = createChainableQuery({
        data: { id: 'deal-1', status: 'pending' },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('returns 400 on database insert error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Unique constraint violation' },
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unique constraint violation');
    });

    it('handles exception gracefully', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Auth service down')),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(validDealData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Auth service down');
    });

    it('accepts optional fields', async () => {
      const dealWithOptionals = {
        ...validDealData,
        description: 'A great campaign',
        start_date: '2024-01-01',
        end_date: '2024-06-01',
        deliverables: ['Instagram post', 'Story mention'],
        opportunity_id: 'opp-1',
      };

      const mockQuery = createChainableQuery({
        data: { id: 'deal-1', ...dealWithOptionals },
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(dealWithOptionals),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'A great campaign',
          start_date: '2024-01-01',
          end_date: '2024-06-01',
          deliverables: ['Instagram post', 'Story mention'],
          opportunity_id: 'opp-1',
        })
      );
    });
  });
});
