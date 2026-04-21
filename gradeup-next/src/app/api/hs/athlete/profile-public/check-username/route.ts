/**
 * GET /api/hs/athlete/profile-public/check-username?username=
 *
 * Fast availability probe. Runs syntax + reserved + collision checks.
 * Auth'd to HS athletes only (so we don't expose a public enumeration
 * surface for username discovery).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { checkUsernameAvailable } from '@/lib/hs-nil/athlete-profile';

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('hs_athlete_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const username = request.nextUrl.searchParams.get('username') ?? '';
    if (!username) {
      return NextResponse.json(
        { available: false, reason: 'invalid', error: 'username required.' },
        { status: 400 }
      );
    }
    const result = await checkUsernameAvailable(username);
    return NextResponse.json(result, {
      // Short private cache — the UI calls this on every keystroke (debounced).
      headers: { 'Cache-Control': 'private, max-age=10' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil profile-public check-username]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
