'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSchoolAthletes, getDirectorStats, type DirectorStats } from '@/lib/services/director';
import type { Athlete } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DirectorAthlete {
  id: string;
  name: string;
  sport: string;
  gpa: number;
  year: string;
  earnings: number;
  deals: number;
  verified: boolean;
  complianceStatus: 'clear' | 'pending' | 'issue';
  avatarUrl?: string;
}

export interface AthleteStats {
  total: number;
  verified: number;
  pending: number;
  issues: number;
}

interface UseDirectorAthletesResult {
  athletes: DirectorAthlete[];
  stats: AthleteStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data (fallback when Supabase unavailable)
// ═══════════════════════════════════════════════════════════════════════════

const mockAthletes: DirectorAthlete[] = [
  {
    id: '1',
    name: 'Marcus Johnson',
    sport: 'Basketball',
    gpa: 3.87,
    year: 'Junior',
    earnings: 45250,
    deals: 8,
    verified: true,
    complianceStatus: 'clear',
  },
  {
    id: '2',
    name: 'Sarah Williams',
    sport: 'Soccer',
    gpa: 3.92,
    year: 'Senior',
    earnings: 38900,
    deals: 6,
    verified: true,
    complianceStatus: 'clear',
  },
  {
    id: '3',
    name: 'Jordan Davis',
    sport: 'Football',
    gpa: 3.65,
    year: 'Junior',
    earnings: 52100,
    deals: 7,
    verified: true,
    complianceStatus: 'pending',
  },
  {
    id: '4',
    name: 'Emma Chen',
    sport: 'Gymnastics',
    gpa: 3.95,
    year: 'Sophomore',
    earnings: 28500,
    deals: 4,
    verified: false,
    complianceStatus: 'issue',
  },
  {
    id: '5',
    name: 'Tyler Brooks',
    sport: 'Basketball',
    gpa: 3.72,
    year: 'Senior',
    earnings: 31200,
    deals: 5,
    verified: true,
    complianceStatus: 'clear',
  },
];

const mockStats: AthleteStats = {
  total: 247,
  verified: 198,
  pending: 42,
  issues: 7,
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map academic year to display string
 */
function formatAcademicYear(year?: string): string {
  switch (year?.toLowerCase()) {
    case 'freshman':
      return 'Freshman';
    case 'sophomore':
      return 'Sophomore';
    case 'junior':
      return 'Junior';
    case 'senior':
      return 'Senior';
    case 'graduate':
      return 'Graduate';
    default:
      return year || 'Unknown';
  }
}

/**
 * Determine compliance status based on athlete data
 */
function getComplianceStatus(athlete: Athlete): 'clear' | 'pending' | 'issue' {
  // Check verification status
  const isFullyVerified = athlete.enrollment_verified &&
                          athlete.sport_verified &&
                          athlete.grades_verified;

  if (!isFullyVerified) {
    return 'pending';
  }

  // Check GPA (below 2.0 is an issue, below 2.5 is pending)
  if (athlete.gpa !== undefined && athlete.gpa !== null) {
    if (athlete.gpa < 2.0) {
      return 'issue';
    }
    if (athlete.gpa < 2.5) {
      return 'pending';
    }
  }

  return 'clear';
}

/**
 * Get athlete earnings and deal count from deals table
 */
async function getAthleteMetrics(
  athleteId: string
): Promise<{ earnings: number; deals: number }> {
  const supabase = createClient();

  try {
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, compensation_amount, status')
      .eq('athlete_id', athleteId);

    if (error || !deals) {
      return { earnings: 0, deals: 0 };
    }

    const completedDeals = deals.filter(d => d.status === 'completed');
    const earnings = completedDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

    return { earnings, deals: deals.length };
  } catch {
    return { earnings: 0, deals: 0 };
  }
}

/**
 * Transform Athlete from backend to DirectorAthlete
 */
async function transformAthlete(athlete: Athlete): Promise<DirectorAthlete> {
  const metrics = await getAthleteMetrics(athlete.id);

  // Get name from profile or athlete fields
  const name = athlete.first_name && athlete.last_name
    ? `${athlete.first_name} ${athlete.last_name}`
    : 'Unknown Athlete';

  // Get sport name
  const sport = typeof athlete.sport === 'object' && athlete.sport !== null
    ? (athlete.sport as { name?: string }).name || 'Unknown Sport'
    : 'Unknown Sport';

  return {
    id: athlete.id,
    name,
    sport,
    gpa: athlete.gpa || 0,
    year: formatAcademicYear(athlete.academic_year),
    earnings: metrics.earnings,
    deals: metrics.deals,
    verified: !!(athlete.enrollment_verified && athlete.sport_verified && athlete.grades_verified),
    complianceStatus: getComplianceStatus(athlete),
    avatarUrl: athlete.avatar_url || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch and enrich director's school athletes
 */
export function useDirectorAthletes(): UseDirectorAthletesResult {
  const [athletes, setAthletes] = useState<DirectorAthlete[]>(mockAthletes);
  const [stats, setStats] = useState<AthleteStats>(mockStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const calculateStats = useCallback((athleteList: DirectorAthlete[]): AthleteStats => {
    return {
      total: athleteList.length,
      verified: athleteList.filter(a => a.verified).length,
      pending: athleteList.filter(a => a.complianceStatus === 'pending').length,
      issues: athleteList.filter(a => a.complianceStatus === 'issue').length,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch athletes from backend
        const result = await getSchoolAthletes(1, 100); // Get up to 100 athletes

        if (cancelled) return;

        if (result.error || !result.data) {
          console.warn('Using mock athletes:', result.error?.message);
          setAthletes(mockAthletes);
          setStats(mockStats);
        } else if (result.data.athletes.length === 0) {
          // No athletes yet, show mock data
          setAthletes(mockAthletes);
          setStats(mockStats);
        } else {
          // Transform all athletes with their metrics
          const enrichedAthletes = await Promise.all(
            result.data.athletes.map(transformAthlete)
          );

          if (!cancelled) {
            setAthletes(enrichedAthletes);
            setStats(calculateStats(enrichedAthletes));
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching athletes:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch athletes'));
        setAthletes(mockAthletes);
        setStats(mockStats);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger, calculateStats]);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  return { athletes, stats, isLoading, error, refetch };
}
