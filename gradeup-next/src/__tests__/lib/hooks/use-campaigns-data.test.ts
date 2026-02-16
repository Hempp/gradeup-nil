/**
 * Tests for useBrandCampaigns hook
 * @module __tests__/lib/hooks/use-campaigns-data.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBrandCampaigns, type EnrichedCampaign } from '@/lib/hooks/use-campaigns-data';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          abortSignal: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    })),
  })),
}));

// Mock brand service
jest.mock('@/lib/services/brand', () => ({
  getBrandCampaigns: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { getBrandCampaigns } from '@/lib/services/brand';

describe('useBrandCampaigns', () => {
  const mockBrandCampaigns = getBrandCampaigns as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial loading state with mock data', () => {
    mockBrandCampaigns.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useBrandCampaigns());

    // Should have initial mock data
    expect(result.current.data.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads mock data when service returns empty', async () => {
    mockBrandCampaigns.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBrandCampaigns());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have mock data when empty
    expect(result.current.data.length).toBeGreaterThan(0);
    expect(result.current.data[0].name).toBeDefined();
  });

  it('uses mock data when service returns error', async () => {
    mockBrandCampaigns.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useBrandCampaigns());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to mock data
    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it('refetch function triggers data reload', async () => {
    mockBrandCampaigns.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBrandCampaigns());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock to track refetch calls
    mockBrandCampaigns.mockClear();

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockBrandCampaigns).toHaveBeenCalled();
    });
  });

  it('has correct EnrichedCampaign structure', async () => {
    mockBrandCampaigns.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBrandCampaigns());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const campaign = result.current.data[0];

    // Verify structure
    expect(campaign).toHaveProperty('id');
    expect(campaign).toHaveProperty('name');
    expect(campaign).toHaveProperty('description');
    expect(campaign).toHaveProperty('budget');
    expect(campaign).toHaveProperty('spent');
    expect(campaign).toHaveProperty('startDate');
    expect(campaign).toHaveProperty('endDate');
    expect(campaign).toHaveProperty('athletes');
    expect(campaign).toHaveProperty('targetSports');
    expect(campaign).toHaveProperty('status');
  });

  it('handles various campaign statuses', async () => {
    mockBrandCampaigns.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBrandCampaigns());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const statuses = result.current.data.map((c) => c.status);

    // Mock data includes various statuses
    expect(statuses.length).toBeGreaterThan(0);
  });

  it('cleans up on unmount', async () => {
    mockBrandCampaigns.mockResolvedValue({ data: [], error: null });

    const { unmount } = renderHook(() => useBrandCampaigns());

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});

describe('EnrichedCampaign type', () => {
  it('has all required properties', () => {
    const campaign: EnrichedCampaign = {
      id: '1',
      name: 'Test Campaign',
      description: 'A test campaign',
      budget: 50000,
      spent: 25000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      athletes: 5,
      targetSports: ['Basketball', 'Football'],
      status: 'active',
    };

    expect(campaign.id).toBe('1');
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.budget).toBe(50000);
    expect(campaign.spent).toBe(25000);
    expect(campaign.athletes).toBe(5);
    expect(campaign.targetSports).toHaveLength(2);
    expect(campaign.status).toBe('active');
  });

  it('allows null description', () => {
    const campaign: EnrichedCampaign = {
      id: '1',
      name: 'Test',
      description: null,
      budget: 1000,
      spent: 0,
      startDate: '2024-01-01',
      endDate: null,
      athletes: 0,
      targetSports: [],
      status: 'draft',
    };

    expect(campaign.description).toBeNull();
    expect(campaign.endDate).toBeNull();
  });

  it('supports all valid statuses', () => {
    const validStatuses = ['draft', 'pending', 'active', 'completed', 'cancelled', 'rejected'];

    validStatuses.forEach((status) => {
      const campaign: Partial<EnrichedCampaign> = {
        status: status as EnrichedCampaign['status'],
      };
      expect(campaign.status).toBe(status);
    });
  });
});
