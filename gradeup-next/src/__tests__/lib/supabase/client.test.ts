/**
 * Tests for the Supabase browser client
 * @module __tests__/lib/supabase/client.test
 */

// Mock the @supabase/ssr module before importing the client
const mockCreateBrowserClient = jest.fn().mockReturnValue({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
});

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe('Supabase client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('creates a Supabase browser client with correct configuration', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      const client = createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: true,
            persistSession: true,
            storageKey: 'gradeup-auth',
          }),
          global: expect.objectContaining({
            headers: expect.objectContaining({
              'x-client-info': 'gradeup-nil-next/1.0.0',
            }),
          }),
        })
      );
      expect(client).toBeDefined();
    });

    it('creates a new client on each call', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      createClient();
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSupabaseClient', () => {
    it('returns a singleton instance', async () => {
      // Reset modules to clear the singleton
      jest.resetModules();

      const { getSupabaseClient } = await import('@/lib/supabase/client');

      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      // Should create only once (singleton pattern)
      expect(client1).toBe(client2);
    });

    it('creates the client on first call', async () => {
      // Reset modules to clear the singleton
      jest.resetModules();
      mockCreateBrowserClient.mockClear();

      const { getSupabaseClient } = await import('@/lib/supabase/client');

      getSupabaseClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });

    it('does not create a new client on subsequent calls', async () => {
      // Reset modules to clear the singleton
      jest.resetModules();
      mockCreateBrowserClient.mockClear();

      const { getSupabaseClient } = await import('@/lib/supabase/client');

      getSupabaseClient();
      getSupabaseClient();
      getSupabaseClient();

      // Should only create once due to singleton
      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration options', () => {
    it('enables auto refresh token', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      createClient();

      const callArgs = mockCreateBrowserClient.mock.calls[0];
      expect(callArgs[2].auth.autoRefreshToken).toBe(true);
    });

    it('enables session persistence', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      createClient();

      const callArgs = mockCreateBrowserClient.mock.calls[0];
      expect(callArgs[2].auth.persistSession).toBe(true);
    });

    it('uses correct storage key for auth', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      createClient();

      const callArgs = mockCreateBrowserClient.mock.calls[0];
      expect(callArgs[2].auth.storageKey).toBe('gradeup-auth');
    });

    it('includes client info header', async () => {
      const { createClient } = await import('@/lib/supabase/client');

      createClient();

      const callArgs = mockCreateBrowserClient.mock.calls[0];
      expect(callArgs[2].global.headers['x-client-info']).toBe('gradeup-nil-next/1.0.0');
    });
  });
});
