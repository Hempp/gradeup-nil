/**
 * /api/hs/mentor-sessions/[requestId]
 *
 * GET   — returns the session request + its message thread. Either party
 *         (requester or mentor) may read.
 * PATCH — action = 'accept' | 'decline' | 'complete'. Accept/decline are
 *         mentor-only; complete can be fired by either party.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  getSessionRequest,
  respondToRequest,
  markSessionCompleted,
  listMessagesForSession,
  getMentorProfileById,
} from '@/lib/hs-nil/mentors';
import { sendSessionResponseToAthlete } from '@/lib/services/hs-nil/mentor-emails';

const patchSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'complete']),
    declinedReason: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
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
  const res = await getSessionRequest(requestId, user.id);
  if (!res.ok) {
    const status =
      res.code === 'not_found' ? 404 : res.code === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: res.error, code: res.code }, { status });
  }
  const messages = await listMessagesForSession(requestId, user.id);
  return NextResponse.json(
    { session: res.data, messages },
    { status: 200 }
  );
}

export async function PATCH(
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
    const v = validateInput(patchSchema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    if (v.data.action === 'complete') {
      const result = await markSessionCompleted(requestId, user.id);
      if (!result.ok) {
        const status =
          result.code === 'not_found'
            ? 404
            : result.code === 'forbidden'
              ? 403
              : result.code === 'conflict'
                ? 409
                : 400;
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status }
        );
      }
      return NextResponse.json({ ok: true, session: result.data }, { status: 200 });
    }

    // Accept / decline — mentor-only. Service layer enforces the role check.
    const decision = v.data.action === 'accept' ? 'accepted' : 'declined';
    const result = await respondToRequest({
      requestId,
      mentorUserId: user.id,
      decision,
      declinedReason: v.data.declinedReason ?? null,
    });
    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'forbidden'
            ? 403
            : result.code === 'conflict'
              ? 409
              : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    // Best-effort: email the athlete the outcome.
    void (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return;
        const sb = createServiceClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const [mentorProfile, { data: athleteAuth }, { data: mentorAuth }] =
          await Promise.all([
            getMentorProfileById(result.data.mentorProfileId),
            sb.auth.admin.getUserById(result.data.requesterUserId),
            sb.auth.admin.getUserById(result.data.mentorUserId),
          ]);
        const athleteEmail = athleteAuth?.user?.email;
        if (!athleteEmail) return;
        const athleteMeta = (athleteAuth.user?.user_metadata ?? {}) as {
          first_name?: string;
        };
        const mentorMeta = (mentorAuth?.user?.user_metadata ?? {}) as {
          first_name?: string;
        };
        await sendSessionResponseToAthlete({
          athleteEmail,
          athleteName: athleteMeta.first_name,
          mentorName:
            mentorMeta.first_name?.trim() ||
            mentorProfile?.collegeName ||
            'Your mentor',
          mentorCollege: mentorProfile?.collegeName ?? 'their college',
          sessionId: result.data.id,
          decision,
          declinedReason: v.data.declinedReason ?? null,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[hs/mentor-sessions] notify athlete failed', e);
      }
    })();

    return NextResponse.json({ ok: true, session: result.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/mentor-sessions PATCH]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
