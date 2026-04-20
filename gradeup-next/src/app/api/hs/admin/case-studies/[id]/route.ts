/**
 * /api/hs/admin/case-studies/[id]
 *
 * GET    — fetch full detail (drafts + published) for the admin UI.
 * PATCH  — partial update including metrics + quotes replacement.
 * DELETE — permanent delete.
 *
 * Admin-gated. FEATURE_HS_NIL-gated. Rate-limited on mutations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  getCaseStudyByIdAdmin,
  updateCaseStudy,
  deleteCaseStudy,
} from '@/lib/hs-nil/case-studies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function requireAdmin(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  if (request.method !== 'GET') {
    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return { error: rateLimited };
  }
  return { userId: user.id };
}

const metricSchema = z.object({
  metricLabel: z.string().min(1).max(120),
  metricValue: z.string().min(1).max(60),
  metricHint: z.string().max(400).nullable().optional(),
  displayOrder: z.number().int().min(0).max(10000),
});

const quoteSchema = z.object({
  quoteBody: z.string().min(1).max(2000),
  attributedRole: z.enum([
    'athlete',
    'parent',
    'brand_marketer',
    'athletic_director',
    'other',
  ]),
  attributedName: z.string().min(1).max(160),
  displayOrder: z.number().int().min(0).max(10000),
});

const patchSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .min(3)
      .max(120)
      .optional(),
    title: z.string().min(1).max(200).optional(),
    subtitle: z.string().max(300).nullable().optional(),
    heroImageUrl: z.string().url().max(1024).nullable().optional(),
    bodyMarkdown: z.string().max(60000).optional(),
    dealId: z.string().uuid().nullable().optional(),
    brandId: z.string().uuid().nullable().optional(),
    athleteUserId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(12).optional(),
    featuredOrder: z.number().int().min(0).max(10000).nullable().optional(),
    metrics: z.array(metricSchema).max(12).optional(),
    quotes: z.array(quoteSchema).max(12).optional(),
  })
  .strict();

export async function GET(request: NextRequest, { params }: RouteContext) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;
  const { id } = await params;
  const study = await getCaseStudyByIdAdmin(id);
  if (!study) {
    return NextResponse.json(
      { ok: false, error: 'Not found' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, study });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const v = validateInput(patchSchema, body);
  if (!v.success) {
    return NextResponse.json(
      { error: formatValidationError(v.errors), code: 'invalid_body' },
      { status: 400 },
    );
  }
  const result = await updateCaseStudy(id, v.data);
  if (!result.ok) {
    const status = result.code === 'slug_conflict' ? 409 : 400;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true, id: result.id });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;
  const { id } = await params;
  const result = await deleteCaseStudy(id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
