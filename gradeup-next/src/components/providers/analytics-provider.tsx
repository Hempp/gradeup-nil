'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView, initAnalytics, setAnalyticsConsent } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
  userId?: string;
  userRole?: 'athlete' | 'brand' | 'director';
}

/**
 * Analytics Provider Component
 *
 * Wraps the application to provide automatic page view tracking
 * and analytics initialization.
 *
 * Usage:
 * ```tsx
 * <AnalyticsProvider userId={user?.id} userRole={user?.role}>
 *   {children}
 * </AnalyticsProvider>
 * ```
 */
export function AnalyticsProvider({ children, userId, userRole }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  // Initialize analytics on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Initialize with user if available
    if (userId) {
      initAnalytics({
        id: userId,
        role: userRole,
      });
    }

    // Check for consent cookie
    const hasConsent = document.cookie.includes('analytics_consent=true');
    if (hasConsent) {
      setAnalyticsConsent(true);
    }
  }, [userId, userRole]);

  // Track page views on route changes
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    trackPageView({
      path: url,
      title: document.title,
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

/**
 * Hook to get analytics tracking functions with proper context
 */
export function useAnalytics() {
  return {
    trackPageView,
    trackEvent: (name: string, properties?: Record<string, unknown>) => {
      import('@/lib/analytics').then(({ trackEvent }) => {
        trackEvent(name, properties);
      });
    },
    trackClick: (buttonName: string, location: string) => {
      import('@/lib/analytics').then(({ trackClick }) => {
        trackClick(buttonName, location);
      });
    },
    trackFeatureUsage: (featureName: string, properties?: Record<string, unknown>) => {
      import('@/lib/analytics').then(({ trackFeatureUsage }) => {
        trackFeatureUsage(featureName, properties);
      });
    },
    trackError: (errorCode: string, errorMessage: string, context?: Record<string, unknown>) => {
      import('@/lib/analytics').then(({ trackError }) => {
        trackError(errorCode, errorMessage, context);
      });
    },
    setConsent: (consent: boolean) => {
      // Save consent to cookie
      document.cookie = `analytics_consent=${consent}; path=/; max-age=${60 * 60 * 24 * 365}`;
      setAnalyticsConsent(consent);
    },
  };
}
