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

  // Check if demo mode is enabled (SKIP_AUTH_CHECK env var)
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    // Skip auth redirects in demo mode
    if (isDemoMode) {
      return;
    }

    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push(redirectTo);
      } else if (allowedRoles && auth.user && !allowedRoles.includes(auth.user.role)) {
        // Redirect to correct dashboard if role doesn't match
        router.push(auth.getDashboardPath());
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, allowedRoles, redirectTo, router, auth, isDemoMode]);

  // In demo mode, return mock auth data
  if (isDemoMode && !auth.isAuthenticated) {
    const demoRole = allowedRoles?.[0] || 'athlete';

    // Complete mock athlete data for demo mode
    const demoAthleteData: Athlete = {
      id: 'demo-athlete-id',
      profile_id: 'demo-user-id',
      name: 'Marcus Johnson',
      first_name: 'Marcus',
      last_name: 'Johnson',
      email: 'marcus.johnson@duke.edu',
      phone: '(919) 555-0147',
      gpa: 3.78,
      school_id: 'duke-university',
      sport_id: 'basketball',
      major: 'Business Administration',
      minor: 'Sports Management',
      position: 'Point Guard',
      gender: 'Male',
      jersey_number: '23',
      height: '6\'2"',
      weight: '185 lbs',
      hometown: 'Durham, NC',
      expected_graduation: '2027',
      academic_year: 'Junior',
      avatar_url: undefined,
      bio: 'Student-athlete focused on excellence both on and off the field. Team captain with a passion for community service and mentoring youth athletes.',
      instagram_handle: '@marcusjohnson',
      twitter_handle: '@mjohnson_duke',
      tiktok_handle: '@marcusj_official',
      total_followers: 45000,
      enrollment_verified: true,
      sport_verified: true,
      grades_verified: true,
      identity_verified: true,
      created_at: '2024-08-15T10:00:00Z',
      updated_at: '2026-02-10T10:00:00Z',
      school: {
        id: 'duke-university',
        name: 'Duke University',
        short_name: 'Duke',
        city: 'Durham',
        state: 'NC',
        division: 'Division I',
        conference: 'ACC',
        logo_url: undefined,
      },
      sport: {
        id: 'basketball',
        name: 'Basketball',
        category: 'Team Sports',
        gender: 'Men',
        icon_name: 'basketball',
      },
    };

    // Complete mock brand data for demo mode
    const demoBrandData: Brand = {
      id: 'demo-brand-id',
      profile_id: 'demo-user-id',
      company_name: 'SportsFuel Athletics',
      company_type: 'Corporation',
      industry: 'Sports & Fitness',
      website_url: 'https://sportsfuel.demo',
      logo_url: undefined,
      contact_name: 'Sarah Mitchell',
      contact_title: 'Partnership Director',
      contact_email: 'partnerships@sportsfuel.demo',
      contact_phone: '(800) 555-FUEL',
      address_line1: '123 Sports Plaza',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      country: 'USA',
      total_spent: 125000,
      deals_completed: 18,
      avg_deal_rating: 4.8,
      active_campaigns: 3,
      preferred_sports: ['Basketball', 'Football', 'Soccer'],
      min_gpa: 3.0,
      min_followers: 5000,
      budget_range_min: 1000,
      budget_range_max: 25000,
      is_verified: true,
      verified_at: '2024-02-01T10:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2026-02-10T10:00:00Z',
    };

    return {
      ...auth,
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'demo-user-id',
        email: demoRole === 'athlete' ? 'marcus.johnson@duke.edu' : `demo@${demoRole}.gradeup.com`,
        role: demoRole,
      },
      profile: {
        id: 'demo-user-id',
        email: demoRole === 'athlete' ? 'marcus.johnson@duke.edu' : `demo@${demoRole}.gradeup.com`,
        first_name: demoRole === 'athlete' ? 'Marcus' : demoRole === 'brand' ? 'Sarah' : 'Director',
        last_name: demoRole === 'athlete' ? 'Johnson' : demoRole === 'brand' ? 'Mitchell' : 'Admin',
        role: demoRole,
        phone: demoRole === 'athlete' ? '(919) 555-0147' : null,
        avatar_url: null,
        bio: demoRole === 'athlete'
          ? 'Student-athlete focused on excellence both on and off the field. Team captain with a passion for community service and mentoring youth athletes.'
          : null,
      },
      roleData: demoRole === 'athlete'
        ? demoAthleteData
        : demoRole === 'brand'
        ? demoBrandData
        : { id: 'demo-director-id', school_id: 'demo-school', title: 'Athletic Director' },
    };
  }

  return auth;
}
