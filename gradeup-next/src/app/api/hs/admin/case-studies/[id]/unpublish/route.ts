/**
 * POST /api/hs/admin/case-studies/[id]/unpublish
 *
 * Reverts a case study to draft. Admin-gated. Reason is accepted and
 * forwarded to the service for parity with other unpublish flows; it
 * is not currently persisted on the case-study row itself.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { unpublishCaseStudy } from '@/lib/hs-nil/case-studies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const schema = z
  .object({
    reason: z.string().max(2000).optional(),
  })
  .strict();

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const body = await request.json().catch(() => ({}));
  const v = validateInput(schema, body ?? {});
  if (!v.success) {
    return NextResponse.json(
      { error: formatValidationError(v.errors), code: 'invalid_body' },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await unpublishCaseStudy(id, v.data.reason);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.code === 'not_found' ? 404 : 400 },
    );
  }
  return NextResponse.json({ ok: true, id: result.id, slug: result.slug });
}
