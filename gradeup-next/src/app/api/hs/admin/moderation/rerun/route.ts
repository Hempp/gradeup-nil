/**
 * POST /api/hs/admin/moderation/rerun
 *
 * Admin action: re-run the moderation classifier on a row. Body:
 *   { moderationId: uuid }
 *
 * Useful after classifier improvements, or when an ops reviewer wants to
 * see if current rules change the auto-decision. Resets status to
 * 'pending' before re-classifying.
 *
 * Auth: admin only. Feature-flag gated. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { rerunForModeration } from '@/lib/hs-nil/moderation';

const schema = z.object({ moderationId: z.string().uuid() }).strict();

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
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await rerunForModeration(v.data.moderationId);
    return NextResponse.json({
      ok: true,
      outcome: {
        status: result.outcome.status,
        confidence: result.outcome.confidence,
        categories: result.outcome.categories,
        reasons: result.outcome.reasons,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/moderation/rerun]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
