/**
 * POST /api/hs/admin/actions/concierge-import/upload
 *
 * Admin-only. Accepts a multipart form with:
 *   - file: CSV of athlete+parent pairs (see
 *     docs/HS-NIL-CONCIERGE-IMPORT-GUIDE.md for the schema).
 *   - pilot_state_code: USPS code for the target pilot state.
 *   - notes: optional free-form description.
 *
 * Creates a concierge_import_batches row + one concierge_import_rows
 * per CSV line. Returns { batchId, rowCount, validCount, invalidCount }.
 *
 * Rate limiting: admin-role + 'mutation' preset (30/min/user).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import { createBatch } from '@/lib/hs-nil/concierge-import';

const MAX_CSV_BYTES = 1_048_576; // 1MB — plenty for the pilot (20 rows × ~200 bytes)

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

    // Parse multipart.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart form body.', code: 'invalid_body' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const pilotStateCode = String(formData.get('pilot_state_code') ?? '').trim().toUpperCase();
    const notes = (formData.get('notes') as string | null)?.trim() || null;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'file field is required.', code: 'invalid_body' },
        { status: 400 }
      );
    }
    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { error: `CSV exceeds max size (${MAX_CSV_BYTES} bytes).`, code: 'too_large' },
        { status: 413 }
      );
    }
    if (!pilotStateCode) {
      return NextResponse.json(
        { error: 'pilot_state_code is required.', code: 'invalid_body' },
        { status: 400 }
      );
    }
    if (!PILOT_STATES.includes(pilotStateCode as USPSStateCode)) {
      return NextResponse.json(
        {
          error: `pilot_state_code "${pilotStateCode}" is not a pilot state (${PILOT_STATES.join(', ')}).`,
          code: 'invalid_state',
        },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const filename =
      (file instanceof File && file.name) || `concierge-${Date.now()}.csv`;

    const result = await createBatch({
      actorUserId: user.id,
      filename,
      pilotStateCode,
      notes,
      csvText,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/concierge-import/upload]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
