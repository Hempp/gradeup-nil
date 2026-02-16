'use client';

import { Session } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase';
import { Brand } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type UserRole = 'athlete' | 'brand' | 'athletic_director' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface SignUpAthleteData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface SignUpBrandData {
  email: string;
  password: string;
  companyName: string;
  contactName?: string;
  contactPhone?: string;
  companyType?: string;
  industry?: string;
  websiteUrl?: string;
}

export interface AuthResult<T = null> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sign up a new athlete user with profile and athlete record creation
 *
 * Creates a Supabase auth user with athlete role metadata, then creates
 * corresponding profile and athlete records. Performs cleanup rollback
 * if any step fails.
 *
 * @param data - The athlete signup data including email, password, and personal info
 * @returns Promise resolving to AuthResult with the created AuthUser or an error
 * @example
 * const result = await signUpAthlete({
 *   email: 'athlete@example.com',
 *   password: 'securePassword123',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   phone: '555-0123'
 * });
 * if (result.error) {
 *   console.error('Signup failed:', result.error);
 * }
 */
export async function signUpAthlete(
  data: SignUpAthleteData
): Promise<AuthResult<{ user: AuthUser }>> {
  const supabase = createBrowserClient();

  try {
    // Create the auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'athlete' as UserRole,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        },
      },
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: new Error('Failed to create user') };
    }

    // Create the profile record
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: data.email,
      role: 'athlete' as UserRole,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
    });

    if (profileError) {
      // Attempt to clean up auth user on profile creation failure
      await supabase.auth.signOut();
      return { data: null, error: profileError };
    }

    // Create the athlete record
    const { error: athleteError } = await supabase.from('athletes').insert({
      profile_id: authData.user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || null,
      gpa: 0,
      enrollment_verified: false,
      sport_verified: false,
      grades_verified: false,
      identity_verified: false,
    });

    if (athleteError) {
      // Clean up on failure
      await supabase.from('profiles').delete().eq('id', authData.user.id);
      await supabase.auth.signOut();
      return { data: null, error: athleteError };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: data.email,
      role: 'athlete',
    };

    return { data: { user }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Sign up a new brand user with profile and brand record creation
 *
 * Creates a Supabase auth user with brand role metadata, then creates
 * corresponding profile and brand records. Performs cleanup rollback
 * if any step fails.
 *
 * @param data - The brand signup data including company and contact information
 * @returns Promise resolving to AuthResult with the created AuthUser and Brand or an error
 * @example
 * const result = await signUpBrand({
 *   email: 'brand@company.com',
 *   password: 'securePassword123',
 *   companyName: 'Nike',
 *   contactName: 'Jane Smith',
 *   industry: 'Sports Apparel'
 * });
 */
export async function signUpBrand(
  data: SignUpBrandData
): Promise<AuthResult<{ user: AuthUser; brand: Brand }>> {
  const supabase = createBrowserClient();

  try {
    // Create the auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'brand' as UserRole,
          company_name: data.companyName,
          contact_name: data.contactName,
        },
      },
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: new Error('Failed to create user') };
    }

    // Create the profile record
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: data.email,
      role: 'brand' as UserRole,
      first_name: data.contactName || null,
      last_name: null,
      phone: data.contactPhone || null,
    });

    if (profileError) {
      await supabase.auth.signOut();
      return { data: null, error: profileError };
    }

    // Create the brand record
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .insert({
        profile_id: authData.user.id,
        company_name: data.companyName,
        company_type: data.companyType || null,
        industry: data.industry || null,
        website_url: data.websiteUrl || null,
        contact_name: data.contactName || '',
        contact_email: data.email,
        contact_phone: data.contactPhone || null,
        total_spent: 0,
        deals_completed: 0,
        active_campaigns: 0,
        is_verified: false,
      })
      .select()
      .single();

    if (brandError || !brandData) {
      // Clean up on failure
      await supabase.from('profiles').delete().eq('id', authData.user.id);
      await supabase.auth.signOut();
      return { data: null, error: brandError || new Error('Failed to create brand') };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: data.email,
      role: 'brand',
    };

    return { data: { user, brand: brandData as Brand }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Sign in an existing user with email and password
 *
 * Authenticates the user, fetches their profile to determine role,
 * and updates the last login timestamp.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to AuthResult with AuthUser and Session or an error
 * @example
 * const { data, error } = await signIn('user@example.com', 'password123');
 * if (data) {
 *   console.log('Logged in as:', data.user.role);
 *   // Redirect based on role
 * }
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<{ user: AuthUser; session: Session }>> {
  const supabase = createBrowserClient();

  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user || !authData.session) {
      return { data: null, error: new Error('Failed to sign in') };
    }

    // Fetch the user's profile to get their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: profileError || new Error('Profile not found'),
      };
    }

    // Update last login timestamp
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', authData.user.id);

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || email,
      role: profile.role as UserRole,
    };

    return { data: { user, session: authData.session }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Sign out the current user and clear their session
 *
 * @returns Promise resolving to AuthResult indicating success or error
 * @example
 * const { error } = await signOut();
 * if (!error) {
 *   router.push('/login');
 * }
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Request a password reset email for the given email address
 *
 * Sends a password reset link to the user's email. The link redirects
 * to the /auth/reset-password page.
 *
 * @param email - The email address to send the reset link to
 * @returns Promise resolving to AuthResult indicating success or error
 * @example
 * const { error } = await resetPassword('user@example.com');
 * if (!error) {
 *   showMessage('Check your email for reset instructions');
 * }
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = createBrowserClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get the full profile of the current authenticated user including role-specific data
 *
 * Fetches the base profile and additional role-specific data (athlete, brand,
 * athletic_director, or admin data) based on the user's role.
 *
 * @returns Promise resolving to AuthResult with profile and roleData or an error
 * @example
 * const { data, error } = await getFullProfile();
 * if (data) {
 *   console.log('Profile:', data.profile);
 *   if (data.profile.role === 'athlete') {
 *     console.log('Athlete data:', data.roleData);
 *   }
 * }
 */
export async function getFullProfile(): Promise<
  AuthResult<{ profile: Profile; roleData: unknown }>
> {
  const supabase = createBrowserClient();

  try {
    // Get the current auth user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name, phone, avatar_url, bio')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: profileError || new Error('Profile not found'),
      };
    }

    // Fetch role-specific data
    let roleData: unknown = null;

    switch (profile.role) {
      case 'athlete': {
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('*, school:schools(*), sport:sports(*)')
          .eq('profile_id', user.id)
          .single();

        if (!athleteError && athleteData) {
          roleData = athleteData;
        }
        break;
      }
      case 'brand': {
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (!brandError && brandData) {
          roleData = brandData;
        }
        break;
      }
      case 'athletic_director': {
        const { data: directorData, error: directorError } = await supabase
          .from('athletic_directors')
          .select('*, school:schools(*)')
          .eq('profile_id', user.id)
          .single();

        if (!directorError && directorData) {
          roleData = directorData;
        }
        break;
      }
      case 'admin': {
        // Admins may not have additional role-specific data
        roleData = { isAdmin: true };
        break;
      }
    }

    return {
      data: {
        profile: profile as Profile,
        roleData,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get the current authenticated user with their role
 *
 * Fetches the currently authenticated user from Supabase and retrieves
 * their role from the profiles table.
 *
 * @returns Promise resolving to AuthResult with AuthUser containing id, email, and role
 * @example
 * const { data: user, error } = await getCurrentUser();
 * if (user) {
 *   console.log('Current user role:', user.role);
 * }
 */
export async function getCurrentUser(): Promise<AuthResult<AuthUser>> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Fetch the user's profile to get their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        data: null,
        error: profileError || new Error('Profile not found'),
      };
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      role: profile.role as UserRole,
    };

    return { data: authUser, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
