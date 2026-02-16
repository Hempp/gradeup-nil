'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VerificationType, VerificationRequestWithAthlete } from '@/lib/services/verification';

// Re-export the type from the service for consumers of this hook
export type { VerificationRequestWithAthlete } from '@/lib/services/verification';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDirectorVerificationsResult {
  requests: VerificationRequestWithAthlete[];
  pendingCount: number;
  loading: boolean;
  error: Error | null;
  approve: (requestId: string, athleteId: string, type: VerificationType) => Promise<{ success: boolean; error?: string }>;
  reject: (requestId: string, athleteId: string, type: VerificationType, reason: string) => Promise<{ success: boolean; error?: string }>;
  bulkApprove: (requestIds: string[]) => Promise<{ approved: number; failed: number }>;
  refresh: () => Promise<void>;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing director verification queue
 * Handles fetching requests, approving, rejecting, and bulk actions
 */
export function useDirectorVerifications(schoolId: string | null): UseDirectorVerificationsResult {
  const [requests, setRequests] = useState<VerificationRequestWithAthlete[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch pending verifications
  const fetchRequests = useCallback(async () => {
    if (!schoolId) {
      setRequests([]);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { getSchoolPendingVerifications, getPendingVerificationCount } = await import('@/lib/services/verification');

      const [requestsResult, countResult] = await Promise.all([
        getSchoolPendingVerifications(schoolId),
        getPendingVerificationCount(schoolId),
      ]);

      if (requestsResult.error) {
        setError(requestsResult.error);
      } else {
        setRequests(requestsResult.data || []);
      }

      if (!countResult.error) {
        setPendingCount(countResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch verification requests'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!schoolId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`director-verifications:${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_requests',
        },
        () => {
          // Refetch when any verification request changes
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, fetchRequests]);

  // Approve verification
  const approve = useCallback(async (
    requestId: string,
    athleteId: string,
    type: VerificationType
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { approveVerification } = await import('@/lib/services/verification');
      const result = await approveVerification(athleteId, type, user.id);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Optimistic update
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setPendingCount(prev => Math.max(0, prev - 1));
      setSelectedIds(prev => prev.filter(id => id !== requestId));

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to approve' };
    }
  }, []);

  // Reject verification
  const reject = useCallback(async (
    requestId: string,
    athleteId: string,
    type: VerificationType,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { rejectVerification } = await import('@/lib/services/verification');
      const result = await rejectVerification(athleteId, type, user.id, reason);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Optimistic update
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setPendingCount(prev => Math.max(0, prev - 1));
      setSelectedIds(prev => prev.filter(id => id !== requestId));

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reject' };
    }
  }, []);

  // Bulk approve
  const bulkApprove = useCallback(async (requestIds: string[]): Promise<{ approved: number; failed: number }> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { approved: 0, failed: requestIds.length };
      }

      const { bulkApproveVerifications } = await import('@/lib/services/verification');
      const result = await bulkApproveVerifications(requestIds, user.id);

      // Refresh after bulk action
      await fetchRequests();
      setSelectedIds([]);

      return result.data;
    } catch (err) {
      return { approved: 0, failed: requestIds.length };
    }
  }, [fetchRequests]);

  // Selection management
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(requests.map(r => r.id));
  }, [requests]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    requests,
    pendingCount,
    loading,
    error,
    approve,
    reject,
    bulkApprove,
    refresh: fetchRequests,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
