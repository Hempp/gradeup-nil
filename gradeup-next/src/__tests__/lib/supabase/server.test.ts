/**
 * Tests for the Supabase server client
 * @module __tests__/lib/supabase/server.test
 */

// Mock next/headers
const mockGetAll = jest.fn().mockReturnValue([]);
const mockSet = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => mockGetAll(),
    set: mockSet,
  }),
}));

// Mock @supabase/ssr
const mockCreateServerClient = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

// Mock environment variables
const originalEnv = process.env;

describe('Supabase server client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
    mockCreateServerClient.mockReturnValue({
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates client with correct URL and key', async () => {
    const { createClient } = require('@/lib/supabase/server');

    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    );
  });

  it('provides getAll method for cookies', async () => {
    const mockCookies = [
      { name: 'sb-access-token', value: 'token123' },
      { name: 'sb-refresh-token', value: 'refresh456' },
    ];
    mockGetAll.mockReturnValue(mockCookies);

    const { createClient } = require('@/lib/supabase/server');

    await createClient();

    // Get the cookies config passed to createServerClient
    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    // Call getAll and verify it returns the mocked cookies
    const result = cookiesConfig.getAll();
    expect(result).toEqual(mockCookies);
  });

  it('provides setAll method for cookies', async () => {
    const { createClient } = require('@/lib/supabase/server');

    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    const cookiesToSet = [
      { name: 'sb-access-token', value: 'newtoken', options: { httpOnly: true } },
    ];

    // Call setAll
    cookiesConfig.setAll(cookiesToSet);

    expect(mockSet).toHaveBeenCalledWith('sb-access-token', 'newtoken', { httpOnly: true });
  });

  it('setAll handles multiple cookies', async () => {
    const { createClient } = require('@/lib/supabase/server');

    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    const cookiesToSet = [
      { name: 'cookie1', value: 'value1', options: {} },
      { name: 'cookie2', value: 'value2', options: {} },
      { name: 'cookie3', value: 'value3', options: {} },
    ];

    cookiesConfig.setAll(cookiesToSet);

    expect(mockSet).toHaveBeenCalledTimes(3);
    expect(mockSet).toHaveBeenCalledWith('cookie1', 'value1', {});
    expect(mockSet).toHaveBeenCalledWith('cookie2', 'value2', {});
    expect(mockSet).toHaveBeenCalledWith('cookie3', 'value3', {});
  });

  it('setAll silently catches errors from Server Components', async () => {
    mockSet.mockImplementation(() => {
      throw new Error('Cannot set cookies in Server Component');
    });

    const { createClient } = require('@/lib/supabase/server');

    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    // Should not throw
    expect(() => {
      cookiesConfig.setAll([
        { name: 'test', value: 'value', options: {} },
      ]);
    }).not.toThrow();
  });

  it('returns a Supabase client instance', async () => {
    const mockClient = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
    };
    mockCreateServerClient.mockReturnValue(mockClient);

    const { createClient } = require('@/lib/supabase/server');
    const client = await createClient();

    expect(client).toBe(mockClient);
    expect(client.from).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('is an async function', async () => {
    const { createClient } = require('@/lib/supabase/server');

    const result = createClient();

    expect(result).toBeInstanceOf(Promise);
  });
});
