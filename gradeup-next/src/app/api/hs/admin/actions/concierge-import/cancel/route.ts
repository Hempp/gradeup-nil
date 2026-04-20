/**
 * POST /api/hs/admin/actions/concierge-import/cancel
 *
 * Admin-only. Marks a batch as cancelled. Does NOT roll back any
 * already-applied rows — the side effects of a successful apply are
 * permanent (auth.users, profile rows, consent records). This endpoint
 * only changes the batch status so the batch stops showing up as
 * actionable in the admin dashboard.
 *
 * Body: { batchId: uuid }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { cancelImport } from '@/lib/hs-nil/concierge-import';

const schema = z.object({ batchId: z.string().uuid() }).strict();

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

    await cancelImport(v.data.batchId);
    return NextResponse.json({ ok: true, batchId: v.data.batchId, status: 'cancelled' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/concierge-import/cancel]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
