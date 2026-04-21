import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from './get-profile';
import type { UserContext } from '@/types/user-context';

/**
 * Server-only helper for reading the current user's profile.
 *
 * Wrapped in React.cache() so repeated calls within a single server-render
 * pass (layout + page + multiple server components) hit the DB exactly once.
 *
 * Usage:
 *   - Server Components: `const ctx = await getServerProfile();`
 *   - Server Actions:    `const ctx = await getServerProfile();`
 *   - API Routes:        `const ctx = await getServerProfile();`
 *
 * The 'server-only' import enforces this module cannot be accidentally
 * bundled into the client bundle.
 */
export const getServerProfile = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfile(supabase, user.id);
});
