/**
 * POST /api/hs/admin/actions/bulk/payout-resolve
 *
 * Body:
 *   {
 *     items: Array<{
 *       payoutId: uuid,
 *       decision: 'paid' | 'refunded',
 *       reference: string,
 *       reason: string (min 10)
 *     }> (1..50),
 *     groupReason: string (min 10)
 *   }
 *
 * Fan-out wrapper over resolvePayoutManually. Each item carries its own
 * decision + reference + reason so the operator can resolve a mixed batch
 * in one click (e.g., five paid via ACH and two refunded).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { bulkResolvePayouts } from '@/lib/hs-nil/bulk-actions';

const schema = z
  .object({
    items: z
      .array(
        z
          .object({
            payoutId: z.string().uuid(),
            decision: z.enum(['paid', 'refunded']),
            reference: z.string().min(1).max(200),
            reason: z.string().min(10).max(2000),
          })
          .strict()
      )
      .min(1)
      .max(50),
    groupReason: z.string().min(10).max(2000),
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

    const result = await bulkResolvePayouts(
      v.data.items,
      user.id,
      v.data.groupReason
    );
    return NextResponse.json(result, {
      status: result.status === 'failed' ? 400 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/bulk/payout-resolve]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
