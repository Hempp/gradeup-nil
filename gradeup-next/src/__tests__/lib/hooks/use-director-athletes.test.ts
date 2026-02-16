import { renderHook, waitFor, act } from '@testing-library/react';
import { useDirectorAthletes } from '@/lib/hooks/use-director-athletes';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock director service
jest.mock('@/lib/services/director', () => ({
  getSchoolAthletes: jest.fn(),
}));

describe('useDirectorAthletes', () => {
  const mockAthletesData = [
    {
      id: 'athlete-1',
      first_name: 'John',
      last_name: 'Doe',
      gpa: 3.8,
      academic_year: 'Junior',
      enrollment_verified: true,
      sport_verified: true,
      grades_verified: true,
      identity_verified: true,
      avatar_url: 'https://example.com/avatar1.jpg',
      sport: { name: 'Basketball' },
    },
    {
      id: 'athlete-2',
      first_name: 'Jane',
      last_name: 'Smith',
      gpa: 3.5,
      academic_year: 'Senior',
      enrollment_verified: true,
      sport_verified: false,
      grades_verified: true,
      identity_verified: true,
      avatar_url: null,
      sport: { name: 'Soccer' },
    },
    {
      id: 'athlete-3',
      first_name: 'Bob',
      last_name: 'Johnson',
      gpa: 1.9,
      academic_year: 'Sophomore',
      enrollment_verified: true,
      sport_verified: true,
      grades_verified: true, // Must be fully verified for GPA compliance check to run
      identity_verified: true,
      avatar_url: null,
      sport: { name: 'Football' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for deals query
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });
  });

  it('returns initial loading state with mock athletes', () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({ data: { athletes: [] }, error: null });

    const { result } = renderHook(() => useDirectorAthletes());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.athletes.length).toBeGreaterThan(0); // Mock data
    expect(result.current.error).toBeNull();
  });

  it('returns expected data structure', () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({ data: { athletes: [] }, error: null });

    const { result } = renderHook(() => useDirectorAthletes());

    expect(result.current).toHaveProperty('athletes');
    expect(result.current).toHaveProperty('stats');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('fetches athletes from service', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: mockAthletesData },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getSchoolAthletes).toHaveBeenCalledWith(1, 100);
  });

  it('transforms athlete data to DirectorAthlete format', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [mockAthletesData[0]] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const athlete = result.current.athletes[0];
    expect(athlete).toHaveProperty('id');
    expect(athlete).toHaveProperty('name');
    expect(athlete).toHaveProperty('sport');
    expect(athlete).toHaveProperty('gpa');
    expect(athlete).toHaveProperty('year');
    expect(athlete).toHaveProperty('earnings');
    expect(athlete).toHaveProperty('deals');
    expect(athlete).toHaveProperty('verified');
    expect(athlete).toHaveProperty('enrollmentVerified');
    expect(athlete).toHaveProperty('gradesVerified');
    expect(athlete).toHaveProperty('sportVerified');
    expect(athlete).toHaveProperty('complianceStatus');
  });

  it('calculates athlete name correctly', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [mockAthletesData[0]] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].name).toBe('John Doe');
  });

  it('handles missing name fields', async () => {
    const athleteWithoutName = {
      ...mockAthletesData[0],
      first_name: undefined,
      last_name: undefined,
    };

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [athleteWithoutName] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].name).toBe('Unknown Athlete');
  });

  it('determines verification status correctly', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: mockAthletesData },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First athlete - fully verified
    expect(result.current.athletes[0].verified).toBe(true);
    expect(result.current.athletes[0].enrollmentVerified).toBe(true);
    expect(result.current.athletes[0].sportVerified).toBe(true);
    expect(result.current.athletes[0].gradesVerified).toBe(true);

    // Second athlete - missing sport verification
    expect(result.current.athletes[1].verified).toBe(false);
    expect(result.current.athletes[1].sportVerified).toBe(false);
  });

  it('calculates compliance status correctly', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: mockAthletesData },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fully verified with good GPA = clear
    expect(result.current.athletes[0].complianceStatus).toBe('clear');

    // Not fully verified (sport_verified: false) = pending
    expect(result.current.athletes[1].complianceStatus).toBe('pending');

    // Fully verified but GPA < 2.0 = issue
    // Note: mockAthletesData[2] has grades_verified: true but gpa: 1.9
    expect(result.current.athletes[2].complianceStatus).toBe('issue');
  });

  it('formats academic year correctly', async () => {
    const athletesWithYears = [
      { ...mockAthletesData[0], academic_year: 'freshman' },
      { ...mockAthletesData[0], id: 'athlete-f', academic_year: 'Freshman' },
      { ...mockAthletesData[0], id: 'athlete-s', academic_year: 'sophomore' },
      { ...mockAthletesData[0], id: 'athlete-j', academic_year: 'junior' },
      { ...mockAthletesData[0], id: 'athlete-sr', academic_year: 'senior' },
      { ...mockAthletesData[0], id: 'athlete-g', academic_year: 'graduate' },
    ];

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: athletesWithYears },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].year).toBe('Freshman');
    expect(result.current.athletes[1].year).toBe('Freshman');
    expect(result.current.athletes[2].year).toBe('Sophomore');
    expect(result.current.athletes[3].year).toBe('Junior');
    expect(result.current.athletes[4].year).toBe('Senior');
    expect(result.current.athletes[5].year).toBe('Graduate');
  });

  it('calculates stats correctly', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: mockAthletesData },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toHaveProperty('total');
    expect(result.current.stats).toHaveProperty('verified');
    expect(result.current.stats).toHaveProperty('pending');
    expect(result.current.stats).toHaveProperty('issues');
    expect(result.current.stats.total).toBe(3);
  });

  it('fetches earnings and deals for each athlete', async () => {
    const mockDeals = [
      { id: 'deal-1', compensation_amount: 1000, status: 'completed' },
      { id: 'deal-2', compensation_amount: 500, status: 'active' },
    ];

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockResolvedValue({
        data: mockDeals,
        error: null,
      }),
    });

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [mockAthletesData[0]] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabaseFrom).toHaveBeenCalledWith('deals');
  });

  it('falls back to mock data when service returns empty', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to mock athletes
    expect(result.current.athletes.length).toBeGreaterThan(0);
  });

  it('falls back to mock data on error', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to mock athletes
    expect(result.current.athletes.length).toBeGreaterThan(0);
  });

  it('sets error on fetch failure', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('refetches data when refetch is called', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: mockAthletesData },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getSchoolAthletes).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(getSchoolAthletes).toHaveBeenCalledTimes(2);
    });
  });

  it('cancels previous request on refetch', async () => {
    let resolveFirst: (value: unknown) => void;
    let resolveSecond: (value: unknown) => void;

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));

    const { result } = renderHook(() => useDirectorAthletes());

    // Trigger refetch before first request completes
    act(() => {
      result.current.refetch();
    });

    // Resolve second request
    await act(async () => {
      resolveSecond!({ data: { athletes: mockAthletesData }, error: null });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First request should be ignored even if resolved later
    await act(async () => {
      resolveFirst!({ data: { athletes: [] }, error: null });
    });

    // Should still have data from second request
    expect(result.current.athletes.length).toBeGreaterThan(0);
  });

  it('handles sport as object with name property', async () => {
    const athleteWithSportObject = {
      ...mockAthletesData[0],
      sport: { name: 'Tennis' },
    };

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [athleteWithSportObject] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].sport).toBe('Tennis');
  });

  it('handles missing sport data', async () => {
    const athleteWithoutSport = {
      ...mockAthletesData[0],
      sport: null,
    };

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [athleteWithoutSport] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].sport).toBe('Unknown Sport');
  });

  it('handles GPA edge cases for compliance', async () => {
    const athletesWithEdgeGPA = [
      { ...mockAthletesData[0], gpa: 2.5, enrollment_verified: true, sport_verified: true, grades_verified: true }, // clear (>= 2.5)
      { ...mockAthletesData[0], id: 'ath-2', gpa: 2.4, enrollment_verified: true, sport_verified: true, grades_verified: true }, // pending (< 2.5)
      { ...mockAthletesData[0], id: 'ath-3', gpa: 1.99, enrollment_verified: true, sport_verified: true, grades_verified: true }, // issue (< 2.0)
    ];

    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: athletesWithEdgeGPA },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].complianceStatus).toBe('clear');
    expect(result.current.athletes[1].complianceStatus).toBe('pending');
    expect(result.current.athletes[2].complianceStatus).toBe('issue');
  });

  it('includes avatar URL when available', async () => {
    const { getSchoolAthletes } = require('@/lib/services/director');
    getSchoolAthletes.mockResolvedValue({
      data: { athletes: [mockAthletesData[0]] },
      error: null,
    });

    const { result } = renderHook(() => useDirectorAthletes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.athletes[0].avatarUrl).toBe('https://example.com/avatar1.jpg');
  });
});
