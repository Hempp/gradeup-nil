/**
 * CSRF Protection for Next.js App Router with Edge Runtime
 *
 * This module provides CSRF (Cross-Site Request Forgery) protection using the
 * double-submit cookie pattern with cryptographic signatures.
 *
 * How it works:
 * 1. On GET requests, generate a random token and store it in an HttpOnly cookie
 * 2. The token is also exposed via a non-HttpOnly cookie for JavaScript access
 * 3. On state-changing requests (POST, PATCH, DELETE, PUT), validate that the
 *    token in the X-CSRF-Token header matches the cookie value
 *
 * Security features:
 * - Tokens are cryptographically random (32 bytes)
 * - Tokens are signed with HMAC-SHA256 to prevent tampering
 * - HttpOnly cookie for the secret prevents XSS token theft
 * - SameSite=Strict prevents CSRF from cross-origin requests
 * - Token rotation on each request for forward secrecy
 */

// =============================================================================
// Configuration
// =============================================================================

export const CSRF_CONFIG = {
  // Cookie names
  CSRF_TOKEN_COOKIE: 'csrf_token',          // The token value (readable by JS)
  CSRF_SECRET_COOKIE: '__Host-csrf_secret', // The signing secret (HttpOnly)

  // Header name for token submission
  CSRF_HEADER: 'X-CSRF-Token',

  // Cookie settings
  COOKIE_OPTIONS: {
    path: '/',
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 hours
  },

  // Token settings
  TOKEN_LENGTH: 32, // bytes

  // HTTP methods that require CSRF validation
  PROTECTED_METHODS: ['POST', 'PATCH', 'DELETE', 'PUT'],

  // Paths exempt from CSRF protection (e.g., webhooks with their own auth)
  EXEMPT_PATHS: [
    '/api/webhooks/stripe',
    '/api/webhooks/',
  ],

  // API paths that require CSRF protection
  PROTECTED_API_PATHS: [
    '/api/',
  ],
} as const;

// =============================================================================
// Types
// =============================================================================

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
  token?: string;
}

// =============================================================================
// Crypto Utilities (Edge Runtime Compatible)
// =============================================================================

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = CSRF_CONFIG.TOKEN_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate HMAC-SHA256 signature for a message using Web Crypto API
 */
export async function signToken(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC-SHA256 signature using constant-time comparison
 */
export async function verifySignature(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await signToken(message, secret);

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

// =============================================================================
// Token Generation and Validation
// =============================================================================

/**
 * Create a new signed CSRF token
 * Returns both the token and the secret needed to verify it
 */
export async function createCsrfToken(): Promise<{
  token: string;
  signedToken: string;
  secret: string;
}> {
  const token = generateToken();
  const secret = generateToken();
  const signature = await signToken(token, secret);
  const signedToken = `${token}.${signature}`;

  return { token, signedToken, secret };
}

/**
 * Validate a CSRF token against its secret
 */
export async function validateCsrfToken(
  signedToken: string,
  secret: string
): Promise<CsrfValidationResult> {
  if (!signedToken || !secret) {
    return { valid: false, error: 'Missing CSRF token or secret' };
  }

  const parts = signedToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid CSRF token format' };
  }

  const [token, signature] = parts;

  if (!token || !signature) {
    return { valid: false, error: 'Invalid CSRF token format' };
  }

  const isValid = await verifySignature(token, signature, secret);

  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token signature' };
  }

  return { valid: true, token };
}

// =============================================================================
// Path Checking Utilities
// =============================================================================

/**
 * Check if a path is exempt from CSRF protection
 */
export function isExemptPath(path: string): boolean {
  return CSRF_CONFIG.EXEMPT_PATHS.some(
    (exempt) => path === exempt || path.startsWith(exempt)
  );
}

/**
 * Check if a path requires CSRF protection
 */
export function requiresCsrfProtection(method: string, path: string): boolean {
  // Only protect specific HTTP methods
  if (!CSRF_CONFIG.PROTECTED_METHODS.includes(method.toUpperCase())) {
    return false;
  }

  // Check if path is exempt
  if (isExemptPath(path)) {
    return false;
  }

  // Check if path is in protected API paths
  return CSRF_CONFIG.PROTECTED_API_PATHS.some(
    (protectedPath) => path.startsWith(protectedPath)
  );
}

// =============================================================================
// Cookie Utilities
// =============================================================================

/**
 * Parse cookies from a cookie header string
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) {
        cookies[name] = rest.join('=');
      }
      return cookies;
    },
    {} as Record<string, string>
  );
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(headers: Headers): string | null {
  return headers.get(CSRF_CONFIG.CSRF_HEADER);
}

/**
 * Get CSRF secret from cookies
 */
export function getCsrfSecretFromCookies(cookieHeader: string | null): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[CSRF_CONFIG.CSRF_SECRET_COOKIE] || null;
}

/**
 * Create Set-Cookie header value for CSRF token (readable by JavaScript)
 */
export function createCsrfTokenCookie(signedToken: string): string {
  const { path, sameSite, secure, maxAge } = CSRF_CONFIG.COOKIE_OPTIONS;
  const parts = [
    `${CSRF_CONFIG.CSRF_TOKEN_COOKIE}=${signedToken}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Create Set-Cookie header value for CSRF secret (HttpOnly, not readable by JavaScript)
 */
export function createCsrfSecretCookie(secret: string): string {
  const { path, sameSite, secure, maxAge } = CSRF_CONFIG.COOKIE_OPTIONS;
  const parts = [
    `${CSRF_CONFIG.CSRF_SECRET_COOKIE}=${secret}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
