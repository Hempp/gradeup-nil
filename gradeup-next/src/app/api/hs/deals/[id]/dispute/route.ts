/**
 * POST /api/hs/deals/[id]/dispute
 *
 * Raise a dispute on a signed deal. Either side (athlete, parent linked to
 * the athlete, or brand) may call. The role is resolved server-side via
 * the disputes service and stamped on deal_disputes.raised_by_role —
 * clients cannot spoof it.
 *
 * Body: { reasonCategory, description, evidenceUrls? }
 *
 * Gate: FEATURE_HS_NIL, authenticated user, mutation rate-limit.
 * 409 when the deal already has status='disputed'.
 * 403 when the authenticated user is not a party to this deal.
 * 404 when the deal doesn't exist (same response as 403 for parents who
 *     are not linked to the athlete, to avoid leaking deal existence).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { raiseDispute } from '@/lib/hs-nil/disputes';

const schema = z
  .object({
    reasonCategory: z.enum([
      'non_delivery',
      'quality',
      'timing',
      'compensation',
      'misconduct',
      'other',
    ]),
    description: z.string().min(30).max(2000),
    evidenceUrls: z
      .array(z.string().url().max(2048))
      .max(10)
      .optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: dealId } = await context.params;
    if (!dealId) {
      return NextResponse.json(
        { error: 'Missing deal id', code: 'invalid_body' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'unauthenticated' },
        { status: 401 }
      );
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

    const result = await raiseDispute({
      dealId,
      userId: user.id,
      reasonCategory: v.data.reasonCategory,
      description: v.data.description,
      evidenceUrls: v.data.evidenceUrls,
    });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'forbidden'
            ? 403
            : result.code === 'conflict'
              ? 409
              : result.code === 'invalid_state'
                ? 400
                : 500;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      disputeId: result.disputeId,
      auditLogId: result.auditLogId ?? null,
      metadata: result.metadata ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-deals/dispute]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
