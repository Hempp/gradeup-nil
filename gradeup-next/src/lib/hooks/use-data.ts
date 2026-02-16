'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Athlete } from '@/types';
import type { Deal, DealFilters, Opportunity } from '@/lib/services/deals';
import type { EarningsSummary } from '@/lib/services/payments';
import type { Campaign } from '@/lib/services/brand';
import type { Conversation, Message } from '@/lib/services/messaging';
import type { Activity } from '@/lib/services/activity';
import type { AthleteStats } from '@/lib/services/athlete';
import type { BrandAnalytics } from '@/lib/services/brand';
import type { DirectorStats, ComplianceAlert } from '@/lib/services/director';
import { isDemoMode } from './use-demo-mode';

// ═══════════════════════════════════════════════════════════════════════════
// Demo Mode Mock Data
// ═══════════════════════════════════════════════════════════════════════════

const demoAthleteStats: AthleteStats = {
  total_deals: 15,
  active_deals: 3,
  completed_deals: 12,
  total_earnings: 45250,
  pending_earnings: 8500,
  profile_views: 1847,
  search_appearances: 342,
  avg_deal_value: 3017,
};

const demoDeals: Deal[] = [
  {
    id: 'demo-deal-1',
    brand_id: 'demo-brand-1',
    athlete_id: 'demo-athlete-id',
    opportunity_id: null,
    deal_type: 'social_post',
    compensation_type: 'fixed',
    compensation_amount: 5000,
    status: 'active',
    title: 'Nike Social Campaign',
    description: 'Create 3 Instagram posts featuring Nike products',
    start_date: '2026-01-15',
    end_date: '2026-03-15',
    created_at: '2026-01-10T10:00:00Z',
    brand: { company_name: 'Nike', logo_url: null },
  },
  {
    id: 'demo-deal-2',
    brand_id: 'demo-brand-2',
    athlete_id: 'demo-athlete-id',
    opportunity_id: null,
    deal_type: 'appearance',
    compensation_type: 'fixed',
    compensation_amount: 2500,
    status: 'pending',
    title: 'Gatorade Event Appearance',
    description: 'Attend product launch event',
    start_date: '2026-02-20',
    end_date: '2026-02-20',
    created_at: '2026-02-01T10:00:00Z',
    brand: { company_name: 'Gatorade', logo_url: null },
  },
  {
    id: 'demo-deal-3',
    brand_id: 'demo-brand-3',
    athlete_id: 'demo-athlete-id',
    opportunity_id: null,
    deal_type: 'endorsement',
    compensation_type: 'fixed',
    compensation_amount: 1500,
    status: 'completed',
    title: 'Local Dealership Promo',
    description: 'Social media promotion for car dealership',
    start_date: '2026-01-01',
    end_date: '2026-01-10',
    created_at: '2025-12-15T10:00:00Z',
    brand: { company_name: 'Durham Auto', logo_url: null },
  },
];

const demoEarnings: EarningsData = {
  total_earned: 45250,
  pending_amount: 8500,
  this_month: 10500,
  last_month: 12050,
  monthly_breakdown: [
    { month: 'Sep', amount: 3200 },
    { month: 'Oct', amount: 4500 },
    { month: 'Nov', amount: 6800 },
    { month: 'Dec', amount: 8200 },
    { month: 'Jan', amount: 12050 },
    { month: 'Feb', amount: 10500 },
  ],
};

const demoActivities: Activity[] = [
  {
    id: 'demo-activity-1',
    profile_id: 'demo-user-id',
    type: 'deal_accepted',
    description: 'Nike accepted your deal proposal',
    metadata: { brand: 'Nike', amount: 5000 },
    created_at: '2026-02-11T14:30:00Z',
  },
  {
    id: 'demo-activity-2',
    profile_id: 'demo-user-id',
    type: 'payment',
    description: 'Received payment from Gatorade',
    metadata: { brand: 'Gatorade', amount: 2500 },
    created_at: '2026-02-10T09:15:00Z',
  },
  {
    id: 'demo-activity-3',
    profile_id: 'demo-user-id',
    type: 'profile_view',
    description: 'Your profile was viewed 15 times today',
    metadata: { views: 15 },
    created_at: '2026-02-09T18:00:00Z',
  },
  {
    id: 'demo-activity-4',
    profile_id: 'demo-user-id',
    type: 'new_offer',
    description: 'New offer from Under Armour',
    metadata: { brand: 'Under Armour', amount: 3500 },
    created_at: '2026-02-08T11:00:00Z',
  },
  {
    id: 'demo-activity-5',
    profile_id: 'demo-user-id',
    type: 'deal_completed',
    description: 'Completed deal with Durham Auto',
    metadata: { brand: 'Durham Auto', amount: 1500 },
    created_at: '2026-02-07T16:45:00Z',
  },
  {
    id: 'demo-activity-6',
    profile_id: 'demo-user-id',
    type: 'message',
    description: 'New message from Nike representative',
    metadata: { brand: 'Nike' },
    created_at: '2026-02-06T10:30:00Z',
  },
];

const demoBrandAnalytics: BrandAnalytics = {
  total_spent: 125000,
  total_deals: 18,
  active_deals: 5,
  total_impressions: 245000,
  total_engagements: 18500,
  avg_roi: 285,
};

const demoCampaigns: Campaign[] = [
  {
    id: 'demo-campaign-1',
    brand_id: 'demo-brand-id',
    title: 'Spring Collection Launch',
    description: 'Promote our new spring athletic wear line',
    budget: 50000,
    start_date: '2026-02-01',
    end_date: '2026-04-30',
    status: 'active',
    target_sports: ['basketball', 'football'],
  },
  {
    id: 'demo-campaign-2',
    brand_id: 'demo-brand-id',
    title: 'Back to School',
    description: 'Fall semester promotional campaign',
    budget: 25000,
    start_date: '2025-08-01',
    end_date: '2025-09-30',
    status: 'completed',
    target_sports: ['all'],
  },
];

const demoDirectorStats: DirectorStats = {
  total_athletes: 247,
  active_deals: 42,
  total_earnings: 892500,
  avg_gpa: 3.45,
  verified_athletes: 198,
  pending_verifications: 49,
};

const demoComplianceAlerts: ComplianceAlert[] = [
  {
    id: 'demo-alert-1',
    athlete_id: 'demo-athlete-1',
    athlete_name: 'Marcus Johnson',
    type: 'deal_review',
    severity: 'high',
    message: 'Contract with Nike exceeds NCAA compensation guidelines - requires review',
    created_at: '2026-02-11T10:00:00Z',
  },
  {
    id: 'demo-alert-2',
    athlete_id: 'demo-athlete-2',
    athlete_name: 'Jordan Davis',
    type: 'gpa_drop',
    severity: 'medium',
    message: 'GPA verification pending for Jordan Davis',
    created_at: '2026-02-10T14:00:00Z',
  },
];

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
 * @param fetcher - Async function that returns { data, error }. Should be wrapped in useCallback by the caller.
 * @param deps - Dependency array to trigger refetch. Values are serialized to create a stable key.
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
  // Store fetcher in a ref to avoid including it in dependencies
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Serialize deps to create a stable dependency key
  const depsKey = JSON.stringify(deps);

  const fetchData = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();

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
  }, [depsKey]);

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
    // Return demo data in demo mode
    if (isDemoMode()) {
      let filteredDeals = [...demoDeals];
      if (filters?.status && filters.status.length > 0) {
        filteredDeals = filteredDeals.filter(d => filters.status!.includes(d.status));
      }
      return { data: filteredDeals, error: null };
    }

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
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoEarnings, error: null };
    }

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

/**
 * Fetch athlete stats (deals, earnings, views)
 */
export function useAthleteStats(athleteId?: string): UseDataResult<AthleteStats> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoAthleteStats, error: null };
    }

    if (!athleteId) {
      return { data: null, error: null };
    }

    try {
      const { getAthleteStats } = await import('@/lib/services/athlete');
      const result = await getAthleteStats(athleteId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch athlete stats'),
      };
    }
  }, [athleteId]);

  return useData<AthleteStats>(fetcher, [athleteId]);
}

/**
 * Fetch user activity feed
 */
export function useActivity(limit: number = 10): UseDataResult<Activity[]> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoActivities.slice(0, limit), error: null };
    }

    try {
      const { getMyActivity } = await import('@/lib/services/activity');
      const result = await getMyActivity(limit);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch activity'),
      };
    }
  }, [limit]);

  return useData<Activity[]>(fetcher, [limit]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Brand Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch brand campaigns
 */
export function useBrandCampaigns(brandId?: string): UseDataResult<Campaign[]> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoCampaigns, error: null };
    }

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
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoDeals, error: null };
    }

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

// ═══════════════════════════════════════════════════════════════════════════
// Brand Analytics Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch brand analytics
 */
export function useBrandAnalytics(brandId?: string): UseDataResult<BrandAnalytics> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoBrandAnalytics, error: null };
    }

    try {
      const { getBrandAnalytics } = await import('@/lib/services/brand');
      const result = await getBrandAnalytics(brandId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch brand analytics'),
      };
    }
  }, [brandId]);

  return useData<BrandAnalytics>(fetcher, [brandId]);
}

/**
 * Fetch brand shortlisted athletes
 */
export function useBrandShortlist(brandId?: string): UseDataResult<Athlete[]> {
  const fetcher = useCallback(async () => {
    try {
      const { getShortlistedAthletes } = await import('@/lib/services/brand');
      const result = await getShortlistedAthletes(brandId);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch shortlist'),
      };
    }
  }, [brandId]);

  return useData<Athlete[]>(fetcher, [brandId]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Director Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch director statistics
 */
export function useDirectorStats(): UseDataResult<DirectorStats> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoDirectorStats, error: null };
    }

    try {
      const { getDirectorStats } = await import('@/lib/services/director');
      const result = await getDirectorStats();
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch director stats'),
      };
    }
  }, []);

  return useData<DirectorStats>(fetcher, []);
}

/**
 * Fetch school athletes for director
 */
export function useSchoolAthletes(page: number = 1): UseDataResult<{ athletes: Athlete[]; total: number }> {
  const fetcher = useCallback(async () => {
    try {
      const { getSchoolAthletes } = await import('@/lib/services/director');
      const result = await getSchoolAthletes(page);
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch school athletes'),
      };
    }
  }, [page]);

  return useData<{ athletes: Athlete[]; total: number }>(fetcher, [page]);
}

/**
 * Fetch compliance alerts for director
 */
export function useComplianceAlerts(): UseDataResult<ComplianceAlert[]> {
  const fetcher = useCallback(async () => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoComplianceAlerts, error: null };
    }

    try {
      const { getComplianceAlerts } = await import('@/lib/services/director');
      const result = await getComplianceAlerts();
      return result;
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch compliance alerts'),
      };
    }
  }, []);

  return useData<ComplianceAlert[]>(fetcher, []);
}
