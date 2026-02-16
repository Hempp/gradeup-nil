'use client';

import { useMemo } from 'react';

/**
 * Check if the app is running in demo mode.
 * Demo mode shows mock data instead of real Supabase data.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Hook that returns demo data if in demo mode, otherwise null.
 * Use this to conditionally return mock data in data-fetching hooks.
 */
export function useDemoData<T>(demoData: T): { isDemoMode: boolean; data: T | null } {
  const isDemo = useMemo(() => isDemoMode(), []);
  return {
    isDemoMode: isDemo,
    data: isDemo ? demoData : null,
  };
}

/**
 * Wrapper for async data fetching that returns demo data if in demo mode.
 * This prevents unnecessary API calls when demo mode is enabled.
 */
export async function fetchWithDemoFallback<T>(
  fetcher: () => Promise<T>,
  demoData: T
): Promise<{ data: T; isDemo: boolean }> {
  if (isDemoMode()) {
    return { data: demoData, isDemo: true };
  }
  const data = await fetcher();
  return { data, isDemo: false };
}
