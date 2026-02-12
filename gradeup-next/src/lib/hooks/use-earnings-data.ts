'use client';

import { useState, useEffect } from 'react';
import {
  getEarningsSummary,
  getAthletePayments,
  type EarningsSummary,
  type Payment,
} from '@/lib/services/payments';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  thisMonth: number;
  lastMonth: number;
}

export interface Payout {
  id: string;
  dealTitle: string;
  brandName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paidAt: string | null;
}

export interface MonthlyEarning {
  month: string;
  amount: number;
}

interface UseEarningsResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data (fallback when Supabase unavailable)
// ═══════════════════════════════════════════════════════════════════════════

const mockEarningsStats: EarningsStats = {
  totalEarnings: 45250,
  pendingPayouts: 12500,
  thisMonth: 8750,
  lastMonth: 11200,
};

const mockPayouts: Payout[] = [
  {
    id: '1',
    dealTitle: 'Instagram Post Campaign',
    brandName: 'Nike',
    amount: 5000,
    status: 'completed',
    paidAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '2',
    dealTitle: 'Youth Basketball Camp',
    brandName: 'Duke Athletics',
    amount: 3000,
    status: 'completed',
    paidAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '3',
    dealTitle: 'Store Opening Appearance',
    brandName: 'Foot Locker',
    amount: 2500,
    status: 'pending',
    paidAt: null,
  },
  {
    id: '4',
    dealTitle: 'Social Media Endorsement',
    brandName: 'Gatorade',
    amount: 7500,
    status: 'pending',
    paidAt: null,
  },
];

const mockMonthlyEarnings: MonthlyEarning[] = [
  { month: 'Mar 24', amount: 2200 },
  { month: 'Apr 24', amount: 3100 },
  { month: 'May 24', amount: 2800 },
  { month: 'Jun 24', amount: 3500 },
  { month: 'Jul 24', amount: 4200 },
  { month: 'Aug 24', amount: 3900 },
  { month: 'Sep 24', amount: 4500 },
  { month: 'Oct 24', amount: 6200 },
  { month: 'Nov 24', amount: 8100 },
  { month: 'Dec 24', amount: 9800 },
  { month: 'Jan 25', amount: 11200 },
  { month: 'Feb 25', amount: 8750 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format month string from YYYY-MM to readable format (e.g., "Jan 25")
 */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  const yearShort = year.slice(-2);
  return `${monthName} ${yearShort}`;
}

/**
 * Transform EarningsSummary from service to EarningsStats
 */
function transformEarningsSummary(summary: EarningsSummary): EarningsStats {
  return {
    totalEarnings: summary.total_earned,
    pendingPayouts: summary.pending_amount,
    thisMonth: summary.this_month,
    lastMonth: summary.last_month,
  };
}

/**
 * Transform Payment from service to Payout
 */
function transformPayment(payment: Payment): Payout {
  return {
    id: payment.id,
    dealTitle: payment.deal?.title ?? 'Unknown Deal',
    brandName: payment.deal?.brand?.company_name ?? 'Unknown Brand',
    amount: payment.amount,
    status: payment.status === 'refunded' ? 'failed' : payment.status,
    paidAt: payment.paid_at,
  };
}

/**
 * Transform monthly breakdown to chart-friendly format
 */
function transformMonthlyBreakdown(breakdown: { month: string; amount: number }[]): MonthlyEarning[] {
  return breakdown
    .map(item => ({
      month: formatMonthLabel(item.month),
      amount: item.amount,
    }))
    .reverse(); // Oldest to newest for chart
}

// ═══════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch earnings stats (totals)
 */
export function useEarningsStats(): UseEarningsResult<EarningsStats> {
  const [data, setData] = useState<EarningsStats>(mockEarningsStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getEarningsSummary();

        if (cancelled) return;

        if (result.error || !result.data) {
          console.warn('Using mock earnings stats:', result.error?.message);
          setData(mockEarningsStats);
        } else {
          setData(transformEarningsSummary(result.data));
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching earnings stats:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch earnings'));
        setData(mockEarningsStats);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to fetch payout history
 */
export function usePayoutHistory(): UseEarningsResult<Payout[]> {
  const [data, setData] = useState<Payout[]>(mockPayouts);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAthletePayments();

        if (cancelled) return;

        if (result.error || !result.data) {
          console.warn('Using mock payout history:', result.error?.message);
          setData(mockPayouts);
        } else {
          const transformed = result.data.map(transformPayment);
          setData(transformed.length > 0 ? transformed : mockPayouts);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching payout history:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch payouts'));
        setData(mockPayouts);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to fetch monthly earnings for chart
 */
export function useMonthlyEarnings(): UseEarningsResult<MonthlyEarning[]> {
  const [data, setData] = useState<MonthlyEarning[]>(mockMonthlyEarnings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getEarningsSummary();

        if (cancelled) return;

        if (result.error || !result.data) {
          console.warn('Using mock monthly earnings:', result.error?.message);
          setData(mockMonthlyEarnings);
        } else {
          const transformed = transformMonthlyBreakdown(result.data.monthly_breakdown);
          setData(transformed.length > 0 ? transformed : mockMonthlyEarnings);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching monthly earnings:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch monthly data'));
        setData(mockMonthlyEarnings);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  return { data, isLoading, error, refetch };
}
