/**
 * POST /api/hs/athlete/profile-public/visibility
 *
 * Toggle public URL visibility. Distinct from /discoverability (brand
 * matching). Requires a claimed username before enabling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { setVisibility } from '@/lib/hs-nil/athlete-profile';

const schema = z.object({ visible: z.boolean() }).strict();

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const validation = validateInput(schema, body ?? {});
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const result = await setVisibility({
      athleteUserId: user.id,
      visible: validation.data.visible,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, visible: validation.data.visible });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil profile-public visibility]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
