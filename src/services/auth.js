/**
 * GradeUp NIL Platform - Authentication Service
 * Handles user authentication, registration, and session management.
 *
 * @module services/auth
 */

import { getSupabaseClient, getCurrentUser, getSession } from './supabase.js';
import { ACADEMIC_YEARS } from './helpers.js';

export { ACADEMIC_YEARS };

export const USER_ROLES = {
  ATHLETE: 'athlete',
  BRAND: 'brand',
  ATHLETIC_DIRECTOR: 'athletic_director',
  ADMIN: 'admin',
};

export async function signUpAthlete(data) {
  const supabase = await getSupabaseClient();
  const { email, password, firstName, lastName, phone } = data;

  if (!email || !password || !firstName || !lastName) {
    return {
      user: null,
      session: null,
      error: new Error('Email, password, first name, and last name are required'),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        role: USER_ROLES.ATHLETE,
      },
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  });

  if (authError) {
    return { user: null, session: null, error: authError };
  }

  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: authData.user.email,
      role: USER_ROLES.ATHLETE,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Return error but still provide user since auth succeeded
      return { user: authData.user, session: authData.session, error: profileError };
    }
  }

  return { user: authData.user, session: authData.session, error: null };
}

export async function signUpBrand(data) {
  const supabase = await getSupabaseClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { role: USER_ROLES.BRAND, company_name: data.companyName },
    },
  });

  if (authError) {
    return { user: null, brand: null, error: authError };
  }

  const user = authData.user;
  const nameParts = (data.contactName || '').split(' ');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    email: data.email,
    role: USER_ROLES.BRAND,
    first_name: nameParts[0] || null,
    last_name: nameParts.slice(1).join(' ') || null,
    phone: data.contactPhone || null,
  });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return { user, brand: null, error: profileError };
  }

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .insert({
      profile_id: user.id,
      company_name: data.companyName,
      company_type: data.companyType || null,
      industry: data.industry || null,
      website_url: data.websiteUrl || null,
      contact_name: data.contactName || null,
      contact_title: data.contactTitle || null,
      contact_email: data.email,
      contact_phone: data.contactPhone || null,
    })
    .select()
    .single();

  if (brandError) {
    console.error('Brand creation error:', brandError);
    return { user, brand: null, error: brandError };
  }

  return { user, brand, error: null };
}

export async function signIn(email, password) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, session: null, error };
  }

  if (data.user) {
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return { user: data.user, session: data.session, error: null };
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };
}

export async function updatePassword(newPassword) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { user: data?.user || null, error };
}

export async function getFullProfile() {
  const { user, error: userError } = await getCurrentUser();
  if (userError || !user) {
    return { profile: null, roleData: null, error: userError };
  }

  const supabase = await getSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return { profile: null, roleData: null, error: profileError };
  }

  let roleData = null;
  let roleError = null;

  const roleQueries = {
    brand: () => supabase.from('brands').select('*').eq('profile_id', user.id).single(),
    athlete: () => supabase.from('athletes').select(`
      *,
      school:schools(name, short_name, city, state, division),
      sport:sports(name, category)
    `).eq('profile_id', user.id).single(),
    athletic_director: () => supabase.from('athletic_directors').select(`
      *,
      school:schools(*)
    `).eq('profile_id', user.id).single(),
  };

  if (roleQueries[profile.role]) {
    const result = await roleQueries[profile.role]();
    roleData = result.data;
    roleError = result.error;
  }

  if (roleError) {
    return { profile, roleData: null, error: roleError };
  }

  return { profile, roleData, error: null };
}

export async function hasRole(role) {
  const { profile } = await getFullProfile();
  return profile?.role === role;
}

export const isBrand = () => hasRole('brand');
export const isAthlete = () => hasRole('athlete');
export const isAthleticDirector = () => hasRole('athletic_director');
export const isAdmin = () => hasRole('admin');

export async function onAuthStateChange(callback) {
  const supabase = await getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return { subscription };
}

export async function signInWithOAuth(provider, options = {}) {
  const supabase = await getSupabaseClient();
  const { redirectTo = `${window.location.origin}/auth/callback` } = options;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  return { error };
}

export async function resendVerificationEmail(email) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/verify-email` },
  });
  return { error };
}

export async function updateProfile(updates) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { profile: null, error: userError || new Error('Not authenticated') };
  }

  const fieldMap = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    bio: 'bio',
    avatarUrl: 'avatar_url',
  };

  const updateData = {};
  for (const [key, dbKey] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) updateData[dbKey] = updates[key];
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  return { profile: data, error };
}

export async function updateEmail(newEmail) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return { error };
}

export async function refreshSession() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();
  return { session: data?.session || null, error };
}

export async function getVerificationStatus() {
  const { user, error } = await getCurrentUser();
  if (error || !user) {
    return { emailVerified: false, phoneVerified: false, error };
  }
  return {
    emailVerified: user.email_confirmed_at !== null,
    phoneVerified: user.phone_confirmed_at !== null,
    error: null,
  };
}

export async function checkAthleteStatus() {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { isAthlete: false, hasProfile: false, error: userError };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== USER_ROLES.ATHLETE) {
    return { isAthlete: false, hasProfile: false, error: profileError };
  }

  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return {
    isAthlete: true,
    hasProfile: !athleteError && athlete !== null,
    error: null,
  };
}

export async function deleteAccount() {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { error: userError || new Error('Not authenticated') };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', user.id);

  if (profileError) return { error: profileError };

  await signOut();
  return { error: null };
}

export default {
  signUpAthlete,
  signUpBrand,
  signIn,
  signInWithOAuth,
  signOut,
  resetPassword,
  updatePassword,
  resendVerificationEmail,
  getFullProfile,
  updateProfile,
  updateEmail,
  refreshSession,
  getVerificationStatus,
  checkAthleteStatus,
  deleteAccount,
  hasRole,
  isBrand,
  isAthlete,
  isAthleticDirector,
  isAdmin,
  onAuthStateChange,
  USER_ROLES,
  ACADEMIC_YEARS,
};
