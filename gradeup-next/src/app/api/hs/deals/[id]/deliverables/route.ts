/**
 * /api/hs/deals/[id]/deliverables
 *
 * POST — athlete submits proof of deliverable (social URL, image
 * proof, external link, receipt, or text note).
 *
 * GET  — list all submissions for the deal in reverse-chronological
 *         order; allowed for the athlete or brand on the deal.
 *
 * Authentication:
 *   - Authenticated Supabase session required.
 *   - POST: caller must be the athlete on the deal.
 *   - GET : caller must be the athlete OR the brand on the deal.
 *
 * Feature flag: FEATURE_HS_NIL gates the whole route; 404 when off.
 *
 * Rate limit:
 *   - POST → 'upload' preset (20/min/user).
 *   - GET  → 'mutation' preset (30/min/user). Reads stay cheap but we
 *     still cap to avoid polling abuse by browser dev tools or test
 *     harnesses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  ALLOWED_DELIVERABLE_MIME_TYPES,
  ALLOWED_SUBMIT_DEAL_STATES,
  MAX_DELIVERABLE_BYTES,
  type DeliverableMimeType,
  type DeliverablePlatform,
  type DeliverableSubmissionType,
  getSignedDeliverableUrl,
  listSubmissionsForDeal,
  submitDeliverable,
  summarizeSubmission,
  transitionDealToInReview,
} from '@/lib/hs-nil/deliverables';
import { sendDeliverableSubmittedToBrand } from '@/lib/services/hs-nil/deliverable-emails';

// ---------------------------------------------------------------------------
// Shared: resolve deal + caller role
// ---------------------------------------------------------------------------

type DealRole = 'athlete' | 'brand';

interface DealRow {
  id: string;
  status: string;
  title: string;
  athlete: { id: string; profile_id: string } | null;
  brand: { id: string; profile_id: string } | null;
}

async function loadDealAndRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
  userId: string
): Promise<{ deal: DealRow; role: DealRole } | null> {
  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, status, title,
       athlete:athletes!inner(id, profile_id),
       brand:brands!inner(id, profile_id)`
    )
    .eq('id', dealId)
    .maybeSingle<DealRow>();

  if (error || !data) return null;

  if (data.athlete?.profile_id === userId) return { deal: data, role: 'athlete' };
  if (data.brand?.profile_id === userId) return { deal: data, role: 'brand' };
  return null;
}

// ---------------------------------------------------------------------------
// POST validation
// ---------------------------------------------------------------------------

const SUBMISSION_TYPES = [
  'social_post_url',
  'image_proof',
  'text_note',
  'external_link',
  'receipt',
] as const satisfies readonly DeliverableSubmissionType[];

const PLATFORMS = [
  'instagram',
  'tiktok',
  'twitter_x',
  'linkedin',
  'facebook',
  'youtube',
  'other',
] as const satisfies readonly DeliverablePlatform[];

const jsonSubmitSchema = z
  .object({
    submissionType: z.enum(SUBMISSION_TYPES),
    contentUrl: z.string().url().max(2048).optional().nullable(),
    note: z.string().trim().min(1).max(4000).optional().nullable(),
    platform: z.enum(PLATFORMS).optional().nullable(),
  })
  .refine(
    (d) => {
      if (d.submissionType === 'text_note') return Boolean(d.note);
      if (d.submissionType === 'social_post_url' || d.submissionType === 'external_link') {
        return Boolean(d.contentUrl);
      }
      if (d.submissionType === 'receipt') {
        // JSON mode of receipt = URL. File mode uses multipart.
        return Boolean(d.contentUrl);
      }
      // image_proof should come through multipart, not JSON.
      return false;
    },
    { message: 'Required payload missing for submission type.' }
  );

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: dealId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'upload', user.id);
    if (rateLimited) return rateLimited;

    const resolved = await loadDealAndRole(supabase, dealId, user.id);
    if (!resolved || resolved.role !== 'athlete') {
      // Don't leak deal existence to non-parties.
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { deal } = resolved;

    const allowedStates: readonly string[] = ALLOWED_SUBMIT_DEAL_STATES;
    if (!allowedStates.includes(deal.status)) {
      return NextResponse.json(
        {
          error:
            'Deliverables cannot be submitted at this stage.',
          dealStatus: deal.status,
        },
        { status: 409 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let submissionType: DeliverableSubmissionType;
    let contentUrl: string | null = null;
    let note: string | null = null;
    let platform: DeliverablePlatform | null = null;
    let fileBuffer: Buffer | null = null;
    let fileOriginalName: string | null = null;
    let fileMimeType: DeliverableMimeType | null = null;
    let fileSizeBytes: number | null = null;

    if (isMultipart) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json(
          { error: 'Expected multipart/form-data body.' },
          { status: 400 }
        );
      }

      const rawType = String(form.get('submissionType') || '');
      if (!SUBMISSION_TYPES.includes(rawType as DeliverableSubmissionType)) {
        return NextResponse.json(
          { error: 'Invalid submissionType.' },
          { status: 400 }
        );
      }
      submissionType = rawType as DeliverableSubmissionType;

      if (submissionType !== 'image_proof' && submissionType !== 'receipt') {
        return NextResponse.json(
          { error: 'multipart is only for image_proof or receipt file uploads.' },
          { status: 400 }
        );
      }

      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'No file provided.' },
          { status: 400 }
        );
      }
      if (file.size <= 0 || file.size > MAX_DELIVERABLE_BYTES) {
        return NextResponse.json(
          {
            error: `File must be between 1 byte and ${MAX_DELIVERABLE_BYTES / (1024 * 1024)} MB.`,
          },
          { status: 400 }
        );
      }
      if (
        !ALLOWED_DELIVERABLE_MIME_TYPES.includes(file.type as DeliverableMimeType)
      ) {
        return NextResponse.json(
          {
            error: `Unsupported format. Allowed: ${ALLOWED_DELIVERABLE_MIME_TYPES.join(', ')}.`,
          },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileOriginalName = file.name || 'proof';
      fileMimeType = file.type as DeliverableMimeType;
      fileSizeBytes = file.size;

      const noteRaw = form.get('note');
      if (typeof noteRaw === 'string' && noteRaw.trim().length > 0) {
        note = noteRaw.trim().slice(0, 4000);
      }
    } else {
      let json: unknown;
      try {
        json = await request.json();
      } catch {
        return NextResponse.json(
          { error: 'Expected application/json body.' },
          { status: 400 }
        );
      }

      const parsed = jsonSubmitSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid payload.',
            issues: parsed.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
          { status: 400 }
        );
      }

      submissionType = parsed.data.submissionType;
      contentUrl = parsed.data.contentUrl ?? null;
      note = parsed.data.note ?? null;
      platform = parsed.data.platform ?? null;

      if (submissionType === 'image_proof') {
        return NextResponse.json(
          { error: 'image_proof requires multipart/form-data upload.' },
          { status: 400 }
        );
      }
    }

    // Submit.
    const result = await submitDeliverable({
      dealId: deal.id,
      athleteUserId: user.id,
      submissionType,
      contentUrl,
      note,
      platform,
      file: fileBuffer,
      fileOriginalName,
      fileMimeType,
      fileSizeBytes,
    });

    // Best-effort: flip the deal to in_review if it's not there yet.
    await transitionDealToInReview(deal.id).catch(() => undefined);

    // Best-effort: email the brand.
    try {
      if (deal.brand?.profile_id) {
        const { data: brandProfile } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', deal.brand.profile_id)
          .maybeSingle<{ email: string | null; first_name: string | null }>();

        const { data: athleteProfile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .maybeSingle<{ first_name: string | null }>();

        if (brandProfile?.email) {
          const summary = summarizeSubmission({
            id: result.submissionId,
            deal_id: deal.id,
            submitted_by: user.id,
            submission_type: submissionType,
            content_url: contentUrl,
            storage_path: result.storagePath,
            note,
            platform,
            status: 'submitted',
            review_notes: null,
            created_at: new Date().toISOString(),
          });
          const appUrl = (
            process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
            'https://gradeupnil.com'
          );
          const reviewUrl = `${appUrl}/hs/brand/deals/${deal.id}`;
          await sendDeliverableSubmittedToBrand({
            brandEmail: brandProfile.email,
            athleteFirstName: athleteProfile?.first_name ?? 'Your athlete',
            dealTitle: deal.title,
            submissionSummary: summary,
            reviewUrl,
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs/deals/:id/deliverables] brand email failed', err);
    }

    return NextResponse.json(
      {
        ok: true,
        submissionId: result.submissionId,
        status: result.status,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs/deals/:id/deliverables POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: dealId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const resolved = await loadDealAndRole(supabase, dealId, user.id);
    if (!resolved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rows = await listSubmissionsForDeal(resolved.deal.id);

    // Attach short-lived signed URLs for image_proof submissions.
    const enriched = await Promise.all(
      rows.map(async (row) => {
        let signedUrl: string | null = null;
        if (row.storage_path) {
          signedUrl = await getSignedDeliverableUrl(row.storage_path, 300);
        }
        return { ...row, signedUrl };
      })
    );

    return NextResponse.json({ ok: true, submissions: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs/deals/:id/deliverables GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
