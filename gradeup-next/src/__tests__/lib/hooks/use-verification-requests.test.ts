/**
 * Tests for useVerificationRequests hook
 * @module __tests__/lib/hooks/use-verification-requests.test
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useVerificationRequests,
  getVerificationLabel,
  getVerificationIcon,
  type VerificationStatus,
} from '@/lib/hooks/use-verification-requests';
import type { VerificationType } from '@/lib/services/verification';

// Mock Supabase client
const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
const mockOn = jest.fn().mockReturnThis();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: mockOn,
      subscribe: mockSubscribe,
    })),
    removeChannel: mockRemoveChannel,
  })),
}));

// Mock verification service
const mockGetAthleteVerificationStatus = jest.fn();
const mockSubmitVerificationRequest = jest.fn();

jest.mock('@/lib/services/verification', () => ({
  getAthleteVerificationStatus: (...args: unknown[]) => mockGetAthleteVerificationStatus(...args),
  submitVerificationRequest: (...args: unknown[]) => mockSubmitVerificationRequest(...args),
}));

describe('useVerificationRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteVerificationStatus.mockResolvedValue({
      data: {
        enrollment_verified: false,
        sport_verified: false,
        grades_verified: false,
        identity_verified: false,
        pending_requests: [],
      },
      error: null,
    });
  });

  it('returns null status when no athleteId provided', async () => {
    const { result } = renderHook(() => useVerificationRequests(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBeNull();
  });

  it('fetches verification status on mount', async () => {
    const { result } = renderHook(() => useVerificationRequests('athlete-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetAthleteVerificationStatus).toHaveBeenCalledWith('athlete-1');
    expect(result.current.status).not.toBeNull();
  });

  it('handles fetch error', async () => {
    mockGetAthleteVerificationStatus.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useVerificationRequests('athlete-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
  });

  it('sets up realtime subscription', async () => {
    renderHook(() => useVerificationRequests('athlete-1'));

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'verification_requests',
          filter: 'athlete_id=eq.athlete-1',
        }),
        expect.any(Function)
      );
    });
  });

  it('removes subscription on unmount', async () => {
    const { unmount } = renderHook(() => useVerificationRequests('athlete-1'));

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  describe('submitRequest', () => {
    it('returns error when no athleteId', async () => {
      const { result } = renderHook(() => useVerificationRequests(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const submitResult = await result.current.submitRequest('enrollment');

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('No athlete ID provided');
    });

    it('submits request successfully', async () => {
      mockSubmitVerificationRequest.mockResolvedValue({
        data: { id: 'req-1' },
        error: null,
      });

      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const submitResult = await result.current.submitRequest('enrollment', 'Test notes');

      expect(submitResult.success).toBe(true);
      expect(mockSubmitVerificationRequest).toHaveBeenCalledWith(
        'athlete-1',
        'enrollment',
        'Test notes'
      );
    });

    it('handles submission error', async () => {
      mockSubmitVerificationRequest.mockResolvedValue({
        data: null,
        error: { message: 'Submission failed' },
      });

      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const submitResult = await result.current.submitRequest('enrollment');

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Submission failed');
    });
  });

  describe('canRequestVerification', () => {
    it('returns false when status is null', async () => {
      const { result } = renderHook(() => useVerificationRequests(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRequestVerification('enrollment')).toBe(false);
    });

    it('returns false when already verified', async () => {
      mockGetAthleteVerificationStatus.mockResolvedValue({
        data: {
          enrollment_verified: true,
          sport_verified: false,
          grades_verified: false,
          identity_verified: false,
          pending_requests: [],
        },
        error: null,
      });

      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRequestVerification('enrollment')).toBe(false);
      expect(result.current.canRequestVerification('sport')).toBe(true);
    });

    it('returns false when pending request exists', async () => {
      mockGetAthleteVerificationStatus.mockResolvedValue({
        data: {
          enrollment_verified: false,
          sport_verified: false,
          grades_verified: false,
          identity_verified: false,
          pending_requests: [{ type: 'enrollment', status: 'pending' }],
        },
        error: null,
      });

      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRequestVerification('enrollment')).toBe(false);
    });

    it('returns false for ncaa_eligibility (no field mapping)', async () => {
      mockGetAthleteVerificationStatus.mockResolvedValue({
        data: {
          enrollment_verified: false,
          sport_verified: false,
          grades_verified: false,
          identity_verified: false,
          pending_requests: [],
        },
        error: null,
      });

      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRequestVerification('ncaa_eligibility')).toBe(false);
    });
  });

  describe('refreshStatus', () => {
    it('refetches verification status', async () => {
      const { result } = renderHook(() => useVerificationRequests('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetAthleteVerificationStatus.mockClear();

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockGetAthleteVerificationStatus).toHaveBeenCalledWith('athlete-1');
    });
  });
});

describe('getVerificationLabel', () => {
  it('returns correct labels for all types', () => {
    expect(getVerificationLabel('enrollment')).toBe('Enrollment');
    expect(getVerificationLabel('sport')).toBe('Sport');
    expect(getVerificationLabel('grades')).toBe('Grades');
    expect(getVerificationLabel('identity')).toBe('Identity');
    expect(getVerificationLabel('stats')).toBe('Stats');
    expect(getVerificationLabel('ncaa_eligibility')).toBe('NCAA Eligibility');
  });

  it('returns type as fallback for unknown types', () => {
    const unknownType = 'unknown_type' as VerificationType;
    expect(getVerificationLabel(unknownType)).toBe('unknown_type');
  });
});

describe('getVerificationIcon', () => {
  it('returns correct icons for all types', () => {
    expect(getVerificationIcon('enrollment')).toBe('GraduationCap');
    expect(getVerificationIcon('sport')).toBe('Trophy');
    expect(getVerificationIcon('grades')).toBe('FileText');
    expect(getVerificationIcon('identity')).toBe('User');
    expect(getVerificationIcon('stats')).toBe('BarChart3');
    expect(getVerificationIcon('ncaa_eligibility')).toBe('Shield');
  });

  it('returns CheckCircle for unknown types', () => {
    const unknownType = 'unknown_type' as VerificationType;
    expect(getVerificationIcon(unknownType)).toBe('CheckCircle');
  });
});

describe('VerificationStatus type', () => {
  it('has correct structure', () => {
    const status: VerificationStatus = {
      enrollment_verified: true,
      sport_verified: false,
      grades_verified: true,
      identity_verified: false,
      stats_verified: false,
      pending_requests: [
        {
          id: 'req-1',
          athlete_id: 'athlete-1',
          type: 'sport',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          submitted_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    };

    expect(status.enrollment_verified).toBe(true);
    expect(status.sport_verified).toBe(false);
    expect(status.pending_requests.length).toBe(1);
    expect(status.pending_requests[0].type).toBe('sport');
  });
});
