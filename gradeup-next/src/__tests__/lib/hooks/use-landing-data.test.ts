import { renderHook, waitFor } from '@testing-library/react';
import {
  useFeaturedAthletes,
  useTestimonials,
  useLandingStats,
  useLandingOpportunities,
} from '@/lib/hooks/use-landing-data';
import {
  mockFeaturedAthletes,
  mockTestimonials,
  mockLandingStats,
  mockOpportunities,
} from '@/data/mock/landing';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock athlete service
jest.mock('@/lib/services/athlete', () => ({
  searchAthletes: jest.fn(),
}));

// Mock deals service
jest.mock('@/lib/services/deals', () => ({
  getOpportunities: jest.fn(),
}));

// Mock logger to avoid console noise
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('use-landing-data hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useFeaturedAthletes', () => {
    it('returns initial loading state with mock data', () => {
      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({ data: { athletes: [] }, error: null });

      const { result } = renderHook(() => useFeaturedAthletes());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual(mockFeaturedAthletes);
      expect(result.current.error).toBeNull();
    });

    it('fetches featured athletes successfully', async () => {
      const mockAthletes = [
        {
          id: 'athlete-1',
          profile: { first_name: 'John', last_name: 'Doe', avatar_url: null },
          sport: { name: 'Basketball' },
          school: { name: 'Duke University' },
          gpa: 3.9,
          nil_valuation: 50000,
        },
        {
          id: 'athlete-2',
          profile: { first_name: 'Jane', last_name: 'Smith', avatar_url: null },
          sport: { name: 'Soccer' },
          school: { name: 'Stanford University' },
          gpa: 3.85,
          nil_valuation: 75000,
        },
      ];

      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: { athletes: mockAthletes },
        error: null,
      });

      const { result } = renderHook(() => useFeaturedAthletes(4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(searchAthletes).toHaveBeenCalledWith({
        min_gpa: 3.0,
        page: 1,
        page_size: 4,
      });

      expect(result.current.data.length).toBe(2);
      expect(result.current.data[0].name).toBe('John Doe');
      expect(result.current.data[0].sport).toBe('Basketball');
    });

    it('falls back to mock data when API returns empty', async () => {
      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: { athletes: [] },
        error: null,
      });

      const { result } = renderHook(() => useFeaturedAthletes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFeaturedAthletes);
    });

    it('falls back to mock data on error', async () => {
      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: null,
        error: new Error('API error'),
      });

      const { result } = renderHook(() => useFeaturedAthletes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFeaturedAthletes);
      expect(result.current.error).toBeTruthy();
    });

    it('formats NIL valuation as follower count', async () => {
      const mockAthletes = [
        {
          id: 'athlete-1',
          profile: { first_name: 'John', last_name: 'Doe', avatar_url: null },
          sport: { name: 'Basketball' },
          school: { name: 'Duke' },
          gpa: 3.9,
          nil_valuation: 1500000, // Should format as "1.5M"
        },
        {
          id: 'athlete-2',
          profile: { first_name: 'Jane', last_name: 'Smith', avatar_url: null },
          sport: { name: 'Soccer' },
          school: { name: 'Stanford' },
          gpa: 3.8,
          nil_valuation: 75000, // Should format as "75K"
        },
      ];

      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: { athletes: mockAthletes },
        error: null,
      });

      const { result } = renderHook(() => useFeaturedAthletes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data[0].followers).toBe('1.5M');
      expect(result.current.data[1].followers).toBe('75K');
    });

    it('handles missing profile data gracefully', async () => {
      const mockAthletes = [
        {
          id: 'athlete-1',
          profile: null,
          sport: null,
          school: null,
          gpa: null,
          nil_valuation: 0,
        },
      ];

      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: { athletes: mockAthletes },
        error: null,
      });

      const { result } = renderHook(() => useFeaturedAthletes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data[0].name).toBe('Unknown Athlete');
      expect(result.current.data[0].sport).toBe('Unknown Sport');
      expect(result.current.data[0].school).toBe('Unknown School');
    });

    it('provides refetch function', async () => {
      const { searchAthletes } = require('@/lib/services/athlete');
      searchAthletes.mockResolvedValue({
        data: { athletes: [] },
        error: null,
      });

      const { result } = renderHook(() => useFeaturedAthletes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('useTestimonials', () => {
    it('returns initial loading state with mock data', () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useTestimonials());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual(mockTestimonials);
    });

    it('fetches testimonials from Supabase', async () => {
      const mockTestimonialsData = [
        {
          id: 'test-1',
          author_name: 'John Doe',
          author_role: 'Basketball, Duke',
          author_image: 'https://example.com/avatar.jpg',
          content: 'Great platform!',
          rating: 5,
          featured: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTestimonialsData, error: null }),
      });

      const { result } = renderHook(() => useTestimonials());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('testimonials');
      expect(result.current.data.length).toBe(1);
      expect(result.current.data[0].name).toBe('John Doe');
      expect(result.current.data[0].quote).toBe('Great platform!');
    });

    it('transforms testimonial data correctly', async () => {
      const mockTestimonialsData = [
        {
          id: 'test-1',
          author_name: 'Jane Smith',
          author_role: 'Soccer, Stanford',
          author_image: null,
          content: 'Amazing experience!',
          rating: 4,
          featured: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTestimonialsData, error: null }),
      });

      const { result } = renderHook(() => useTestimonials());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data[0]).toEqual({
        id: 'test-1',
        quote: 'Amazing experience!',
        name: 'Jane Smith',
        role: 'Soccer, Stanford',
        avatar: expect.any(String), // Falls back to default avatar
        rating: 4,
        verified: true,
      });
    });

    it('falls back to mock data when no testimonials found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useTestimonials());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTestimonials);
    });

    it('falls back to mock data on error', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      const { result } = renderHook(() => useTestimonials());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTestimonials);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useLandingStats', () => {
    it('returns initial loading state with mock data', () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useLandingStats());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual(mockLandingStats);
    });

    it('aggregates stats from multiple queries', async () => {
      // Mock for athletes count
      const athletesMock = { count: 100, data: null, error: null };
      // Mock for brands count
      const brandsMock = { count: 50, data: null, error: null };
      // Mock for completed deals
      const completedDealsMock = {
        data: [
          { id: 'deal-1', compensation_amount: 1000 },
          { id: 'deal-2', compensation_amount: 2000 },
        ],
        error: null,
      };
      // Mock for all deals count
      const allDealsMock = { count: 10, data: null, error: null };
      // Mock for GPA
      const gpaMock = {
        data: [{ gpa: 3.8 }, { gpa: 3.5 }, { gpa: 3.7 }],
        error: null,
      };

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'athletes') {
          return {
            select: jest.fn().mockReturnThis(),
            not: jest.fn().mockResolvedValue(gpaMock),
          };
        }
        if (table === 'brands') {
          return {
            select: jest.fn().mockResolvedValue(brandsMock),
          };
        }
        if (table === 'deals') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue(completedDealsMock),
          };
        }
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        };
      });

      const { result } = renderHook(() => useLandingStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Stats should contain aggregated data
      expect(result.current.data).toHaveProperty('athletes');
      expect(result.current.data).toHaveProperty('brands');
      expect(result.current.data).toHaveProperty('avgGpa');
      expect(result.current.data).toHaveProperty('totalDeals');
      expect(result.current.data).toHaveProperty('totalPaidOut');
      expect(result.current.data).toHaveProperty('avgDealValue');
      expect(result.current.data).toHaveProperty('conversionRate');
    });

    it('falls back to mock stats on error', async () => {
      // Mock all queries to fail by throwing in Promise.all
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('DB error');
      });

      const { result } = renderHook(() => useLandingStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockLandingStats);
    });

    it('provides refetch function', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useLandingStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('useLandingOpportunities', () => {
    it('returns initial loading state', () => {
      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: [], error: null });

      const { result } = renderHook(() => useLandingOpportunities());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
    });

    it('fetches opportunities successfully', async () => {
      const mockOpps = [
        {
          id: 'opp-1',
          brand: { company_name: 'Nike', logo_url: 'https://example.com/nike.png' },
          title: 'Brand Ambassador',
          description: 'Join our ambassador program',
          compensation_amount: 5000,
          deal_type: 'endorsement',
        },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpps, error: null });

      const { result } = renderHook(() => useLandingOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.length).toBe(1);
      expect(result.current.data[0].brandName).toBe('Nike');
      expect(result.current.data[0].title).toBe('Brand Ambassador');
    });

    it('transforms opportunity data correctly', async () => {
      const mockOpps = [
        {
          id: 'opp-1',
          brand: { company_name: 'Gatorade', logo_url: null },
          title: 'Social Campaign',
          description: 'Social media partnership',
          compensation_amount: 2500,
          deal_type: 'social_post',
        },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpps, error: null });

      const { result } = renderHook(() => useLandingOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const opp = result.current.data[0];
      expect(opp.brandName).toBe('Gatorade');
      expect(opp.compensation).toBe('$2.5K');
      expect(opp.category).toBe('Social Media');
      expect(opp.compensationType).toBe('hybrid');
    });

    it('applies search filter', async () => {
      const mockOpps = [
        {
          id: 'opp-1',
          brand: { company_name: 'Nike', logo_url: null },
          title: 'Nike Ambassador',
          description: 'Brand ambassador program',
          compensation_amount: 5000,
          deal_type: 'endorsement',
        },
        {
          id: 'opp-2',
          brand: { company_name: 'Adidas', logo_url: null },
          title: 'Adidas Campaign',
          description: 'Social campaign',
          compensation_amount: 3000,
          deal_type: 'social_post',
        },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpps, error: null });

      const { result } = renderHook(() =>
        useLandingOpportunities({ search: 'Nike' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.length).toBe(1);
      expect(result.current.data[0].brandName).toBe('Nike');
    });

    it('applies compensationType filter', async () => {
      const mockOpps = [
        {
          id: 'opp-1',
          brand: { company_name: 'Nike', logo_url: null },
          title: 'Cash Deal',
          description: 'Cash only',
          compensation_amount: 5000,
          deal_type: 'endorsement', // maps to 'cash'
        },
        {
          id: 'opp-2',
          brand: { company_name: 'Adidas', logo_url: null },
          title: 'Product Deal',
          description: 'Products only',
          compensation_amount: 1000,
          deal_type: 'merchandise', // maps to 'product'
        },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpps, error: null });

      const { result } = renderHook(() =>
        useLandingOpportunities({ compensationType: 'cash' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.length).toBe(1);
      expect(result.current.data[0].compensationType).toBe('cash');
    });

    it('applies featured filter', async () => {
      const mockOpps = [
        {
          id: 'opp-1',
          brand: { company_name: 'Nike', logo_url: null },
          title: 'High Value',
          description: 'Featured opportunity',
          compensation_amount: 5000, // >= 1000, featured = true
          deal_type: 'endorsement',
        },
        {
          id: 'opp-2',
          brand: { company_name: 'Local Brand', logo_url: null },
          title: 'Small Deal',
          description: 'Not featured',
          compensation_amount: 500, // < 1000, featured = false
          deal_type: 'appearance',
        },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpps, error: null });

      const { result } = renderHook(() =>
        useLandingOpportunities({ featured: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.length).toBe(1);
      expect(result.current.data[0].featured).toBe(true);
    });

    it('falls back to mock data on error', async () => {
      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useLandingOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockOpportunities);
      expect(result.current.error).toBeTruthy();
    });

    it('applies category filter to fallback mock data', async () => {
      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() =>
        useLandingOpportunities({ category: 'Ambassador' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.every(o => o.category === 'Ambassador')).toBe(true);
    });

    it('provides refetch function', async () => {
      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: [], error: null });

      const { result } = renderHook(() => useLandingOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('refetches when options change', async () => {
      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: [], error: null });

      const { rerender } = renderHook(
        ({ options }) => useLandingOpportunities(options),
        { initialProps: { options: { category: 'Ambassador' } } }
      );

      await waitFor(() => {
        expect(getOpportunities).toHaveBeenCalledTimes(1);
      });

      rerender({ options: { category: 'Social Media' } });

      await waitFor(() => {
        expect(getOpportunities).toHaveBeenCalledTimes(2);
      });
    });
  });
});
