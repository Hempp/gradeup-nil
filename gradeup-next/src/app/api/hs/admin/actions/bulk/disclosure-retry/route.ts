/**
 * POST /api/hs/admin/actions/bulk/disclosure-retry
 *
 * Body: { dealIds: uuid[] (1..100), reason: string (min 10 chars) }
 *
 * Fan-out wrapper over retryDisclosure. Respects the disclosure retry
 * guard (10-minute cooldown) — any deal touched recently is recorded as
 * status=skipped_retry_guard instead of failing. Returns a per-item
 * summary plus the admin_bulk_operations row id.
 *
 * Auth: admin only. Feature-flag gated. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { bulkRetryDisclosures } from '@/lib/hs-nil/bulk-actions';

const schema = z
  .object({
    dealIds: z.array(z.string().uuid()).min(1).max(100),
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

    const result = await bulkRetryDisclosures(
      v.data.dealIds,
      user.id,
      v.data.reason
    );
    return NextResponse.json(result, {
      status: result.status === 'failed' ? 400 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/bulk/disclosure-retry]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
