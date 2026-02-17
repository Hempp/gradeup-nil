'use client';

import { useState, useCallback, useMemo } from 'react';
import { useData, type UseDataResult } from '@/lib/hooks/use-data';
import { isDemoMode } from '@/lib/hooks/use-demo-mode';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  eachMonthOfInterval,
  eachWeekOfInterval,
} from 'date-fns';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DateRangePreset = '7d' | '30d' | '90d' | '12m' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PlatformAnalytics {
  totalAthletes: number;
  totalBrands: number;
  totalDeals: number;
  totalRevenue: number;
  athletesTrend: number;
  brandsTrend: number;
  dealsTrend: number;
  revenueTrend: number;
}

export interface DealActivityData {
  [key: string]: string | number;
  date: string;
  deals: number;
  revenue: number;
}

export interface TopAthlete {
  id: string;
  name: string;
  school: string;
  sport: string;
  totalEarnings: number;
  dealsCompleted: number;
  avatarUrl?: string;
}

export interface TopBrand {
  id: string;
  name: string;
  industry: string;
  totalSpent: number;
  dealsCompleted: number;
  logoUrl?: string;
}

export interface GeographicData {
  state: string;
  athletes: number;
  deals: number;
  revenue: number;
}

export interface SportDistribution {
  sport: string;
  athletes: number;
  deals: number;
  percentage: number;
}

export interface DealTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  overview: PlatformAnalytics;
  dealActivity: DealActivityData[];
  topAthletes: TopAthlete[];
  topBrands: TopBrand[];
  geographicData: GeographicData[];
  sportDistribution: SportDistribution[];
  dealTypeDistribution: DealTypeDistribution[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════

const generateDemoActivityData = (months: number): DealActivityData[] => {
  const data: DealActivityData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const monthStr = format(date, 'MMM yyyy');
    // Generate realistic variation
    const baseDeals = 45 + Math.floor(Math.random() * 30);
    const baseRevenue = 125000 + Math.floor(Math.random() * 75000);

    data.push({
      date: monthStr,
      deals: baseDeals + Math.floor(i * 2), // Slight growth trend
      revenue: baseRevenue + (i * 15000),
    });
  }

  return data;
};

const demoOverview: PlatformAnalytics = {
  totalAthletes: 2847,
  totalBrands: 423,
  totalDeals: 1256,
  totalRevenue: 4250000,
  athletesTrend: 12.5,
  brandsTrend: 8.3,
  dealsTrend: 15.7,
  revenueTrend: 22.4,
};

const demoTopAthletes: TopAthlete[] = [
  {
    id: 'athlete-1',
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    totalEarnings: 125000,
    dealsCompleted: 12,
  },
  {
    id: 'athlete-2',
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    totalEarnings: 98500,
    dealsCompleted: 15,
  },
  {
    id: 'athlete-3',
    name: 'DeShawn Williams',
    school: 'University of Alabama',
    sport: 'Football',
    totalEarnings: 87200,
    dealsCompleted: 8,
  },
  {
    id: 'athlete-4',
    name: 'Emma Chen',
    school: 'UCLA',
    sport: 'Gymnastics',
    totalEarnings: 76800,
    dealsCompleted: 18,
  },
  {
    id: 'athlete-5',
    name: 'Jordan Davis',
    school: 'Ohio State University',
    sport: 'Football',
    totalEarnings: 65400,
    dealsCompleted: 6,
  },
];

const demoTopBrands: TopBrand[] = [
  {
    id: 'brand-1',
    name: 'Nike',
    industry: 'Sportswear',
    totalSpent: 450000,
    dealsCompleted: 45,
  },
  {
    id: 'brand-2',
    name: 'Gatorade',
    industry: 'Beverages',
    totalSpent: 325000,
    dealsCompleted: 38,
  },
  {
    id: 'brand-3',
    name: 'Under Armour',
    industry: 'Sportswear',
    totalSpent: 280000,
    dealsCompleted: 32,
  },
  {
    id: 'brand-4',
    name: 'Red Bull',
    industry: 'Energy Drinks',
    totalSpent: 195000,
    dealsCompleted: 24,
  },
  {
    id: 'brand-5',
    name: 'Beats by Dre',
    industry: 'Electronics',
    totalSpent: 165000,
    dealsCompleted: 18,
  },
];

const demoGeographicData: GeographicData[] = [
  { state: 'California', athletes: 425, deals: 187, revenue: 685000 },
  { state: 'Texas', athletes: 380, deals: 156, revenue: 520000 },
  { state: 'Florida', athletes: 312, deals: 134, revenue: 445000 },
  { state: 'Ohio', athletes: 245, deals: 98, revenue: 325000 },
  { state: 'North Carolina', athletes: 198, deals: 87, revenue: 298000 },
  { state: 'Alabama', athletes: 176, deals: 78, revenue: 265000 },
  { state: 'Georgia', athletes: 165, deals: 72, revenue: 248000 },
  { state: 'Michigan', athletes: 142, deals: 65, revenue: 215000 },
];

const demoSportDistribution: SportDistribution[] = [
  { sport: 'Football', athletes: 685, deals: 312, percentage: 24.1 },
  { sport: 'Basketball', athletes: 542, deals: 278, percentage: 19.0 },
  { sport: 'Soccer', athletes: 398, deals: 165, percentage: 14.0 },
  { sport: 'Baseball', athletes: 312, deals: 124, percentage: 11.0 },
  { sport: 'Track & Field', athletes: 245, deals: 98, percentage: 8.6 },
  { sport: 'Swimming', athletes: 198, deals: 76, percentage: 7.0 },
  { sport: 'Volleyball', athletes: 165, deals: 65, percentage: 5.8 },
  { sport: 'Other', athletes: 302, deals: 138, percentage: 10.5 },
];

const demoDealTypeDistribution: DealTypeDistribution[] = [
  { type: 'Social Post', count: 456, percentage: 36.3 },
  { type: 'Appearance', count: 287, percentage: 22.8 },
  { type: 'Endorsement', count: 234, percentage: 18.6 },
  { type: 'Camp', count: 145, percentage: 11.5 },
  { type: 'Merchandise', count: 87, percentage: 6.9 },
  { type: 'Other', count: 47, percentage: 3.9 },
];

// ═══════════════════════════════════════════════════════════════════════════
// DATE RANGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case '7d':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
      };
    case '30d':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };
    case '90d':
      return {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        end: now,
      };
    case '12m':
      return {
        start: subMonths(now, 12),
        end: now,
      };
    case 'all':
    default:
      return {
        start: new Date('2023-01-01'),
        end: now,
      };
  }
}

export function formatDateRangeLabel(preset: DateRangePreset): string {
  switch (preset) {
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case '90d':
      return 'Last 90 Days';
    case '12m':
      return 'Last 12 Months';
    case 'all':
      return 'All Time';
    default:
      return 'Custom Range';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function aggregateByMonth<T extends { date: string; [key: string]: unknown }>(
  data: T[],
  dateRange: DateRange
): T[] {
  const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

  return months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthData = data.filter((item) => {
      const itemDate = parseISO(item.date);
      return isWithinInterval(itemDate, { start: monthStart, end: monthEnd });
    });

    // Aggregate numeric values
    const aggregated: Record<string, unknown> = {
      date: format(month, 'MMM yyyy'),
    };

    if (monthData.length > 0) {
      const keys = Object.keys(monthData[0]).filter((k) => k !== 'date');
      keys.forEach((key) => {
        const value = monthData[0][key];
        if (typeof value === 'number') {
          aggregated[key] = monthData.reduce((sum, item) => sum + (item[key] as number), 0);
        }
      });
    }

    return aggregated as T;
  });
}

export function aggregateByWeek<T extends { date: string; [key: string]: unknown }>(
  data: T[],
  dateRange: DateRange
): T[] {
  const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });

  return weeks.map((week) => {
    const weekStart = startOfWeek(week);
    const weekEnd = endOfWeek(week);

    const weekData = data.filter((item) => {
      const itemDate = parseISO(item.date);
      return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
    });

    const aggregated: Record<string, unknown> = {
      date: format(week, 'MMM d'),
    };

    if (weekData.length > 0) {
      const keys = Object.keys(weekData[0]).filter((k) => k !== 'date');
      keys.forEach((key) => {
        const value = weekData[0][key];
        if (typeof value === 'number') {
          aggregated[key] = weekData.reduce((sum, item) => sum + (item[key] as number), 0);
        }
      });
    }

    return aggregated as T;
  });
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseAnalyticsOptions {
  dateRange?: DateRangePreset;
  customDateRange?: DateRange;
}

export interface UseAnalyticsResult extends UseDataResult<AnalyticsData> {
  dateRange: DateRangePreset;
  setDateRange: (range: DateRangePreset) => void;
  effectiveDateRange: DateRange;
}

/**
 * Hook to fetch and manage platform analytics data
 *
 * @param options - Configuration options including date range
 * @returns Analytics data with loading state, error handling, and date range controls
 *
 * @example
 * ```tsx
 * const { data, loading, error, dateRange, setDateRange } = useAnalytics();
 *
 * if (loading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <AnalyticsDashboard
 *     overview={data.overview}
 *     dealActivity={data.dealActivity}
 *     onDateRangeChange={setDateRange}
 *   />
 * );
 * ```
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsResult {
  const [dateRange, setDateRange] = useState<DateRangePreset>(options.dateRange ?? '30d');

  const effectiveDateRange = useMemo(() => {
    if (options.customDateRange) {
      return options.customDateRange;
    }
    return getDateRangeFromPreset(dateRange);
  }, [dateRange, options.customDateRange]);

  const fetcher = useCallback(async (): Promise<{ data: AnalyticsData | null; error: Error | null }> => {
    // Return demo data in demo mode
    if (isDemoMode()) {
      // Adjust demo data based on date range
      const months = dateRange === '7d' ? 1 : dateRange === '30d' ? 1 : dateRange === '90d' ? 3 : 12;
      const dealActivity = generateDemoActivityData(months);

      return {
        data: {
          overview: demoOverview,
          dealActivity,
          topAthletes: demoTopAthletes,
          topBrands: demoTopBrands,
          geographicData: demoGeographicData,
          sportDistribution: demoSportDistribution,
          dealTypeDistribution: demoDealTypeDistribution,
        },
        error: null,
      };
    }

    try {
      // In production, fetch from Supabase
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch overview metrics
      const [athletesResult, brandsResult, dealsResult] = await Promise.all([
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase.from('brands').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id, compensation_amount, created_at, status'),
      ]);

      const totalAthletes = athletesResult.count ?? 0;
      const totalBrands = brandsResult.count ?? 0;
      const deals = dealsResult.data ?? [];
      const totalDeals = deals.length;
      const totalRevenue = deals
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

      // Calculate trends (comparing to previous period)
      const periodStart = effectiveDateRange.start;
      const periodEnd = effectiveDateRange.end;
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      const previousPeriodStart = new Date(periodStart.getTime() - periodLength);

      const currentPeriodDeals = deals.filter(d => {
        const createdAt = new Date(d.created_at);
        return createdAt >= periodStart && createdAt <= periodEnd;
      });

      const previousPeriodDeals = deals.filter(d => {
        const createdAt = new Date(d.created_at);
        return createdAt >= previousPeriodStart && createdAt < periodStart;
      });

      const overview: PlatformAnalytics = {
        totalAthletes,
        totalBrands,
        totalDeals,
        totalRevenue,
        athletesTrend: 0, // Would need historical data
        brandsTrend: 0,
        dealsTrend: calculateTrend(currentPeriodDeals.length, previousPeriodDeals.length),
        revenueTrend: calculateTrend(
          currentPeriodDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0),
          previousPeriodDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0)
        ),
      };

      // Generate deal activity data from actual deals
      const dealActivity: DealActivityData[] = [];
      const monthsToShow = dateRange === '7d' ? 1 : dateRange === '30d' ? 1 : dateRange === '90d' ? 3 : 12;

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthDeals = deals.filter(d => {
          const createdAt = new Date(d.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        });

        dealActivity.push({
          date: format(monthDate, 'MMM yyyy'),
          deals: monthDeals.length,
          revenue: monthDeals
            .filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + (d.compensation_amount || 0), 0),
        });
      }

      // Fetch top athletes
      const { data: topAthletesData } = await supabase
        .from('deals')
        .select(`
          athlete_id,
          compensation_amount,
          athletes (
            id,
            first_name,
            last_name,
            avatar_url,
            school:schools (name),
            sport:sports (name)
          )
        `)
        .eq('status', 'completed')
        .limit(100);

      const athleteEarnings = new Map<string, {
        athlete: TopAthlete;
        earnings: number;
        deals: number
      }>();

      (topAthletesData || []).forEach((deal) => {
        const athleteId = deal.athlete_id;
        // Handle Supabase join result (could be array or single object depending on relationship)
        const athleteData = deal.athletes;
        const athlete = (Array.isArray(athleteData) ? athleteData[0] : athleteData) as {
          id: string;
          first_name: string;
          last_name: string;
          avatar_url?: string;
          school?: { name: string } | Array<{ name: string }>;
          sport?: { name: string } | Array<{ name: string }>;
        } | null;

        if (!athlete) return;

        const existing = athleteEarnings.get(athleteId);
        if (existing) {
          existing.earnings += deal.compensation_amount || 0;
          existing.deals += 1;
        } else {
          // Extract school/sport name from potentially nested structure
          const schoolData = athlete.school;
          const sportData = athlete.sport;
          const schoolName = Array.isArray(schoolData) ? schoolData[0]?.name : schoolData?.name;
          const sportName = Array.isArray(sportData) ? sportData[0]?.name : sportData?.name;

          athleteEarnings.set(athleteId, {
            athlete: {
              id: athlete.id,
              name: `${athlete.first_name} ${athlete.last_name}`,
              school: schoolName || 'Unknown',
              sport: sportName || 'Unknown',
              totalEarnings: deal.compensation_amount || 0,
              dealsCompleted: 1,
              avatarUrl: athlete.avatar_url,
            },
            earnings: deal.compensation_amount || 0,
            deals: 1,
          });
        }
      });

      const topAthletes = Array.from(athleteEarnings.values())
        .map(({ athlete, earnings, deals }) => ({
          ...athlete,
          totalEarnings: earnings,
          dealsCompleted: deals,
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 5);

      // Fetch top brands
      const { data: topBrandsData } = await supabase
        .from('deals')
        .select(`
          brand_id,
          compensation_amount,
          brands (
            id,
            company_name,
            industry,
            logo_url
          )
        `)
        .eq('status', 'completed')
        .limit(100);

      const brandSpending = new Map<string, {
        brand: TopBrand;
        spent: number;
        deals: number
      }>();

      (topBrandsData || []).forEach((deal) => {
        const brandId = deal.brand_id;
        // Handle Supabase join result (could be array or single object depending on relationship)
        const brandData = deal.brands;
        const brand = (Array.isArray(brandData) ? brandData[0] : brandData) as {
          id: string;
          company_name: string;
          industry?: string;
          logo_url?: string;
        } | null;

        if (!brand) return;

        const existing = brandSpending.get(brandId);
        if (existing) {
          existing.spent += deal.compensation_amount || 0;
          existing.deals += 1;
        } else {
          brandSpending.set(brandId, {
            brand: {
              id: brand.id,
              name: brand.company_name,
              industry: brand.industry || 'Unknown',
              totalSpent: deal.compensation_amount || 0,
              dealsCompleted: 1,
              logoUrl: brand.logo_url,
            },
            spent: deal.compensation_amount || 0,
            deals: 1,
          });
        }
      });

      const topBrands = Array.from(brandSpending.values())
        .map(({ brand, spent, deals }) => ({
          ...brand,
          totalSpent: spent,
          dealsCompleted: deals,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      return {
        data: {
          overview,
          dealActivity,
          topAthletes: topAthletes.length > 0 ? topAthletes : demoTopAthletes,
          topBrands: topBrands.length > 0 ? topBrands : demoTopBrands,
          geographicData: demoGeographicData, // Would need more complex query
          sportDistribution: demoSportDistribution, // Would need more complex query
          dealTypeDistribution: demoDealTypeDistribution, // Would need more complex query
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch analytics'),
      };
    }
  }, [dateRange, effectiveDateRange]);

  const result = useData<AnalyticsData>(fetcher, [dateRange]);

  return {
    ...result,
    dateRange,
    setDateRange,
    effectiveDateRange,
  };
}

export default useAnalytics;
