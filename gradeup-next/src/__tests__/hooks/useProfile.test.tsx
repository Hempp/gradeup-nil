import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from '@/hooks/useProfile';

// Mock the supabase browser client + getProfile
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/shared/get-profile', () => ({
  getProfile: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/shared/get-profile';

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets profile=null when no authenticated user', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns the UserContext when authenticated', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    });
    (getProfile as jest.Mock).mockResolvedValue({
      role: 'admin',
      userId: 'user-1',
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual({ role: 'admin', userId: 'user-1' });
    expect(result.current.error).toBeNull();
  });

  it('sets error when getProfile throws', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'bad' } } }) },
    });
    (getProfile as jest.Mock).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.profile).toBeNull();
  });
});
