/**
 * /api/hs/admin/campaign-templates
 *
 * GET  — list all (published + unpublished) templates for the admin UI.
 * POST — create a new template.
 *
 * Auth: profiles.role === 'admin'. 404 otherwise (do not leak admin
 * routes to unauthenticated traffic).
 * Feature-flag: FEATURE_HS_NIL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  createTemplate,
  listAllTemplatesAdmin,
  type CampaignTemplateCategory,
  type CampaignTemplateDealCategory,
} from '@/lib/hs-nil/campaign-templates';

async function requireAdmin(
  request: NextRequest,
): Promise<{ userId: string } | { error: NextResponse }> {
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

const createSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .min(3)
      .max(120),
    title: z.string().min(1).max(200),
    category: z.enum([
      'grand_opening',
      'back_to_school',
      'summer_camp',
      'seasonal_promo',
      'product_launch',
      'athlete_spotlight',
      'community_event',
      'recurring_series',
    ]),
    description: z.string().max(5000).default(''),
    dealCategory: z.enum([
      'apparel',
      'food_beverage',
      'local_business',
      'training',
      'autograph',
      'social_media_promo',
    ]),
    suggestedCompensationCents: z.number().int().min(0).max(100_000_000),
    suggestedDurationDays: z.number().int().min(1).max(365),
    deliverablesTemplate: z.string().max(5000).default(''),
    targetSports: z.array(z.string().min(1).max(40)).max(40).optional(),
    targetGradYears: z.array(z.number().int().min(2024).max(2040)).max(10).optional(),
    heroImageUrl: z.string().url().max(1024).nullable().optional(),
    published: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;
  const templates = await listAllTemplatesAdmin();
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const result = await createTemplate({
    slug: p.slug,
    title: p.title,
    category: p.category as CampaignTemplateCategory,
    description: p.description,
    dealCategory: p.dealCategory as CampaignTemplateDealCategory,
    suggestedCompensationCents: p.suggestedCompensationCents,
    suggestedDurationDays: p.suggestedDurationDays,
    deliverablesTemplate: p.deliverablesTemplate,
    targetSports: p.targetSports,
    targetGradYears: p.targetGradYears,
    heroImageUrl: p.heroImageUrl ?? null,
    published: p.published,
    displayOrder: p.displayOrder,
  });
  if (!result.ok) {
    const status = result.code === 'slug_conflict' ? 409 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json(
    { id: result.id, slug: result.slug },
    { status: 201 },
  );
}
