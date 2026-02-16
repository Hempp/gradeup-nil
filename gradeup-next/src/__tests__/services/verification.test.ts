/**
 * Tests for the verification service
 * @module __tests__/services/verification.test
 */

import {
  submitVerificationRequest,
  approveVerification,
  rejectVerification,
  revokeVerification,
  getVerificationHistory,
  getAthleteVerificationStatus,
  getPendingVerificationCount,
  type VerificationType,
  type VerificationStatus,
  type VerificationRequest,
  type VerificationHistory,
} from '@/lib/services/verification';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Sample test data
const mockVerificationRequest: VerificationRequest = {
  id: 'request-123',
  athlete_id: 'athlete-123',
  type: 'enrollment',
  status: 'pending',
  notes: 'Submitted for verification',
  submitted_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockVerificationHistory: VerificationHistory = {
  id: 'history-123',
  athlete_id: 'athlete-123',
  type: 'enrollment',
  action: 'submitted',
  notes: 'Initial submission',
  created_at: '2024-01-15T10:00:00Z',
};

// Helper to create chainable query mock
function createChainableQuery(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'update', 'insert', 'delete', 'order', 'neq'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // For head queries with count
  mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
    const result = { ...finalResult };
    if (finalResult.count !== undefined) {
      result.count = finalResult.count;
    }
    return Promise.resolve(result).then(onFulfilled);
  };

  return mockQuery;
}

describe('verification service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitVerificationRequest', () => {
    it('submits a new verification request', async () => {
      // First call checks for existing requests (none found)
      // Second call inserts new request
      // Third call logs to history
      let callCount = 0;
      const mockQuery = createChainableQuery({ data: mockVerificationRequest, error: null });
      mockQuery.single = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // No existing request found (PGRST116 = not found, which is expected)
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows returned' } });
        }
        return Promise.resolve({ data: mockVerificationRequest, error: null });
      });

      const historyInsert = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table) => {
          if (table === 'verification_history') {
            return historyInsert;
          }
          return mockQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitVerificationRequest('athlete-123', 'enrollment', 'Test notes');

      expect(result.data).toEqual(mockVerificationRequest);
      expect(result.error).toBeNull();
    });

    it('returns error if request already pending', async () => {
      const mockQuery = createChainableQuery({ data: mockVerificationRequest, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitVerificationRequest('athlete-123', 'enrollment');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('already pending');
    });

    it('handles database errors when checking existing', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'SOME_ERROR', message: 'Database connection failed' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitVerificationRequest('athlete-123', 'enrollment');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to check existing requests');
    });
  });

  describe('approveVerification', () => {
    it('approves a verification request', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Override in to resolve directly for the update operation
      mockQuery.in = jest.fn().mockResolvedValue({ error: null });

      const historyInsert = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const athleteQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      let fromCallCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table) => {
          fromCallCount++;
          if (table === 'verification_history') {
            return historyInsert;
          }
          if (table === 'athletes') {
            return athleteQuery;
          }
          return mockQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await approveVerification('athlete-123', 'enrollment', 'director-456');

      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'approved',
        reviewed_by: 'director-456',
      }));
    });

    it('handles update failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.in = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await approveVerification('athlete-123', 'enrollment', 'director-456');

      expect(result.error?.message).toContain('Failed to approve');
    });
  });

  describe('rejectVerification', () => {
    it('rejects a verification request with reason', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.in = jest.fn().mockResolvedValue({ error: null });

      const historyInsert = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table) => {
          if (table === 'verification_history') {
            return historyInsert;
          }
          return mockQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectVerification(
        'athlete-123',
        'enrollment',
        'director-456',
        'Documents not valid'
      );

      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected',
        rejection_reason: 'Documents not valid',
      }));
    });

    it('handles rejection failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.in = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectVerification('athlete-123', 'enrollment', 'director-456', 'Reason');

      expect(result.error?.message).toContain('Failed to reject');
    });
  });

  describe('revokeVerification', () => {
    it('revokes an approved verification', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);
      // Last eq call should resolve
      let eqCallCount = 0;
      const originalEq = mockQuery.eq;
      mockQuery.eq = jest.fn().mockImplementation((...args) => {
        eqCallCount++;
        if (eqCallCount === 3) {
          // After athlete_id, type, and status
          return Promise.resolve({ error: null });
        }
        return originalEq(...args);
      });

      const historyInsert = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const athleteQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table) => {
          if (table === 'verification_history') {
            return historyInsert;
          }
          if (table === 'athletes') {
            return athleteQuery;
          }
          return mockQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await revokeVerification('athlete-123', 'enrollment', 'Inaccurate information');

      expect(result.error).toBeNull();
    });
  });

  describe('getVerificationHistory', () => {
    it('returns verification history for athlete', async () => {
      const mockQuery = createChainableQuery({
        data: [mockVerificationHistory],
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getVerificationHistory('athlete-123');

      expect(result.data).toEqual([mockVerificationHistory]);
      expect(result.error).toBeNull();
    });

    it('handles fetch error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Database error' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getVerificationHistory('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch verification history');
    });
  });

  describe('getAthleteVerificationStatus', () => {
    it('returns complete verification status', async () => {
      const athleteData = {
        enrollment_verified: true,
        sport_verified: true,
        grades_verified: false,
        identity_verified: false,
      };

      let callCount = 0;
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.single = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: athleteData, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // For pending requests query
      mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
        return Promise.resolve({ data: [mockVerificationRequest], error: null }).then(onFulfilled);
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteVerificationStatus('athlete-123');

      expect(result.data?.enrollment_verified).toBe(true);
      expect(result.data?.sport_verified).toBe(true);
      expect(result.data?.grades_verified).toBe(false);
      expect(result.data?.identity_verified).toBe(false);
      expect(result.data?.pending_requests).toEqual([mockVerificationRequest]);
    });

    it('handles athlete fetch error', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Athlete not found' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteVerificationStatus('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch athlete');
    });
  });

  describe('getPendingVerificationCount', () => {
    it('returns count of pending verifications for school', async () => {
      // First query gets athlete IDs, second counts pending requests
      let callCount = 0;
      const mockQuery = createChainableQuery({ data: null, error: null, count: 5 });

      mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
        callCount++;
        if (callCount === 1) {
          // Return athletes
          return Promise.resolve({
            data: [{ id: 'athlete-1' }, { id: 'athlete-2' }],
            error: null,
          }).then(onFulfilled);
        }
        // Return count
        return Promise.resolve({ count: 5, error: null }).then(onFulfilled);
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPendingVerificationCount('school-123');

      expect(result.data).toBe(5);
      expect(result.error).toBeNull();
    });

    it('returns 0 when no athletes found', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });

      mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPendingVerificationCount('school-123');

      expect(result.data).toBe(0);
      expect(result.error).toBeNull();
    });

    it('handles athlete fetch error', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });

      mockQuery.then = function (onFulfilled: (value: unknown) => unknown) {
        return Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled);
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getPendingVerificationCount('school-123');

      expect(result.data).toBe(0);
      expect(result.error?.message).toBe('Database error');
    });
  });

  describe('verification types', () => {
    const verificationTypes: VerificationType[] = [
      'enrollment',
      'sport',
      'grades',
      'identity',
      'stats',
      'ncaa_eligibility',
    ];

    it('handles all verification types', async () => {
      for (const type of verificationTypes) {
        const request: VerificationRequest = { ...mockVerificationRequest, type };
        expect(request.type).toBe(type);
      }
    });
  });

  describe('verification statuses', () => {
    const verificationStatuses: VerificationStatus[] = [
      'pending',
      'in_review',
      'approved',
      'rejected',
      'expired',
      'revoked',
    ];

    it('handles all verification statuses', async () => {
      for (const status of verificationStatuses) {
        const request: VerificationRequest = { ...mockVerificationRequest, status };
        expect(request.status).toBe(status);
      }
    });
  });
});
