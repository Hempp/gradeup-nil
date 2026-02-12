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
 * Sign up a new athlete user
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
 * Sign up a new brand user
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
 * Sign in an existing user
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
 * Sign out the current user
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
 * Request a password reset email
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
 * Get the full profile of the current user including role-specific data
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
 * Get the current authenticated user
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
