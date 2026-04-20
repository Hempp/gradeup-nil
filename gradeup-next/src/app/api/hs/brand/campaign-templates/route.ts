/**
 * /api/hs/brand/campaign-templates
 *
 * GET — list published templates. Public (no auth required) so the
 * anonymous marketing browse at /solutions/brands/templates can consume
 * it without a session.
 *
 * Query params:
 *   ?category=grand_opening
 *   ?deal_category=local_business
 *   ?target_sport=basketball
 *   ?limit=24
 *
 * Writes live at /api/hs/admin/campaign-templates — this route is
 * read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  listTemplates,
  type CampaignTemplateCategory,
  type CampaignTemplateDealCategory,
} from '@/lib/hs-nil/campaign-templates';

const CATEGORY_VALUES: ReadonlyArray<CampaignTemplateCategory> = [
  'grand_opening',
  'back_to_school',
  'summer_camp',
  'seasonal_promo',
  'product_launch',
  'athlete_spotlight',
  'community_event',
  'recurring_series',
];

const DEAL_CATEGORY_VALUES: ReadonlyArray<CampaignTemplateDealCategory> = [
  'apparel',
  'food_beverage',
  'local_business',
  'training',
  'autograph',
  'social_media_promo',
];

function parseCategory(raw: string | null): CampaignTemplateCategory | undefined {
  if (!raw) return undefined;
  return CATEGORY_VALUES.find((c) => c === raw);
}

function parseDealCategory(
  raw: string | null,
): CampaignTemplateDealCategory | undefined {
  if (!raw) return undefined;
  return DEAL_CATEGORY_VALUES.find((c) => c === raw);
}

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  let limit: number | undefined;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isFinite(n) && n > 0) limit = Math.min(n, 200);
  }

  const templates = await listTemplates({
    category: parseCategory(searchParams.get('category')),
    dealCategory: parseDealCategory(searchParams.get('deal_category')),
    targetSport: searchParams.get('target_sport') ?? undefined,
    limit,
  });

  return NextResponse.json(
    { templates },
    {
      headers: {
        // Cache at the edge for 5 minutes. Public marketing surface.
        'Cache-Control':
          'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
