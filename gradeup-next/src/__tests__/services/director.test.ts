/**
 * Tests for the director service
 * @module __tests__/services/director.test
 */

import {
  getDirectorStats,
  getSchoolAthletes,
  getComplianceAlerts,
  getSchoolDeals,
  type DirectorStats,
  type ComplianceAlert,
} from '@/lib/services/director';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'delete', 'range', 'limit', 'lt', 'not', 'single'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable)
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockAthletes = [
  {
    id: 'athlete-1',
    gpa: 3.5,
    profile: { first_name: 'John', last_name: 'Doe' },
    school: { name: 'State University' },
    sport: { name: 'Football' },
  },
  {
    id: 'athlete-2',
    gpa: 3.8,
    profile: { first_name: 'Jane', last_name: 'Smith' },
    school: { name: 'State University' },
    sport: { name: 'Basketball' },
  },
];

const mockDeals = [
  { id: 'deal-1', status: 'completed', compensation_amount: 5000 },
  { id: 'deal-2', status: 'active', compensation_amount: 3000 },
  { id: 'deal-3', status: 'accepted', compensation_amount: 2000 },
];

describe('director service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.warn during tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDirectorStats', () => {
    it('calculates stats correctly', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockAthletes.map(a => ({ id: a.id, gpa: a.gpa })), error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: mockAthletes.map(a => ({ id: a.id, gpa: a.gpa })), error: null });

      const dealsQuery = createChainableQuery({ data: mockDeals, error: null });
      dealsQuery.in = jest.fn().mockResolvedValue({ data: mockDeals, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          if (table === 'deals') {
            return dealsQuery;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDirectorStats();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();

      const stats = result.data as DirectorStats;
      expect(stats.total_athletes).toBe(2);
      expect(stats.active_deals).toBe(2); // active + accepted
      expect(stats.total_earnings).toBe(5000); // only completed
      expect(stats.avg_gpa).toBeCloseTo(3.65, 2); // (3.5 + 3.8) / 2
    });

    it('returns error when school not found', async () => {
      const directorQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(directorQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDirectorStats();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('School not found');
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

      const result = await getDirectorStats();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('School not found');
    });

    it('returns error when athletes query fails', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDirectorStats();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch athletes');
    });

    it('handles empty athletes array', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: [], error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: [], error: null });

      const dealsQuery = createChainableQuery({ data: [], error: null });
      dealsQuery.in = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          return dealsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDirectorStats();

      expect(result.error).toBeNull();
      expect(result.data?.total_athletes).toBe(0);
      expect(result.data?.avg_gpa).toBe(0);
    });

    it('handles deals query failure gracefully', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockAthletes.map(a => ({ id: a.id, gpa: a.gpa })), error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: mockAthletes.map(a => ({ id: a.id, gpa: a.gpa })), error: null });

      const dealsQuery = createChainableQuery({ data: null, error: { message: 'Deals error' } });
      dealsQuery.in = jest.fn().mockResolvedValue({ data: null, error: { message: 'Deals error' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          return dealsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      // Should still return stats with zero deal values
      const result = await getDirectorStats();

      expect(result.error).toBeNull();
      expect(result.data?.active_deals).toBe(0);
      expect(result.data?.total_earnings).toBe(0);
    });
  });

  describe('getSchoolAthletes', () => {
    it('returns athletes with pagination', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockAthletes, error: null, count: 2 });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolAthletes(1, 20);

      expect(result.error).toBeNull();
      expect(result.data?.athletes).toHaveLength(2);
      expect(result.data?.total).toBe(2);
      expect(athletesQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('applies correct pagination for page 2', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: [], error: null, count: 50 });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getSchoolAthletes(2, 10);

      expect(athletesQuery.range).toHaveBeenCalledWith(10, 19);
    });

    it('returns error when school not found', async () => {
      const directorQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(directorQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolAthletes();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('School not found');
    });

    it('returns error when athletes query fails', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: null, error: { message: 'Database error' }, count: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolAthletes();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch athletes');
    });

    it('uses default pagination values', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: [], error: null, count: 0 });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getSchoolAthletes();

      expect(athletesQuery.range).toHaveBeenCalledWith(0, 19);
    });
  });

  describe('getComplianceAlerts', () => {
    const lowGpaAthletes = [
      { id: 'athlete-1', gpa: 2.3, profile: { first_name: 'Low', last_name: 'GPA' } },
      { id: 'athlete-2', gpa: 1.8, profile: { first_name: 'Very', last_name: 'Low' } },
    ];

    it('generates alerts for low GPA athletes', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const alertsQuery = createChainableQuery({ data: lowGpaAthletes, error: null });
      // Override not method to return the alertsQuery for chaining
      alertsQuery.not = jest.fn().mockResolvedValue({ data: lowGpaAthletes, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return alertsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getComplianceAlerts();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);

      const alerts = result.data as ComplianceAlert[];
      expect(alerts[0].type).toBe('gpa_drop');
      expect(alerts[0].athlete_name).toBe('Low GPA');
      expect(alerts[0].severity).toBe('medium'); // GPA 2.3 is >= 2.0
      expect(alerts[1].severity).toBe('high'); // GPA 1.8 is < 2.0
    });

    it('returns error when school not found', async () => {
      const directorQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(directorQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getComplianceAlerts();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('School not found');
    });

    it('returns empty array when no low GPA athletes', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const alertsQuery = createChainableQuery({ data: [], error: null });
      alertsQuery.not = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return alertsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getComplianceAlerts();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('handles profile as array from Supabase', async () => {
      const athleteWithArrayProfile = [
        { id: 'athlete-1', gpa: 2.3, profile: [{ first_name: 'Array', last_name: 'Profile' }] },
      ];

      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const alertsQuery = createChainableQuery({ data: athleteWithArrayProfile, error: null });
      alertsQuery.not = jest.fn().mockResolvedValue({ data: athleteWithArrayProfile, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return alertsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getComplianceAlerts();

      expect(result.error).toBeNull();
      expect(result.data![0].athlete_name).toBe('Array Profile');
    });
  });

  describe('getSchoolDeals', () => {
    const mockDealAthletes = [
      { id: 'athlete-1', profile: { first_name: 'John', last_name: 'Doe' } },
      { id: 'athlete-2', profile: { first_name: 'Jane', last_name: 'Smith' } },
    ];

    const mockFormattedDeals = [
      { id: 'deal-1', title: 'Nike Campaign', athlete_id: 'athlete-1', compensation_amount: 5000, status: 'active' },
      { id: 'deal-2', title: 'Adidas Deal', athlete_id: 'athlete-2', compensation_amount: 3000, status: 'completed' },
    ];

    it('returns deals with athlete names', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockDealAthletes, error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: mockDealAthletes, error: null });

      const dealsQuery = createChainableQuery({ data: mockFormattedDeals, error: null });
      dealsQuery.limit = jest.fn().mockResolvedValue({ data: mockFormattedDeals, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          return dealsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolDeals(10);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data![0].athlete_name).toBe('John Doe');
      expect(result.data![1].athlete_name).toBe('Jane Smith');
    });

    it('returns error when school not found', async () => {
      const directorQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        from: jest.fn().mockReturnValue(directorQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolDeals();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('School not found');
    });

    it('returns empty array when no athletes', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: [], error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolDeals();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('returns error when athletes query fails', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          return athletesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolDeals();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch athletes');
    });

    it('returns error when deals query fails', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockDealAthletes, error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: mockDealAthletes, error: null });

      const dealsQuery = createChainableQuery({ data: null, error: { message: 'Deals error' } });
      dealsQuery.limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'Deals error' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          return dealsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getSchoolDeals();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch deals');
    });

    it('uses default limit of 10', async () => {
      const directorQuery = createChainableQuery({ data: { school_id: 'school-123' }, error: null });
      const athletesQuery = createChainableQuery({ data: mockDealAthletes, error: null });
      athletesQuery.eq = jest.fn().mockResolvedValue({ data: mockDealAthletes, error: null });

      const dealsQuery = createChainableQuery({ data: [], error: null });
      dealsQuery.limit = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'athletic_directors') {
            return directorQuery;
          }
          if (table === 'athletes') {
            return athletesQuery;
          }
          return dealsQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getSchoolDeals();

      expect(dealsQuery.limit).toHaveBeenCalledWith(10);
    });
  });
});
