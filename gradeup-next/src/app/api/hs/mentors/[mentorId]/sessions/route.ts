/**
 * POST /api/hs/mentors/[mentorId]/sessions
 *
 * Athlete-facing: open a new session request with this mentor. Service layer
 * validates that the mentor accepts the requested format and is not paused.
 * Fires a best-effort notification email to the mentor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  requestSession,
  getMentorProfileById,
  type MentorSessionFormat,
} from '@/lib/hs-nil/mentors';
import { sendSessionRequestedToMentor } from '@/lib/services/hs-nil/mentor-emails';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const schema = z
  .object({
    topic: z.string().trim().min(1).max(200),
    format: z.enum(['message', 'video_call']),
    athleteNote: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ mentorId: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { mentorId } = await context.params;
    if (!mentorId) {
      return NextResponse.json({ error: 'Missing mentorId' }, { status: 400 });
    }

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

    const result = await requestSession({
      requesterUserId: user.id,
      mentorProfileId: mentorId,
      topic: v.data.topic,
      format: v.data.format as MentorSessionFormat,
      athleteNote: v.data.athleteNote ?? null,
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

    // Best-effort mentor notification. Pull athlete profile context for
    // the email copy; if it fails we still return success to the caller.
    void (async () => {
      try {
        const mentor = await getMentorProfileById(mentorId);
        if (!mentor) return;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return;
        const sb = createServiceClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const [{ data: athleteProfile }, { data: mentorAuth }] = await Promise.all([
          sb
            .from('hs_athlete_profiles')
            .select('sport, school_name, state_code')
            .eq('user_id', user.id)
            .maybeSingle<{
              sport: string | null;
              school_name: string | null;
              state_code: string | null;
            }>(),
          sb.auth.admin.getUserById(mentor.userId),
        ]);
        const mentorEmail = mentorAuth?.user?.email;
        if (!mentorEmail) return;
        const mentorMeta = (mentorAuth.user?.user_metadata ?? {}) as {
          first_name?: string;
        };
        const athleteMeta = (user.user_metadata ?? {}) as { first_name?: string };
        await sendSessionRequestedToMentor({
          mentorEmail,
          mentorName: mentorMeta.first_name,
          athleteFirstName:
            athleteMeta.first_name?.trim() || 'A GradeUp athlete',
          athleteSchool: athleteProfile?.school_name ?? null,
          athleteSport: athleteProfile?.sport ?? null,
          athleteState: athleteProfile?.state_code ?? null,
          requestedTopic: v.data.topic,
          requestedFormat: v.data.format as MentorSessionFormat,
          sessionId: result.data.id,
          athleteNote: v.data.athleteNote ?? null,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[hs/mentors/sessions] notify mentor failed', e);
      }
    })();

    return NextResponse.json(
      { ok: true, sessionRequest: result.data },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/mentors/sessions POST]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
