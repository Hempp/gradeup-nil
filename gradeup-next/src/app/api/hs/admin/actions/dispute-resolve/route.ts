/**
 * POST /api/hs/admin/actions/dispute-resolve
 *
 * Admin action: resolve a dispute. Body:
 *   {
 *     disputeId: uuid,
 *     outcome: 'athlete' | 'brand' | 'split' | 'withdraw',
 *     summary: string (min 30 chars, admin rationale),
 *     action: object (informational structured decision)
 *   }
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 *
 * Deal status effects on resolution:
 *   - 'athlete'  → deal transitions back to 'in_review' (brand re-reviews)
 *   - 'brand'    → deal transitions to 'cancelled'
 *   - 'split'    → deal status left as-is; admin performs any follow-up
 *                  actions (partial payout release, partial refund) through
 *                  the existing OPS-WRITER endpoints
 *   - 'withdraw' → deal transitions back to the deal_status_before_dispute
 *                  snapshot taken at raise time
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { resolveDispute } from '@/lib/hs-nil/disputes';

const schema = z
  .object({
    disputeId: z.string().uuid(),
    outcome: z.enum(['athlete', 'brand', 'split', 'withdraw']),
    summary: z.string().min(30).max(4000),
    action: z.record(z.string(), z.unknown()).default({}),
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

    const result = await resolveDispute({
      disputeId: v.data.disputeId,
      adminUserId: user.id,
      outcome: v.data.outcome,
      summary: v.data.summary,
      action: v.data.action ?? {},
    });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'invalid_state'
            ? 400
            : result.code === 'forbidden'
              ? 403
              : 500;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: result.auditLogId ?? null,
      metadata: result.metadata ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/dispute-resolve]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
