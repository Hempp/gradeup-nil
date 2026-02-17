/**
 * Tests for the athletes/[id] API route
 * @module __tests__/app/api/athletes/[id]/route.test
 */

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/athletes/[id]/route';

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock the validation module
jest.mock('@/lib/validations/api-schemas', () => ({
  updateAthleteSchema: {},
  validateInput: jest.fn((schema, data) => ({ success: true, data })),
  formatValidationError: jest.fn((errors) => errors.join(', ')),
}));

import { createClient } from '@/lib/supabase/server';
import { validateInput } from '@/lib/validations/api-schemas';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockValidateInput = validateInput as jest.MockedFunction<typeof validateInput>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'update', 'delete'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  return mockQuery;
}

// Helper to create a mock request
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options));
}

describe('Athletes [id] API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateInput.mockImplementation((schema, data) => ({ success: true, data }));
  });

  describe('GET /api/athletes/[id]', () => {
    it('returns public athlete data for unauthenticated users', async () => {
      const mockAthlete = {
        id: 'athlete-1',
        position: 'Point Guard',
        is_searchable: true,
        profile: { first_name: 'John', last_name: 'Doe', avatar_url: null },
      };

      const mockQuery = createChainableQuery({
        data: mockAthlete,
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('athlete-1');
      expect(data.is_searchable).toBe(true);
    });

    it('returns full athlete data for authenticated users', async () => {
      const mockAthlete = {
        id: 'athlete-1',
        position: 'Point Guard',
        gpa: 3.8,
        major: 'Computer Science',
        profile: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gpa).toBe(3.8);
      expect(data.major).toBe('Computer Science');
    });

    it('returns 404 for non-searchable athlete when unauthenticated', async () => {
      const mockAthlete = {
        id: 'athlete-1',
        is_searchable: false,
      };

      const mockQuery = createChainableQuery({
        data: mockAthlete,
        error: null,
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(mockQuery),
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Athlete not found');
    });

    it('returns 404 when athlete does not exist', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes/non-existent');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Athlete not found');
    });

    it('returns 500 on database error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'OTHER', message: 'Database error' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });

  describe('PATCH /api/athletes/[id]', () => {
    it('updates athlete successfully', async () => {
      const mockUpdatedAthlete = {
        id: 'athlete-1',
        position: 'Shooting Guard',
        gpa: 3.9,
      };

      const mockQuery = createChainableQuery({
        data: mockUpdatedAthlete,
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'PATCH',
        body: JSON.stringify({ position: 'Shooting Guard', gpa: 3.9 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe('Shooting Guard');
      expect(data.gpa).toBe(3.9);
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'PATCH',
        body: JSON.stringify({ position: 'Guard' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 on validation error', async () => {
      mockValidateInput.mockReturnValue({
        success: false,
        errors: ['Invalid GPA value', 'Position is required'],
      });

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as unknown as ReturnType<typeof createClient>);

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'PATCH',
        body: JSON.stringify({ gpa: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 404 when athlete not found or not authorized', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'PATCH',
        body: JSON.stringify({ position: 'Guard' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Athlete not found or not authorized');
    });

    it('strips protected fields from update', async () => {
      const mockQuery = createChainableQuery({
        data: { id: 'athlete-1' },
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'hacked-id',
          profile_id: 'hacked-profile',
          position: 'Guard',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await PATCH(request, { params: Promise.resolve({ id: 'athlete-1' }) });

      // Verify only allowed fields are passed to validateInput
      expect(mockValidateInput).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ id: 'hacked-id', profile_id: 'hacked-profile' })
      );
    });
  });

  describe('DELETE /api/athletes/[id]', () => {
    it('deletes athlete successfully', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: null,
      });
      // Override delete to not call single
      mockQuery.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'athlete-1' }) });

      expect(response.status).toBe(204);
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 on delete error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: null,
      });
      mockQuery.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Foreign key constraint' } }),
        }),
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

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Foreign key constraint');
    });

    it('handles exception gracefully', async () => {
      mockCreateClient.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/athletes/athlete-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'athlete-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
    });
  });
});
