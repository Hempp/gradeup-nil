/**
 * Tests for the athlete service
 * @module __tests__/services/athlete.test
 */

import {
  getAthleteById,
  searchAthletes,
  getAthleteStats,
  getMyAthleteProfile,
  updateAthleteProfile,
  getHighlightUrls,
  addHighlightUrl,
  removeHighlightUrl,
  type Athlete,
  type AthleteFilters,
  type AthleteStats,
} from '@/lib/services/athlete';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Sample test data
const mockAthlete: Athlete = {
  id: 'athlete-123',
  profile_id: 'profile-123',
  school_id: 'school-123',
  sport_id: 'sport-123',
  position: 'Quarterback',
  jersey_number: '12',
  academic_year: 'Junior',
  gpa: 3.8,
  major: 'Business Administration',
  hometown: 'Austin, TX',
  height_inches: 74,
  weight_lbs: 215,
  nil_valuation: 50000,
  is_searchable: true,
  profile: {
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Star quarterback with academic excellence',
  },
  school: {
    id: 'school-123',
    name: 'State University',
    short_name: 'SU',
    city: 'Austin',
    state: 'TX',
    division: 'D1',
    conference: 'Big 12',
    logo_url: 'https://example.com/logo.png',
  },
  sport: {
    id: 'sport-123',
    name: 'Football',
    category: 'team',
    gender: 'male',
  },
};

// Helper to create a chainable mock query builder that properly tracks all calls
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  // All methods return the same mockQuery object for chaining
  // In Supabase, even range() returns a chainable query that can be awaited
  const chainableMethods = ['select', 'eq', 'in', 'gte', 'or', 'order', 'update', 'insert', 'delete', 'range'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable) to return the final result when awaited
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

describe('athlete service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAthleteById', () => {
    it('returns athlete data when found', async () => {
      const mockQuery = createChainableQuery({ data: mockAthlete, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteById('athlete-123');

      expect(result.data).toEqual(mockAthlete);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('athletes');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'athlete-123');
    });

    it('returns error when athlete not found', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteById('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to fetch athlete');
    });

    it('returns error when athlete data is null', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteById('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Athlete not found');
    });

    it('handles unexpected errors gracefully', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.single = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteById('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Network error');
    });

    it('handles non-Error thrown values', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.single = jest.fn().mockRejectedValue('String error');
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteById('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('An unexpected error occurred');
    });
  });

  describe('searchAthletes', () => {
    const mockAthletes = [mockAthlete];

    it('returns athletes with default pagination', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await searchAthletes({});

      expect(result.data).not.toBeNull();
      expect(result.data?.athletes).toEqual(mockAthletes);
      expect(result.data?.pagination).toEqual({
        page: 1,
        page_size: 10,
        total: 1,
        total_pages: 1,
      });
      expect(result.error).toBeNull();
    });

    it('applies sport filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        sport_ids: ['sport-123', 'sport-456'],
      };

      await searchAthletes(filters);

      expect(mockQuery.in).toHaveBeenCalledWith('sport_id', ['sport-123', 'sport-456']);
    });

    it('applies school filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        school_ids: ['school-123'],
      };

      await searchAthletes(filters);

      expect(mockQuery.in).toHaveBeenCalledWith('school_id', ['school-123']);
    });

    it('applies minimum GPA filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        min_gpa: 3.5,
      };

      await searchAthletes(filters);

      expect(mockQuery.gte).toHaveBeenCalledWith('gpa', 3.5);
    });

    it('applies search filter correctly', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 1 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        search: 'quarterback',
      };

      await searchAthletes(filters);

      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('applies pagination correctly', async () => {
      const mockQuery = createChainableQuery({ data: mockAthletes, error: null, count: 50 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        page: 3,
        page_size: 20,
      };

      const result = await searchAthletes(filters);

      // page 3 with page_size 20 means offset 40 to 59
      expect(mockQuery.range).toHaveBeenCalledWith(40, 59);
      expect(result.data?.pagination.page).toBe(3);
      expect(result.data?.pagination.page_size).toBe(20);
      expect(result.data?.pagination.total_pages).toBe(3);
    });

    it('filters by division on the client side', async () => {
      const athleteD1 = { ...mockAthlete, school: { ...mockAthlete.school!, division: 'D1' as const } };
      const athleteD2 = { ...mockAthlete, id: 'athlete-456', school: { ...mockAthlete.school!, division: 'D2' as const } };

      const mockQuery = createChainableQuery({ data: [athleteD1, athleteD2], error: null, count: 2 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        divisions: ['D1'],
      };

      const result = await searchAthletes(filters);

      expect(result.data?.athletes).toHaveLength(1);
      expect(result.data?.athletes[0].school?.division).toBe('D1');
    });

    it('returns empty array when no athletes found', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await searchAthletes({});

      expect(result.data?.athletes).toEqual([]);
      expect(result.data?.pagination.total).toBe(0);
      expect(result.data?.pagination.total_pages).toBe(0);
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' }, count: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await searchAthletes({});

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to search athletes');
    });

    it('sanitizes search input to prevent injection', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: AthleteFilters = {
        search: "'; DROP TABLE athletes; --",
      };

      await searchAthletes(filters);

      // The search term should be sanitized - check that or was called with escaped content
      expect(mockQuery.or).toHaveBeenCalled();
      const orCall = mockQuery.or.mock.calls[0][0];
      // Single quotes should be escaped as double single quotes
      expect(orCall).toContain("''");
    });
  });

  describe('getAthleteStats', () => {
    const mockDeals = [
      { id: 'deal-1', status: 'completed', compensation_amount: 1000 },
      { id: 'deal-2', status: 'active', compensation_amount: 500 },
      { id: 'deal-3', status: 'accepted', compensation_amount: 750 },
    ];

    const mockAnalytics = {
      profile_views: 150,
      search_appearances: 500,
    };

    it('calculates stats correctly', async () => {
      // Create mock queries for deals and analytics
      const dealsQuery = createChainableQuery({ data: mockDeals, error: null });
      // Override the eq method to resolve directly
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: mockDeals, error: null });

      const analyticsQuery = createChainableQuery({ data: mockAnalytics, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deals' || callCount === 1) {
            return dealsQuery;
          }
          return analyticsQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteStats('athlete-123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();

      const stats = result.data as AthleteStats;
      expect(stats.total_deals).toBe(3);
      expect(stats.active_deals).toBe(2); // active + accepted
      expect(stats.completed_deals).toBe(1);
      expect(stats.total_earnings).toBe(1000); // only completed
      expect(stats.pending_earnings).toBe(1250); // active + accepted
      expect(stats.profile_views).toBe(150);
      expect(stats.search_appearances).toBe(500);
    });

    it('returns error when deals query fails', async () => {
      const dealsQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(dealsQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteStats('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to fetch athlete stats');
    });

    it('handles missing analytics gracefully', async () => {
      const dealsQuery = createChainableQuery({ data: mockDeals, error: null });
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: mockDeals, error: null });

      const analyticsQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deals' || callCount === 1) {
            return dealsQuery;
          }
          return analyticsQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteStats('athlete-123');

      expect(result.error).toBeNull();
      expect(result.data?.profile_views).toBe(0);
      expect(result.data?.search_appearances).toBe(0);
    });

    it('handles empty deals array', async () => {
      const dealsQuery = createChainableQuery({ data: [], error: null });
      dealsQuery.eq = jest.fn().mockResolvedValue({ data: [], error: null });

      const analyticsQuery = createChainableQuery({ data: mockAnalytics, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'deals' || callCount === 1) {
            return dealsQuery;
          }
          return analyticsQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getAthleteStats('athlete-123');

      expect(result.error).toBeNull();
      expect(result.data?.total_deals).toBe(0);
      expect(result.data?.avg_deal_value).toBe(0);
    });
  });

  describe('getMyAthleteProfile', () => {
    it('returns profile for authenticated user', async () => {
      const mockQuery = createChainableQuery({ data: mockAthlete, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyAthleteProfile();

      expect(result.data).toEqual(mockAthlete);
      expect(result.error).toBeNull();
      expect(mockQuery.eq).toHaveBeenCalledWith('profile_id', 'profile-123');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyAthleteProfile();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when auth fails', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' },
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyAthleteProfile();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('returns error when profile not found', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyAthleteProfile();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Athlete profile not found');
    });
  });

  describe('updateAthleteProfile', () => {
    it('updates profile successfully', async () => {
      const updatedAthlete = { ...mockAthlete, gpa: 3.9 };
      const mockQuery = createChainableQuery({ data: updatedAthlete, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateAthleteProfile({ gpa: 3.9 });

      expect(result.data).toEqual(updatedAthlete);
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith({ gpa: 3.9 });
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateAthleteProfile({ gpa: 3.9 });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('strips relation fields from updates', async () => {
      const mockQuery = createChainableQuery({ data: mockAthlete, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await updateAthleteProfile({
        gpa: 3.9,
        profile: { first_name: 'Jane', last_name: 'Doe', avatar_url: null, bio: null },
        school: mockAthlete.school,
        sport: mockAthlete.sport,
      });

      // Should only pass gpa, not profile, school, or sport
      expect(mockQuery.update).toHaveBeenCalledWith({ gpa: 3.9 });
    });

    it('returns error on update failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateAthleteProfile({ gpa: 3.9 });

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to update athlete profile');
    });
  });

  describe('getHighlightUrls', () => {
    const mockHighlights = [
      { id: 'h1', platform: 'youtube', url: 'https://youtube.com/watch?v=123', title: 'Game Highlights', added_at: '2024-01-01T00:00:00Z' },
      { id: 'h2', platform: 'tiktok', url: 'https://tiktok.com/@user/video/123', title: 'Practice Video', added_at: '2024-01-02T00:00:00Z' },
    ];

    it('returns highlight URLs for authenticated user', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: mockHighlights }, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getHighlightUrls();

      expect(result.data).toEqual(mockHighlights);
      expect(result.error).toBeNull();
    });

    it('returns empty array when no highlights exist', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: null }, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getHighlightUrls();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getHighlightUrls();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error on fetch failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'DB error' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getHighlightUrls();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch highlight URLs');
    });
  });

  describe('addHighlightUrl', () => {
    const existingHighlights = [
      { id: 'h1', platform: 'youtube', url: 'https://youtube.com/watch?v=existing', title: 'Existing', added_at: '2024-01-01T00:00:00Z' },
    ];

    it('adds new highlight URL successfully', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: existingHighlights }, error: null });
      mockQuery.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addHighlightUrl('https://youtube.com/watch?v=new123', 'youtube', 'New Video');

      expect(result.data).not.toBeNull();
      expect(result.data?.platform).toBe('youtube');
      expect(result.data?.url).toBe('https://youtube.com/watch?v=new123');
      expect(result.data?.title).toBe('New Video');
      expect(result.error).toBeNull();
    });

    it('returns error for duplicate URL', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: existingHighlights }, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addHighlightUrl('https://youtube.com/watch?v=existing', 'youtube');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('This video has already been added');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await addHighlightUrl('https://youtube.com/watch?v=123', 'youtube');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('removeHighlightUrl', () => {
    const existingHighlights = [
      { id: 'h1', platform: 'youtube', url: 'https://youtube.com/watch?v=123', title: 'Video 1', added_at: '2024-01-01T00:00:00Z' },
      { id: 'h2', platform: 'tiktok', url: 'https://tiktok.com/@user/video/123', title: 'Video 2', added_at: '2024-01-02T00:00:00Z' },
    ];

    it('removes highlight URL successfully', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: existingHighlights }, error: null });
      mockQuery.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeHighlightUrl('h1');

      expect(result.error).toBeNull();
    });

    it('returns error when highlight not found', async () => {
      const mockQuery = createChainableQuery({ data: { highlight_urls: existingHighlights }, error: null });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeHighlightUrl('nonexistent');

      expect(result.error?.message).toBe('Highlight not found');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await removeHighlightUrl('h1');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });
});
