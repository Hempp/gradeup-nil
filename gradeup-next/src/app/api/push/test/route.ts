/**
 * POST /api/push/test
 *
 * Admin-only: send a test push to the caller. Handy during VAPID
 * setup and on-call verification. No body required.
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendPushToUser } from '@/lib/push/sender';

export async function POST(request: NextRequest) {
  try {
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

    const result = await sendPushToUser({
      userId: user.id,
      notificationType: 'test',
      title: 'GradeUp push test',
      body: 'If you are reading this, VAPID is wired and your subscription is live.',
      url: '/hs/settings/notifications',
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[push/test] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
