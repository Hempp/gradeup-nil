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

// Demo athletes for brand shortlist and director school athletes
const demoAthletes: Athlete[] = [
  {
    id: 'demo-athlete-1',
    profile_id: 'demo-profile-1',
    name: 'Marcus Johnson',
    first_name: 'Marcus',
    last_name: 'Johnson',
    email: 'marcus.johnson@duke.edu',
    gpa: 3.87,
    school_id: 'duke-university',
    sport_id: 'basketball',
    major: 'Business Administration',
    position: 'Point Guard',
    gender: 'Male',
    jersey_number: '23',
    hometown: 'Chicago, IL',
    academic_year: 'Junior',
    avatar_url: undefined,
    instagram_handle: '@marcusjohnson',
    total_followers: 125000,
    enrollment_verified: true,
    sport_verified: true,
    grades_verified: true,
    identity_verified: true,
    created_at: '2024-08-15T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
    school: {
      id: 'duke-university',
      name: 'Duke University',
      short_name: 'Duke',
      city: 'Durham',
      state: 'NC',
      division: 'Division I',
      conference: 'ACC',
    },
    sport: {
      id: 'basketball',
      name: 'Basketball',
      category: 'Team Sports',
      gender: 'Men',
    },
  },
  {
    id: 'demo-athlete-2',
    profile_id: 'demo-profile-2',
    name: 'Sarah Williams',
    first_name: 'Sarah',
    last_name: 'Williams',
    email: 'sarah.williams@stanford.edu',
    gpa: 3.92,
    school_id: 'stanford-university',
    sport_id: 'soccer',
    major: 'Computer Science',
    position: 'Forward',
    gender: 'Female',
    jersey_number: '10',
    hometown: 'Seattle, WA',
    academic_year: 'Senior',
    avatar_url: undefined,
    instagram_handle: '@sarahwilliams',
    total_followers: 89000,
    enrollment_verified: true,
    sport_verified: true,
    grades_verified: true,
    identity_verified: true,
    created_at: '2023-09-01T10:00:00Z',
    updated_at: '2026-02-08T10:00:00Z',
    school: {
      id: 'stanford-university',
      name: 'Stanford University',
      short_name: 'Stanford',
      city: 'Stanford',
      state: 'CA',
      division: 'Division I',
      conference: 'Pac-12',
    },
    sport: {
      id: 'soccer',
      name: 'Soccer',
      category: 'Team Sports',
      gender: 'Women',
    },
  },
  {
    id: 'demo-athlete-3',
    profile_id: 'demo-profile-3',
    name: 'Jordan Davis',
    first_name: 'Jordan',
    last_name: 'Davis',
    email: 'jordan.davis@osu.edu',
    gpa: 3.65,
    school_id: 'ohio-state',
    sport_id: 'football',
    major: 'Sports Management',
    position: 'Quarterback',
    gender: 'Male',
    jersey_number: '7',
    hometown: 'Columbus, OH',
    academic_year: 'Sophomore',
    avatar_url: undefined,
    instagram_handle: '@jordandavis',
    total_followers: 210000,
    enrollment_verified: true,
    sport_verified: true,
    grades_verified: false,
    identity_verified: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2026-02-05T10:00:00Z',
    school: {
      id: 'ohio-state',
      name: 'Ohio State University',
      short_name: 'OSU',
      city: 'Columbus',
      state: 'OH',
      division: 'Division I',
      conference: 'Big Ten',
    },
    sport: {
      id: 'football',
      name: 'Football',
      category: 'Team Sports',
      gender: 'Men',
    },
  },
  {
    id: 'demo-athlete-4',
    profile_id: 'demo-profile-4',
    name: 'Emma Chen',
    first_name: 'Emma',
    last_name: 'Chen',
    email: 'emma.chen@ucla.edu',
    gpa: 3.95,
    school_id: 'ucla',
    sport_id: 'gymnastics',
    major: 'Psychology',
    position: 'All-Around',
    gender: 'Female',
    hometown: 'San Jose, CA',
    academic_year: 'Junior',
    avatar_url: undefined,
    instagram_handle: '@emmachen',
    total_followers: 150000,
    enrollment_verified: true,
    sport_verified: true,
    grades_verified: true,
    identity_verified: true,
    created_at: '2023-08-20T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    school: {
      id: 'ucla',
      name: 'UCLA',
      short_name: 'UCLA',
      city: 'Los Angeles',
      state: 'CA',
      division: 'Division I',
      conference: 'Pac-12',
    },
    sport: {
      id: 'gymnastics',
      name: 'Gymnastics',
      category: 'Individual Sports',
      gender: 'Women',
    },
  },
  {
    id: 'demo-athlete-5',
    profile_id: 'demo-profile-5',
    name: 'DeShawn Williams',
    first_name: 'DeShawn',
    last_name: 'Williams',
    email: 'deshawn.williams@alabama.edu',
    gpa: 3.52,
    school_id: 'alabama',
    sport_id: 'football',
    major: 'Communications',
    position: 'Running Back',
    gender: 'Male',
    jersey_number: '22',
    hometown: 'Atlanta, GA',
    academic_year: 'Senior',
    avatar_url: undefined,
    instagram_handle: '@deshawnwilliams',
    total_followers: 320000,
    enrollment_verified: true,
    sport_verified: true,
    grades_verified: true,
    identity_verified: true,
    created_at: '2022-08-15T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
    school: {
      id: 'alabama',
      name: 'University of Alabama',
      short_name: 'Alabama',
      city: 'Tuscaloosa',
      state: 'AL',
      division: 'Division I',
      conference: 'SEC',
    },
    sport: {
      id: 'football',
      name: 'Football',
      category: 'Team Sports',
      gender: 'Men',
    },
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
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: demoAthletes.slice(0, 5), error: null };
    }

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
    // Return demo data in demo mode
    if (isDemoMode()) {
      return { data: { athletes: demoAthletes, total: demoAthletes.length }, error: null };
    }

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
