import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ratelimit } from '@/lib/rate-limit';
import {
  createCsrfToken,
  validateCsrfToken,
  requiresCsrfProtection,
  getCsrfTokenFromHeader,
  getCsrfSecretFromCookies,
  createCsrfTokenCookie,
  createCsrfSecretCookie,
} from '@/lib/csrf';
import {
  generateNonce,
  CSP_NONCE_HEADER,
  buildCspHeader,
  buildDevCspHeader,
} from '@/lib/csp-nonce';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES_WITH_ROUTES,
  SUPPORTED_LOCALES,
  TRANSLATED_PATHS,
  isSupportedLocale,
  type Locale,
} from '@/lib/i18n/config';

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================
// Distributed rate limiting using Upstash Redis for production environments.
// Falls back to in-memory rate limiting when Redis is not configured.
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting fallback (Map<IP, RateLimitEntry>)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration for in-memory fallback
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
 * Clean up expired rate limit entries to prevent memory leaks (in-memory fallback)
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
 * In-memory rate limit check (fallback when Redis is not configured)
 * Returns true if request should be allowed, false if rate limited
 */
function checkInMemoryRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
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

/**
 * Check rate limit using Upstash Redis or fall back to in-memory
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Use Upstash Redis if configured
  if (ratelimit) {
    const { success, remaining, reset } = await ratelimit.limit(ip);
    return {
      allowed: success,
      remaining,
      resetTime: reset
    };
  }

  // Fall back to in-memory rate limiting for development
  return checkInMemoryRateLimit(ip);
}

// =============================================================================
// LOCALE HELPERS
// =============================================================================

/**
 * Return the locale embedded in a pathname's first segment, or the default
 * when no locale segment is present. Mirrors client-side
 * `detectLocaleFromPath` in src/lib/i18n/client.ts — duplicated here so the
 * middleware module stays edge-compatible (no client-only imports).
 */
function detectLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split('/')[1];
  if (seg && isSupportedLocale(seg) && seg !== DEFAULT_LOCALE) {
    return seg;
  }
  return DEFAULT_LOCALE;
}

/**
 * True when the given English-canonical path has a translated counterpart
 * we can redirect into without serving a 404. Matches both exact paths and
 * prefixes under translated paths (e.g. /business/case-studies/:slug).
 *
 * We intentionally DO NOT redirect on paths we haven't translated — that
 * would send a Spanish-preferring user into a dead end.
 */
function shouldConsiderLocaleRedirect(path: string): boolean {
  for (const translated of TRANSLATED_PATHS) {
    if (path === translated) return true;
    // Listing-style pages get per-item pages later; don't redirect into
    // those yet (they're not translated).
    if (translated !== '/' && path === translated + '/') return true;
  }
  return false;
}

/**
 * Build a `/<locale>` prefixed URL for the given request URL. Preserves
 * query string and hash.
 */
function buildLocalizedUrl(url: URL, locale: Locale): URL {
  const target = new URL(url.toString());
  const currentPath = target.pathname === '/' ? '' : target.pathname;
  target.pathname = `/${locale}${currentPath}`;
  return target;
}

/**
 * Parse a raw Accept-Language header and return the highest-priority
 * locale we support (ignoring region tags). Returns `null` when nothing
 * matches. Tiny implementation — no need to pull in a parsing library.
 *
 * Supported header example: "es-MX,es;q=0.9,en;q=0.8"
 */
function preferredLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranges = header
    .split(',')
    .map((entry) => {
      const [lang, ...params] = entry.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.split('=')[1]) : 1;
      return { lang: lang.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((r) => r.lang.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { lang } of ranges) {
    // Match primary subtag (e.g. "es" from "es-MX").
    const primary = lang.split('-')[0];
    for (const supported of SUPPORTED_LOCALES) {
      if (primary === supported) return supported;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  // =============================================================================
  // CSP NONCE GENERATION
  // =============================================================================
  // Generate a unique nonce for each request to allow inline scripts/styles
  // while blocking unauthorized inline code (XSS protection)
  // =============================================================================
  const nonce = generateNonce();
  const isProduction = process.env.NODE_ENV === 'production';

  // Build CSP header based on environment
  const cspHeader = isProduction
    ? buildCspHeader(nonce)
    : buildDevCspHeader(nonce);

  // Clone request headers and add the nonce for server components to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP header on the response
  response.headers.set('Content-Security-Policy', cspHeader);

  const path = request.nextUrl.pathname;
  const method = request.method;

  // =============================================================================
  // LOCALE DETECTION + ACCEPT-LANGUAGE REDIRECT
  // =============================================================================
  // URL-prefix locale routing. Default (English) lives at /*; translated
  // locales live under /<locale>/*. The middleware does three things:
  //
  //   1. If the URL already carries a locale prefix, stamp a cookie so the
  //      preference survives subsequent navigations.
  //   2. If the URL has no prefix, the user has no cookie preference, and
  //      their Accept-Language header prefers a supported non-default
  //      locale that has a matching translated page, redirect them to
  //      the localized URL. We never redirect into a 404.
  //   3. If the user has a cookie preference that differs from the URL's
  //      implied locale, we do nothing — URL wins. The switcher is how
  //      they change locale explicitly.
  //
  // Static assets, API routes, and _next internals are already filtered
  // out by the `matcher` config at the bottom of this file, so we don't
  // need to re-guard them here.
  // =============================================================================
  const localeFromPath = detectLocaleFromPath(path);
  if (localeFromPath && localeFromPath !== DEFAULT_LOCALE) {
    // User is already on a localized route — remember their preference.
    response.cookies.set(LOCALE_COOKIE, localeFromPath, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: isProduction,
    });
    requestHeaders.set('x-locale', localeFromPath);
  } else {
    requestHeaders.set('x-locale', DEFAULT_LOCALE);

    // Only consider a redirect on GET requests for translated English
    // paths. We do NOT redirect on POST/PATCH/etc. — keeping forms
    // locale-agnostic lets co-agents reuse endpoints for both locales.
    if (method === 'GET' && !path.startsWith('/api/') && shouldConsiderLocaleRedirect(path)) {
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

      // Cookie preference always wins over Accept-Language if we have one.
      if (cookieLocale && isSupportedLocale(cookieLocale) && cookieLocale !== DEFAULT_LOCALE && LOCALES_WITH_ROUTES.includes(cookieLocale)) {
        const target = buildLocalizedUrl(request.nextUrl, cookieLocale);
        return NextResponse.redirect(target);
      }

      if (!cookieLocale) {
        const preferred = preferredLocaleFromAcceptLanguage(
          request.headers.get('accept-language'),
        );
        if (preferred && preferred !== DEFAULT_LOCALE && LOCALES_WITH_ROUTES.includes(preferred)) {
          const target = buildLocalizedUrl(request.nextUrl, preferred);
          return NextResponse.redirect(target);
        }
      }
    }
  }

  // Track if we need to set CSRF cookies (will be done at the end)
  let csrfTokens: { signedToken: string; secret: string } | null = null;

  // =============================================================================
  // CSRF PROTECTION
  // =============================================================================
  // Implements double-submit cookie pattern with cryptographic signatures.
  // - GET requests: Generate and set CSRF tokens in cookies
  // - POST/PATCH/DELETE/PUT requests to /api/*: Validate CSRF token from header
  // =============================================================================

  // Check if this request requires CSRF validation
  if (requiresCsrfProtection(method, path)) {
    const csrfToken = getCsrfTokenFromHeader(request.headers);
    const csrfSecret = getCsrfSecretFromCookies(request.headers.get('cookie'));

    if (!csrfToken || !csrfSecret) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Missing CSRF token',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const validation = await validateCsrfToken(csrfToken, csrfSecret);

    if (!validation.valid) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: validation.error || 'Invalid CSRF token',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // Generate new CSRF token for GET requests (and other safe methods)
  // Store tokens to be set at the end (after response object may be reassigned)
  if (method === 'GET' && !path.startsWith('/api/')) {
    csrfTokens = await createCsrfToken();
  }

  // =============================================================================
  // RATE LIMITING FOR AUTH ENDPOINTS
  // =============================================================================
  // Apply rate limiting to auth endpoints to prevent brute force attacks.
  // Disabled in development to avoid blocking E2E tests and local workflows.
  if (isProduction && isAuthEndpoint(path)) {
    const ip = getClientIP(request);
    const { allowed, remaining, resetTime } = await checkRateLimit(ip);

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
    // Set CSRF cookies before returning
    if (csrfTokens) {
      response.headers.append('Set-Cookie', createCsrfTokenCookie(csrfTokens.signedToken));
      response.headers.append('Set-Cookie', createCsrfSecretCookie(csrfTokens.secret));
    }
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
        admin: '/admin',
      };
      const allowedPath = demoRolePaths[demoRole];

      // Allow access if the demo role matches the path
      if (allowedPath && path.startsWith(allowedPath)) {
        // Set CSRF cookies before returning
        if (csrfTokens) {
          response.headers.append('Set-Cookie', createCsrfTokenCookie(csrfTokens.signedToken));
          response.headers.append('Set-Cookie', createCsrfSecretCookie(csrfTokens.secret));
        }
        return response;
      }

      // Redirect to correct demo dashboard if accessing wrong one
      if (path.startsWith('/athlete') || path.startsWith('/brand') || path.startsWith('/director') || path.startsWith('/admin')) {
        if (allowedPath && !path.startsWith(allowedPath)) {
          const redirectPath = allowedPath === '/admin' ? '/admin' : `${allowedPath}/dashboard`;
          return NextResponse.redirect(new URL(redirectPath, request.url));
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

  // Protected dashboard routes — match the EXACT segment, not a prefix.
  // `startsWith('/athlete')` used to swallow `/athletes` (the public scholar-
  // athlete directory) and `/brand` used to swallow `/brands` (public brand
  // directory), silently redirecting both to /login. Segment-boundary check
  // keeps `/athlete/dashboard`, `/brand/campaigns`, `/admin/users`, etc.
  // protected while leaving plural public directories alone.
  const isDashboardRoute =
    path === '/athlete' || path.startsWith('/athlete/') ||
    path === '/brand' || path.startsWith('/brand/') ||
    path === '/director' || path.startsWith('/director/') ||
    path === '/admin' || path.startsWith('/admin/');

  if (isDashboardRoute) {
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

    // Each role maps to a path prefix it is allowed to access and a landing
    // URL to redirect it to if it hits the wrong prefix. Adding a new role to
    // user_role MUST be reflected here — otherwise sign-in succeeds but the
    // redirect falls through and the user bounces back to '/' or loops.
    const rolePathMap: Record<string, { prefix: string; landing: string }> = {
      athlete: { prefix: '/athlete', landing: '/athlete/dashboard' },
      brand: { prefix: '/brand', landing: '/brand/dashboard' },
      athletic_director: { prefix: '/director', landing: '/director/dashboard' },
      state_ad: { prefix: '/hs/ad-portal', landing: '/hs/ad-portal' },
      hs_parent: { prefix: '/hs/parent', landing: '/hs/parent' },
      admin: { prefix: '/admin', landing: '/admin' },
    };

    const entry = rolePathMap[profile?.role || ''];

    // Redirect user to their correct dashboard if they're accessing wrong one
    // Note: Admins can access all dashboards for administrative purposes
    if (entry && !path.startsWith(entry.prefix) && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL(entry.landing, request.url));
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
      state_ad: '/hs/ad-portal',
      hs_parent: '/hs/parent',
      admin: '/admin',
    };

    const redirectPath = redirectMap[profile?.role || ''] || '/';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // =============================================================================
  // SET CSRF COOKIES (must be done after all response modifications)
  // =============================================================================
  if (csrfTokens) {
    response.headers.append('Set-Cookie', createCsrfTokenCookie(csrfTokens.signedToken));
    response.headers.append('Set-Cookie', createCsrfSecretCookie(csrfTokens.secret));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
