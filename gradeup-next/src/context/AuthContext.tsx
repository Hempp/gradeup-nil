'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  getFullProfile,
  type AuthUser,
  type Profile,
  type UserRole,
} from '@/lib/services/auth';
import type { Athlete, Brand } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleticDirector {
  id: string;
  profile_id: string;
  school_id: string | null;
  title: string | null;
  department: string | null;
  is_verified: boolean;
  school?: {
    id: string;
    name: string;
    short_name: string;
  };
}

type RoleData = Athlete | Brand | AthleticDirector | null;

interface AuthContextType {
  // State
  user: AuthUser | null;
  profile: Profile | null;
  roleData: RoleData;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;

  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Helpers
  isAthlete: () => boolean;
  isBrand: () => boolean;
  isDirector: () => boolean;
  isAdmin: () => boolean;
  getAthleteData: () => Athlete | null;
  getBrandData: () => Brand | null;
  getDirectorData: () => AthleticDirector | null;
  getDashboardPath: () => string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roleData, setRoleData] = useState<RoleData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user data from Supabase
  const fetchUserData = useCallback(async () => {
    try {
      const result = await getFullProfile();

      if (result.error || !result.data) {
        setUser(null);
        setProfile(null);
        setRoleData(null);
        return;
      }

      const { profile: profileData, roleData: fetchedRoleData } = result.data;

      setUser({
        id: profileData.id,
        email: profileData.email,
        role: profileData.role,
      });
      setProfile(profileData);
      setRoleData(fetchedRoleData as RoleData);
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setUser(null);
      setProfile(null);
      setRoleData(null);
      setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    // Check initial session
    const initializeAuth = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          await fetchUserData();
        } else {
          setUser(null);
          setProfile(null);
          setRoleData(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error initializing auth:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserData();
        } else if (event === 'SIGNED_OUT') {
          if (!isMounted) return;
          setUser(null);
          setProfile(null);
          setRoleData(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Optionally refresh user data on token refresh
          await fetchUserData();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Sign in handler
  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authSignIn(email, password);

        if (result.error) {
          setError(result.error);
          return { success: false, error: result.error.message };
        }

        if (result.data) {
          await fetchUserData();
          return { success: true };
        }

        return { success: false, error: 'Sign in failed' };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(err instanceof Error ? err : new Error(errorMessage));
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserData]
  );

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await authSignOut();
      setUser(null);
      setProfile(null);
      setRoleData(null);
      setError(null);
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchUserData();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // Helper functions
  const isAthlete = useCallback(() => user?.role === 'athlete', [user]);
  const isBrand = useCallback(() => user?.role === 'brand', [user]);
  const isDirector = useCallback(() => user?.role === 'athletic_director', [user]);
  const isAdmin = useCallback(() => user?.role === 'admin', [user]);

  const getAthleteData = useCallback((): Athlete | null => {
    if (user?.role === 'athlete' && roleData) {
      return roleData as Athlete;
    }
    return null;
  }, [user, roleData]);

  const getBrandData = useCallback((): Brand | null => {
    if (user?.role === 'brand' && roleData) {
      return roleData as Brand;
    }
    return null;
  }, [user, roleData]);

  const getDirectorData = useCallback((): AthleticDirector | null => {
    if (user?.role === 'athletic_director' && roleData) {
      return roleData as AthleticDirector;
    }
    return null;
  }, [user, roleData]);

  const getDashboardPath = useCallback((): string => {
    switch (user?.role) {
      case 'athlete':
        return '/athlete/dashboard';
      case 'brand':
        return '/brand/dashboard';
      case 'athletic_director':
        return '/director/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  }, [user]);

  // Context value
  const value: AuthContextType = {
    user,
    profile,
    roleData,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshUser,
    isAthlete,
    isBrand,
    isDirector,
    isAdmin,
    getAthleteData,
    getBrandData,
    getDirectorData,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Hook: Require Auth
// ═══════════════════════════════════════════════════════════════════════════

interface UseRequireAuthOptions {
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/login', allowedRoles } = options;
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push(redirectTo);
      } else if (allowedRoles && auth.user && !allowedRoles.includes(auth.user.role)) {
        // Redirect to correct dashboard if role doesn't match
        router.push(auth.getDashboardPath());
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, allowedRoles, redirectTo, router, auth]);

  return auth;
}
