/**
 * Analytics & Monitoring Utilities
 * Provides event tracking, performance monitoring, and user analytics
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type EventCategory =
  | 'auth'
  | 'navigation'
  | 'deal'
  | 'profile'
  | 'campaign'
  | 'message'
  | 'search'
  | 'error';

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
  userRole?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count';
  rating?: 'good' | 'needs-improvement' | 'poor';
}

// ═══════════════════════════════════════════════════════════════════════════
// Analytics State
// ═══════════════════════════════════════════════════════════════════════════

let isInitialized = false;
let userId: string | null = null;
let userRole: string | null = null;

const eventQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

export function initializeAnalytics(options?: {
  userId?: string;
  userRole?: string;
}): void {
  if (typeof window === 'undefined') return;

  userId = options?.userId || null;
  userRole = options?.userRole || null;
  isInitialized = true;

  // Setup performance observer
  setupPerformanceObserver();

  // Setup error tracking
  setupErrorTracking();

  console.log('[Analytics] Initialized', { userId: !!userId, userRole });
}

export function setUser(id: string | null, role?: string): void {
  userId = id;
  userRole = role || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Tracking
// ═══════════════════════════════════════════════════════════════════════════

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;

  const enrichedEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    userId,
    userRole,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Add to queue
  eventQueue.push(event);
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Event:', enrichedEvent);
  }

  // TODO: Send to analytics service (e.g., Google Analytics, Mixpanel, Amplitude)
  // sendToAnalyticsService(enrichedEvent);
}

export function trackPageView(event: PageViewEvent): void {
  if (typeof window === 'undefined') return;

  const pageView = {
    ...event,
    timestamp: new Date().toISOString(),
    userId,
    userRole,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Page View:', pageView);
  }

  // TODO: Send to analytics service
  // sendToAnalyticsService({ type: 'pageview', ...pageView });
}

// ═══════════════════════════════════════════════════════════════════════════
// Preset Event Helpers
// ═══════════════════════════════════════════════════════════════════════════

export const analytics = {
  // Auth events
  login: (method: string) => trackEvent({
    category: 'auth',
    action: 'login',
    label: method,
  }),

  logout: () => trackEvent({
    category: 'auth',
    action: 'logout',
  }),

  signup: (role: string) => trackEvent({
    category: 'auth',
    action: 'signup',
    label: role,
  }),

  // Deal events
  viewDeal: (dealId: string, dealType?: string) => trackEvent({
    category: 'deal',
    action: 'view',
    label: dealType,
    metadata: { dealId },
  }),

  acceptDeal: (dealId: string, amount?: number) => trackEvent({
    category: 'deal',
    action: 'accept',
    value: amount,
    metadata: { dealId },
  }),

  rejectDeal: (dealId: string, reason?: string) => trackEvent({
    category: 'deal',
    action: 'reject',
    label: reason,
    metadata: { dealId },
  }),

  createDeal: (dealType: string, amount: number) => trackEvent({
    category: 'deal',
    action: 'create',
    label: dealType,
    value: amount,
  }),

  // Search events
  search: (query: string, resultsCount: number) => trackEvent({
    category: 'search',
    action: 'query',
    label: query,
    value: resultsCount,
  }),

  filterApplied: (filterType: string, filterValue: string) => trackEvent({
    category: 'search',
    action: 'filter',
    label: `${filterType}:${filterValue}`,
  }),

  // Profile events
  updateProfile: (field: string) => trackEvent({
    category: 'profile',
    action: 'update',
    label: field,
  }),

  uploadAvatar: () => trackEvent({
    category: 'profile',
    action: 'avatar_upload',
  }),

  // Campaign events
  createCampaign: (campaignType: string, budget: number) => trackEvent({
    category: 'campaign',
    action: 'create',
    label: campaignType,
    value: budget,
  }),

  // Message events
  sendMessage: (conversationId: string) => trackEvent({
    category: 'message',
    action: 'send',
    metadata: { conversationId },
  }),

  // Navigation events
  navigate: (from: string, to: string) => trackEvent({
    category: 'navigation',
    action: 'route_change',
    label: `${from} -> ${to}`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Performance Monitoring
// ═══════════════════════════════════════════════════════════════════════════

function setupPerformanceObserver(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    // Observe Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      trackPerformanceMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Observe First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        trackPerformanceMetric({
          name: 'FID',
          value: fidEntry.processingStart - fidEntry.startTime,
          unit: 'ms',
          rating: fidEntry.processingStart - fidEntry.startTime < 100 ? 'good' : 'needs-improvement',
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Observe Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value;
        }
      }
      trackPerformanceMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'count',
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Performance APIs not supported
  }
}

interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

function trackPerformanceMetric(metric: PerformanceMetric): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Performance:', metric);
  }

  // TODO: Send to monitoring service
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Tracking
// ═══════════════════════════════════════════════════════════════════════════

function setupErrorTracking(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    trackEvent({
      category: 'error',
      action: 'uncaught_error',
      label: event.message,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackEvent({
      category: 'error',
      action: 'unhandled_rejection',
      label: event.reason?.message || String(event.reason),
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Debug & Export
// ═══════════════════════════════════════════════════════════════════════════

export function getEventQueue(): readonly AnalyticsEvent[] {
  return eventQueue;
}

export function isAnalyticsInitialized(): boolean {
  return isInitialized;
}
