/**
 * POST /api/push/subscribe
 *
 * Authenticated user registers a web-push subscription. The browser
 * generates the PushSubscription via serviceWorker.pushManager and
 * POSTs it here; we upsert into public.push_subscriptions keyed on
 * (user_id, endpoint) so re-subscribing from the same browser is
 * idempotent.
 *
 * Rate-limited per user via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';

const schema = z
  .object({
    endpoint: z.string().url().min(1).max(2048),
    keys: z
      .object({
        p256dh: z.string().min(1).max(256),
        auth: z.string().min(1).max(256),
      })
      .strict(),
    userAgent: z.string().max(512).optional().nullable(),
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

    const ua =
      v.data.userAgent ?? request.headers.get('user-agent')?.slice(0, 512) ?? null;

    // Upsert keyed on (user_id, endpoint). Clear disabled_at on
    // re-subscribe so a previously dead endpoint can come back if
    // the user re-enables notifications.
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: v.data.endpoint,
          p256dh_key: v.data.keys.p256dh,
          auth_key: v.data.keys.auth,
          user_agent: ua,
          platform: 'web-push',
          disabled_at: null,
        },
        { onConflict: 'user_id,endpoint' }
      )
      .select('id')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[push/subscribe] upsert failed', error);
      return NextResponse.json(
        { error: 'Could not save subscription' },
        { status: 500 }
      );
    }

    // Ensure a push_preferences row exists so future sends respect defaults.
    await supabase
      .from('push_preferences')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' });

    return NextResponse.json({ ok: true, subscriptionId: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
