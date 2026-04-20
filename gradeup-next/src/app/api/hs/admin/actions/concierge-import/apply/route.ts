/**
 * POST /api/hs/admin/actions/concierge-import/apply
 *
 * Admin-only. Triggers applyImport async and returns 202 with the batch id.
 *
 * Body: { batchId: uuid }
 *
 * The apply runs to completion on the server and the route does NOT wait
 * for it — the admin polls the preview endpoint to see per-row progress.
 * That keeps the connection short + prevents platform timeouts on runs
 * that touch Supabase auth + Resend.
 *
 * Rate-limited with the mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { applyImport } from '@/lib/hs-nil/concierge-import';

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

    // Fire-and-forget. Errors here are deliberately swallowed at the
    // route layer — the apply path writes apply_error per row and the
    // batch's partial_failure status to signal outcome. Admin polls
    // preview to see progress.
    const actorUserId = user.id;
    queueMicrotask(() => {
      applyImport({ batchId: v.data.batchId, actorUserId }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[hs-admin/concierge-import/apply] async apply failed', {
          batchId: v.data.batchId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });

    return NextResponse.json(
      { ok: true, batchId: v.data.batchId, status: 'applying' },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/concierge-import/apply]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
