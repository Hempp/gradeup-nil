/**
 * Tests for middleware helper functions
 * @module __tests__/middleware.test
 */

// We need to mock modules before importing the middleware
jest.mock('next/server', () => {
  // Create a mock constructor that also has static methods
  const MockNextResponse = jest.fn().mockImplementation((body, options) => ({
    body,
    status: options?.status || 200,
    headers: new Map(Object.entries(options?.headers || {})),
  }));

  MockNextResponse.next = jest.fn(() => ({
    headers: new Map(),
    cookies: { set: jest.fn() },
  }));

  MockNextResponse.redirect = jest.fn((url) => ({
    status: 307,
    headers: new Map(),
    url,
  }));

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn(),
  };
});

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })),
  })),
}));

import { NextResponse, NextRequest } from 'next/server';

// Create mock request factory
function createMockRequest(path: string, headers: Record<string, string> = {}) {
  const headerMap = new Map(Object.entries(headers));
  return {
    nextUrl: { pathname: path },
    url: 'http://localhost:3000' + path,
    headers: {
      get: (key: string) => headerMap.get(key) || null,
    },
    cookies: {
      get: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    },
  } as unknown as NextRequest;
}

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ENABLE_DEMO_MODE;
  });

  it('should exist and export middleware function', async () => {
    const { middleware } = await import('@/middleware');
    expect(typeof middleware).toBe('function');
  });

  it('should export config with matcher', async () => {
    const { config } = await import('@/middleware');
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
  });

  describe('rate limiting for auth endpoints', () => {
    it('should add rate limit headers on auth endpoints', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/login', {
        'x-forwarded-for': '127.0.0.1',
      });

      // Mock NextResponse.next to return a proper response object
      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      const response = await middleware(request);
      
      // Rate limit headers should be added
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });
  });

  describe('demo mode', () => {
    it('should handle demo mode when disabled', async () => {
      delete process.env.ENABLE_DEMO_MODE;
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/athlete/dashboard');
      
      const response = await middleware(request);
      expect(response).toBeDefined();
    });
  });

  describe('non-auth endpoints', () => {
    it('should pass through for non-protected routes', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/about');

      const response = await middleware(request);
      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe('client IP detection', () => {
    it('should get IP from x-forwarded-for header', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/login', {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should get IP from x-real-ip header', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/signup', {
        'x-real-ip': '10.10.10.10',
      });

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should get IP from x-vercel-forwarded-for header', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/forgot-password', {
        'x-vercel-forwarded-for': '8.8.8.8, 1.1.1.1',
      });

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });
  });

  describe('auth endpoint matching', () => {
    it('should match /login endpoint', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/login');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should match /signup endpoint', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/signup');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should match nested auth endpoints', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/signup/athlete');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });
  });

  describe('missing supabase config', () => {
    it('should skip auth when supabase URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/public-page');

      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: { set: jest.fn() },
        cookies: { set: jest.fn() },
      });

      const response = await middleware(request);
      expect(response).toBeDefined();
    });

    it('should skip auth when supabase anon key is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/public-page');

      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: { set: jest.fn() },
        cookies: { set: jest.fn() },
      });

      const response = await middleware(request);
      expect(response).toBeDefined();
    });
  });

  describe('auth endpoints - reset-password', () => {
    it('should match /reset-password endpoint', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/reset-password');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should match /forgot-password endpoint', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/forgot-password');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(true);
    });
  });

  describe('IP fallback', () => {
    it('should handle request with no IP headers', async () => {
      const { middleware } = await import('@/middleware');
      // Request with no IP headers - uses 'unknown' as fallback
      const request = createMockRequest('/login', {});

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      // Even if rate limited, middleware should return a response
      const response = await middleware(request);
      expect(response).toBeDefined();
    });
  });

  describe('public routes', () => {
    it('should not rate limit non-auth endpoints', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/api/healthcheck');

      const mockHeaders = new Map();
      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        cookies: { set: jest.fn() },
      });

      await middleware(request);
      // Should not have rate limit headers for non-auth endpoints
      expect(mockHeaders.has('X-RateLimit-Limit')).toBe(false);
    });

    it('should handle homepage', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/');

      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: { set: jest.fn() },
        cookies: { set: jest.fn() },
      });

      const response = await middleware(request);
      expect(response).toBeDefined();
    });

    it('should handle marketing pages', async () => {
      const { middleware } = await import('@/middleware');
      const request = createMockRequest('/athletes');

      (NextResponse.next as jest.Mock).mockReturnValue({
        headers: { set: jest.fn() },
        cookies: { set: jest.fn() },
      });

      const response = await middleware(request);
      expect(response).toBeDefined();
    });
  });
});
