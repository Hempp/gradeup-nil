/**
 * /api/hs/admin/case-studies
 *
 * GET  — list all (drafts + published) for the admin dashboard.
 * POST — create a new case study (draft).
 *
 * Auth: profiles.role === 'admin'. 404 otherwise.
 * Feature-flag: FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset on POST.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  listAllCaseStudiesAdmin,
  createCaseStudy,
} from '@/lib/hs-nil/case-studies';

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
  // Rate limit mutation requests only.
  if (request.method !== 'GET') {
    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return { error: rateLimited };
  }
  return { userId: user.id };
}

const createSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(3).max(120),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(300).nullable().optional(),
    heroImageUrl: z.string().url().max(1024).nullable().optional(),
    bodyMarkdown: z.string().max(60000).optional(),
    dealId: z.string().uuid().nullable().optional(),
    brandId: z.string().uuid().nullable().optional(),
    athleteUserId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(12).optional(),
    featuredOrder: z.number().int().min(0).max(10000).nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;
  const studies = await listAllCaseStudiesAdmin();
  return NextResponse.json({ ok: true, studies });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const v = validateInput(createSchema, body);
  if (!v.success) {
    return NextResponse.json(
      { error: formatValidationError(v.errors), code: 'invalid_body' },
      { status: 400 },
    );
  }
  const result = await createCaseStudy({
    ...v.data,
    authorUserId: gate.userId,
  });
  if (!result.ok) {
    const status = result.code === 'slug_conflict' ? 409 : 400;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json(
    { ok: true, id: result.id, slug: result.slug },
    { status: 201 },
  );
}
