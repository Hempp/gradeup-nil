import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { type NextRequest, NextResponse } from 'next/server';

// For development/fallback, use memory
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Existing generic rate-limiter (100/min) — used by middleware for auth endpoints.
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
    })
  : null;

// =============================================================================
// Per-route limiters for authenticated API handlers
// =============================================================================
// These are lazily instantiated once per process. When Redis is not configured
// (local dev / missing env vars) they fall back to in-memory limiters keyed per
// user+path, which is good enough for tests but should not be relied on in prod.
// =============================================================================

type LimiterKind = 'mutation' | 'ai' | 'upload';

const LIMITS: Record<LimiterKind, { tokens: number; window: `${number} ${'s' | 'm' | 'h'}` }> = {
  mutation: { tokens: 30, window: '1 m' },
  ai: { tokens: 10, window: '1 m' },
  upload: { tokens: 20, window: '1 m' },
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(key: string, kind: LimiterKind) {
  const { tokens, window } = LIMITS[kind];
  // Parse window like "1 m" or "30 s" — only support m/s/h
  const [nStr, unit] = window.split(' ');
  const n = Number(nStr);
  const ms = unit === 's' ? n * 1000 : unit === 'h' ? n * 3_600_000 : n * 60_000;
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + ms });
    return { success: true, remaining: tokens - 1, reset: now + ms };
  }
  if (existing.count >= tokens) {
    return { success: false, remaining: 0, reset: existing.resetAt };
  }
  existing.count += 1;
  return { success: true, remaining: tokens - existing.count, reset: existing.resetAt };
}

const redisLimiters: Partial<Record<LimiterKind, Ratelimit>> = {};

function getLimiter(kind: LimiterKind): Ratelimit | null {
  if (!redis) return null;
  if (!redisLimiters[kind]) {
    redisLimiters[kind] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMITS[kind].tokens, LIMITS[kind].window),
      analytics: true,
      prefix: `rl:${kind}`,
    });
  }
  return redisLimiters[kind]!;
}

/**
 * Extract client IP from common proxy headers.
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) return vercelIP.split(',')[0].trim();
  return 'unknown';
}

/**
 * Enforce a per-user (or per-IP, if unauthenticated) rate limit for an API
 * handler. Returns `null` when the request is allowed; returns a 429
 * NextResponse when the limit has been exceeded — callers should early-return
 * that response.
 *
 * @param request      The incoming NextRequest
 * @param kind         Which preset bucket to use (mutation/ai/upload)
 * @param userId       Authenticated user id, or null/undefined to fall back to IP
 */
export async function enforceRateLimit(
  request: NextRequest,
  kind: LimiterKind,
  userId: string | null | undefined
): Promise<NextResponse | null> {
  const pathname = new URL(request.url).pathname;
  const identity = userId ? `u:${userId}` : `ip:${getClientIP(request)}`;
  const key = `${identity}:${pathname}`;

  const limiter = getLimiter(kind);
  const result = limiter
    ? await limiter.limit(key)
    : inMemoryLimit(key, kind);

  if (result.success) return null;

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded for ${kind}. Try again in ${retryAfter}s.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(LIMITS[kind].tokens),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
      },
    }
  );
}
