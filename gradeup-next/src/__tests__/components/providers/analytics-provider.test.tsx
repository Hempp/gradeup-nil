/**
 * Tests for AnalyticsProvider component
 * @module __tests__/components/providers/analytics-provider.test
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { AnalyticsProvider, useAnalytics } from '@/components/providers/analytics-provider';

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackPageView: jest.fn(),
  initAnalytics: jest.fn(),
  setAnalyticsConsent: jest.fn(),
  trackEvent: jest.fn(),
  trackClick: jest.fn(),
  trackFeatureUsage: jest.fn(),
  trackError: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/athlete/dashboard',
  useSearchParams: () => ({
    toString: () => '',
  }),
}));

import * as analytics from '@/lib/analytics';

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  it('renders children', () => {
    const { getByText } = render(
      <AnalyticsProvider>
        <div>Child content</div>
      </AnalyticsProvider>
    );

    expect(getByText('Child content')).toBeInTheDocument();
  });

  it('tracks page view on mount', () => {
    render(
      <AnalyticsProvider>
        <div>Content</div>
      </AnalyticsProvider>
    );

    expect(analytics.trackPageView).toHaveBeenCalled();
  });

  it('initializes with user when userId provided', () => {
    render(
      <AnalyticsProvider userId="user-123" userRole="athlete">
        <div>Content</div>
      </AnalyticsProvider>
    );

    expect(analytics.initAnalytics).toHaveBeenCalledWith({
      id: 'user-123',
      role: 'athlete',
    });
  });

  it('does not initialize user when userId not provided', () => {
    render(
      <AnalyticsProvider>
        <div>Content</div>
      </AnalyticsProvider>
    );

    expect(analytics.initAnalytics).not.toHaveBeenCalled();
  });

  it('sets consent when cookie exists', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'analytics_consent=true',
    });

    render(
      <AnalyticsProvider>
        <div>Content</div>
      </AnalyticsProvider>
    );

    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(true);
  });
});

describe('useAnalytics', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AnalyticsProvider>{children}</AnalyticsProvider>
  );

  it('returns analytics functions', () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    expect(result.current.trackPageView).toBeDefined();
    expect(result.current.trackEvent).toBeDefined();
    expect(result.current.trackClick).toBeDefined();
    expect(result.current.trackFeatureUsage).toBeDefined();
    expect(result.current.trackError).toBeDefined();
    expect(result.current.setConsent).toBeDefined();
  });

  it('setConsent sets cookie', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    result.current.setConsent(true);

    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(true);
  });
});
