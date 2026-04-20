/**
 * GET /api/hs/admin/actions/concierge-import/preview?batchId=<uuid>
 *
 * Admin-only read. Returns the full batch preview (batch envelope +
 * every row with validation status and — if already applied — apply
 * status). Used by the batch detail page and polled after apply.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { previewImport } from '@/lib/hs-nil/concierge-import';

export async function GET(request: NextRequest) {
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

    const batchId = new URL(request.url).searchParams.get('batchId');
    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId query param is required.', code: 'invalid_body' },
        { status: 400 }
      );
    }

    const preview = await previewImport(batchId);
    if (!preview) {
      return NextResponse.json(
        { error: 'Batch not found.', code: 'not_found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/concierge-import/preview]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
