/**
 * POST /api/hs/admin/actions/regulatory-change-review
 *
 * Admin marks a detected regulatory_change_events row as reviewed. Body:
 *   { eventId: uuid, outcome: 'no_change'|'minor_update'|'rule_change'|'unable_to_parse',
 *     notes: string (min 10) }
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 *
 * The 'rule_change' outcome additionally writes an admin_audit_log row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { reviewChange } from '@/lib/hs-nil/regulatory-monitor';

const schema = z
  .object({
    eventId: z.string().uuid(),
    outcome: z.enum([
      'no_change',
      'minor_update',
      'rule_change',
      'unable_to_parse',
    ]),
    notes: z.string().min(10).max(2000),
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

    const result = await reviewChange({
      eventId: v.data.eventId,
      outcome: v.data.outcome,
      notes: v.data.notes,
      reviewerUserId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'not_found' ? 404 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: result.auditLogId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/regulatory-change-review]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
