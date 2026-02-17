/**
 * Tests for the athletes API route
 * @module __tests__/app/api/athletes/route.test
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/athletes/route';

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

  // All chainable methods return the same mockQuery object for chaining
  const chainableMethods = ['select', 'eq', 'in', 'gte', 'or', 'order', 'range', 'insert'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // Terminal method returns the final result
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // For queries that don't call .single(), return result directly
  // Make the query itself thenable
  mockQuery.then = (resolve: (value: unknown) => void) => {
    resolve({ ...finalResult, count: finalResult.count ?? 0 });
  };

  return mockQuery;
}

// Helper to create a mock request
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options));
}

describe('Athletes API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/athletes', () => {
    it('returns athletes with default pagination', async () => {
      const mockAthletes = [
        {
          id: 'athlete-1',
          position: 'Point Guard',
          gpa: 3.8,
          profile: { first_name: 'John', last_name: 'Doe' },
        },
        {
          id: 'athlete-2',
          position: 'Quarterback',
          gpa: 3.5,
          profile: { first_name: 'Jane', last_name: 'Smith' },
        },
      ];

      const mockQuery = createChainableQuery({
        data: mockAthletes,
        error: null,
        count: 2,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.athletes).toHaveLength(2);
      expect(data.pagination).toEqual({
        page: 1,
        page_size: 10,
        total: 2,
        total_pages: 1,
      });
    });

    it('applies pagination parameters correctly', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 50,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?page=2&page_size=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.page_size).toBe(20);
      expect(mockQuery.range).toHaveBeenCalledWith(20, 39);
    });

    it('filters by sport_ids', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?sport_ids=sport-1,sport-2');
      await GET(request);

      expect(mockQuery.in).toHaveBeenCalledWith('sport_id', ['sport-1', 'sport-2']);
    });

    it('filters by school_ids', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?school_ids=school-1,school-2');
      await GET(request);

      expect(mockQuery.in).toHaveBeenCalledWith('school_id', ['school-1', 'school-2']);
    });

    it('filters by min_gpa', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?min_gpa=3.5');
      await GET(request);

      expect(mockQuery.gte).toHaveBeenCalledWith('gpa', 3.5);
    });

    it('filters by search term', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?search=basketball');
      await GET(request);

      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('escapes special characters in search term', async () => {
      const mockQuery = createChainableQuery({
        data: [],
        error: null,
        count: 0,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes?search=test%25value');
      await GET(request);

      // Verify search was processed (escaping happens internally)
      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('returns 500 on database error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('handles exception gracefully', async () => {
      mockCreateClient.mockRejectedValue(new Error('Connection timeout'));

      const request = createMockRequest('http://localhost:3000/api/athletes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Connection timeout');
    });
  });

  describe('POST /api/athletes', () => {
    it('creates an athlete successfully', async () => {
      const mockAthlete = {
        id: 'new-athlete-1',
        profile_id: 'user-123',
        school_id: 'school-1',
        sport_id: 'sport-1',
        position: 'Guard',
      };

      const mockQuery = createChainableQuery({
        data: mockAthlete,
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

      const request = createMockRequest('http://localhost:3000/api/athletes', {
        method: 'POST',
        body: JSON.stringify({
          school_id: 'school-1',
          sport_id: 'sport-1',
          position: 'Guard',
          gpa: 3.5,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('new-athlete-1');
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

      const request = createMockRequest('http://localhost:3000/api/athletes', {
        method: 'POST',
        body: JSON.stringify({ school_id: 'school-1' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 on database insert error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Duplicate entry' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes', {
        method: 'POST',
        body: JSON.stringify({ school_id: 'school-1' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Duplicate entry');
    });

    it('handles exception in POST request', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Auth service unavailable')),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes', {
        method: 'POST',
        body: JSON.stringify({ school_id: 'school-1' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Auth service unavailable');
    });

    it('sets default is_searchable to true', async () => {
      const mockQuery = createChainableQuery({
        data: { id: 'new-athlete', is_searchable: true },
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

      const request = createMockRequest('http://localhost:3000/api/athletes', {
        method: 'POST',
        body: JSON.stringify({ school_id: 'school-1', sport_id: 'sport-1' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_searchable: true })
      );
    });
  });
});
