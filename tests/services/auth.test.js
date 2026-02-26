/**
 * Authentication Service Tests
 * Comprehensive tests for src/services/auth.js
 *
 * Tests cover:
 * - User registration (athlete and brand)
 * - Sign in / sign out flows
 * - Password management (reset, update)
 * - Profile management
 * - Session handling
 * - Role-based checks
 * - OAuth integration
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase module before importing auth
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  getSession: vi.fn(),
}));

// Import mocked modules
import { getSupabaseClient, getCurrentUser, getSession } from '../../src/services/supabase.js';

// Import auth service after mocks are set up
import {
  signUpAthlete,
  signUpBrand,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  getFullProfile,
  hasRole,
  isBrand,
  isAthlete,
  isAthleticDirector,
  isAdmin,
  onAuthStateChange,
  signInWithOAuth,
  resendVerificationEmail,
  updateProfile,
  updateEmail,
  refreshSession,
  getVerificationStatus,
  checkAthleteStatus,
  deleteAccount,
  USER_ROLES,
  ACADEMIC_YEARS,
} from '../../src/services/auth.js';

// Mock window.location for redirect URL tests
const mockLocation = {
  origin: 'https://gradeup.example.com',
};

// Helper to create a mock Supabase client
function createMockSupabase() {
  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOAuth: vi.fn(),
      resend: vi.fn(),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };
}

describe('AuthService', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    getSupabaseClient.mockResolvedValue(mockSupabase);

    // Mock window.location
    global.window = { location: mockLocation };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
  });

  // ─── Constants Tests ───

  describe('Constants', () => {
    it('should export USER_ROLES with correct values', () => {
      expect(USER_ROLES).toEqual({
        ATHLETE: 'athlete',
        BRAND: 'brand',
        ATHLETIC_DIRECTOR: 'athletic_director',
        ADMIN: 'admin',
      });
    });

    it('should export ACADEMIC_YEARS with correct values', () => {
      expect(ACADEMIC_YEARS).toEqual({
        FRESHMAN: 'freshman',
        SOPHOMORE: 'sophomore',
        JUNIOR: 'junior',
        SENIOR: 'senior',
        GRADUATE: 'graduate',
        OTHER: 'other',
      });
    });
  });

  // ─── Athlete Sign Up Tests ───

  describe('signUpAthlete', () => {
    it('should successfully register a new athlete', async () => {
      const mockUser = { id: 'user-123', email: 'athlete@test.com' };
      const mockSession = { access_token: 'token-123' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from = mockFrom;

      const result = await signUpAthlete({
        email: 'athlete@test.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'athlete@test.com',
        password: 'SecurePass123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            phone: '555-1234',
            role: 'athlete',
          },
          emailRedirectTo: 'https://gradeup.example.com/verify-email',
        },
      });
    });

    it('should return error when required fields are missing', async () => {
      const result = await signUpAthlete({
        email: 'athlete@test.com',
        password: 'SecurePass123',
        // Missing firstName and lastName
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe(
        'Email, password, first name, and last name are required'
      );
    });

    it('should return error when email is missing', async () => {
      const result = await signUpAthlete({
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return error when password is missing', async () => {
      const result = await signUpAthlete({
        email: 'athlete@test.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle auth signup error', async () => {
      const authError = new Error('Email already registered');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await signUpAthlete({
        email: 'existing@test.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBe(authError);
    });

    it('should handle profile creation error but still return user', async () => {
      const mockUser = { id: 'user-123', email: 'athlete@test.com' };
      const mockSession = { access_token: 'token-123' };
      const profileError = new Error('Profile creation failed');

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: profileError }),
      });

      const result = await signUpAthlete({
        email: 'athlete@test.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      // User is returned even if profile fails
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBe(profileError);
    });

    it('should create profile with correct fields', async () => {
      const mockUser = { id: 'user-456', email: 'test@test.com' };
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({ insert: mockInsert });

      await signUpAthlete({
        email: 'test@test.com',
        password: 'Pass123456',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '555-5678',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockInsert).toHaveBeenCalledWith({
        id: 'user-456',
        email: 'test@test.com',
        role: 'athlete',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '555-5678',
      });
    });
  });

  // ─── Brand Sign Up Tests ───

  describe('signUpBrand', () => {
    it('should successfully register a new brand', async () => {
      const mockUser = { id: 'brand-123', email: 'brand@company.com' };
      const mockBrand = {
        id: 'brand-record-1',
        company_name: 'Nike',
        profile_id: 'brand-123',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      // Mock chained calls for profile and brand creation
      const mockProfileInsert = vi.fn().mockResolvedValue({ error: null });
      const mockBrandInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockBrand, error: null }),
        }),
      });

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return { insert: mockProfileInsert };
        }
        if (table === 'brands') {
          return { insert: mockBrandInsert };
        }
      });

      const result = await signUpBrand({
        email: 'brand@company.com',
        password: 'BrandPass123',
        companyName: 'Nike',
        companyType: 'Athletic Apparel',
        industry: 'Sports',
        websiteUrl: 'https://nike.com',
        contactName: 'John Smith',
        contactTitle: 'Marketing Director',
        contactPhone: '555-9999',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.brand).toEqual(mockBrand);
      expect(result.error).toBeNull();
    });

    it('should handle auth signup error for brand', async () => {
      const authError = new Error('Registration failed');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await signUpBrand({
        email: 'brand@test.com',
        password: 'Pass123',
        companyName: 'Test Co',
      });

      expect(result.user).toBeNull();
      expect(result.brand).toBeNull();
      expect(result.error).toBe(authError);
    });

    it('should handle profile creation error for brand', async () => {
      const mockUser = { id: 'brand-123' };
      const profileError = new Error('Profile insert failed');

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: profileError }),
      }));

      const result = await signUpBrand({
        email: 'brand@test.com',
        password: 'Pass123',
        companyName: 'Test Co',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.brand).toBeNull();
      expect(result.error).toBe(profileError);
    });

    it('should handle brand record creation error', async () => {
      const mockUser = { id: 'brand-123' };
      const brandError = new Error('Brand insert failed');

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const mockProfileInsert = vi.fn().mockResolvedValue({ error: null });
      const mockBrandInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: brandError }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { insert: mockProfileInsert };
        if (table === 'brands') return { insert: mockBrandInsert };
      });

      const result = await signUpBrand({
        email: 'brand@test.com',
        password: 'Pass123',
        companyName: 'Test Co',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.brand).toBeNull();
      expect(result.error).toBe(brandError);
    });

    it('should parse contact name into first and last name', async () => {
      const mockUser = { id: 'brand-123' };
      const mockProfileInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { insert: mockProfileInsert };
        if (table === 'brands')
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
            }),
          };
      });

      await signUpBrand({
        email: 'brand@test.com',
        password: 'Pass123',
        companyName: 'Test Co',
        contactName: 'John Michael Smith',
      });

      expect(mockProfileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Michael Smith',
        })
      );
    });

    it('should handle empty contact name gracefully', async () => {
      const mockUser = { id: 'brand-123' };
      const mockProfileInsert = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { insert: mockProfileInsert };
        if (table === 'brands')
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
            }),
          };
      });

      await signUpBrand({
        email: 'brand@test.com',
        password: 'Pass123',
        companyName: 'Test Co',
        contactName: '',
      });

      expect(mockProfileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: null,
          last_name: null,
        })
      );
    });
  });

  // ─── Sign In Tests ───

  describe('signIn', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = { id: 'user-123', email: 'user@test.com' };
      const mockSession = { access_token: 'token-abc' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate });

      const result = await signIn('user@test.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
      });
    });

    it('should update last_login_at on successful login', async () => {
      const mockUser = { id: 'user-123' };
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate });

      await signIn('user@test.com', 'password123');

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ last_login_at: expect.any(String) })
      );
    });

    it('should reject invalid credentials', async () => {
      const authError = new Error('Invalid login credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await signIn('user@test.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBe(authError);
    });

    it('should not update profile if no user returned', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Auth failed'),
      });

      await signIn('user@test.com', 'password');

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ─── Sign Out Tests ───

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await signOut();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should return error if sign out fails', async () => {
      const signOutError = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error: signOutError });

      const result = await signOut();

      expect(result.error).toBe(signOutError);
    });
  });

  // ─── Password Reset Tests ───

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await resetPassword('user@test.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@test.com',
        { redirectTo: 'https://gradeup.example.com/reset-password' }
      );
    });

    it('should return error for invalid email', async () => {
      const resetError = new Error('User not found');
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: resetError,
      });

      const result = await resetPassword('nonexistent@test.com');

      expect(result.error).toBe(resetError);
    });
  });

  // ─── Update Password Tests ───

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      const mockUser = { id: 'user-123', email: 'user@test.com' };
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await updatePassword('NewSecurePass123');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewSecurePass123',
      });
    });

    it('should return error for weak password', async () => {
      const updateError = new Error('Password is too weak');
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: updateError,
      });

      const result = await updatePassword('weak');

      expect(result.user).toBeNull();
      expect(result.error).toBe(updateError);
    });

    it('should return null user when data is undefined', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: undefined,
        error: null,
      });

      const result = await updatePassword('NewPass123');

      expect(result.user).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  // ─── Full Profile Tests ───

  describe('getFullProfile', () => {
    it('should return profile and role data for athlete', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { id: 'user-123', role: 'athlete', first_name: 'John' };
      const mockAthleteData = {
        id: 'athlete-1',
        gpa: 3.5,
        school: { name: 'State University' },
        sport: { name: 'Basketball' },
      };

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      });

      const mockAthleteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: mockAthleteData, error: null }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'athletes') return { select: mockAthleteSelect };
      });

      const result = await getFullProfile();

      expect(result.profile).toEqual(mockProfile);
      expect(result.roleData).toEqual(mockAthleteData);
      expect(result.error).toBeNull();
    });

    it('should return profile and role data for brand', async () => {
      const mockUser = { id: 'brand-123' };
      const mockProfile = { id: 'brand-123', role: 'brand' };
      const mockBrandData = { id: 'brand-1', company_name: 'Nike' };

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      });

      const mockBrandSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockBrandData, error: null }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'brands') return { select: mockBrandSelect };
      });

      const result = await getFullProfile();

      expect(result.profile).toEqual(mockProfile);
      expect(result.roleData).toEqual(mockBrandData);
      expect(result.error).toBeNull();
    });

    it('should return profile and role data for athletic director', async () => {
      const mockUser = { id: 'director-123' };
      const mockProfile = { id: 'director-123', role: 'athletic_director' };
      const mockDirectorData = { id: 'dir-1', school: { name: 'State U' } };

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      });

      const mockDirectorSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: mockDirectorData, error: null }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'athletic_directors') return { select: mockDirectorSelect };
      });

      const result = await getFullProfile();

      expect(result.profile).toEqual(mockProfile);
      expect(result.roleData).toEqual(mockDirectorData);
    });

    it('should return error when user is not authenticated', async () => {
      const authError = new Error('Not authenticated');
      getCurrentUser.mockResolvedValue({ user: null, error: authError });

      const result = await getFullProfile();

      expect(result.profile).toBeNull();
      expect(result.roleData).toBeNull();
      expect(result.error).toBe(authError);
    });

    it('should return error when profile fetch fails', async () => {
      const mockUser = { id: 'user-123' };
      const profileError = new Error('Profile not found');

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: profileError }),
          }),
        }),
      });

      const result = await getFullProfile();

      expect(result.profile).toBeNull();
      expect(result.roleData).toBeNull();
      expect(result.error).toBe(profileError);
    });

    it('should return profile with null roleData for admin (no role query)', async () => {
      const mockUser = { id: 'admin-123' };
      const mockProfile = { id: 'admin-123', role: 'admin' };

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      const result = await getFullProfile();

      expect(result.profile).toEqual(mockProfile);
      expect(result.roleData).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle role data fetch error', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { id: 'user-123', role: 'athlete' };
      const roleError = new Error('Athlete record not found');

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      });

      const mockAthleteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: roleError }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'athletes') return { select: mockAthleteSelect };
      });

      const result = await getFullProfile();

      expect(result.profile).toEqual(mockProfile);
      expect(result.roleData).toBeNull();
      expect(result.error).toBe(roleError);
    });
  });

  // ─── Role Check Tests ───

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      getCurrentUser.mockResolvedValue({ user: { id: '123' }, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'athlete' }, error: null }),
          }),
        }),
      });

      const result = await hasRole('athlete');
      expect(result).toBe(true);
    });

    it('should return false when user has different role', async () => {
      getCurrentUser.mockResolvedValue({ user: { id: '123' }, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'brand' }, error: null }),
          }),
        }),
      });

      const result = await hasRole('athlete');
      expect(result).toBe(false);
    });

    it('should return false when not authenticated', async () => {
      getCurrentUser.mockResolvedValue({
        user: null,
        error: new Error('Not authenticated'),
      });

      const result = await hasRole('athlete');
      expect(result).toBe(false);
    });
  });

  describe('Role helper functions', () => {
    beforeEach(() => {
      getCurrentUser.mockResolvedValue({ user: { id: '123' }, error: null });
    });

    it('isBrand should check for brand role', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'brand' }, error: null }),
          }),
        }),
      });

      const result = await isBrand();
      expect(result).toBe(true);
    });

    it('isAthlete should check for athlete role', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'athlete' }, error: null }),
          }),
        }),
      });

      const result = await isAthlete();
      expect(result).toBe(true);
    });

    it('isAthleticDirector should check for athletic_director role', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'athletic_director' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAthleticDirector();
      expect(result).toBe(true);
    });

    it('isAdmin should check for admin role', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      });

      const result = await isAdmin();
      expect(result).toBe(true);
    });
  });

  // ─── Auth State Change Tests ───

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', async () => {
      const callback = vi.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const result = await onAuthStateChange(callback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(result.subscription).toBeDefined();
    });
  });

  // ─── OAuth Tests ───

  describe('signInWithOAuth', () => {
    it('should initiate OAuth sign in with default redirect', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await signInWithOAuth('google');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://gradeup.example.com/auth/callback',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
    });

    it('should initiate OAuth sign in with custom redirect', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await signInWithOAuth('github', {
        redirectTo: 'https://custom.example.com/callback',
      });

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'https://custom.example.com/callback',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
    });

    it('should return error for failed OAuth', async () => {
      const oauthError = new Error('OAuth provider unavailable');
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: oauthError });

      const result = await signInWithOAuth('facebook');

      expect(result.error).toBe(oauthError);
    });
  });

  // ─── Email Verification Tests ───

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      mockSupabase.auth.resend.mockResolvedValue({ error: null });

      const result = await resendVerificationEmail('user@test.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'user@test.com',
        options: {
          emailRedirectTo: 'https://gradeup.example.com/verify-email',
        },
      });
    });

    it('should return error for invalid email', async () => {
      const resendError = new Error('Email not found');
      mockSupabase.auth.resend.mockResolvedValue({ error: resendError });

      const result = await resendVerificationEmail('invalid@test.com');

      expect(result.error).toBe(resendError);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status for authenticated user', async () => {
      getCurrentUser.mockResolvedValue({
        user: {
          id: '123',
          email_confirmed_at: '2024-01-01T00:00:00Z',
          phone_confirmed_at: null,
        },
        error: null,
      });

      const result = await getVerificationStatus();

      expect(result.emailVerified).toBe(true);
      expect(result.phoneVerified).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should return all verified for fully verified user', async () => {
      getCurrentUser.mockResolvedValue({
        user: {
          id: '123',
          email_confirmed_at: '2024-01-01T00:00:00Z',
          phone_confirmed_at: '2024-01-02T00:00:00Z',
        },
        error: null,
      });

      const result = await getVerificationStatus();

      expect(result.emailVerified).toBe(true);
      expect(result.phoneVerified).toBe(true);
    });

    it('should return error when not authenticated', async () => {
      const authError = new Error('Not authenticated');
      getCurrentUser.mockResolvedValue({ user: null, error: authError });

      const result = await getVerificationStatus();

      expect(result.emailVerified).toBe(false);
      expect(result.phoneVerified).toBe(false);
      expect(result.error).toBe(authError);
    });
  });

  // ─── Profile Update Tests ───

  describe('updateProfile', () => {
    it('should update profile fields correctly', async () => {
      const mockUser = { id: 'user-123' };
      const updatedProfile = {
        id: 'user-123',
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '555-1234',
      };

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: updatedProfile, error: null }),
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate });

      const result = await updateProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '555-1234',
      });

      expect(result.profile).toEqual(updatedProfile);
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '555-1234',
      });
    });

    it('should map field names correctly', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate });

      await updateProfile({
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should return error when not authenticated', async () => {
      getCurrentUser.mockResolvedValue({
        user: null,
        error: new Error('Auth error'),
      });

      const result = await updateProfile({ firstName: 'Test' });

      expect(result.profile).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error when update fails', async () => {
      const mockUser = { id: 'user-123' };
      const updateError = new Error('Update failed');

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: updateError }),
            }),
          }),
        }),
      });

      const result = await updateProfile({ firstName: 'Test' });

      expect(result.profile).toBeNull();
      expect(result.error).toBe(updateError);
    });

    it('should handle user being null (no error but not authenticated)', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: null });

      const result = await updateProfile({ firstName: 'Test' });

      expect(result.profile).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });
  });

  // ─── Email Update Tests ───

  describe('updateEmail', () => {
    it('should update email address', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await updateEmail('newemail@test.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        email: 'newemail@test.com',
      });
    });

    it('should return error for invalid email', async () => {
      const emailError = new Error('Invalid email format');
      mockSupabase.auth.updateUser.mockResolvedValue({ error: emailError });

      const result = await updateEmail('invalid-email');

      expect(result.error).toBe(emailError);
    });
  });

  // ─── Session Tests ───

  describe('refreshSession', () => {
    it('should refresh the session', async () => {
      const mockSession = { access_token: 'new-token' };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await refreshSession();

      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should return error when refresh fails', async () => {
      const refreshError = new Error('Session expired');
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: null,
        error: refreshError,
      });

      const result = await refreshSession();

      expect(result.session).toBeNull();
      expect(result.error).toBe(refreshError);
    });

    it('should return null session when data is undefined', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: undefined,
        error: null,
      });

      const result = await refreshSession();

      expect(result.session).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  // ─── Athlete Status Tests ───

  describe('checkAthleteStatus', () => {
    it('should return athlete status with profile', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { role: 'athlete' }, error: null }),
        }),
      });

      const mockAthleteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'athlete-1' }, error: null }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'athletes') return { select: mockAthleteSelect };
      });

      const result = await checkAthleteStatus();

      expect(result.isAthlete).toBe(true);
      expect(result.hasProfile).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return isAthlete true but hasProfile false when athlete record missing', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { role: 'athlete' }, error: null }),
        }),
      });

      const mockAthleteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found'),
          }),
        }),
      });

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') return { select: mockProfileSelect };
        if (table === 'athletes') return { select: mockAthleteSelect };
      });

      const result = await checkAthleteStatus();

      expect(result.isAthlete).toBe(true);
      expect(result.hasProfile).toBe(false);
    });

    it('should return false for non-athlete role', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'brand' }, error: null }),
          }),
        }),
      });

      const result = await checkAthleteStatus();

      expect(result.isAthlete).toBe(false);
      expect(result.hasProfile).toBe(false);
    });

    it('should return error when not authenticated', async () => {
      const authError = new Error('Not authenticated');
      getCurrentUser.mockResolvedValue({ user: null, error: authError });

      const result = await checkAthleteStatus();

      expect(result.isAthlete).toBe(false);
      expect(result.hasProfile).toBe(false);
      expect(result.error).toBe(authError);
    });
  });

  // ─── Delete Account Tests ───

  describe('deleteAccount', () => {
    it('should deactivate account and sign out', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await deleteAccount();

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should return error when not authenticated', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: null });

      const result = await deleteAccount();

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('should return error when profile update fails', async () => {
      const mockUser = { id: 'user-123' };
      const profileError = new Error('Update failed');

      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: profileError }),
        }),
      });

      const result = await deleteAccount();

      expect(result.error).toBe(profileError);
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('should return auth error when getting user fails', async () => {
      const authError = new Error('Auth error');
      getCurrentUser.mockResolvedValue({ user: null, error: authError });

      const result = await deleteAccount();

      expect(result.error).toBe(authError);
    });
  });
});
