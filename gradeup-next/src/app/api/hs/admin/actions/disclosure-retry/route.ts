/**
 * POST /api/hs/admin/actions/disclosure-retry
 *
 * Admin action: re-queue a failed disclosure. Body:
 *   { dealId: uuid, reason: string (min 10 chars) }
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset (30/min/user).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { retryDisclosure } from '@/lib/hs-nil/admin-actions';

const schema = z
  .object({
    dealId: z.string().uuid(),
    reason: z.string().min(10).max(2000),
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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await retryDisclosure(v.data.dealId, user.id, v.data.reason);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'not_found' ? 404 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: result.auditLogId,
      metadata: result.metadata ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/disclosure-retry]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
