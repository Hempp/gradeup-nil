/**
 * Analytics & Monitoring Utilities
 * Provides event tracking, performance monitoring, and user analytics
 */

import * as Sentry from '@sentry/nextjs';

// ═══════════════════════════════════════════════════════════════════════════
// Global Type Declarations
// ═══════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

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
let hasConsent = false;

const eventQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════
// Consent Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if user has consented to analytics tracking
 */
function checkConsent(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('analytics_consent=true');
}

/**
 * Set analytics consent status
 */
export function setConsent(consent: boolean): void {
  hasConsent = consent;

  // If consent granted, flush queued events
  if (consent && eventQueue.length > 0) {
    eventQueue.forEach(event => {
      sendToGA4(event);
      addSentryBreadcrumb(event);
    });
    eventQueue.length = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GA4 Integration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send event to Google Analytics 4
 */
function sendToGA4(event: AnalyticsEvent): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  // Convert event to GA4 format
  const eventName = `${event.category}_${event.action}`;
  const params: Record<string, unknown> = {
    event_category: event.category,
    event_action: event.action,
    ...(event.label && { event_label: event.label }),
    ...(event.value !== undefined && { value: event.value }),
    ...(event.metadata && { ...event.metadata }),
    ...(userId && { user_id: userId }),
    ...(userRole && { user_role: userRole }),
  };

  window.gtag('event', eventName, params);
}

/**
 * Send page view to Google Analytics 4
 */
function sendPageViewToGA4(event: PageViewEvent): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: event.path,
    page_title: event.title || document.title,
    page_referrer: event.referrer || document.referrer,
    ...(userId && { user_id: userId }),
    ...(event.userRole && { user_role: event.userRole }),
  });
}

/**
 * Set user properties in GA4
 */
function setGA4UserProperties(): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  if (userId || userRole) {
    window.gtag('set', 'user_properties', {
      ...(userId && { user_id: userId }),
      ...(userRole && { user_role: userRole }),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sentry Integration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add analytics event as Sentry breadcrumb
 */
function addSentryBreadcrumb(event: AnalyticsEvent): void {
  try {
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: `${event.category}:${event.action}`,
      data: {
        label: event.label,
        value: event.value,
        ...event.metadata,
      },
      level: event.category === 'error' ? 'error' : 'info',
    });
  } catch {
    // Sentry not available, ignore
  }
}

/**
 * Add page view as Sentry breadcrumb
 */
function addPageViewSentryBreadcrumb(event: PageViewEvent): void {
  try {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Page view: ${event.path}`,
      data: {
        title: event.title,
        referrer: event.referrer,
        userRole: event.userRole,
      },
      level: 'info',
    });
  } catch {
    // Sentry not available, ignore
  }
}

/**
 * Set Sentry user context
 */
function setSentryUser(): void {
  try {
    if (userId) {
      Sentry.setUser({
        id: userId,
        ...(userRole && { role: userRole }),
      });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    // Sentry not available, ignore
  }
}

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

  // Check for existing consent
  hasConsent = checkConsent();

  // Set user properties in GA4 and Sentry
  setGA4UserProperties();
  setSentryUser();

  // Setup performance observer
  setupPerformanceObserver();

  // Setup error tracking
  setupErrorTracking();

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Initialized', { userId: !!userId, userRole, hasConsent });
  }
}

export function setUser(id: string | null, role?: string): void {
  userId = id;
  userRole = role || null;

  // Update GA4 and Sentry user context
  setGA4UserProperties();
  setSentryUser();
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

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Event:', enrichedEvent);
  }

  // Check consent before sending
  if (!hasConsent) {
    // Queue event for later if consent not yet granted
    eventQueue.push(event);
    if (eventQueue.length > MAX_QUEUE_SIZE) {
      eventQueue.shift();
    }
    return;
  }

  // Send to Google Analytics 4
  sendToGA4(event);

  // Add Sentry breadcrumb for error tracking context
  addSentryBreadcrumb(event);
}

export function trackPageView(event: PageViewEvent): void {
  if (typeof window === 'undefined') return;

  const pageView = {
    ...event,
    timestamp: new Date().toISOString(),
    userId,
    userRole: event.userRole || userRole,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Page View:', pageView);
  }

  // Check consent before sending
  if (!hasConsent) {
    return;
  }

  // Send to Google Analytics 4
  sendPageViewToGA4(event);

  // Add Sentry breadcrumb for navigation context
  addPageViewSentryBreadcrumb(event);
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

  // Check consent before sending
  if (!hasConsent) {
    return;
  }

  // Send to Google Analytics 4 as a performance event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.unit === 'ms' ? metric.value : metric.value * 1000),
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit,
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Add Sentry breadcrumb for performance context
  try {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric.name}: ${metric.value}${metric.unit}`,
      data: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        rating: metric.rating,
      },
      level: metric.rating === 'poor' ? 'warning' : 'info',
    });
  } catch {
    // Sentry not available, ignore
  }
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

export function hasAnalyticsConsent(): boolean {
  return hasConsent;
}

/**
 * Manually flush queued events (useful after consent is granted)
 */
export function flushEventQueue(): void {
  if (!hasConsent || eventQueue.length === 0) {
    return;
  }

  eventQueue.forEach(event => {
    sendToGA4(event);
    addSentryBreadcrumb(event);
  });
  eventQueue.length = 0;
}
