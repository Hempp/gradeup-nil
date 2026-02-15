'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VerificationType, VerificationRequest } from '@/lib/services/verification';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface VerificationStatus {
  enrollment_verified: boolean;
  sport_verified: boolean;
  grades_verified: boolean;
  identity_verified: boolean;
  stats_verified: boolean;
  pending_requests: VerificationRequest[];
}

export interface UseVerificationRequestsResult {
  status: VerificationStatus | null;
  loading: boolean;
  error: Error | null;
  submitRequest: (type: VerificationType, notes?: string) => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
  canRequestVerification: (type: VerificationType) => boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing athlete verification requests
 * Handles fetching status, submitting requests, and real-time updates
 */
export function useVerificationRequests(athleteId: string | null): UseVerificationRequestsResult {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    if (!athleteId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { getAthleteVerificationStatus } = await import('@/lib/services/verification');
      const result = await getAthleteVerificationStatus(athleteId);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setStatus({
          ...result.data,
          stats_verified: false, // Add default for stats
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch verification status'));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!athleteId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`verification:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_requests',
          filter: `athlete_id=eq.${athleteId}`,
        },
        () => {
          // Refetch status when any verification request changes
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, fetchStatus]);

  // Submit verification request
  const submitRequest = useCallback(async (
    type: VerificationType,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!athleteId) {
      return { success: false, error: 'No athlete ID provided' };
    }

    try {
      const { submitVerificationRequest } = await import('@/lib/services/verification');
      const result = await submitVerificationRequest(athleteId, type, notes);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Refresh status after successful submission
      await fetchStatus();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit request' };
    }
  }, [athleteId, fetchStatus]);

  // Check if verification can be requested for a type
  const canRequestVerification = useCallback((type: VerificationType): boolean => {
    if (!status) return false;

    // Map type to verified field
    const verifiedMap: Record<VerificationType, keyof VerificationStatus | null> = {
      enrollment: 'enrollment_verified',
      sport: 'sport_verified',
      grades: 'grades_verified',
      identity: 'identity_verified',
      stats: 'stats_verified',
      ncaa_eligibility: null,
    };

    const field = verifiedMap[type];
    if (!field) return false;

    // Already verified
    if (status[field]) return false;

    // Already has pending request
    const hasPending = status.pending_requests.some(
      req => req.type === type && (req.status === 'pending' || req.status === 'in_review')
    );
    if (hasPending) return false;

    return true;
  }, [status]);

  return {
    status,
    loading,
    error,
    submitRequest,
    refreshStatus: fetchStatus,
    canRequestVerification,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Hook - Get verification label
// ═══════════════════════════════════════════════════════════════════════════

export function getVerificationLabel(type: VerificationType): string {
  const labels: Record<VerificationType, string> = {
    enrollment: 'Enrollment',
    sport: 'Sport',
    grades: 'Grades',
    identity: 'Identity',
    stats: 'Stats',
    ncaa_eligibility: 'NCAA Eligibility',
  };
  return labels[type] || type;
}

export function getVerificationIcon(type: VerificationType): string {
  const icons: Record<VerificationType, string> = {
    enrollment: 'GraduationCap',
    sport: 'Trophy',
    grades: 'FileText',
    identity: 'User',
    stats: 'BarChart3',
    ncaa_eligibility: 'Shield',
  };
  return icons[type] || 'CheckCircle';
}
