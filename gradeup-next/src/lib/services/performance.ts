/**
 * Performance Metrics Service
 *
 * Aggregates and manages performance metrics for the admin dashboard.
 * Provides utilities for storing, retrieving, and analyzing Web Vitals,
 * page load times, API response times, and error rates.
 */

import { createLogger } from '@/lib/utils/logger';
import type { WebVitalMetric } from '@/lib/utils/performance';

const log = createLogger('PerformanceService');

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PerformanceMetricEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  route: string;
  userAgent: string;
}

export interface WebVitalEntry extends PerformanceMetricEntry {
  type: 'web-vital';
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
}

export interface PageLoadEntry extends PerformanceMetricEntry {
  type: 'page-load';
  duration: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

export interface ApiResponseEntry extends PerformanceMetricEntry {
  type: 'api-response';
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  success: boolean;
}

export interface ErrorEntry extends PerformanceMetricEntry {
  type: 'error';
  errorType: 'javascript' | 'api' | 'network' | 'other';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface UserSessionEntry {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  routes: string[];
  device: string;
  browser: string;
  country?: string;
}

export type PerformanceEntry =
  | WebVitalEntry
  | PageLoadEntry
  | ApiResponseEntry
  | ErrorEntry;

// Aggregated metrics for dashboard display
export interface WebVitalsAggregated {
  LCP: MetricStats;
  FID: MetricStats;
  CLS: MetricStats;
  TTFB: MetricStats;
  INP: MetricStats;
}

export interface MetricStats {
  current: number;
  average: number;
  p75: number;
  p95: number;
  count: number;
  goodPercentage: number;
  needsImprovementPercentage: number;
  poorPercentage: number;
  trend: number; // Percentage change from previous period
}

export interface PageLoadStats {
  route: string;
  avgLoadTime: number;
  p75LoadTime: number;
  p95LoadTime: number;
  count: number;
  trend: number;
}

export interface ApiEndpointStats {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  successRate: number;
  errorCount: number;
  requestCount: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorRate: number; // Errors per 1000 requests
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurred: string;
  }>;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

export interface PerformanceDashboardData {
  webVitals: WebVitalsAggregated;
  pageLoadTimes: PageLoadStats[];
  slowestPages: PageLoadStats[];
  apiEndpoints: ApiEndpointStats[];
  errorStats: ErrorStats;
  errorTrend: TimeSeriesDataPoint[];
  sessionStats: {
    totalSessions: number;
    avgDuration: number;
    avgPageViews: number;
    bounceRate: number;
  };
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// In-Memory Storage (Replace with database in production)
// ═══════════════════════════════════════════════════════════════════════════

const metricsStore: PerformanceEntry[] = [];
const sessionsStore: UserSessionEntry[] = [];
const MAX_ENTRIES = 10000;

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `perf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem('perf_session_id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('perf_session_id', sessionId);
  }
  return sessionId;
}

function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'server';
  return window.location.pathname;
}

function getUserAgent(): string {
  if (typeof window === 'undefined') return 'server';
  return navigator.userAgent;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Recording Functions
// ═══════════════════════════════════════════════════════════════════════════

export function recordWebVital(metric: WebVitalMetric, userId?: string): void {
  const entry: WebVitalEntry = {
    id: generateId(),
    type: 'web-vital',
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId,
    route: getCurrentRoute(),
    userAgent: getUserAgent(),
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
  };

  addEntry(entry);
  log.debug(`Recorded Web Vital: ${metric.name}`, { value: metric.value, rating: metric.rating });
}

export function recordPageLoad(
  duration: number,
  domContentLoaded: number,
  options?: {
    firstPaint?: number;
    firstContentfulPaint?: number;
    userId?: string;
  }
): void {
  const entry: PageLoadEntry = {
    id: generateId(),
    type: 'page-load',
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: options?.userId,
    route: getCurrentRoute(),
    userAgent: getUserAgent(),
    duration,
    domContentLoaded,
    firstPaint: options?.firstPaint,
    firstContentfulPaint: options?.firstContentfulPaint,
  };

  addEntry(entry);
  log.debug(`Recorded page load: ${duration}ms`, { route: entry.route });
}

export function recordApiResponse(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  userId?: string
): void {
  const entry: ApiResponseEntry = {
    id: generateId(),
    type: 'api-response',
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId,
    route: getCurrentRoute(),
    userAgent: getUserAgent(),
    endpoint,
    method,
    statusCode,
    duration,
    success: statusCode >= 200 && statusCode < 400,
  };

  addEntry(entry);

  if (duration > 2000) {
    log.warn(`Slow API response: ${method} ${endpoint}`, { duration, statusCode });
  }
}

export function recordError(
  errorType: ErrorEntry['errorType'],
  message: string,
  options?: {
    stack?: string;
    context?: Record<string, unknown>;
    userId?: string;
  }
): void {
  const entry: ErrorEntry = {
    id: generateId(),
    type: 'error',
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: options?.userId,
    route: getCurrentRoute(),
    userAgent: getUserAgent(),
    errorType,
    message,
    stack: options?.stack,
    context: options?.context,
  };

  addEntry(entry);
  log.error(`Recorded error: ${errorType}`, undefined, { message, ...options?.context });
}

function addEntry(entry: PerformanceEntry): void {
  metricsStore.push(entry);

  // Trim old entries to prevent memory issues
  if (metricsStore.length > MAX_ENTRIES) {
    metricsStore.splice(0, metricsStore.length - MAX_ENTRIES);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Tracking
// ═══════════════════════════════════════════════════════════════════════════

export function startSession(userId?: string): UserSessionEntry {
  const session: UserSessionEntry = {
    id: getSessionId(),
    userId,
    startTime: new Date().toISOString(),
    pageViews: 1,
    routes: [getCurrentRoute()],
    device: getDeviceType(),
    browser: getBrowserName(),
  };

  sessionsStore.push(session);
  return session;
}

export function recordPageView(route: string): void {
  const sessionId = getSessionId();
  const session = sessionsStore.find((s) => s.id === sessionId);

  if (session) {
    session.pageViews++;
    if (!session.routes.includes(route)) {
      session.routes.push(route);
    }
  }
}

export function endSession(): void {
  const sessionId = getSessionId();
  const session = sessionsStore.find((s) => s.id === sessionId);

  if (session) {
    session.endTime = new Date().toISOString();
    session.duration =
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
  }
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowserName(): string {
  if (typeof window === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

// ═══════════════════════════════════════════════════════════════════════════
// Data Aggregation Functions
// ═══════════════════════════════════════════════════════════════════════════

export function getWebVitalsAggregated(
  timeRangeHours: number = 24
): WebVitalsAggregated {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const webVitals = metricsStore.filter(
    (e): e is WebVitalEntry =>
      e.type === 'web-vital' && new Date(e.timestamp) >= cutoff
  );

  const metrics: WebVitalsAggregated = {
    LCP: createEmptyMetricStats(),
    FID: createEmptyMetricStats(),
    CLS: createEmptyMetricStats(),
    TTFB: createEmptyMetricStats(),
    INP: createEmptyMetricStats(),
  };

  const groupedByName = webVitals.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {} as Record<string, WebVitalEntry[]>);

  for (const [name, entries] of Object.entries(groupedByName)) {
    const values = entries.map((e) => e.value);
    const ratings = entries.map((e) => e.rating);

    const good = ratings.filter((r) => r === 'good').length;
    const needsImprovement = ratings.filter((r) => r === 'needs-improvement').length;
    const poor = ratings.filter((r) => r === 'poor').length;
    const total = ratings.length;

    metrics[name as keyof WebVitalsAggregated] = {
      current: values[values.length - 1] || 0,
      average: calculateAverage(values),
      p75: calculatePercentile(values, 75),
      p95: calculatePercentile(values, 95),
      count: total,
      goodPercentage: (good / total) * 100 || 0,
      needsImprovementPercentage: (needsImprovement / total) * 100 || 0,
      poorPercentage: (poor / total) * 100 || 0,
      trend: 0, // Calculate based on previous period
    };
  }

  return metrics;
}

function createEmptyMetricStats(): MetricStats {
  return {
    current: 0,
    average: 0,
    p75: 0,
    p95: 0,
    count: 0,
    goodPercentage: 0,
    needsImprovementPercentage: 0,
    poorPercentage: 0,
    trend: 0,
  };
}

export function getPageLoadStats(timeRangeHours: number = 24): PageLoadStats[] {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const pageLoads = metricsStore.filter(
    (e): e is PageLoadEntry =>
      e.type === 'page-load' && new Date(e.timestamp) >= cutoff
  );

  const groupedByRoute = pageLoads.reduce((acc, p) => {
    if (!acc[p.route]) acc[p.route] = [];
    acc[p.route].push(p);
    return acc;
  }, {} as Record<string, PageLoadEntry[]>);

  return Object.entries(groupedByRoute).map(([route, entries]) => {
    const durations = entries.map((e) => e.duration);
    return {
      route,
      avgLoadTime: calculateAverage(durations),
      p75LoadTime: calculatePercentile(durations, 75),
      p95LoadTime: calculatePercentile(durations, 95),
      count: entries.length,
      trend: 0,
    };
  });
}

export function getSlowestPages(
  timeRangeHours: number = 24,
  limit: number = 10
): PageLoadStats[] {
  return getPageLoadStats(timeRangeHours)
    .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
    .slice(0, limit);
}

export function getApiEndpointStats(
  timeRangeHours: number = 24
): ApiEndpointStats[] {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const apiResponses = metricsStore.filter(
    (e): e is ApiResponseEntry =>
      e.type === 'api-response' && new Date(e.timestamp) >= cutoff
  );

  const groupedByEndpoint = apiResponses.reduce((acc, a) => {
    const key = `${a.method}:${a.endpoint}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, ApiResponseEntry[]>);

  return Object.entries(groupedByEndpoint).map(([key, entries]) => {
    const [method, endpoint] = key.split(':');
    const durations = entries.map((e) => e.duration);
    const successCount = entries.filter((e) => e.success).length;
    const errorCount = entries.length - successCount;

    return {
      endpoint,
      method,
      avgResponseTime: calculateAverage(durations),
      p95ResponseTime: calculatePercentile(durations, 95),
      successRate: (successCount / entries.length) * 100,
      errorCount,
      requestCount: entries.length,
    };
  });
}

export function getErrorStats(timeRangeHours: number = 24): ErrorStats {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const errors = metricsStore.filter(
    (e): e is ErrorEntry =>
      e.type === 'error' && new Date(e.timestamp) >= cutoff
  );

  const errorsByType = errors.reduce((acc, e) => {
    acc[e.errorType] = (acc[e.errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorCounts = errors.reduce((acc, e) => {
    acc[e.message] = (acc[e.message] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topErrors = Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([message, count]) => {
      const lastError = errors
        .filter((e) => e.message === message)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return {
        message,
        count,
        lastOccurred: lastError?.timestamp || '',
      };
    });

  // Calculate error rate per 1000 requests
  const totalRequests = metricsStore.filter(
    (e) => e.type === 'api-response' && new Date(e.timestamp) >= cutoff
  ).length;
  const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 1000 : 0;

  return {
    totalErrors: errors.length,
    errorsByType,
    errorRate,
    topErrors,
  };
}

export function getErrorTrend(
  timeRangeHours: number = 24,
  bucketSizeMinutes: number = 60
): TimeSeriesDataPoint[] {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const errors = metricsStore.filter(
    (e): e is ErrorEntry =>
      e.type === 'error' && new Date(e.timestamp) >= cutoff
  );

  const buckets: Record<string, number> = {};
  const bucketMs = bucketSizeMinutes * 60 * 1000;

  for (let time = cutoff.getTime(); time <= Date.now(); time += bucketMs) {
    const bucketTime = new Date(time).toISOString();
    buckets[bucketTime] = 0;
  }

  errors.forEach((e) => {
    const time = new Date(e.timestamp).getTime();
    const bucketTime = new Date(Math.floor(time / bucketMs) * bucketMs).toISOString();
    if (buckets[bucketTime] !== undefined) {
      buckets[bucketTime]++;
    }
  });

  return Object.entries(buckets).map(([timestamp, value]) => ({
    timestamp,
    value,
  }));
}

export function getSessionStats(timeRangeHours: number = 24): {
  totalSessions: number;
  avgDuration: number;
  avgPageViews: number;
  bounceRate: number;
} {
  const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
  const sessions = sessionsStore.filter(
    (s) => new Date(s.startTime) >= cutoff
  );

  const completedSessions = sessions.filter((s) => s.duration);
  const durations = completedSessions.map((s) => s.duration!);
  const pageViews = sessions.map((s) => s.pageViews);
  const bouncedSessions = sessions.filter((s) => s.pageViews === 1).length;

  return {
    totalSessions: sessions.length,
    avgDuration: calculateAverage(durations),
    avgPageViews: calculateAverage(pageViews),
    bounceRate: sessions.length > 0 ? (bouncedSessions / sessions.length) * 100 : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Data
// ═══════════════════════════════════════════════════════════════════════════

export function getPerformanceDashboardData(
  timeRangeHours: number = 24
): PerformanceDashboardData {
  return {
    webVitals: getWebVitalsAggregated(timeRangeHours),
    pageLoadTimes: getPageLoadStats(timeRangeHours),
    slowestPages: getSlowestPages(timeRangeHours, 10),
    apiEndpoints: getApiEndpointStats(timeRangeHours),
    errorStats: getErrorStats(timeRangeHours),
    errorTrend: getErrorTrend(timeRangeHours),
    sessionStats: getSessionStats(timeRangeHours),
    lastUpdated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Thresholds and Scoring
// ═══════════════════════════════════════════════════════════════════════════

export const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  FID: { good: 100, poor: 300, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
  INP: { good: 200, poor: 500, unit: 'ms' },
};

export function getVitalRating(
  name: keyof typeof WEB_VITAL_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function getOverallPerformanceScore(webVitals: WebVitalsAggregated): number {
  const weights = {
    LCP: 0.25,
    FID: 0.20,
    CLS: 0.20,
    TTFB: 0.15,
    INP: 0.20,
  };

  let totalScore = 0;

  for (const [name, stats] of Object.entries(webVitals) as [
    keyof WebVitalsAggregated,
    MetricStats
  ][]) {
    // Calculate score based on good percentage
    const score = stats.goodPercentage;
    totalScore += score * weights[name];
  }

  return Math.round(totalScore);
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data Generator (for development/demo)
// ═══════════════════════════════════════════════════════════════════════════

export function generateMockPerformanceData(): PerformanceDashboardData {
  const routes = [
    '/athlete/dashboard',
    '/athlete/deals',
    '/athlete/profile',
    '/brand/dashboard',
    '/brand/discover',
    '/director/dashboard',
    '/director/athletes',
    '/director/analytics',
    '/',
    '/login',
  ];

  const endpoints = [
    { method: 'GET', endpoint: '/api/athletes' },
    { method: 'GET', endpoint: '/api/deals' },
    { method: 'POST', endpoint: '/api/deals' },
    { method: 'GET', endpoint: '/api/brands' },
    { method: 'GET', endpoint: '/api/messages' },
    { method: 'POST', endpoint: '/api/messages' },
    { method: 'GET', endpoint: '/api/analytics' },
    { method: 'PATCH', endpoint: '/api/profile' },
  ];

  // Generate random values with realistic distributions
  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const webVitals: WebVitalsAggregated = {
    LCP: {
      current: randomInRange(1800, 2800),
      average: randomInRange(2000, 2600),
      p75: randomInRange(2200, 3000),
      p95: randomInRange(3000, 4500),
      count: Math.floor(randomInRange(500, 2000)),
      goodPercentage: randomInRange(60, 85),
      needsImprovementPercentage: randomInRange(10, 25),
      poorPercentage: randomInRange(5, 15),
      trend: randomInRange(-10, 10),
    },
    FID: {
      current: randomInRange(50, 120),
      average: randomInRange(60, 100),
      p75: randomInRange(80, 150),
      p95: randomInRange(120, 250),
      count: Math.floor(randomInRange(500, 2000)),
      goodPercentage: randomInRange(75, 95),
      needsImprovementPercentage: randomInRange(5, 15),
      poorPercentage: randomInRange(0, 10),
      trend: randomInRange(-5, 5),
    },
    CLS: {
      current: randomInRange(0.05, 0.15),
      average: randomInRange(0.06, 0.12),
      p75: randomInRange(0.08, 0.18),
      p95: randomInRange(0.15, 0.30),
      count: Math.floor(randomInRange(500, 2000)),
      goodPercentage: randomInRange(70, 90),
      needsImprovementPercentage: randomInRange(8, 20),
      poorPercentage: randomInRange(2, 10),
      trend: randomInRange(-8, 8),
    },
    TTFB: {
      current: randomInRange(400, 900),
      average: randomInRange(500, 800),
      p75: randomInRange(600, 1000),
      p95: randomInRange(900, 1500),
      count: Math.floor(randomInRange(500, 2000)),
      goodPercentage: randomInRange(65, 85),
      needsImprovementPercentage: randomInRange(10, 25),
      poorPercentage: randomInRange(5, 15),
      trend: randomInRange(-12, 12),
    },
    INP: {
      current: randomInRange(100, 250),
      average: randomInRange(120, 200),
      p75: randomInRange(150, 280),
      p95: randomInRange(250, 450),
      count: Math.floor(randomInRange(500, 2000)),
      goodPercentage: randomInRange(70, 88),
      needsImprovementPercentage: randomInRange(8, 20),
      poorPercentage: randomInRange(4, 12),
      trend: randomInRange(-7, 7),
    },
  };

  const pageLoadTimes: PageLoadStats[] = routes.map((route) => ({
    route,
    avgLoadTime: randomInRange(800, 3500),
    p75LoadTime: randomInRange(1200, 4000),
    p95LoadTime: randomInRange(2000, 6000),
    count: Math.floor(randomInRange(100, 1000)),
    trend: randomInRange(-15, 15),
  }));

  const slowestPages = [...pageLoadTimes]
    .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
    .slice(0, 5);

  const apiEndpoints: ApiEndpointStats[] = endpoints.map(({ method, endpoint }) => ({
    endpoint,
    method,
    avgResponseTime: randomInRange(50, 500),
    p95ResponseTime: randomInRange(200, 1200),
    successRate: randomInRange(95, 99.9),
    errorCount: Math.floor(randomInRange(0, 50)),
    requestCount: Math.floor(randomInRange(100, 5000)),
  }));

  const errorTrend: TimeSeriesDataPoint[] = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    errorTrend.push({
      timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
      value: Math.floor(randomInRange(0, 20)),
    });
  }

  return {
    webVitals,
    pageLoadTimes,
    slowestPages,
    apiEndpoints,
    errorStats: {
      totalErrors: Math.floor(randomInRange(50, 300)),
      errorsByType: {
        javascript: Math.floor(randomInRange(20, 100)),
        api: Math.floor(randomInRange(10, 80)),
        network: Math.floor(randomInRange(5, 50)),
        other: Math.floor(randomInRange(5, 30)),
      },
      errorRate: randomInRange(1, 10),
      topErrors: [
        {
          message: 'TypeError: Cannot read property of undefined',
          count: Math.floor(randomInRange(10, 50)),
          lastOccurred: new Date(Date.now() - randomInRange(1, 24) * 60 * 60 * 1000).toISOString(),
        },
        {
          message: 'NetworkError: Failed to fetch',
          count: Math.floor(randomInRange(5, 30)),
          lastOccurred: new Date(Date.now() - randomInRange(1, 24) * 60 * 60 * 1000).toISOString(),
        },
        {
          message: 'SyntaxError: Unexpected token',
          count: Math.floor(randomInRange(3, 20)),
          lastOccurred: new Date(Date.now() - randomInRange(1, 24) * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    errorTrend,
    sessionStats: {
      totalSessions: Math.floor(randomInRange(500, 3000)),
      avgDuration: randomInRange(120000, 600000), // 2-10 minutes in ms
      avgPageViews: randomInRange(3, 8),
      bounceRate: randomInRange(20, 45),
    },
    lastUpdated: new Date().toISOString(),
  };
}
