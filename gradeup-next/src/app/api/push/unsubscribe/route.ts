/**
 * POST /api/push/unsubscribe
 *
 * Authenticated user removes a push subscription (typically on
 * explicit toggle-off in the notifications settings page, or after
 * pushManager.unsubscribe() is called client-side).
 *
 * We hard-delete the row. push_deliveries FK has ON DELETE CASCADE
 * so the audit trail collapses with it; that's intentional because
 * a user-initiated unsubscribe isn't the same as a hard-failure
 * disable (which sets disabled_at and preserves history).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';

const schema = z
  .object({
    endpoint: z.string().url().min(1).max(2048),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        { error: formatValidationError(v.errors) },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', v.data.endpoint);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[push/unsubscribe] delete failed', error);
      return NextResponse.json(
        { error: 'Could not remove subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
