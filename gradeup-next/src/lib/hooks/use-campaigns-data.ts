'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getBrandCampaigns, type Campaign } from '@/lib/services/brand';
import type { DealStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface EnrichedCampaign {
  id: string;
  name: string;
  description: string | null;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string | null;
  athletes: number;
  targetSports: string[];
  status: DealStatus;
}

interface UseCampaignsResult {
  data: EnrichedCampaign[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data (fallback when Supabase unavailable)
// ═══════════════════════════════════════════════════════════════════════════

const mockCampaigns: EnrichedCampaign[] = [
  {
    id: '1',
    name: 'Spring Collection Launch',
    description: 'Promote our new spring athletic wear collection',
    budget: 50000,
    spent: 32500,
    startDate: '2024-02-01',
    endDate: '2024-04-30',
    athletes: 5,
    targetSports: ['Basketball', 'Soccer'],
    status: 'active',
  },
  {
    id: '2',
    name: 'Summer Sports Partnership',
    description: 'Long-term partnerships with summer sport athletes',
    budget: 75000,
    spent: 15000,
    startDate: '2024-03-01',
    endDate: '2024-08-31',
    athletes: 8,
    targetSports: ['Swimming', 'Track & Field', 'Tennis'],
    status: 'active',
  },
  {
    id: '3',
    name: 'Back to School Campaign',
    description: 'Student athlete promotion for back to school season',
    budget: 30000,
    spent: 0,
    startDate: '2024-08-01',
    endDate: '2024-09-15',
    athletes: 0,
    targetSports: ['Football', 'Basketball', 'Volleyball'],
    status: 'draft',
  },
  {
    id: '4',
    name: 'Holiday Season Push',
    description: 'Holiday gift guide featuring athlete endorsements',
    budget: 100000,
    spent: 100000,
    startDate: '2023-11-15',
    endDate: '2023-12-31',
    athletes: 12,
    targetSports: ['All Sports'],
    status: 'completed',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map campaign status from backend to UI status
 */
function mapCampaignStatus(status: Campaign['status']): DealStatus {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'active':
      return 'active';
    case 'paused':
      return 'pending'; // Map paused to pending for UI consistency
    case 'completed':
      return 'completed';
    default:
      return 'draft';
  }
}

/**
 * Fetch campaign spend and athlete counts from deals
 */
async function getCampaignMetrics(
  campaignId: string
): Promise<{ spent: number; athleteCount: number }> {
  const supabase = createClient();

  try {
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, compensation_amount, athlete_id, status')
      .eq('campaign_id', campaignId);

    if (error || !deals) {
      return { spent: 0, athleteCount: 0 };
    }

    // Calculate spent (only from completed or active deals)
    const spent = deals
      .filter((d) => d.status === 'completed' || d.status === 'active' || d.status === 'accepted')
      .reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

    // Count unique athletes
    const uniqueAthletes = new Set(deals.map((d) => d.athlete_id)).size;

    return { spent, athleteCount: uniqueAthletes };
  } catch {
    return { spent: 0, athleteCount: 0 };
  }
}

/**
 * Transform Campaign from backend to EnrichedCampaign
 */
async function transformCampaign(campaign: Campaign): Promise<EnrichedCampaign> {
  const metrics = await getCampaignMetrics(campaign.id);

  return {
    id: campaign.id,
    name: campaign.title,
    description: campaign.description,
    budget: campaign.budget,
    spent: metrics.spent,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    athletes: metrics.athleteCount,
    targetSports: campaign.target_sports || [],
    status: mapCampaignStatus(campaign.status),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch and enrich brand campaigns
 */
export function useBrandCampaigns(): UseCampaignsResult {
  const [data, setData] = useState<EnrichedCampaign[]>(mockCampaigns);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getBrandCampaigns();

        if (cancelled) return;

        if (result.error || !result.data) {
          console.warn('Using mock campaigns:', result.error?.message);
          setData(mockCampaigns);
        } else if (result.data.length === 0) {
          // No campaigns yet, show mock data as placeholder
          setData(mockCampaigns);
        } else {
          // Transform all campaigns with their metrics
          const enrichedCampaigns = await Promise.all(
            result.data.map(transformCampaign)
          );

          if (!cancelled) {
            setData(enrichedCampaigns);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching campaigns:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
        setData(mockCampaigns);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  return { data, isLoading, error, refetch };
}
