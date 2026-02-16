/**
 * Tests for AuthContext and AuthProvider
 * @module __tests__/context/AuthContext.test
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, useRequireAuth } from '@/context/AuthContext';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock Supabase client
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}));

// Mock auth service
jest.mock('@/lib/services/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getFullProfile: jest.fn(),
}));

import { signIn as authSignIn, signOut as authSignOut, getFullProfile } from '@/lib/services/auth';

const mockAuthSignIn = authSignIn as jest.MockedFunction<typeof authSignIn>;
const mockAuthSignOut = authSignOut as jest.MockedFunction<typeof authSignOut>;
const mockGetFullProfile = getFullProfile as jest.MockedFunction<typeof getFullProfile>;

// Helper to create complete mock profiles
function createMockProfile(overrides: { id: string; email: string; role: 'athlete' | 'brand' | 'athletic_director' }) {
  return {
    ...overrides,
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    avatar_url: null,
    bio: null,
  };
}

// Test component that uses auth context
function AuthConsumer() {
  const {
    user,
    profile,
    isLoading,
    isAuthenticated,
    error,
    signIn,
    signOut,
    isAthlete,
    isBrand,
    isDirector,
    getDashboardPath,
  } = useAuth();

  return (
    <div>
      <span data-testid="loading">{isLoading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="user-id">{user?.id || 'none'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
      <span data-testid="user-role">{user?.role || 'none'}</span>
      <span data-testid="profile-name">{profile?.first_name || 'none'}</span>
      <span data-testid="error">{error?.message || 'none'}</span>
      <span data-testid="is-athlete">{isAthlete().toString()}</span>
      <span data-testid="is-brand">{isBrand().toString()}</span>
      <span data-testid="is-director">{isDirector().toString()}</span>
      <span data-testid="dashboard-path">{getDashboardPath()}</span>
      <button
        data-testid="sign-in"
        onClick={async () => {
          await signIn('test@example.com', 'password');
        }}
      >
        Sign In
      </button>
      <button data-testid="sign-out" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}

// Test component for useRequireAuth
function RequireAuthConsumer({ allowedRoles }: { allowedRoles?: string[] }) {
  const auth = useRequireAuth({ allowedRoles: allowedRoles as ('athlete' | 'brand' | 'athletic_director' | 'admin')[] });
  return (
    <div>
      <span data-testid="require-auth-user">{auth.user?.id || 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockGetFullProfile.mockResolvedValue({ data: null, error: null });
  });

  describe('AuthProvider', () => {
    it('provides initial unauthenticated state', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-id')).toHaveTextContent('none');
    });

    it('loads user data when session exists', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123', profile_id: 'user-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    it('handles sign in', async () => {
      const user = userEvent.setup();

      mockAuthSignIn.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('sign-in'));
      });

      expect(mockAuthSignIn).toHaveBeenCalledWith('test@example.com', 'password');
    });

    it('handles sign out', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuthSignOut.mockResolvedValue({ data: null, error: null } as any);

      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      await act(async () => {
        await user.click(screen.getByTestId('sign-out'));
      });

      expect(mockAuthSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('handles auth errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Auth error'),
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  describe('role helpers', () => {
    it('identifies athlete role correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-athlete')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('is-brand')).toHaveTextContent('false');
      expect(screen.getByTestId('is-director')).toHaveTextContent('false');
    });

    it('identifies brand role correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'brand',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'brand-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-brand')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('is-athlete')).toHaveTextContent('false');
    });

    it('identifies director role correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athletic_director',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'director-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-director')).toHaveTextContent('true');
      });
    });
  });

  describe('getDashboardPath', () => {
    it('returns correct path for athlete', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-path')).toHaveTextContent('/athlete/dashboard');
      });
    });

    it('returns correct path for brand', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'brand',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'brand-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-path')).toHaveTextContent('/brand/dashboard');
      });
    });

    it('returns correct path for director', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athletic_director',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'director-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-path')).toHaveTextContent('/director/dashboard');
      });
    });

    it('returns login path when not authenticated', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('dashboard-path')).toHaveTextContent('/login');
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AuthConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('useRequireAuth hook', () => {
    it('redirects to login when not authenticated', async () => {
      render(
        <AuthProvider>
          <RequireAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('does not redirect when authenticated', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <RequireAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('require-auth-user')).toHaveTextContent('user-123');
      });

      // Should not redirect to login when authenticated
      expect(mockPush).not.toHaveBeenCalledWith('/login');
    });

    it('redirects to dashboard when role not allowed', async () => {
      const mockProfile = createMockProfile({
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete',
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      mockGetFullProfile.mockResolvedValue({
        data: {
          profile: mockProfile,
          roleData: { id: 'athlete-123' },
        },
        error: null,
      });

      render(
        <AuthProvider>
          <RequireAuthConsumer allowedRoles={['brand']} />
        </AuthProvider>
      );

      await waitFor(() => {
        // Should redirect to athlete dashboard since user is athlete but page requires brand
        expect(mockPush).toHaveBeenCalledWith('/athlete/dashboard');
      });
    });
  });
});
