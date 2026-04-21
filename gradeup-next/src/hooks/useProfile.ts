'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/shared/get-profile';
import type { UserContext } from '@/types/user-context';

/**
 * Client-side hook for reading the current user's profile.
 *
 * Returns three states: { profile, loading, error }
 *
 * - loading=true until the auth check + DB query resolves
 * - profile=null when no session exists or on error
 * - error is set on unexpected failures (DB errors, network, etc.)
 *
 * The cancelled guard prevents setState on unmounted components.
 *
 * Usage:
 *   const { profile, loading, error } = useProfile();
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        const ctx = await getProfile(supabase, user.id);
        if (!cancelled) {
          setProfile(ctx);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, error };
}
