import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================
// In-memory rate limiter for auth endpoints to prevent brute force attacks.
// Note: This uses in-memory storage which resets on server restart and doesn't
// share state across Vercel serverless instances. For production at scale,
// consider using @upstash/ratelimit with Redis for distributed rate limiting.
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (Map<IP, RateLimitEntry>)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 5,           // Maximum requests allowed
  windowMs: 60 * 1000,      // Time window in milliseconds (1 minute)
};

// Auth endpoints that should be rate limited
const AUTH_ENDPOINTS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

/**
 * Check if a path matches any auth endpoint (including nested routes)
 */
function isAuthEndpoint(path: string): boolean {
  return AUTH_ENDPOINTS.some(endpoint =>
    path === endpoint || path.startsWith(`${endpoint}/`)
  );
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }

  // Fallback - in production this should rarely be used
  return 'unknown';
}

/**
 * Clean up expired rate limit entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Check rate limit for a given IP and path
 * Returns true if request should be allowed, false if rate limited
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `auth:${ip}`;

  // Periodic cleanup (every ~100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // No entry or expired - create new entry
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime
    };
  }

  // Entry exists and not expired
  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const path = request.nextUrl.pathname;

  // =============================================================================
  // RATE LIMITING FOR AUTH ENDPOINTS
  // =============================================================================
  // Apply rate limiting to auth endpoints to prevent brute force attacks
  if (isAuthEndpoint(path)) {
    const ip = getClientIP(request);
    const { allowed, remaining, resetTime } = checkRateLimit(ip);

    if (!allowed) {
      // Return 429 Too Many Requests
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
  }

  // Skip auth checks if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // =============================================================================
  // DEMO MODE AUTHENTICATION BYPASS
  // =============================================================================
  // SECURITY WARNING: This demo mode allows unauthenticated access to dashboards
  // for demonstration purposes ONLY. It is gated by ENABLE_DEMO_MODE environment
  // variable which must be explicitly set to "true".
  //
  // PRODUCTION SAFETY:
  // - NEVER set ENABLE_DEMO_MODE=true in production
  // - This feature is intended for local development and staging demos only
  // - In production, users must authenticate via Supabase
  //
  // ALTERNATIVE APPROACH: For production demos, consider using test user accounts
  // with pre-defined credentials instead of bypassing authentication entirely.
  // =============================================================================
  const isDemoModeEnabled = process.env.ENABLE_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';

  if (isDemoModeEnabled) {
    const demoRole = request.cookies.get('demo_role')?.value;
    if (demoRole) {
      const demoRolePaths: Record<string, string> = {
        athlete: '/athlete',
        brand: '/brand',
        director: '/director',
      };
      const allowedPath = demoRolePaths[demoRole];

      // Allow access if the demo role matches the path
      if (allowedPath && path.startsWith(allowedPath)) {
        return response;
      }

      // Redirect to correct demo dashboard if accessing wrong one
      if (path.startsWith('/athlete') || path.startsWith('/brand') || path.startsWith('/director')) {
        if (allowedPath && !path.startsWith(allowedPath)) {
          return NextResponse.redirect(new URL(`${allowedPath}/dashboard`, request.url));
        }
      }
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected dashboard routes
  if (path.startsWith('/athlete') || path.startsWith('/brand') || path.startsWith('/director')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }

    // Get user role and redirect if accessing wrong dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const rolePathMap: Record<string, string> = {
      athlete: '/athlete',
      brand: '/brand',
      athletic_director: '/director',
    };

    const expectedPath = rolePathMap[profile?.role || ''];

    // Redirect user to their correct dashboard if they're accessing wrong one
    if (expectedPath && !path.startsWith(expectedPath)) {
      return NextResponse.redirect(new URL(`${expectedPath}/dashboard`, request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if ((path === '/login' || path.startsWith('/signup')) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const redirectMap: Record<string, string> = {
      athlete: '/athlete/dashboard',
      brand: '/brand/dashboard',
      athletic_director: '/director/dashboard',
    };

    const redirectPath = redirectMap[profile?.role || ''] || '/';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
