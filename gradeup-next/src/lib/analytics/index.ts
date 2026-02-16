/**
 * Analytics Provider
 *
 * A vendor-agnostic analytics system that can be configured to use
 * different backends (Mixpanel, Google Analytics, PostHog, etc.)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyticsUser {
  id: string;
  email?: string;
  role?: 'athlete' | 'brand' | 'director';
  properties?: Record<string, unknown>;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Analytics Configuration
// ═══════════════════════════════════════════════════════════════════════════

const isProduction = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
const isEnabled =
  typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;

// Consent state
let hasConsent = false;
let userId: string | null = null;
let userProperties: Record<string, unknown> = {};

// Queue for events before consent
const eventQueue: AnalyticsEvent[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// Core Analytics Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize analytics with optional user data
 */
export function initAnalytics(user?: AnalyticsUser): void {
  if (!isEnabled) return;

  if (user) {
    userId = user.id;
    userProperties = {
      role: user.role,
      ...user.properties,
    };

    // Send identify event
    sendToProvider('identify', { userId, ...userProperties });
  }
}

/**
 * Set user consent for analytics tracking
 */
export function setAnalyticsConsent(consent: boolean): void {
  hasConsent = consent;

  if (consent && eventQueue.length > 0) {
    // Flush queued events
    eventQueue.forEach((event) => {
      sendToProvider('track', event);
    });
    eventQueue.length = 0;
  }
}

/**
 * Track a custom event
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    name,
    properties: {
      ...properties,
      ...userProperties,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date(),
  };

  if (!isEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Event:', name, properties);
    }
    return;
  }

  if (!hasConsent) {
    // Queue event for later
    eventQueue.push(event);
    return;
  }

  sendToProvider('track', event);
}

/**
 * Track a page view
 */
export function trackPageView(data: PageViewEvent): void {
  trackEvent('page_view', {
    path: data.path,
    title: data.title || document.title,
    referrer: data.referrer || document.referrer,
    ...data.properties,
  });
}

/**
 * Identify a user
 */
export function identifyUser(user: AnalyticsUser): void {
  userId = user.id;
  userProperties = {
    email: user.email,
    role: user.role,
    ...user.properties,
  };

  if (!isEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identify:', user.id, userProperties);
    }
    return;
  }

  sendToProvider('identify', { userId, ...userProperties });
}

/**
 * Reset user identity (e.g., on logout)
 */
export function resetUser(): void {
  userId = null;
  userProperties = {};

  if (!isEnabled) return;

  sendToProvider('reset', {});
}

// ═══════════════════════════════════════════════════════════════════════════
// Provider Integration
// ═══════════════════════════════════════════════════════════════════════════

type ProviderAction = 'track' | 'identify' | 'reset' | 'page';

/**
 * Send event to analytics provider
 * Currently supports: Console (dev), Google Analytics, Custom endpoint
 */
function sendToProvider(action: ProviderAction, data: unknown): void {
  // Development logging
  if (!isProduction) {
    console.log(`[Analytics] ${action}:`, data);
    return;
  }

  // Google Analytics 4 (gtag)
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as Window & { gtag: (...args: unknown[]) => void }).gtag;

    switch (action) {
      case 'track':
        const event = data as AnalyticsEvent;
        gtag('event', event.name, event.properties);
        break;
      case 'identify':
        gtag('set', 'user_properties', data);
        break;
      case 'page':
        const pageData = data as PageViewEvent;
        gtag('event', 'page_view', {
          page_path: pageData.path,
          page_title: pageData.title,
        });
        break;
      case 'reset':
        // GA4 doesn't have a direct reset, but we clear user properties
        gtag('set', 'user_properties', {});
        break;
    }
  }

  // Custom analytics endpoint (for self-hosted analytics)
  const analyticsEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (analyticsEndpoint) {
    fetch(analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        data,
        timestamp: new Date().toISOString(),
        userId,
      }),
    }).catch((error) => {
      console.error('[Analytics] Failed to send event:', error);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Pre-defined Events
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard event names for consistency
 */
export const AnalyticsEvents = {
  // Authentication
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Profile
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_UPDATED: 'profile_updated',
  AVATAR_UPLOADED: 'avatar_uploaded',

  // Deals
  DEAL_VIEWED: 'deal_viewed',
  DEAL_APPLIED: 'deal_applied',
  DEAL_ACCEPTED: 'deal_accepted',
  DEAL_REJECTED: 'deal_rejected',
  DEAL_COMPLETED: 'deal_completed',

  // Messages
  MESSAGE_SENT: 'message_sent',
  CONVERSATION_STARTED: 'conversation_started',

  // Search
  SEARCH_PERFORMED: 'search_performed',
  ATHLETE_SEARCHED: 'athlete_searched',
  FILTERS_APPLIED: 'filters_applied',

  // Engagement
  FEATURE_USED: 'feature_used',
  BUTTON_CLICKED: 'button_clicked',
  MODAL_OPENED: 'modal_opened',
  TOUR_STARTED: 'tour_started',
  TOUR_COMPLETED: 'tour_completed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  VALIDATION_FAILED: 'validation_failed',
} as const;

/**
 * Track signup start
 */
export function trackSignupStart(role: 'athlete' | 'brand' | 'director'): void {
  trackEvent(AnalyticsEvents.SIGN_UP_STARTED, { role });
}

/**
 * Track signup completion
 */
export function trackSignupComplete(role: 'athlete' | 'brand' | 'director'): void {
  trackEvent(AnalyticsEvents.SIGN_UP_COMPLETED, { role });
}

/**
 * Track login
 */
export function trackLogin(method: 'email' | 'oauth' | 'demo' = 'email'): void {
  trackEvent(AnalyticsEvents.LOGIN, { method });
}

/**
 * Track logout
 */
export function trackLogout(): void {
  trackEvent(AnalyticsEvents.LOGOUT);
}

/**
 * Track deal application
 */
export function trackDealApplication(dealId: string, dealType: string): void {
  trackEvent(AnalyticsEvents.DEAL_APPLIED, { dealId, dealType });
}

/**
 * Track search
 */
export function trackSearch(query: string, filters: Record<string, unknown>, resultCount: number): void {
  trackEvent(AnalyticsEvents.SEARCH_PERFORMED, {
    query,
    filters,
    resultCount,
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName: string, properties?: Record<string, unknown>): void {
  trackEvent(AnalyticsEvents.FEATURE_USED, {
    feature: featureName,
    ...properties,
  });
}

/**
 * Track button click
 */
export function trackClick(buttonName: string, location: string): void {
  trackEvent(AnalyticsEvents.BUTTON_CLICKED, {
    button: buttonName,
    location,
  });
}

/**
 * Track error
 */
export function trackError(errorCode: string, errorMessage: string, context?: Record<string, unknown>): void {
  trackEvent(AnalyticsEvents.ERROR_OCCURRED, {
    code: errorCode,
    message: errorMessage,
    ...context,
  });
}
