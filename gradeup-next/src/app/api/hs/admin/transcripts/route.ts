/**
 * /api/hs/admin/transcripts
 *
 * Ops-facing endpoints for the Tier B transcript review queue.
 *   GET  — list pending submissions (+ signed view URL per row).
 *   POST — record a review decision on a single submission.
 *
 * Auth: requires an authenticated user whose `profiles.role === 'admin'`.
 *       Matches the pattern used elsewhere in the app
 *       (src/app/api/reports/[type]/route.ts, etc.).
 *
 * Feature-flag gated (FEATURE_HS_NIL).
 *
 * On approval we update hs_athlete_profiles (gpa, verification tier,
 * verified_at) and email the athlete. On reject/resubmit we email the
 * athlete with the ops-authored note. Email failures are soft — the
 * DB transition is the source of truth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  getSignedViewUrl,
  listPendingSubmissions,
  recordReviewDecision,
  type TranscriptSubmissionRow,
} from '@/lib/hs-nil/transcripts';
import {
  sendTranscriptApproved,
  sendTranscriptRejected,
} from '@/lib/services/hs-nil/emails';

// ---------------------------------------------------------------------------
// Auth helper — assert admin role. Returns `null` on success, a response on
// failure so callers can `return result ?? null`-style early-exit.
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Pattern mirrors src/app/api/reports/[type]/route.ts: look up `profiles.role`.
  // TODO(hs-nil): if we move to Supabase custom claims, swap this for a JWT
  // read to shave the extra RTT.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || profile.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// GET — list the pending queue. Each row includes a short-lived signed URL
// so the reviewer can click straight into the file without a second RPC.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const rateLimited = await enforceRateLimit(request, 'mutation', gate.userId);
    if (rateLimited) return rateLimited;

    const rows = await listPendingSubmissions(50);
    const withUrls = await Promise.all(
      rows.map(async (row: TranscriptSubmissionRow) => ({
        ...row,
        signed_view_url: await getSignedViewUrl(row.storage_path, 300),
      }))
    );

    return NextResponse.json({ ok: true, submissions: withUrls });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — record a review decision. Input is JSON, not multipart.
// ---------------------------------------------------------------------------

const reviewSchema = z
  .object({
    submissionId: z.string().uuid(),
    decision: z.enum(['approve', 'reject', 'request_resubmission']),
    approvedGpa: z
      .number()
      .min(0)
      .max(5)
      .optional(),
    reviewerNotes: z.string().max(2000).optional(),
    athleteVisibleNote: z.string().max(500).optional(),
  })
  .strict();

async function lookupAthleteEmail(
  athleteUserId: string
): Promise<{ email: string | null; firstName: string | null }> {
  // Uses the SSR (anon) client — profiles is readable under existing RLS for
  // the authenticated admin. If this ever fails we log + fall through; the
  // DB transition is authoritative.
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', athleteUserId)
    .maybeSingle();
  return {
    email: data?.email ?? null,
    firstName: data?.first_name ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const rateLimited = await enforceRateLimit(request, 'mutation', gate.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(reviewSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const input = validation.data;

    // Fetch athlete user id via the service-role decision recorder so we can
    // address the follow-up email correctly. The recorder looks up the
    // submission under the service role to avoid RLS surprises.
    const decision = await recordReviewDecision({
      submissionId: input.submissionId,
      reviewerUserId: gate.userId,
      decision: input.decision,
      approvedGpa: input.approvedGpa,
      reviewerNotes: input.reviewerNotes,
      athleteVisibleNote: input.athleteVisibleNote,
    });

    // Notify the athlete. Fail-soft — DB state is source of truth.
    try {
      // Re-read via anon client to grab email + name. The service-role
      // recorder returned only status fields to keep its contract tight.
      const supabase = await createClient();
      const { data: submission } = await supabase
        .from('transcript_submissions')
        .select('athlete_user_id, approved_gpa, athlete_visible_note')
        .eq('id', input.submissionId)
        .maybeSingle();

      if (submission?.athlete_user_id) {
        const athlete = await lookupAthleteEmail(submission.athlete_user_id);
        if (athlete.email) {
          if (decision.newStatus === 'approved' && submission.approved_gpa !== null) {
            await sendTranscriptApproved({
              athleteEmail: athlete.email,
              athleteName: athlete.firstName ?? undefined,
              approvedGpa: Number(submission.approved_gpa),
            });
          } else if (
            decision.newStatus === 'rejected' ||
            decision.newStatus === 'resubmission_requested'
          ) {
            await sendTranscriptRejected({
              athleteEmail: athlete.email,
              athleteName: athlete.firstName ?? undefined,
              athleteVisibleNote: submission.athlete_visible_note ?? undefined,
              resubmission: decision.newStatus === 'resubmission_requested',
            });
          }
        }
      }
    } catch (emailErr) {
      // eslint-disable-next-line no-console
      console.warn('[hs-nil transcript review] email send failed', {
        submissionId: input.submissionId,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    return NextResponse.json({
      ok: true,
      submissionId: decision.submissionId,
      status: decision.newStatus,
      profileUpdated: decision.profileUpdated,
      profileUpdateError: decision.profileUpdateError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil transcript review]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
