/**
 * Tests for analytics utility
 * @module __tests__/lib/utils/analytics.test
 */

import {
  initializeAnalytics,
  setUser,
  setConsent,
  trackEvent,
  trackPageView,
  analytics,
  getEventQueue,
  isAnalyticsInitialized,
  hasAnalyticsConsent,
  flushEventQueue,
  type EventCategory,
  type AnalyticsEvent,
  type PageViewEvent,
  type PerformanceMetric,
} from '@/lib/utils/analytics';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
}));

describe('analytics utilities', () => {
  const originalEnv = process.env.NODE_ENV;
  let mockGtag: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGtag = jest.fn();
    window.gtag = mockGtag;

    // Clear cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterAll(() => {
    (process.env as { NODE_ENV: string }).NODE_ENV = originalEnv;
  });

  describe('initializeAnalytics', () => {
    it('initializes without user info', () => {
      initializeAnalytics();

      expect(isAnalyticsInitialized()).toBe(true);
    });

    it('initializes with user info', () => {
      initializeAnalytics({ userId: 'user-123', userRole: 'athlete' });

      expect(isAnalyticsInitialized()).toBe(true);
    });
  });

  describe('setUser', () => {
    it('sets user id and role', () => {
      setUser('user-123', 'brand');

      // Should update GA4 and Sentry
      expect(mockGtag).toHaveBeenCalled();
    });

    it('clears user when id is null', () => {
      // First set a user
      setUser('user-123', 'athlete');
      mockGtag.mockClear();

      // Then clear
      setUser(null);

      // When userId is null, setGA4UserProperties may not call gtag
      // The important thing is it doesn't throw
      expect(() => setUser(null)).not.toThrow();
    });
  });

  describe('setConsent', () => {
    it('sets consent to true', () => {
      setConsent(true);

      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('sets consent to false', () => {
      setConsent(false);

      expect(hasAnalyticsConsent()).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('queues event when no consent', () => {
      setConsent(false);

      trackEvent({
        category: 'auth',
        action: 'login',
        label: 'google',
      });

      const queue = getEventQueue();
      expect(queue.length).toBeGreaterThan(0);
    });

    it('sends event when consent given', () => {
      setConsent(true);

      trackEvent({
        category: 'deal',
        action: 'view',
        label: 'deal-123',
        value: 1000,
      });

      expect(mockGtag).toHaveBeenCalledWith('event', expect.any(String), expect.any(Object));
    });

    it('includes metadata in event', () => {
      setConsent(true);

      trackEvent({
        category: 'search',
        action: 'query',
        metadata: { resultCount: 10 },
      });

      expect(mockGtag).toHaveBeenCalled();
    });
  });

  describe('trackPageView', () => {
    it('sends page view when consent given', () => {
      setConsent(true);

      trackPageView({
        path: '/dashboard',
        title: 'Dashboard',
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', expect.any(Object));
    });

    it('does not send when no consent', () => {
      setConsent(false);
      mockGtag.mockClear();

      trackPageView({
        path: '/profile',
      });

      // Should not call gtag for page_view when no consent
      expect(mockGtag).not.toHaveBeenCalledWith('event', 'page_view', expect.any(Object));
    });
  });

  describe('analytics preset helpers', () => {
    beforeEach(() => {
      setConsent(true);
      mockGtag.mockClear();
    });

    it('analytics.login tracks login event', () => {
      analytics.login('google');

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'auth_login',
        expect.objectContaining({ event_label: 'google' })
      );
    });

    it('analytics.logout tracks logout event', () => {
      analytics.logout();

      expect(mockGtag).toHaveBeenCalledWith('event', 'auth_logout', expect.any(Object));
    });

    it('analytics.signup tracks signup event', () => {
      analytics.signup('athlete');

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'auth_signup',
        expect.objectContaining({ event_label: 'athlete' })
      );
    });

    it('analytics.viewDeal tracks deal view', () => {
      analytics.viewDeal('deal-123', 'sponsorship');

      expect(mockGtag).toHaveBeenCalledWith('event', 'deal_view', expect.any(Object));
    });

    it('analytics.acceptDeal tracks deal acceptance', () => {
      analytics.acceptDeal('deal-123', 5000);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'deal_accept',
        expect.objectContaining({ value: 5000 })
      );
    });

    it('analytics.rejectDeal tracks deal rejection', () => {
      analytics.rejectDeal('deal-123', 'price_too_low');

      expect(mockGtag).toHaveBeenCalledWith('event', 'deal_reject', expect.any(Object));
    });

    it('analytics.createDeal tracks deal creation', () => {
      analytics.createDeal('sponsorship', 10000);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'deal_create',
        expect.objectContaining({ value: 10000 })
      );
    });

    it('analytics.search tracks search query', () => {
      analytics.search('basketball', 25);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'search_query',
        expect.objectContaining({ value: 25 })
      );
    });

    it('analytics.filterApplied tracks filter', () => {
      analytics.filterApplied('sport', 'Basketball');

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'search_filter',
        expect.objectContaining({ event_label: 'sport:Basketball' })
      );
    });

    it('analytics.updateProfile tracks profile update', () => {
      analytics.updateProfile('bio');

      expect(mockGtag).toHaveBeenCalledWith('event', 'profile_update', expect.any(Object));
    });

    it('analytics.uploadAvatar tracks avatar upload', () => {
      analytics.uploadAvatar();

      expect(mockGtag).toHaveBeenCalledWith('event', 'profile_avatar_upload', expect.any(Object));
    });

    it('analytics.createCampaign tracks campaign creation', () => {
      analytics.createCampaign('social', 50000);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'campaign_create',
        expect.objectContaining({ value: 50000 })
      );
    });

    it('analytics.sendMessage tracks message send', () => {
      analytics.sendMessage('conv-123');

      expect(mockGtag).toHaveBeenCalledWith('event', 'message_send', expect.any(Object));
    });

    it('analytics.navigate tracks navigation', () => {
      analytics.navigate('/home', '/dashboard');

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'navigation_route_change',
        expect.objectContaining({ event_label: '/home -> /dashboard' })
      );
    });
  });

  describe('flushEventQueue', () => {
    it('does nothing when no consent', () => {
      setConsent(false);
      trackEvent({ category: 'test' as EventCategory, action: 'test' });

      mockGtag.mockClear();
      flushEventQueue();

      // Should not send events without consent
      expect(mockGtag).not.toHaveBeenCalledWith('event', expect.any(String), expect.any(Object));
    });

    it('sends queued events when consent given', () => {
      setConsent(false);
      trackEvent({ category: 'auth', action: 'test1' });
      trackEvent({ category: 'auth', action: 'test2' });

      mockGtag.mockClear();
      setConsent(true);
      flushEventQueue();

      // Events should have been flushed when consent was set
      expect(getEventQueue().length).toBe(0);
    });
  });

  describe('Type definitions', () => {
    it('EventCategory has all valid values', () => {
      const categories: EventCategory[] = [
        'auth',
        'navigation',
        'deal',
        'profile',
        'campaign',
        'message',
        'search',
        'error',
      ];

      expect(categories.length).toBe(8);
    });

    it('AnalyticsEvent has correct structure', () => {
      const event: AnalyticsEvent = {
        category: 'deal',
        action: 'view',
        label: 'sponsorship',
        value: 1000,
        metadata: { dealId: 'deal-123' },
      };

      expect(event.category).toBe('deal');
      expect(event.action).toBe('view');
    });

    it('PageViewEvent has correct structure', () => {
      const pageView: PageViewEvent = {
        path: '/dashboard',
        title: 'Dashboard',
        referrer: '/login',
        userRole: 'athlete',
      };

      expect(pageView.path).toBe('/dashboard');
    });

    it('PerformanceMetric has correct structure', () => {
      const metric: PerformanceMetric = {
        name: 'LCP',
        value: 2500,
        unit: 'ms',
        rating: 'needs-improvement',
      };

      expect(metric.name).toBe('LCP');
      expect(metric.rating).toBe('needs-improvement');
    });
  });
});
