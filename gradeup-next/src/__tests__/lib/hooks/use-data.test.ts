import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useData,
  useAthleteProfile,
  useAthleteDeals,
  useAthleteEarnings,
  useAthleteStats,
  useActivity,
  useBrandCampaigns,
  useBrandDeals,
  useOpportunities,
  useConversations,
  useMessages,
  useBrandAnalytics,
  useBrandShortlist,
  useDirectorStats,
  useSchoolAthletes,
  useComplianceAlerts,
} from '@/lib/hooks/use-data';
import type { DealFilters, DealStatus, DealType } from '@/lib/services/deals';

// Mock the demo mode hook
jest.mock('@/lib/hooks/use-demo-mode', () => ({
  isDemoMode: jest.fn(() => false),
}));

// Mock dynamic imports for services
jest.mock('@/lib/services/athlete', () => ({
  getAthleteById: jest.fn(),
  getAthleteStats: jest.fn(),
  searchAthletes: jest.fn(),
}));

jest.mock('@/lib/services/deals', () => ({
  getAthleteDeals: jest.fn(),
  getBrandDeals: jest.fn(),
  getOpportunities: jest.fn(),
}));

jest.mock('@/lib/services/payments', () => ({
  getEarningsSummary: jest.fn(),
}));

jest.mock('@/lib/services/activity', () => ({
  getMyActivity: jest.fn(),
}));

jest.mock('@/lib/services/brand', () => ({
  getBrandCampaigns: jest.fn(),
  getBrandAnalytics: jest.fn(),
  getShortlistedAthletes: jest.fn(),
}));

jest.mock('@/lib/services/messaging', () => ({
  getConversations: jest.fn(),
  getMessages: jest.fn(),
}));

jest.mock('@/lib/services/director', () => ({
  getDirectorStats: jest.fn(),
  getSchoolAthletes: jest.fn(),
  getComplianceAlerts: jest.fn(),
}));

describe('useData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useData generic hook', () => {
    it('returns initial loading state', () => {
      const fetcher = jest.fn().mockResolvedValue({ data: null, error: null });
      const { result } = renderHook(() => useData(fetcher));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches data successfully', async () => {
      const mockData = { id: '1', name: 'Test' };
      const fetcher = jest.fn().mockResolvedValue({ data: mockData, error: null });

      const { result } = renderHook(() => useData(fetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('handles errors from fetcher', async () => {
      const mockError = new Error('Fetch failed');
      const fetcher = jest.fn().mockResolvedValue({ data: null, error: mockError });

      const { result } = renderHook(() => useData(fetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('handles thrown exceptions', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useData(fetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('refetches data when refetch is called', async () => {
      const mockData1 = { value: 1 };
      const mockData2 = { value: 2 };
      const fetcher = jest.fn()
        .mockResolvedValueOnce({ data: mockData1, error: null })
        .mockResolvedValueOnce({ data: mockData2, error: null });

      const { result } = renderHook(() => useData(fetcher));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('refetches when dependencies change', async () => {
      const mockData = { count: 1 };
      const fetcher = jest.fn().mockResolvedValue({ data: mockData, error: null });

      let dep = 'initial';
      const { result, rerender } = renderHook(() => useData(fetcher, [dep]));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fetcher).toHaveBeenCalledTimes(1);

      dep = 'changed';
      rerender();

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(2);
      });
    });

    it('handles race conditions with fetch ID tracking', async () => {
      let resolveFirst: (value: { data: string; error: null }) => void;
      let resolveSecond: (value: { data: string; error: null }) => void;

      const fetcher = jest.fn()
        .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));

      let dep = 'first';
      const { result, rerender } = renderHook(() => useData(fetcher, [dep]));

      // Start second fetch before first completes
      dep = 'second';
      rerender();

      // Resolve second fetch first
      await act(async () => {
        resolveSecond!({ data: 'second-result', error: null });
      });

      await waitFor(() => {
        expect(result.current.data).toBe('second-result');
      });

      // Resolve first fetch after second (should be ignored)
      await act(async () => {
        resolveFirst!({ data: 'first-result', error: null });
      });

      // Data should still be from second fetch
      expect(result.current.data).toBe('second-result');
    });
  });

  describe('useAthleteProfile', () => {
    it('returns null data when athleteId is undefined', async () => {
      const { result } = renderHook(() => useAthleteProfile(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches athlete profile when athleteId is provided', async () => {
      const mockAthlete = {
        id: 'athlete-1',
        first_name: 'John',
        last_name: 'Doe',
        gpa: 3.8,
      };

      const { getAthleteById } = require('@/lib/services/athlete');
      getAthleteById.mockResolvedValue({ data: mockAthlete, error: null });

      const { result } = renderHook(() => useAthleteProfile('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAthlete);
    });

    it('handles error when fetching athlete profile', async () => {
      const { getAthleteById } = require('@/lib/services/athlete');
      getAthleteById.mockResolvedValue({ data: null, error: new Error('Not found') });

      const { result } = renderHook(() => useAthleteProfile('invalid-id'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useAthleteDeals', () => {
    it('returns null data when athleteId is undefined and not in demo mode', async () => {
      const { result } = renderHook(() => useAthleteDeals(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('fetches athlete deals with filters', async () => {
      const mockDeals = [
        { id: 'deal-1', status: 'active', compensation_amount: 1000 },
        { id: 'deal-2', status: 'completed', compensation_amount: 2000 },
      ];

      const { getAthleteDeals } = require('@/lib/services/deals');
      getAthleteDeals.mockResolvedValue({ deals: mockDeals, error: null });

      const filters: DealFilters = { status: ['active' as DealStatus] };
      const { result } = renderHook(() => useAthleteDeals('athlete-1', filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getAthleteDeals).toHaveBeenCalledWith('athlete-1', filters);
      expect(result.current.data).toEqual(mockDeals);
    });

    it('returns demo data when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useAthleteDeals('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useAthleteEarnings', () => {
    it('returns null when athleteId is undefined and not in demo mode', async () => {
      const { result } = renderHook(() => useAthleteEarnings(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('returns demo earnings when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useAthleteEarnings('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data).toHaveProperty('total_earned');
      expect(result.current.data).toHaveProperty('pending_amount');

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useAthleteStats', () => {
    it('returns demo stats when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useAthleteStats('athlete-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data).toHaveProperty('total_deals');
      expect(result.current.data).toHaveProperty('total_earnings');

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useActivity', () => {
    it('returns demo activities when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useActivity(5));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data!.length).toBeLessThanOrEqual(5);

      isDemoMode.mockReturnValue(false);
    });

    it('fetches activities from service when not in demo mode', async () => {
      const mockActivities = [
        { id: 'act-1', type: 'deal_accepted', description: 'Deal accepted' },
      ];

      const { getMyActivity } = require('@/lib/services/activity');
      getMyActivity.mockResolvedValue({ data: mockActivities, error: null });

      const { result } = renderHook(() => useActivity(10));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getMyActivity).toHaveBeenCalledWith(10);
      expect(result.current.data).toEqual(mockActivities);
    });
  });

  describe('useBrandCampaigns', () => {
    it('returns null when brandId is undefined and not in demo mode', async () => {
      const { result } = renderHook(() => useBrandCampaigns(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('returns demo campaigns when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useBrandCampaigns('brand-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useBrandDeals', () => {
    it('returns null when brandId is undefined and not in demo mode', async () => {
      const { result } = renderHook(() => useBrandDeals(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('returns demo deals when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useBrandDeals('brand-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useOpportunities', () => {
    it('fetches opportunities with filters', async () => {
      const mockOpportunities = [
        { id: 'opp-1', title: 'Nike Campaign', compensation_amount: 5000 },
      ];

      const { getOpportunities } = require('@/lib/services/deals');
      getOpportunities.mockResolvedValue({ opportunities: mockOpportunities, error: null });

      const filters: DealFilters = { deal_types: ['endorsement' as DealType] };
      const { result } = renderHook(() => useOpportunities(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getOpportunities).toHaveBeenCalledWith(filters);
      expect(result.current.data).toEqual(mockOpportunities);
    });
  });

  describe('useConversations', () => {
    it('fetches conversations', async () => {
      const mockConversations = [
        { id: 'conv-1', participant_ids: ['user-1', 'user-2'] },
      ];

      const { getConversations } = require('@/lib/services/messaging');
      getConversations.mockResolvedValue({ data: mockConversations, error: null });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockConversations);
    });
  });

  describe('useMessages', () => {
    it('returns null when conversationId is undefined', async () => {
      const { result } = renderHook(() => useMessages(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('fetches messages for a conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', sender_id: 'user-1' },
      ];

      const { getMessages } = require('@/lib/services/messaging');
      getMessages.mockResolvedValue({ data: mockMessages, error: null });

      const { result } = renderHook(() => useMessages('conv-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getMessages).toHaveBeenCalledWith('conv-1');
      expect(result.current.data).toEqual(mockMessages);
    });
  });

  describe('useBrandAnalytics', () => {
    it('returns demo analytics when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useBrandAnalytics('brand-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data).toHaveProperty('total_spent');
      expect(result.current.data).toHaveProperty('total_deals');

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useBrandShortlist', () => {
    it('returns demo athletes when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useBrandShortlist('brand-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);

      isDemoMode.mockReturnValue(false);
    });
  });

  describe('useDirectorStats', () => {
    it('returns demo stats when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useDirectorStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data).toHaveProperty('total_athletes');
      expect(result.current.data).toHaveProperty('active_deals');

      isDemoMode.mockReturnValue(false);
    });

    it('fetches director stats from service when not in demo mode', async () => {
      const mockStats = {
        total_athletes: 100,
        active_deals: 25,
        total_earnings: 50000,
      };

      const { getDirectorStats } = require('@/lib/services/director');
      getDirectorStats.mockResolvedValue({ data: mockStats, error: null });

      const { result } = renderHook(() => useDirectorStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useSchoolAthletes', () => {
    it('returns demo athletes when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useSchoolAthletes(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data).toHaveProperty('athletes');
      expect(result.current.data).toHaveProperty('total');

      isDemoMode.mockReturnValue(false);
    });

    it('fetches school athletes with pagination', async () => {
      const mockData = {
        athletes: [{ id: 'athlete-1', name: 'John Doe' }],
        total: 50,
      };

      const { getSchoolAthletes } = require('@/lib/services/director');
      getSchoolAthletes.mockResolvedValue({ data: mockData, error: null });

      const { result } = renderHook(() => useSchoolAthletes(2));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getSchoolAthletes).toHaveBeenCalledWith(2);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useComplianceAlerts', () => {
    it('returns demo alerts when in demo mode', async () => {
      const { isDemoMode } = require('@/lib/hooks/use-demo-mode');
      isDemoMode.mockReturnValue(true);

      const { result } = renderHook(() => useComplianceAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(Array.isArray(result.current.data)).toBe(true);

      isDemoMode.mockReturnValue(false);
    });

    it('fetches compliance alerts from service when not in demo mode', async () => {
      const mockAlerts = [
        { id: 'alert-1', type: 'gpa_drop', severity: 'high' },
      ];

      const { getComplianceAlerts } = require('@/lib/services/director');
      getComplianceAlerts.mockResolvedValue({ data: mockAlerts, error: null });

      const { result } = renderHook(() => useComplianceAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAlerts);
    });
  });
});
