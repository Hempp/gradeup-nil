/**
 * POST /api/hs/athlete/transition/cancel
 *
 * Athlete cancels their own pending transition. Service layer checks
 * ownership + status. Any uploaded proof is purged from the bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { cancelOwnTransition } from '@/lib/hs-nil/transitions';

const schema = z
  .object({
    transitionId: z.string().uuid(),
  })
  .strict();

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

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await cancelOwnTransition(v.data.transitionId, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        {
          status:
            result.code === 'not_found'
              ? 404
              : result.code === 'invalid_state'
                ? 400
                : 400,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      transitionId: result.data.transitionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-athlete/transition/cancel]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
