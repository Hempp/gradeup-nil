'use client';

import { useCallback, useEffect, useState } from 'react';
import { CSRF_CONFIG } from '@/lib/csrf';

/**
 * Hook to manage CSRF token for client-side requests
 *
 * This hook:
 * 1. Reads the CSRF token from the cookie set by middleware
 * 2. Provides a method to get the token for fetch requests
 * 3. Automatically refreshes when the cookie changes
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { csrfToken, getCsrfHeaders } = useCsrf();
 *
 *   const handleSubmit = async () => {
 *     const response = await fetch('/api/data', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         ...getCsrfHeaders(),
 *       },
 *       body: JSON.stringify({ data: 'value' }),
 *     });
 *   };
 * }
 * ```
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  /**
   * Parse and retrieve the CSRF token from cookies
   */
  const getTokenFromCookie = useCallback((): string | null => {
    if (typeof document === 'undefined') {
      return null;
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === CSRF_CONFIG.CSRF_TOKEN_COOKIE) {
        return rest.join('=');
      }
    }
    return null;
  }, []);

  /**
   * Refresh token from cookie
   */
  const refreshToken = useCallback(() => {
    const token = getTokenFromCookie();
    setCsrfToken(token);
    return token;
  }, [getTokenFromCookie]);

  /**
   * Get headers object with CSRF token for fetch requests
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    // Always get fresh token from cookie
    const token = getTokenFromCookie();
    if (!token) {
      return {};
    }
    return {
      [CSRF_CONFIG.CSRF_HEADER]: token,
    };
  }, [getTokenFromCookie]);

  /**
   * Get the current CSRF token (refreshed from cookie)
   */
  const getToken = useCallback((): string | null => {
    return getTokenFromCookie();
  }, [getTokenFromCookie]);

  // Initialize token on mount
  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  // Listen for navigation events to refresh token
  // (Next.js may set new cookies on navigation)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Refresh token periodically (every 5 minutes)
    // to catch any token rotations
    const interval = setInterval(refreshToken, 5 * 60 * 1000);

    // Refresh on focus to catch tokens set while tab was inactive
    const handleFocus = () => {
      refreshToken();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshToken]);

  return {
    /**
     * Current CSRF token (may be stale, use getCsrfHeaders for requests)
     */
    csrfToken,

    /**
     * Get headers object with CSRF token for fetch requests
     * Always returns fresh token from cookie
     */
    getCsrfHeaders,

    /**
     * Get the current CSRF token (fresh from cookie)
     */
    getToken,

    /**
     * Manually refresh token from cookie
     */
    refreshToken,

    /**
     * The CSRF header name (for manual header construction)
     */
    headerName: CSRF_CONFIG.CSRF_HEADER,
  };
}

/**
 * Get CSRF token from cookie (non-hook version for use outside components)
 *
 * @example
 * ```ts
 * const token = getCsrfToken();
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': token || '',
 *   },
 *   body: JSON.stringify({ data: 'value' }),
 * });
 * ```
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === CSRF_CONFIG.CSRF_TOKEN_COOKIE) {
      return rest.join('=');
    }
  }
  return null;
}

/**
 * Get CSRF headers for fetch requests (non-hook version)
 *
 * @example
 * ```ts
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...getCsrfHeaders(),
 *   },
 *   body: JSON.stringify({ data: 'value' }),
 * });
 * ```
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) {
    return {};
  }
  return {
    [CSRF_CONFIG.CSRF_HEADER]: token,
  };
}

export default useCsrf;
