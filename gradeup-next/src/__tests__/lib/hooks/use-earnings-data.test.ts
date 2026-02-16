/**
 * Tests for earnings data hooks
 * @module __tests__/lib/hooks/use-earnings-data.test
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useEarningsStats,
  usePayoutHistory,
  useMonthlyEarnings,
  type EarningsStats,
  type Payout,
  type MonthlyEarning,
} from '@/lib/hooks/use-earnings-data';

// Mock payments service
jest.mock('@/lib/services/payments', () => ({
  getEarningsSummary: jest.fn(),
  getAthletePayments: jest.fn(),
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

import { getEarningsSummary, getAthletePayments } from '@/lib/services/payments';

describe('useEarningsStats', () => {
  const mockGetEarningsSummary = getEarningsSummary as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial loading state with mock data', () => {
    mockGetEarningsSummary.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useEarningsStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    // Should have mock data initially
    expect(result.current.data.totalEarnings).toBeDefined();
  });

  it('transforms earnings summary correctly', async () => {
    mockGetEarningsSummary.mockResolvedValue({
      data: {
        total_earned: 50000,
        pending_amount: 10000,
        this_month: 5000,
        last_month: 8000,
        monthly_breakdown: [],
      },
      error: null,
    });

    const { result } = renderHook(() => useEarningsStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.totalEarnings).toBe(50000);
    expect(result.current.data.pendingPayouts).toBe(10000);
    expect(result.current.data.thisMonth).toBe(5000);
    expect(result.current.data.lastMonth).toBe(8000);
  });

  it('falls back to mock data on error', async () => {
    mockGetEarningsSummary.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useEarningsStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have mock data
    expect(result.current.data.totalEarnings).toBeGreaterThan(0);
  });

  it('refetch triggers data reload', async () => {
    mockGetEarningsSummary.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useEarningsStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetEarningsSummary.mockClear();

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockGetEarningsSummary).toHaveBeenCalled();
    });
  });
});

describe('usePayoutHistory', () => {
  const mockGetAthletePayments = getAthletePayments as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial loading state', () => {
    mockGetAthletePayments.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePayoutHistory());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('transforms payment data correctly', async () => {
    mockGetAthletePayments.mockResolvedValue({
      data: [
        {
          id: 'pay-1',
          amount: 5000,
          status: 'completed',
          paid_at: '2024-02-01T10:00:00Z',
          deal: {
            title: 'Instagram Campaign',
            brand: { company_name: 'Nike' },
          },
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePayoutHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].id).toBe('pay-1');
    expect(result.current.data[0].dealTitle).toBe('Instagram Campaign');
    expect(result.current.data[0].brandName).toBe('Nike');
    expect(result.current.data[0].amount).toBe(5000);
    expect(result.current.data[0].status).toBe('completed');
  });

  it('maps refunded status to failed', async () => {
    mockGetAthletePayments.mockResolvedValue({
      data: [
        {
          id: 'pay-1',
          amount: 1000,
          status: 'refunded',
          paid_at: null,
          deal: { title: 'Test', brand: { company_name: 'Test Brand' } },
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePayoutHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].status).toBe('failed');
  });

  it('handles missing deal info gracefully', async () => {
    mockGetAthletePayments.mockResolvedValue({
      data: [
        {
          id: 'pay-1',
          amount: 1000,
          status: 'pending',
          paid_at: null,
          deal: null,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePayoutHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].dealTitle).toBe('Unknown Deal');
    expect(result.current.data[0].brandName).toBe('Unknown Brand');
  });

  it('falls back to mock data when empty', async () => {
    mockGetAthletePayments.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => usePayoutHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have mock data when empty
    expect(result.current.data.length).toBeGreaterThan(0);
  });
});

describe('useMonthlyEarnings', () => {
  const mockGetEarningsSummary = getEarningsSummary as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial loading state', () => {
    mockGetEarningsSummary.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useMonthlyEarnings());

    expect(result.current.isLoading).toBe(true);
  });

  it('transforms monthly breakdown correctly', async () => {
    mockGetEarningsSummary.mockResolvedValue({
      data: {
        total_earned: 0,
        pending_amount: 0,
        this_month: 0,
        last_month: 0,
        monthly_breakdown: [
          { month: '2024-12', amount: 5000 },
          { month: '2024-11', amount: 3000 },
          { month: '2024-10', amount: 4000 },
        ],
      },
      error: null,
    });

    const { result } = renderHook(() => useMonthlyEarnings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should be reversed (oldest to newest)
    expect(result.current.data[0].month).toBe('Oct 24');
    expect(result.current.data[0].amount).toBe(4000);
    expect(result.current.data[1].month).toBe('Nov 24');
    expect(result.current.data[2].month).toBe('Dec 24');
  });

  it('falls back to mock data on error', async () => {
    mockGetEarningsSummary.mockResolvedValue({
      data: null,
      error: { message: 'Failed' },
    });

    const { result } = renderHook(() => useMonthlyEarnings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it('falls back to mock data when breakdown is empty', async () => {
    mockGetEarningsSummary.mockResolvedValue({
      data: {
        total_earned: 0,
        pending_amount: 0,
        this_month: 0,
        last_month: 0,
        monthly_breakdown: [],
      },
      error: null,
    });

    const { result } = renderHook(() => useMonthlyEarnings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.length).toBeGreaterThan(0);
  });
});

describe('Type definitions', () => {
  it('EarningsStats has correct structure', () => {
    const stats: EarningsStats = {
      totalEarnings: 50000,
      pendingPayouts: 10000,
      thisMonth: 5000,
      lastMonth: 8000,
    };

    expect(stats.totalEarnings).toBe(50000);
    expect(stats.pendingPayouts).toBe(10000);
  });

  it('Payout has correct structure', () => {
    const payout: Payout = {
      id: 'pay-1',
      dealTitle: 'Test Deal',
      brandName: 'Test Brand',
      amount: 5000,
      status: 'completed',
      paidAt: '2024-01-01T00:00:00Z',
    };

    expect(payout.status).toBe('completed');
    expect(payout.paidAt).toBeDefined();
  });

  it('Payout supports all statuses', () => {
    const statuses: Payout['status'][] = ['pending', 'processing', 'completed', 'failed'];

    statuses.forEach((status) => {
      const payout: Partial<Payout> = { status };
      expect(payout.status).toBe(status);
    });
  });

  it('MonthlyEarning has correct structure', () => {
    const earning: MonthlyEarning = {
      month: 'Jan 24',
      amount: 5000,
    };

    expect(earning.month).toBe('Jan 24');
    expect(earning.amount).toBe(5000);
  });
});
