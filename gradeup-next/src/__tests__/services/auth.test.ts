/**
 * Tests for the auth service
 * @module __tests__/services/auth.test
 */

import {
  signIn,
  signOut,
  resetPassword,
  signUpAthlete,
  signUpBrand,
  getCurrentUser,
  getFullProfile,
  type SignUpAthleteData,
  type SignUpBrandData,
  type UserRole,
} from '@/lib/services/auth';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  createBrowserClient: jest.fn(),
}));

import { createBrowserClient } from '@/lib/supabase';

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>;

// Helper to create a chainable mock query builder that properly tracks all calls
function createChainableQuery(finalResult: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  // All chainable methods return the same mockQuery object for chaining
  const chainableMethods = ['select', 'eq', 'insert', 'update', 'delete'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // Terminal methods return the final result
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  return mockQuery;
}

// Sample test data
const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
};

const mockAthleteSignupData: SignUpAthleteData = {
  email: 'athlete@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  phone: '555-123-4567',
};

const mockBrandSignupData: SignUpBrandData = {
  email: 'brand@example.com',
  password: 'securePassword123',
  companyName: 'Acme Corp',
  contactName: 'Jane Smith',
  contactPhone: '555-987-6543',
  companyType: 'corporation',
  industry: 'retail',
  websiteUrl: 'https://acme.com',
};

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('signs in user successfully', async () => {
      const profileQuery = createChainableQuery({ data: { role: 'athlete' as UserRole }, error: null });
      const updateQuery = createChainableQuery({ data: null, error: null });

      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'test@example.com' },
              session: mockSession,
            },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return profileQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signIn('test@example.com', 'password123');

      expect(result.data).not.toBeNull();
      expect(result.data?.user.email).toBe('test@example.com');
      expect(result.data?.user.role).toBe('athlete');
      expect(result.data?.session).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('returns error on invalid credentials', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signIn('test@example.com', 'wrongpassword');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('returns error when user/session is null', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signIn('test@example.com', 'password123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Failed to sign in');
    });

    it('returns error when profile not found', async () => {
      const profileQuery = createChainableQuery({ data: null, error: { message: 'Profile not found' } });

      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'test@example.com' },
              session: mockSession,
            },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signIn('test@example.com', 'password123');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('handles unexpected errors', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signIn('test@example.com', 'password123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('signOut', () => {
    it('signs out user successfully', async () => {
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signOut();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: { message: 'Sign out failed' } }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signOut();

      expect(result.error?.message).toBe('Sign out failed');
    });

    it('handles unexpected errors', async () => {
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signOut();

      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('resetPassword', () => {
    it('sends password reset email successfully', async () => {
      const mockSupabase = {
        auth: {
          resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await resetPassword('test@example.com');

      expect(result.error).toBeNull();
      // The redirect URL uses window.location.origin which is localhost in tests
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') })
      );
    });

    it('returns error on failure', async () => {
      const mockSupabase = {
        auth: {
          resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { message: 'Email not found' } }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await resetPassword('nonexistent@example.com');

      expect(result.error?.message).toBe('Email not found');
    });

    it('handles unexpected errors', async () => {
      const mockSupabase = {
        auth: {
          resetPasswordForEmail: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await resetPassword('test@example.com');

      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('signUpAthlete', () => {
    it('creates athlete account successfully', async () => {
      const profileQuery = createChainableQuery({ data: {}, error: null });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const athleteQuery = createChainableQuery({ data: {}, error: null });
      athleteQuery.insert = jest.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return athleteQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(mockAthleteSignupData);

      expect(result.data?.user.email).toBe(mockAthleteSignupData.email);
      expect(result.data?.user.role).toBe('athlete');
      expect(result.error).toBeNull();

      // Verify auth.signUp was called with correct metadata
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: mockAthleteSignupData.email,
        password: mockAthleteSignupData.password,
        options: {
          data: {
            role: 'athlete',
            first_name: mockAthleteSignupData.firstName,
            last_name: mockAthleteSignupData.lastName,
            phone: mockAthleteSignupData.phone,
          },
        },
      });
    });

    it('returns error when auth signup fails', async () => {
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Email already exists' },
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(mockAthleteSignupData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Email already exists');
    });

    it('returns error when user creation returns null', async () => {
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(mockAthleteSignupData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Failed to create user');
    });

    it('cleans up auth user when profile creation fails', async () => {
      const profileQuery = createChainableQuery({ data: null, error: { message: 'Profile creation failed' } });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: { message: 'Profile creation failed' } });

      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(mockAthleteSignupData);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('handles unexpected errors', async () => {
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(mockAthleteSignupData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
    });

    it('handles signup without phone number', async () => {
      const dataWithoutPhone: SignUpAthleteData = {
        email: 'athlete@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const profileQuery = createChainableQuery({ data: {}, error: null });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const athleteQuery = createChainableQuery({ data: {}, error: null });
      athleteQuery.insert = jest.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return athleteQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpAthlete(dataWithoutPhone);

      expect(result.error).toBeNull();
    });
  });

  describe('signUpBrand', () => {
    it('creates brand account successfully', async () => {
      const profileQuery = createChainableQuery({ data: {}, error: null });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const brandQuery = createChainableQuery({ data: { id: 'brand-123', company_name: 'Acme Corp' }, error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return brandQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpBrand(mockBrandSignupData);

      expect(result.data?.user.email).toBe(mockBrandSignupData.email);
      expect(result.data?.user.role).toBe('brand');
      expect(result.data?.brand).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('returns error when auth signup fails', async () => {
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Email already exists' },
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpBrand(mockBrandSignupData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Email already exists');
    });

    it('cleans up on brand creation failure', async () => {
      const profileQuery = createChainableQuery({ data: {}, error: null });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const brandQuery = createChainableQuery({ data: null, error: { message: 'Brand creation failed' } });

      const deleteQuery = createChainableQuery({ data: null, error: null });
      deleteQuery.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          if (callCount === 2) return brandQuery;
          return deleteQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpBrand(mockBrandSignupData);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('handles signup with minimal data', async () => {
      const minimalData: SignUpBrandData = {
        email: 'brand@example.com',
        password: 'securePassword123',
        companyName: 'Acme Corp',
      };

      const profileQuery = createChainableQuery({ data: {}, error: null });
      profileQuery.insert = jest.fn().mockResolvedValue({ error: null });

      const brandQuery = createChainableQuery({ data: { id: 'brand-123' }, error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return brandQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await signUpBrand(minimalData);

      expect(result.error).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns current authenticated user', async () => {
      const profileQuery = createChainableQuery({ data: { role: 'athlete' as UserRole }, error: null });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getCurrentUser();

      expect(result.data?.id).toBe('user-123');
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.role).toBe('athlete');
      expect(result.error).toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when auth fails', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Auth error' },
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('returns error when profile not found', async () => {
      const profileQuery = createChainableQuery({ data: null, error: { message: 'Profile not found' } });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('handles user with null email', async () => {
      const profileQuery = createChainableQuery({ data: { role: 'athlete' as UserRole }, error: null });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: null } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getCurrentUser();

      expect(result.data?.email).toBe('');
    });
  });

  describe('getFullProfile', () => {
    it('returns full profile with athlete role data', async () => {
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'athlete' as UserRole,
        first_name: 'John',
        last_name: 'Doe',
        phone: null,
        avatar_url: null,
        bio: null,
      };

      const athleteData = { id: 'athlete-123', position: 'Quarterback' };

      const profileQuery = createChainableQuery({ data: profileData, error: null });
      const athleteQuery = createChainableQuery({ data: athleteData, error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return athleteQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getFullProfile();

      expect(result.data?.profile.role).toBe('athlete');
      expect(result.data?.roleData).toEqual(athleteData);
      expect(result.error).toBeNull();
    });

    it('returns full profile with brand role data', async () => {
      const profileData = {
        id: 'user-123',
        email: 'brand@example.com',
        role: 'brand' as UserRole,
        first_name: 'Jane',
        last_name: null,
        phone: null,
        avatar_url: null,
        bio: null,
      };

      const brandData = { id: 'brand-123', company_name: 'Acme Corp' };

      const profileQuery = createChainableQuery({ data: profileData, error: null });
      const brandQuery = createChainableQuery({ data: brandData, error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return brandQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getFullProfile();

      expect(result.data?.profile.role).toBe('brand');
      expect(result.data?.roleData).toEqual(brandData);
    });

    it('returns admin role data', async () => {
      const profileData = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        first_name: 'Admin',
        last_name: 'User',
        phone: null,
        avatar_url: null,
        bio: null,
      };

      const profileQuery = createChainableQuery({ data: profileData, error: null });

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue(profileQuery),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getFullProfile();

      expect(result.data?.profile.role).toBe('admin');
      expect(result.data?.roleData).toEqual({ isAdmin: true });
    });

    it('returns error when not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getFullProfile();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('handles athletic_director role', async () => {
      const profileData = {
        id: 'user-123',
        email: 'director@example.com',
        role: 'athletic_director' as UserRole,
        first_name: 'Director',
        last_name: 'User',
        phone: null,
        avatar_url: null,
        bio: null,
      };

      const directorData = { id: 'director-123', school: { name: 'State University' } };

      const profileQuery = createChainableQuery({ data: profileData, error: null });
      const directorQuery = createChainableQuery({ data: directorData, error: null });

      let callCount = 0;
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return profileQuery;
          return directorQuery;
        }),
      };
      mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);

      const result = await getFullProfile();

      expect(result.data?.profile.role).toBe('athletic_director');
      expect(result.data?.roleData).toEqual(directorData);
    });
  });
});
