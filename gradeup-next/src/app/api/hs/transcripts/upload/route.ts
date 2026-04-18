/**
 * POST /api/hs/transcripts/upload
 *
 * Authenticated HS athlete endpoint. Accepts a multipart form with the
 * transcript file (PDF/PNG/JPG, ≤10MB) plus the athlete's claimed GPA.
 * Uploads to the private `hs-transcripts` Supabase Storage bucket and
 * records a `transcript_submissions` row with status='pending_review'.
 *
 * Security:
 *   - Feature-flag gated (FEATURE_HS_NIL).
 *   - Authenticated Supabase session required.
 *   - Rate limited ('upload' preset: 20/min per user).
 *   - File size + mime type validated server-side — client claims are
 *     never trusted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  ALLOWED_TRANSCRIPT_MIME_TYPES,
  MAX_TRANSCRIPT_BYTES,
  createSubmission,
  type TranscriptMimeType,
} from '@/lib/hs-nil/transcripts';

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'upload', user.id);
    if (rateLimited) return rateLimited;

    // Multipart parse. NextRequest.formData() throws on non-multipart bodies;
    // catch so we return a clean 400 instead of a 500.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart/form-data body.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const claimedGpaRaw = formData.get('claimed_gpa');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No transcript file provided.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_TRANSCRIPT_BYTES) {
      return NextResponse.json(
        {
          error: `Transcript must be between 1 byte and ${MAX_TRANSCRIPT_BYTES / (1024 * 1024)} MB.`,
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TRANSCRIPT_MIME_TYPES.includes(file.type as TranscriptMimeType)
    ) {
      return NextResponse.json(
        {
          error: `Unsupported transcript format. Allowed: ${ALLOWED_TRANSCRIPT_MIME_TYPES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const claimedGpa = Number(claimedGpaRaw);
    if (!Number.isFinite(claimedGpa) || claimedGpa < 0 || claimedGpa > 5) {
      return NextResponse.json(
        { error: 'claimed_gpa must be a number between 0 and 5.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const submission = await createSubmission({
      athleteUserId: user.id,
      file: buffer,
      originalFilename: file.name || 'transcript',
      mimeType: file.type as TranscriptMimeType,
      fileSizeBytes: file.size,
      claimedGpa,
    });

    return NextResponse.json(
      {
        ok: true,
        submissionId: submission.submissionId,
        status: submission.status,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil transcript upload]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
