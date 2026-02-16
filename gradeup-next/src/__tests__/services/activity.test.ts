/**
 * Tests for the activity service
 * @module __tests__/services/activity.test
 */

import {
  getMyActivity,
  getAthleteActivity,
  logActivity,
  type Activity,
  type ActivityType,
} from '@/lib/services/activity';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Sample test data
const mockActivity: Activity = {
  id: 'activity-123',
  profile_id: 'profile-123',
  type: 'deal_created',
  description: 'Created a new deal with Nike',
  metadata: { deal_id: 'deal-123' },
  created_at: '2024-01-15T10:00:00Z',
};

// Helper to create mock Supabase client with chainable methods
function createMockSupabase(options: {
  userData?: { id: string } | null;
  userError?: Error | null;
  queryResult?: { data: unknown; error: unknown };
}) {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(options.queryResult || { data: null, error: null }),
    then: function (onFulfilled: (value: unknown) => unknown) {
      return Promise.resolve(options.queryResult || { data: null, error: null }).then(onFulfilled);
    },
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.userData },
        error: options.userError || null,
      }),
    },
    from: jest.fn().mockReturnValue(mockQuery),
  };
}

describe('activity service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyActivity', () => {
    it('returns activity for authenticated user', async () => {
      const mockSupabase = createMockSupabase({
        userData: { id: 'user-123' },
        queryResult: { data: [mockActivity], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyActivity();

      expect(result.data).toEqual([mockActivity]);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('activity_log');
    });

    it('returns activity with custom limit', async () => {
      const mockSupabase = createMockSupabase({
        userData: { id: 'user-123' },
        queryResult: { data: [mockActivity], error: null },
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyActivity(5);

      expect(result.data).toEqual([mockActivity]);
      const mockQuery = mockSupabase.from('activity_log');
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = createMockSupabase({
        userData: null,
        userError: null,
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyActivity();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('Not authenticated'));
    });

    it('returns error on auth failure', async () => {
      const mockSupabase = createMockSupabase({
        userData: null,
        userError: new Error('Auth failed'),
      });
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyActivity();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Auth failed');
    });

    it('returns error on database failure', async () => {
      // Create a custom mock for this test
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: function (onFulfilled: (value: unknown) => unknown) {
          return Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled);
        },
      };

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

      const result = await getMyActivity();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch activity');
    });
  });

  describe('getAthleteActivity', () => {
    it('returns activity for specific athlete', async () => {
      // First query returns athlete with profile_id, second returns activities
      let callCount = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: { profile_id: 'profile-123' }, error: null });
          }
          return Promise.resolve({ data: mockActivity, error: null });
        }),
        then: function (onFulfilled: (value: unknown) => unknown) {
          return Promise.resolve({ data: [mockActivity], error: null }).then(onFulfilled);
        },
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteActivity('athlete-123');

      expect(result.data).toEqual([mockActivity]);
      expect(result.error).toBeNull();
    });

    it('returns error when athlete not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteActivity('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Athlete not found');
    });

    it('respects custom limit', async () => {
      let callCount = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: { profile_id: 'profile-123' }, error: null });
          }
          return Promise.resolve({ data: mockActivity, error: null });
        }),
        then: function (onFulfilled: (value: unknown) => unknown) {
          return Promise.resolve({ data: [mockActivity], error: null }).then(onFulfilled);
        },
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getAthleteActivity('athlete-123', 5);

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('logActivity', () => {
    it('logs activity for authenticated user', async () => {
      const newActivity = { ...mockActivity };
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: newActivity, error: null }),
      };

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

      const result = await logActivity('deal_created', 'Created a new deal');

      expect(result.data).toEqual(newActivity);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        profile_id: 'user-123',
        type: 'deal_created',
        description: 'Created a new deal',
      }));
    });

    it('logs activity with metadata', async () => {
      const metadata = { deal_id: 'deal-456', amount: 5000 };
      const newActivity = { ...mockActivity, metadata };
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: newActivity, error: null }),
      };

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

      const result = await logActivity('deal_created', 'Created a deal', metadata);

      expect(result.data?.metadata).toEqual(metadata);
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        metadata,
      }));
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: jest.fn(),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await logActivity('deal_created', 'Test activity');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error on insert failure', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      };

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

      const result = await logActivity('deal_created', 'Test activity');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to log activity');
    });

    it('handles all activity types', async () => {
      const activityTypes: ActivityType[] = [
        'deal_created',
        'deal_accepted',
        'deal_completed',
        'deal_rejected',
        'message',
        'profile_view',
        'deliverable',
        'payment',
        'new_offer',
      ];

      for (const type of activityTypes) {
        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockActivity, type },
            error: null,
          }),
        };

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

        const result = await logActivity(type, `Test ${type}`);

        expect(result.data?.type).toBe(type);
        expect(result.error).toBeNull();
      }
    });
  });
});
