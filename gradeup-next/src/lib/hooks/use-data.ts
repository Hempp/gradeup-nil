'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Athlete } from '@/types';
import type { Deal, DealFilters, Opportunity } from '@/lib/services/deals';
import type { EarningsSummary } from '@/lib/services/payments';
import type { Campaign } from '@/lib/services/brand';
import type { Conversation, Message } from '@/lib/services/messaging';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// AthleteProfile is just an alias for Athlete with optional stats
export type AthleteProfile = Athlete & {
  stats?: {
    totalEarnings: number;
    activeDeals: number;
    completedDeals: number;
    profileViews: number;
  };
};

// Re-export EarningsSummary as EarningsData for backward compatibility
export type EarningsData = EarningsSummary;

// Re-export DealFilters from deals service
export type { DealFilters };

// OpportunityFilters is same as DealFilters
export type OpportunityFilters = DealFilters;

// ═══════════════════════════════════════════════════════════════════════════
// Generic Data Fetching Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic data fetching hook with loading, error states, and refetch capability.
 *
 * @param fetcher - Async function that returns { data, error }
 * @param deps - Dependency array to trigger refetch
 * @returns { data, loading, error, refetch }
 */
export function useData<T>(
  fetcher: () => Promise<{ data: T | null; error: Error | null }>,
  deps: unknown[] = []
): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  // Track current fetch to handle race conditions
  const fetchIdRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // Only update state if this is the latest fetch and component is mounted
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result.data);
          setError(null);
        }
      }
    } catch (err) {
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        setData(null);
      }
    } finally {
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, ...deps]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════════════════
// Athlete Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch athlete profile with stats
 */
export function useAthleteProfile(athleteId?: string): UseDataResult<AthleteProfile> {
  const fetcher = useCallback(async (): Promise<{ data: AthleteProfile | null; error: Error | null }> => {
    if (!athleteId) {
      return { data: null, error: null };
    }

    try {
      // Import service dynamically to avoid circular dependencies
      const { getAthleteById } = await import('@/lib/services/athlete');
      const result = await getAthleteById(athleteId);
      // Cast Athlete to AthleteProfile (they're compatible)
      return { data: result.data as AthleteProfile | null, error: result.error };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch athlete profile'),
      };
    }
  }, [athleteId]);

  return useData<AthleteProfile>(fetcher, [athleteId]);
}

/**
 * Fetch athlete deals with optional filters
 */
export function useAthleteDeals(
  athleteId?: string,
  filters?: DealFilters
): UseDataResult<Deal[]> {
  const fetcher = useCallback(async (): Promise<{ data: Deal[] | null; error: Error | null }> => {
    if (!athleteId) {
      return { data: null, error: null };
    }

    try {
      const { getAthleteDeals } = await import('@/lib/services/deals');
      const result = await getAthleteDeals(athleteId, filters);
      return { data: result.deals, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch athlete deals'),
      };
    }
  }, [athleteId, filters]);

  return useData<Deal[]>(fetcher, [athleteId, JSON.stringify(filters)]);
}

/**
 * Fetch athlete earnings data
 */
export function useAthleteEarnings(athleteId?: string): UseDataResult<EarningsData> {
  const fetcher = useCallback(async () => {
    if (!athleteId) {
      return { data: null, error: null };
    }

    try {
      const { getEarningsSummary: getAthleteEarnings } = await import('@/lib/services/payments');
      const result = await getAthleteEarnings(athleteId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch athlete earnings'),
      };
    }
  }, [athleteId]);

  return useData<EarningsData>(fetcher, [athleteId]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Brand Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch brand campaigns
 */
export function useBrandCampaigns(brandId?: string): UseDataResult<Campaign[]> {
  const fetcher = useCallback(async () => {
    if (!brandId) {
      return { data: null, error: null };
    }

    try {
      const { getBrandCampaigns } = await import('@/lib/services/brand');
      const result = await getBrandCampaigns(brandId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch brand campaigns'),
      };
    }
  }, [brandId]);

  return useData<Campaign[]>(fetcher, [brandId]);
}

/**
 * Fetch brand deals
 */
export function useBrandDeals(brandId?: string): UseDataResult<Deal[]> {
  const fetcher = useCallback(async (): Promise<{ data: Deal[] | null; error: Error | null }> => {
    if (!brandId) {
      return { data: null, error: null };
    }

    try {
      const { getBrandDeals } = await import('@/lib/services/deals');
      const result = await getBrandDeals(brandId);
      return { data: result.deals, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch brand deals'),
      };
    }
  }, [brandId]);

  return useData<Deal[]>(fetcher, [brandId]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Opportunity Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch opportunities with optional filters
 */
export function useOpportunities(filters?: OpportunityFilters): UseDataResult<Opportunity[]> {
  const fetcher = useCallback(async (): Promise<{ data: Opportunity[] | null; error: Error | null }> => {
    try {
      const { getOpportunities } = await import('@/lib/services/deals');
      const result = await getOpportunities(filters);
      return { data: result.opportunities, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch opportunities'),
      };
    }
  }, [filters]);

  return useData<Opportunity[]>(fetcher, [JSON.stringify(filters)]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Messaging Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch user conversations (uses authenticated user)
 */
export function useConversations(): UseDataResult<Conversation[]> {
  const fetcher = useCallback(async (): Promise<{ data: Conversation[] | null; error: Error | null }> => {
    try {
      const { getConversations } = await import('@/lib/services/messaging');
      const result = await getConversations();
      return { data: result.data as Conversation[] | null, error: result.error };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch conversations'),
      };
    }
  }, []);

  return useData<Conversation[]>(fetcher, []);
}

/**
 * Fetch messages for a conversation
 */
export function useMessages(conversationId?: string): UseDataResult<Message[]> {
  const fetcher = useCallback(async () => {
    if (!conversationId) {
      return { data: null, error: null };
    }

    try {
      const { getMessages } = await import('@/lib/services/messaging');
      const result = await getMessages(conversationId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch messages'),
      };
    }
  }, [conversationId]);

  return useData<Message[]>(fetcher, [conversationId]);
}
