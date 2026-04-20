/**
 * POST /api/hs/admin/actions/regulatory-recheck
 *
 * Admin force-rechecks a single regulatory_monitor_sources row. Body:
 *   { sourceId: uuid }
 *
 * Bypasses the weekly schedule. Useful when (a) admin just updated a
 * placeholder URL and wants to seed the hash, or (b) admin suspects a
 * rules change and wants a fresh poll now.
 *
 * Auth: profiles.role === 'admin' (404 otherwise).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { checkSource } from '@/lib/hs-nil/regulatory-monitor';

const schema = z
  .object({
    sourceId: z.string().uuid(),
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

    const result = await checkSource(v.data.sourceId);
    return NextResponse.json({
      ok: result.outcome !== 'fetch_failed',
      outcome: result.outcome,
      eventId: result.eventId ?? null,
      error: result.error ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/regulatory-recheck]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
