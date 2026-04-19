/**
 * POST /api/hs/athlete/transition/proof
 *
 * Multipart upload of the athlete's enrollment proof into the private
 * `hs-enrollment-proofs` bucket. File constraints:
 *   - mime: application/pdf | image/png | image/jpeg
 *   - size: 1B .. 10MB
 * Validated server-side before upload. The transition row is only
 * updated with the storage path after the upload succeeds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  ALLOWED_ENROLLMENT_PROOF_MIME_TYPES,
  MAX_ENROLLMENT_PROOF_BYTES,
  submitTransitionProof,
  type EnrollmentProofMimeType,
} from '@/lib/hs-nil/transitions';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'upload', user.id);
    if (rateLimited) return rateLimited;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart/form-data body.' },
        { status: 400 }
      );
    }

    const transitionId = formData.get('transitionId');
    const file = formData.get('file');

    if (typeof transitionId !== 'string' || transitionId.length === 0) {
      return NextResponse.json(
        { error: 'transitionId required.' },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No enrollment proof file provided.' },
        { status: 400 }
      );
    }
    if (file.size <= 0 || file.size > MAX_ENROLLMENT_PROOF_BYTES) {
      return NextResponse.json(
        {
          error: `Enrollment proof must be between 1 byte and ${MAX_ENROLLMENT_PROOF_BYTES / (1024 * 1024)} MB.`,
        },
        { status: 400 }
      );
    }
    if (
      !ALLOWED_ENROLLMENT_PROOF_MIME_TYPES.includes(
        file.type as EnrollmentProofMimeType
      )
    ) {
      return NextResponse.json(
        {
          error: `Unsupported format. Allowed: ${ALLOWED_ENROLLMENT_PROOF_MIME_TYPES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await submitTransitionProof({
      transitionId,
      athleteUserId: user.id,
      file: buffer,
      originalFilename: file.name || 'enrollment-proof',
      mimeType: file.type as EnrollmentProofMimeType,
      fileSizeBytes: file.size,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        {
          status:
            result.code === 'not_found'
              ? 404
              : result.code === 'storage_error'
                ? 502
                : 400,
        }
      );
    }

    return NextResponse.json(
      { ok: true, storagePath: result.data.storagePath },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-athlete/transition/proof]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
