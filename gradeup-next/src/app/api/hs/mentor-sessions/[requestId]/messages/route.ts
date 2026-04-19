/**
 * POST /api/hs/mentor-sessions/[requestId]/messages
 *
 * Append a message to the thread. Either party may post (the service
 * layer decides sender_role). Fires a best-effort email to the OTHER
 * party, throttled to ≤ 1 per hour per session per recipient via the
 * derived shouldSuppressNewMessageEmail check in mentor-emails.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { postMessage, getSessionRequest } from '@/lib/hs-nil/mentors';
import { sendNewMessage } from '@/lib/services/hs-nil/mentor-emails';

const schema = z
  .object({
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { requestId } = await context.params;
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
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await postMessage({
      requestId,
      senderUserId: user.id,
      body: v.data.body,
    });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'forbidden'
            ? 403
            : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    // Fire-and-forget: email the OTHER party, throttled.
    void (async () => {
      try {
        const session = await getSessionRequest(requestId, user.id);
        if (!session.ok) return;
        const recipientUserId =
          result.data.senderRole === 'mentor'
            ? session.data.requesterUserId
            : session.data.mentorUserId;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return;
        const sb = createServiceClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: recipientAuth } = await sb.auth.admin.getUserById(
          recipientUserId
        );
        const recipientEmail = recipientAuth?.user?.email;
        if (!recipientEmail) return;
        const recipientMeta = (recipientAuth.user?.user_metadata ?? {}) as {
          first_name?: string;
        };
        const senderMeta = (user.user_metadata ?? {}) as { first_name?: string };
        await sendNewMessage({
          recipientEmail,
          recipientName: recipientMeta.first_name,
          senderDisplayName:
            senderMeta.first_name?.trim() ||
            (result.data.senderRole === 'mentor' ? 'Your mentor' : 'Your mentee'),
          sessionId: requestId,
          messagePreview: result.data.body,
          senderRole: result.data.senderRole,
          messageCreatedAt: result.data.createdAt,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[hs/mentor-sessions/messages] notify failed', e);
      }
    })();

    return NextResponse.json({ ok: true, message: result.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/mentor-sessions/messages POST]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
