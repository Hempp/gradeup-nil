import { renderHook, waitFor, act } from '@testing-library/react';
import { useDirectorVerifications } from '@/lib/hooks/use-director-verifications';

// Mock Supabase client
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'director-123' } },
    }),
  },
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: jest.fn(),
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock verification service
jest.mock('@/lib/services/verification', () => ({
  getSchoolPendingVerifications: jest.fn(),
  getPendingVerificationCount: jest.fn(),
  approveVerification: jest.fn(),
  rejectVerification: jest.fn(),
  bulkApproveVerifications: jest.fn(),
}));

describe('useDirectorVerifications', () => {
  const mockVerificationRequests = [
    {
      id: 'req-1',
      athlete_id: 'athlete-1',
      type: 'enrollment',
      status: 'pending',
      submitted_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      athlete: {
        id: 'athlete-1',
        first_name: 'John',
        last_name: 'Doe',
        gpa: 3.8,
        avatar_url: null,
        sport: { name: 'Basketball' },
      },
    },
    {
      id: 'req-2',
      athlete_id: 'athlete-2',
      type: 'grades',
      status: 'pending',
      submitted_at: '2026-01-02T00:00:00Z',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      athlete: {
        id: 'athlete-2',
        first_name: 'Jane',
        last_name: 'Smith',
        gpa: 3.5,
        avatar_url: 'https://example.com/avatar.jpg',
        sport: { name: 'Soccer' },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    const {
      getSchoolPendingVerifications,
      getPendingVerificationCount,
    } = require('@/lib/services/verification');

    getSchoolPendingVerifications.mockResolvedValue({
      data: mockVerificationRequests,
      error: null,
    });

    getPendingVerificationCount.mockResolvedValue({
      data: 2,
      error: null,
    });
  });

  it('returns initial state when schoolId is null', async () => {
    const { result } = renderHook(() => useDirectorVerifications(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.requests).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('returns expected data structure', () => {
    const { result } = renderHook(() => useDirectorVerifications('school-1'));

    expect(result.current).toHaveProperty('requests');
    expect(result.current).toHaveProperty('pendingCount');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('approve');
    expect(result.current).toHaveProperty('reject');
    expect(result.current).toHaveProperty('bulkApprove');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('selectedIds');
    expect(result.current).toHaveProperty('toggleSelect');
    expect(result.current).toHaveProperty('selectAll');
    expect(result.current).toHaveProperty('clearSelection');
  });

  it('fetches pending verifications on mount', async () => {
    const { getSchoolPendingVerifications } = require('@/lib/services/verification');

    const { result } = renderHook(() => useDirectorVerifications('school-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getSchoolPendingVerifications).toHaveBeenCalledWith('school-1');
    expect(result.current.requests).toEqual(mockVerificationRequests);
    expect(result.current.pendingCount).toBe(2);
  });

  it('handles fetch error', async () => {
    const { getSchoolPendingVerifications } = require('@/lib/services/verification');
    getSchoolPendingVerifications.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => useDirectorVerifications('school-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('subscribes to realtime updates', async () => {
    renderHook(() => useDirectorVerifications('school-1'));

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('director-verifications:school-1');
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('unsubscribes from channel on unmount', async () => {
    const { unmount } = renderHook(() => useDirectorVerifications('school-1'));

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  describe('approve', () => {
    it('approves verification successfully', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(response.success).toBe(true);
      expect(approveVerification).toHaveBeenCalledWith('athlete-1', 'enrollment', 'director-123');
    });

    it('removes approved request from list (optimistic update)', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.requests.length).toBe(2);
      });

      await act(async () => {
        await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(result.current.requests.length).toBe(1);
      expect(result.current.requests.find(r => r.id === 'req-1')).toBeUndefined();
    });

    it('decrements pending count on approve', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(2);
      });

      await act(async () => {
        await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(result.current.pendingCount).toBe(1);
    });

    it('returns error on approve failure', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: new Error('Approval failed') });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Approval failed');
    });

    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Not authenticated');
    });

    it('removes approved request from selected IDs', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Select the request first
      act(() => {
        result.current.toggleSelect('req-1');
      });

      expect(result.current.selectedIds).toContain('req-1');

      // Approve it
      await act(async () => {
        await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(result.current.selectedIds).not.toContain('req-1');
    });
  });

  describe('reject', () => {
    it('rejects verification successfully', async () => {
      const { rejectVerification } = require('@/lib/services/verification');
      rejectVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.reject('req-1', 'athlete-1', 'enrollment', 'Invalid documents');
      });

      expect(response.success).toBe(true);
      expect(rejectVerification).toHaveBeenCalledWith(
        'athlete-1',
        'enrollment',
        'director-123',
        'Invalid documents'
      );
    });

    it('removes rejected request from list (optimistic update)', async () => {
      const { rejectVerification } = require('@/lib/services/verification');
      rejectVerification.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.requests.length).toBe(2);
      });

      await act(async () => {
        await result.current.reject('req-1', 'athlete-1', 'enrollment', 'Reason');
      });

      expect(result.current.requests.length).toBe(1);
    });

    it('returns error on reject failure', async () => {
      const { rejectVerification } = require('@/lib/services/verification');
      rejectVerification.mockResolvedValue({ error: new Error('Rejection failed') });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.reject('req-1', 'athlete-1', 'enrollment', 'Reason');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Rejection failed');
    });
  });

  describe('bulkApprove', () => {
    it('approves multiple requests', async () => {
      const { bulkApproveVerifications } = require('@/lib/services/verification');
      bulkApproveVerifications.mockResolvedValue({
        data: { approved: 2, failed: 0 },
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.bulkApprove(['req-1', 'req-2']);
      });

      expect(response.approved).toBe(2);
      expect(response.failed).toBe(0);
      expect(bulkApproveVerifications).toHaveBeenCalledWith(['req-1', 'req-2'], 'director-123');
    });

    it('clears selection after bulk approve', async () => {
      const { bulkApproveVerifications } = require('@/lib/services/verification');
      bulkApproveVerifications.mockResolvedValue({
        data: { approved: 2, failed: 0 },
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Select some items
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds.length).toBe(2);

      await act(async () => {
        await result.current.bulkApprove(['req-1', 'req-2']);
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('returns failure count when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.bulkApprove(['req-1', 'req-2']);
      });

      expect(response.approved).toBe(0);
      expect(response.failed).toBe(2);
    });

    it('refreshes data after bulk approve', async () => {
      const {
        bulkApproveVerifications,
        getSchoolPendingVerifications,
      } = require('@/lib/services/verification');

      bulkApproveVerifications.mockResolvedValue({
        data: { approved: 2, failed: 0 },
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = getSchoolPendingVerifications.mock.calls.length;

      await act(async () => {
        await result.current.bulkApprove(['req-1', 'req-2']);
      });

      expect(getSchoolPendingVerifications.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('selection management', () => {
    it('toggles selection for individual request', async () => {
      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedIds).toEqual([]);

      act(() => {
        result.current.toggleSelect('req-1');
      });

      expect(result.current.selectedIds).toEqual(['req-1']);

      act(() => {
        result.current.toggleSelect('req-1');
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('selects all requests', async () => {
      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toEqual(['req-1', 'req-2']);
    });

    it('clears selection', async () => {
      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds.length).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('adds to existing selection', async () => {
      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleSelect('req-1');
      });

      act(() => {
        result.current.toggleSelect('req-2');
      });

      expect(result.current.selectedIds).toEqual(['req-1', 'req-2']);
    });
  });

  describe('refresh', () => {
    it('refetches data when refresh is called', async () => {
      const { getSchoolPendingVerifications } = require('@/lib/services/verification');

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = getSchoolPendingVerifications.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(getSchoolPendingVerifications.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('resubscription on schoolId change', () => {
    it('resubscribes when schoolId changes', async () => {
      const { rerender } = renderHook(
        ({ schoolId }) => useDirectorVerifications(schoolId),
        { initialProps: { schoolId: 'school-1' } }
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('director-verifications:school-1');
      });

      rerender({ schoolId: 'school-2' });

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('director-verifications:school-2');
      });
    });
  });

  describe('edge cases', () => {
    it('handles exception during approve', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('handles exception during reject', async () => {
      const { rejectVerification } = require('@/lib/services/verification');
      rejectVerification.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.reject('req-1', 'athlete-1', 'enrollment', 'Reason');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('handles exception during bulk approve', async () => {
      const { bulkApproveVerifications } = require('@/lib/services/verification');
      bulkApproveVerifications.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await act(async () => {
        return await result.current.bulkApprove(['req-1', 'req-2']);
      });

      expect(response.approved).toBe(0);
      expect(response.failed).toBe(2);
    });

    it('prevents pending count from going below zero', async () => {
      const { approveVerification } = require('@/lib/services/verification');
      approveVerification.mockResolvedValue({ error: null });

      const {
        getSchoolPendingVerifications,
        getPendingVerificationCount,
      } = require('@/lib/services/verification');

      getSchoolPendingVerifications.mockResolvedValue({
        data: [mockVerificationRequests[0]],
        error: null,
      });

      getPendingVerificationCount.mockResolvedValue({
        data: 0, // Start with 0
        error: null,
      });

      const { result } = renderHook(() => useDirectorVerifications('school-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pendingCount).toBe(0);

      await act(async () => {
        await result.current.approve('req-1', 'athlete-1', 'enrollment');
      });

      // Should remain at 0, not go negative
      expect(result.current.pendingCount).toBe(0);
    });
  });
});
