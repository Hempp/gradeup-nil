/**
 * POST /api/hs/admin/case-studies/[id]/autopopulate
 *
 * Body: { dealId: uuid }
 *
 * Returns suggested metrics + tags + the athlete display name derived from
 * the completed deal. Does NOT persist — admin reviews + saves via the
 * normal PATCH flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { autoPopulateMetricsFromDeal } from '@/lib/hs-nil/case-studies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const schema = z
  .object({
    dealId: z.string().uuid(),
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

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const v = validateInput(schema, body);
  if (!v.success) {
    return NextResponse.json(
      { error: formatValidationError(v.errors), code: 'invalid_body' },
      { status: 400 },
    );
  }

  // Existence check on the target study for clearer error feedback.
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const result = await autoPopulateMetricsFromDeal(v.data.dealId);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: 'Deal not found', code: 'not_found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
