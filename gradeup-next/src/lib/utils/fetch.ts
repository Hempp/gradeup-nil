'use client';

/**
 * CSRF-Protected Fetch Utilities
 *
 * This module provides fetch wrapper functions that automatically include
 * CSRF tokens for state-changing HTTP methods (POST, PUT, PATCH, DELETE).
 *
 * @example
 * ```typescript
 * // Using the fetch wrapper
 * const response = await csrfFetch('/api/deals', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'New Deal' }),
 * });
 *
 * // Using typed API helpers
 * const deal = await apiPost<Deal>('/api/deals', { title: 'New Deal' });
 * const updatedDeal = await apiPatch<Deal>('/api/deals/123', { status: 'active' });
 * await apiDelete('/api/deals/123');
 * ```
 */

import { CSRF_CONFIG } from '@/lib/csrf';

// =============================================================================
// Types
// =============================================================================

export interface FetchOptions extends RequestInit {
  /**
   * Skip CSRF token inclusion (use with caution)
   */
  skipCsrf?: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string; status?: number } | null;
}

// =============================================================================
// CSRF Token Utilities
// =============================================================================

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
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
 * Check if a method requires CSRF protection
 */
function methodRequiresCsrf(method: string): boolean {
  return (CSRF_CONFIG.PROTECTED_METHODS as readonly string[]).includes(method.toUpperCase());
}

// =============================================================================
// Fetch Wrapper
// =============================================================================

/**
 * CSRF-protected fetch wrapper
 *
 * Automatically adds CSRF token header for state-changing methods.
 * Falls back to standard fetch behavior for GET/HEAD/OPTIONS.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (same as standard fetch)
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * const response = await csrfFetch('/api/deals', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ title: 'New Deal' }),
 * });
 * ```
 */
export async function csrfFetch(
  url: string | URL,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipCsrf = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();

  // Add CSRF token for protected methods
  if (!skipCsrf && methodRequiresCsrf(method)) {
    const csrfToken = getCsrfTokenFromCookie();

    if (!csrfToken) {
      // Log warning in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[CSRF] No CSRF token found in cookies. Request may be rejected.',
          { url: url.toString(), method }
        );
      }
    }

    // Merge headers with CSRF token
    const headers = new Headers(fetchOptions.headers);
    if (csrfToken) {
      headers.set(CSRF_CONFIG.CSRF_HEADER, csrfToken);
    }

    // Ensure Content-Type is set for JSON bodies
    if (fetchOptions.body && typeof fetchOptions.body === 'string') {
      try {
        JSON.parse(fetchOptions.body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      } catch {
        // Not JSON, skip Content-Type
      }
    }

    fetchOptions.headers = headers;
  }

  return fetch(url, fetchOptions);
}

// =============================================================================
// Typed API Helpers
// =============================================================================

/**
 * Parse API response and return typed result
 */
async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data.error || data.message || `Request failed with status ${response.status}`,
          status: response.status,
        },
      };
    }

    return { data: data as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to parse response',
        status: response.status,
      },
    };
  }
}

/**
 * Make a GET request to an API endpoint
 *
 * @param url - API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiGet<T>(
  url: string,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  const response = await csrfFetch(url, { ...options, method: 'GET' });
  return parseApiResponse<T>(response);
}

/**
 * Make a POST request to an API endpoint with CSRF protection
 *
 * @param url - API endpoint URL
 * @param data - Request body data
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiPost<T, D = unknown>(
  url: string,
  data: D,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  const response = await csrfFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(options.headers).entries()),
    },
  });
  return parseApiResponse<T>(response);
}

/**
 * Make a PUT request to an API endpoint with CSRF protection
 *
 * @param url - API endpoint URL
 * @param data - Request body data
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiPut<T, D = unknown>(
  url: string,
  data: D,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  const response = await csrfFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(options.headers).entries()),
    },
  });
  return parseApiResponse<T>(response);
}

/**
 * Make a PATCH request to an API endpoint with CSRF protection
 *
 * @param url - API endpoint URL
 * @param data - Request body data
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiPatch<T, D = unknown>(
  url: string,
  data: D,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  const response = await csrfFetch(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(options.headers).entries()),
    },
  });
  return parseApiResponse<T>(response);
}

/**
 * Make a DELETE request to an API endpoint with CSRF protection
 *
 * @param url - API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiDelete<T = void>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<ApiResponse<T>> {
  const response = await csrfFetch(url, {
    ...options,
    method: 'DELETE',
  });

  // For 204 No Content responses
  if (response.status === 204) {
    return { data: null, error: null };
  }

  return parseApiResponse<T>(response);
}

// =============================================================================
// FormData Support
// =============================================================================

/**
 * Make a POST request with FormData (for file uploads) with CSRF protection
 *
 * @param url - API endpoint URL
 * @param formData - FormData object
 * @param options - Additional fetch options
 * @returns Promise resolving to typed API response
 */
export async function apiPostFormData<T>(
  url: string,
  formData: FormData,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  // Add CSRF token to FormData
  const csrfToken = getCsrfTokenFromCookie();

  const response = await csrfFetch(url, {
    ...options,
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type for FormData - browser will set it with boundary
      ...(csrfToken ? { [CSRF_CONFIG.CSRF_HEADER]: csrfToken } : {}),
      ...Object.fromEntries(new Headers(options.headers).entries()),
    },
  });

  return parseApiResponse<T>(response);
}

// =============================================================================
// Default Export
// =============================================================================

export default csrfFetch;
