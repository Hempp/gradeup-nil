'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as athleteService from '@/lib/services/athlete';
import * as dealsService from '@/lib/services/deals';
import {
  mockFeaturedAthletes,
  mockTestimonials,
  mockLandingStats,
  mockOpportunities,
  type FeaturedAthlete,
  type Testimonial,
  type LandingStats,
  type LandingOpportunity,
} from '@/data/mock/landing';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseLandingDataResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Re-export types for consumers
export type { FeaturedAthlete, Testimonial, LandingStats, LandingOpportunity };

// ═══════════════════════════════════════════════════════════════════════════
// Featured Athletes Hook - Uses Real Supabase Data
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch featured athletes from Supabase.
 * Transforms athlete data to FeaturedAthlete format.
 * Falls back to mock data if API unavailable.
 */
export function useFeaturedAthletes(limit: number = 4): UseLandingDataResult<FeaturedAthlete[]> {
  const [data, setData] = useState<FeaturedAthlete[]>(mockFeaturedAthletes);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch athletes with high GPA, sorted by NIL valuation
      const result = await athleteService.searchAthletes({
        min_gpa: 3.0,
        page: 1,
        page_size: limit,
      });

      if (result.error || !result.data) {
        throw result.error || new Error('No data returned');
      }

      // Transform Supabase data to FeaturedAthlete format
      const transformedAthletes: FeaturedAthlete[] = result.data.athletes.map((athlete) => ({
        id: athlete.id,
        name: athlete.profile
          ? `${athlete.profile.first_name} ${athlete.profile.last_name}`
          : 'Unknown Athlete',
        sport: athlete.sport?.name || 'Unknown Sport',
        school: athlete.school?.name || 'Unknown School',
        gpa: athlete.gpa || 0,
        image: athlete.profile?.avatar_url ||
          `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400`,
        followers: formatFollowers(athlete.nil_valuation || 0),
        deals: 0, // Would need additional query to get deal count
        verified: true, // Assume verified if in searchable athletes
      }));

      if (isMountedRef.current) {
        // Use mock data if no real athletes found
        setData(transformedAthletes.length > 0 ? transformedAthletes : mockFeaturedAthletes);
        setError(null);
      }
    } catch (err) {
      // Silently fall back to mock data in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('Featured athletes fetch failed, using mock data:', err);
      }
      if (isMountedRef.current) {
        setData(mockFeaturedAthletes);
        setError(err instanceof Error ? err : new Error('Failed to fetch athletes'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => { isMountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper to format NIL valuation as follower count display
function formatFollowers(valuation: number): string {
  if (valuation >= 1000000) return `${(valuation / 1000000).toFixed(1)}M`;
  if (valuation >= 1000) return `${(valuation / 1000).toFixed(0)}K`;
  return `${valuation}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Testimonials Hook - Uses Mock Data (No backend table yet)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch testimonials for the landing page.
 * Currently uses mock data - can be connected to Supabase when table exists.
 */
export function useTestimonials(): UseLandingDataResult<Testimonial[]> {
  const [data] = useState<Testimonial[]>(mockTestimonials);
  const [loading] = useState<boolean>(false);
  const [error] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    // TODO: Connect to Supabase testimonials table when available
  }, []);

  return { data, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════════════════
// Landing Stats Hook - Aggregates Real Data from Supabase
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch landing page statistics from Supabase.
 * Aggregates athlete count, brand count, average GPA, and deal count.
 * Falls back to mock data if API unavailable.
 */
export function useLandingStats(): UseLandingDataResult<LandingStats> {
  const [data, setData] = useState<LandingStats>(mockLandingStats);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch counts and compensation data in parallel
      const [athleteResult, brandResult, completedDealsResult, allDealsResult, gpaResult] = await Promise.all([
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase.from('brands').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id, compensation_amount').eq('status', 'completed'),
        supabase.from('deals').select('id', { count: 'exact', head: true }),
        supabase.from('athletes').select('gpa').not('gpa', 'is', null),
      ]);

      // Calculate average GPA
      let avgGpa = mockLandingStats.avgGpa;
      if (gpaResult.data && gpaResult.data.length > 0) {
        const totalGpa = gpaResult.data.reduce((sum, a) => sum + (a.gpa || 0), 0);
        avgGpa = Math.round((totalGpa / gpaResult.data.length) * 10) / 10;
      }

      // Calculate total paid out and average deal value from completed deals
      let totalPaidOut = mockLandingStats.totalPaidOut;
      let avgDealValue = mockLandingStats.avgDealValue;
      const completedDeals = completedDealsResult.data || [];

      if (completedDeals.length > 0) {
        totalPaidOut = completedDeals.reduce(
          (sum, deal) => sum + (deal.compensation_amount || 0),
          0
        );
        avgDealValue = Math.round(totalPaidOut / completedDeals.length);
      }

      // Calculate conversion rate (completed deals / total deals)
      const totalDealsCount = allDealsResult.count || 0;
      const completedCount = completedDeals.length;
      const conversionRate = totalDealsCount > 0
        ? Math.round((completedCount / totalDealsCount) * 100)
        : mockLandingStats.conversionRate;

      const stats: LandingStats = {
        athletes: athleteResult.count || mockLandingStats.athletes,
        brands: brandResult.count || mockLandingStats.brands,
        avgGpa,
        totalDeals: completedCount || mockLandingStats.totalDeals,
        totalPaidOut,
        avgDealValue,
        conversionRate,
      };

      if (isMountedRef.current) {
        setData(stats);
        setError(null);
      }
    } catch (err) {
      // Silently fall back to mock data in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('Landing stats fetch failed, using mock data:', err);
      }
      if (isMountedRef.current) {
        setData(mockLandingStats);
        setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => { isMountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════════════════════
// Opportunities Hook - Uses Real Supabase Data
// ═══════════════════════════════════════════════════════════════════════════

export interface UseOpportunitiesOptions {
  search?: string;
  category?: string;
  compensationType?: 'cash' | 'product' | 'hybrid' | 'all';
  minGpa?: number;
  sport?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch opportunities from Supabase with optional filtering.
 * Transforms Opportunity data to LandingOpportunity format.
 * Falls back to mock data if API unavailable.
 */
export function useLandingOpportunities(
  options: UseOpportunitiesOptions = {}
): UseLandingDataResult<LandingOpportunity[]> {
  const [data, setData] = useState<LandingOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Map category to deal_type if provided
      const dealTypeMap: Record<string, dealsService.DealType> = {
        'Ambassador': 'endorsement',
        'Social Media': 'social_post',
        'Product': 'merchandise',
        'Local': 'appearance',
        'Feature': 'endorsement',
      };

      const dealTypes = options.category && options.category !== 'all'
        ? [dealTypeMap[options.category] || 'other'] as dealsService.DealType[]
        : undefined;

      const result = await dealsService.getOpportunities({
        page: options.page || 1,
        page_size: options.pageSize || 10,
        deal_types: dealTypes,
      });

      // Transform to LandingOpportunity format
      const transformedOpportunities: LandingOpportunity[] = result.opportunities.map((opp) => ({
        id: opp.id,
        brandName: opp.brand?.company_name || 'Unknown Brand',
        brandLogo: opp.brand?.logo_url || '',
        title: opp.title,
        compensation: formatCompensation(opp.compensation_amount),
        compensationType: mapCompensationType(opp.deal_type),
        category: mapDealTypeToCategory(opp.deal_type),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        minGpa: 3.0, // Default minimum GPA
        sports: ['All Sports'],
        description: opp.description,
        featured: opp.compensation_amount >= 1000, // Feature high-value opportunities
      }));

      // Apply client-side filters not supported by backend
      let filtered = transformedOpportunities;

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filtered = filtered.filter(
          (opp) =>
            opp.title.toLowerCase().includes(searchLower) ||
            opp.brandName.toLowerCase().includes(searchLower) ||
            opp.description.toLowerCase().includes(searchLower)
        );
      }

      if (options.compensationType && options.compensationType !== 'all') {
        filtered = filtered.filter((opp) => opp.compensationType === options.compensationType);
      }

      if (options.featured !== undefined) {
        filtered = filtered.filter((opp) => opp.featured === options.featured);
      }

      if (isMountedRef.current) {
        // Use mock data if no real opportunities found
        setData(filtered.length > 0 ? filtered : mockOpportunities);
        setError(null);
      }
    } catch (err) {
      // Silently fall back to mock data in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('Opportunities fetch failed, using mock data:', err);
      }
      if (isMountedRef.current) {
        // Fall back to filtered mock data
        let filtered = [...mockOpportunities];

        if (options.search) {
          const searchLower = options.search.toLowerCase();
          filtered = filtered.filter(
            (opp) =>
              opp.title.toLowerCase().includes(searchLower) ||
              opp.brandName.toLowerCase().includes(searchLower) ||
              opp.description.toLowerCase().includes(searchLower)
          );
        }

        if (options.category && options.category !== 'all') {
          filtered = filtered.filter((opp) => opp.category === options.category);
        }

        if (options.compensationType && options.compensationType !== 'all') {
          filtered = filtered.filter((opp) => opp.compensationType === options.compensationType);
        }

        setData(filtered);
        setError(err instanceof Error ? err : new Error('Failed to fetch opportunities'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [options.search, options.category, options.compensationType, options.minGpa, options.sport, options.featured, options.page, options.pageSize]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => { isMountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper functions for data transformation

function formatCompensation(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return `$${amount}`;
}

function mapCompensationType(dealType: dealsService.DealType): 'cash' | 'product' | 'hybrid' {
  switch (dealType) {
    case 'merchandise':
      return 'product';
    case 'endorsement':
    case 'appearance':
    case 'camp':
      return 'cash';
    default:
      return 'hybrid';
  }
}

function mapDealTypeToCategory(dealType: dealsService.DealType): string {
  switch (dealType) {
    case 'endorsement':
      return 'Ambassador';
    case 'social_post':
      return 'Social Media';
    case 'merchandise':
      return 'Product';
    case 'appearance':
      return 'Local';
    case 'camp':
      return 'Feature';
    default:
      return 'Other';
  }
}
