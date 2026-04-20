/**
 * /api/hs/admin/campaign-templates/[id]
 *
 * PATCH  — update a template (including publish/unpublish toggle).
 * DELETE — remove a template (campaign_template_uses rows cascade).
 *
 * Auth: profiles.role === 'admin'. 404 otherwise.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  updateTemplate,
  deleteTemplate,
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
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return { error: rateLimited };
  return { userId: user.id };
}

const patchSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .min(3)
      .max(120)
      .optional(),
    title: z.string().min(1).max(200).optional(),
    category: z
      .enum([
        'grand_opening',
        'back_to_school',
        'summer_camp',
        'seasonal_promo',
        'product_launch',
        'athlete_spotlight',
        'community_event',
        'recurring_series',
      ])
      .optional(),
    description: z.string().max(5000).optional(),
    dealCategory: z
      .enum([
        'apparel',
        'food_beverage',
        'local_business',
        'training',
        'autograph',
        'social_media_promo',
      ])
      .optional(),
    suggestedCompensationCents: z
      .number()
      .int()
      .min(0)
      .max(100_000_000)
      .optional(),
    suggestedDurationDays: z.number().int().min(1).max(365).optional(),
    deliverablesTemplate: z.string().max(5000).optional(),
    targetSports: z.array(z.string().min(1).max(40)).max(40).optional(),
    targetGradYears: z
      .array(z.number().int().min(2024).max(2040))
      .max(10)
      .optional(),
    heroImageUrl: z.string().url().max(1024).nullable().optional(),
    published: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const result = await updateTemplate(id, {
    ...(p.slug !== undefined ? { slug: p.slug } : {}),
    ...(p.title !== undefined ? { title: p.title } : {}),
    ...(p.category !== undefined
      ? { category: p.category as CampaignTemplateCategory }
      : {}),
    ...(p.description !== undefined ? { description: p.description } : {}),
    ...(p.dealCategory !== undefined
      ? { dealCategory: p.dealCategory as CampaignTemplateDealCategory }
      : {}),
    ...(p.suggestedCompensationCents !== undefined
      ? { suggestedCompensationCents: p.suggestedCompensationCents }
      : {}),
    ...(p.suggestedDurationDays !== undefined
      ? { suggestedDurationDays: p.suggestedDurationDays }
      : {}),
    ...(p.deliverablesTemplate !== undefined
      ? { deliverablesTemplate: p.deliverablesTemplate }
      : {}),
    ...(p.targetSports !== undefined ? { targetSports: p.targetSports } : {}),
    ...(p.targetGradYears !== undefined
      ? { targetGradYears: p.targetGradYears }
      : {}),
    ...(p.heroImageUrl !== undefined ? { heroImageUrl: p.heroImageUrl } : {}),
    ...(p.published !== undefined ? { published: p.published } : {}),
    ...(p.displayOrder !== undefined ? { displayOrder: p.displayOrder } : {}),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const gate = await requireAdmin(request);
  if ('error' in gate) return gate.error;

  const result = await deleteTemplate(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
