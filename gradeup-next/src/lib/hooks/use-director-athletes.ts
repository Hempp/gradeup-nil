'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Individual verification statuses for granular control
  enrollmentVerified: boolean;
  gradesVerified: boolean;
  sportVerified: boolean;
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
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH PERFORMERS - Fully Verified, Clear Compliance
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '1',
    name: 'Marcus Johnson',
    sport: 'Basketball',
    gpa: 3.87,
    year: 'Junior',
    earnings: 45250,
    deals: 8,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
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
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '3',
    name: 'DeShawn Williams',
    sport: 'Football',
    gpa: 3.52,
    year: 'Senior',
    earnings: 125000,
    deals: 15,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '4',
    name: 'Mia Rodriguez',
    sport: 'Volleyball',
    gpa: 3.88,
    year: 'Junior',
    earnings: 22400,
    deals: 5,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
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
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '6',
    name: 'Olivia Martinez',
    sport: 'Swimming',
    gpa: 3.91,
    year: 'Sophomore',
    earnings: 18500,
    deals: 4,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '7',
    name: 'Jaylen Thomas',
    sport: 'Football',
    gpa: 3.45,
    year: 'Junior',
    earnings: 67800,
    deals: 9,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '8',
    name: 'Aisha Patel',
    sport: 'Tennis',
    gpa: 3.98,
    year: 'Senior',
    earnings: 42100,
    deals: 7,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING VERIFICATION - In Progress
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '9',
    name: 'Jordan Davis',
    sport: 'Football',
    gpa: 3.65,
    year: 'Junior',
    earnings: 52100,
    deals: 7,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: false,
    complianceStatus: 'pending',
  },
  {
    id: '10',
    name: 'Kenji Nakamura',
    sport: 'Baseball',
    gpa: 3.58,
    year: 'Junior',
    earnings: 15200,
    deals: 3,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: false,
    sportVerified: true,
    complianceStatus: 'pending',
  },
  {
    id: '11',
    name: 'Brittany Foster',
    sport: 'Track & Field',
    gpa: 3.41,
    year: 'Sophomore',
    earnings: 8900,
    deals: 2,
    verified: false,
    enrollmentVerified: false,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'pending',
  },
  {
    id: '12',
    name: 'Carlos Mendez',
    sport: 'Soccer',
    gpa: 3.29,
    year: 'Junior',
    earnings: 12400,
    deals: 3,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: false,
    sportVerified: false,
    complianceStatus: 'pending',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE ISSUES - Require Attention
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '13',
    name: 'Emma Chen',
    sport: 'Gymnastics',
    gpa: 1.95,
    year: 'Sophomore',
    earnings: 28500,
    deals: 4,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: false,
    sportVerified: false,
    complianceStatus: 'issue',
  },
  {
    id: '14',
    name: 'Brandon Lee',
    sport: 'Basketball',
    gpa: 1.85,
    year: 'Freshman',
    earnings: 5200,
    deals: 1,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: false,
    sportVerified: true,
    complianceStatus: 'issue',
  },
  {
    id: '15',
    name: 'Taylor Swift',
    sport: 'Softball',
    gpa: 2.15,
    year: 'Junior',
    earnings: 11800,
    deals: 2,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: false,
    complianceStatus: 'issue',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // FRESHMEN - New Athletes
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '16',
    name: 'Zoe Thompson',
    sport: 'Basketball',
    gpa: 3.75,
    year: 'Freshman',
    earnings: 3500,
    deals: 1,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '17',
    name: 'Andre Washington',
    sport: 'Football',
    gpa: 3.62,
    year: 'Freshman',
    earnings: 8200,
    deals: 2,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '18',
    name: 'Sophia Kim',
    sport: 'Volleyball',
    gpa: 3.89,
    year: 'Freshman',
    earnings: 0,
    deals: 0,
    verified: false,
    enrollmentVerified: true,
    gradesVerified: false,
    sportVerified: true,
    complianceStatus: 'pending',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // GRADUATE STUDENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '19',
    name: 'Michael Chen',
    sport: 'Swimming',
    gpa: 3.94,
    year: 'Graduate',
    earnings: 55000,
    deals: 11,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
  {
    id: '20',
    name: 'Jessica Brown',
    sport: 'Soccer',
    gpa: 3.78,
    year: 'Graduate',
    earnings: 38200,
    deals: 8,
    verified: true,
    enrollmentVerified: true,
    gradesVerified: true,
    sportVerified: true,
    complianceStatus: 'clear',
  },
];

const mockStats: AthleteStats = {
  total: 20,
  verified: 12,
  pending: 5,
  issues: 3,
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
 * Now accepts AbortSignal for cancellation support
 */
async function getAthleteMetrics(
  athleteId: string,
  signal?: AbortSignal
): Promise<{ earnings: number; deals: number }> {
  // Early exit if already aborted
  if (signal?.aborted) {
    return { earnings: 0, deals: 0 };
  }

  const supabase = createClient();

  try {
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, compensation_amount, status')
      .eq('athlete_id', athleteId)
      .abortSignal(signal as AbortSignal);

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
 * Now accepts AbortSignal for cancellation support
 */
async function transformAthlete(
  athlete: Athlete,
  signal?: AbortSignal
): Promise<DirectorAthlete> {
  const metrics = await getAthleteMetrics(athlete.id, signal);

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
    enrollmentVerified: !!athlete.enrollment_verified,
    gradesVerified: !!athlete.grades_verified,
    sportVerified: !!athlete.sport_verified,
    complianceStatus: getComplianceStatus(athlete),
    avatarUrl: athlete.avatar_url || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch and enrich director's school athletes
 * Uses AbortController for proper request cancellation
 */
export function useDirectorAthletes(): UseDirectorAthletesResult {
  const [athletes, setAthletes] = useState<DirectorAthlete[]>(mockAthletes);
  const [stats, setStats] = useState<AthleteStats>(mockStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateStats = useCallback((athleteList: DirectorAthlete[]): AthleteStats => {
    return {
      total: athleteList.length,
      verified: athleteList.filter(a => a.verified).length,
      pending: athleteList.filter(a => a.complianceStatus === 'pending').length,
      issues: athleteList.filter(a => a.complianceStatus === 'issue').length,
    };
  }, []);

  useEffect(() => {
    // Cancel any previous request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch athletes from backend
        const result = await getSchoolAthletes(1, 100); // Get up to 100 athletes

        if (abortController.signal.aborted) return;

        if (result.error || !result.data) {
          console.warn('Using mock athletes:', result.error?.message);
          setAthletes(mockAthletes);
          setStats(mockStats);
        } else if (result.data.athletes.length === 0) {
          // No athletes yet, show mock data
          setAthletes(mockAthletes);
          setStats(mockStats);
        } else {
          // Transform athletes sequentially with cancellation checks
          // This prevents wasted requests when component unmounts
          const enrichedAthletes: DirectorAthlete[] = [];

          for (const athlete of result.data.athletes) {
            // Check cancellation before each fetch
            if (abortController.signal.aborted) return;

            const enriched = await transformAthlete(
              athlete,
              abortController.signal
            );
            enrichedAthletes.push(enriched);
          }

          if (!abortController.signal.aborted) {
            setAthletes(enrichedAthletes);
            setStats(calculateStats(enrichedAthletes));
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Error fetching athletes:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch athletes'));
        setAthletes(mockAthletes);
        setStats(mockStats);
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [refetchTrigger, calculateStats]);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  return { athletes, stats, isLoading, error, refetch };
}
