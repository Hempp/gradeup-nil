/**
 * HS-NIL Campaign Templates Service
 * ----------------------------------------------------------------------------
 * Pre-built campaign briefs brands clone into their campaign-create form.
 * A template is NOT a campaign — cloning produces a `CampaignTemplateClone`
 * payload that pre-fills CampaignCreateForm; the brand still submits via the
 * normal createCampaign() path so every existing gate (state-rule pre-eval,
 * consent-scope mapping, parental-consent surfacing) still runs.
 *
 * Public entrypoints:
 *
 *   listTemplates(filters?)
 *     Anon-safe read of published templates. Filters: category, deal_category,
 *     target_sport. Ordered by display_order ASC, created_at ASC.
 *
 *   getTemplateBySlug(slug)
 *     Anon-safe single-template fetch.
 *
 *   cloneTemplate({ templateId, brandId })
 *     Loads the template, logs a campaign_template_uses row, returns a
 *     CampaignTemplateClone draft the caller passes to CampaignCreateForm
 *     as initialTemplate. Does NOT create the campaign.
 *
 *   linkCloneToCampaign({ brandId, templateSlug, campaignId })
 *     Back-fills the most recent not-yet-linked clone for this brand + slug
 *     with the campaign that was ultimately posted. Called from the
 *     campaign-create POST path so the funnel closes.
 *
 *   getTemplateUsageStats()
 *     Admin-only. Returns per-template clone count + count-of-converted
 *     (clones with cloned_into_campaign_id IS NOT NULL).
 *
 * Clone logging design:
 *   Every clone inserts a row with cloned_into_campaign_id=NULL. When the
 *   brand actually submits the pre-filled form, the server POST handler at
 *   /api/hs/brand/campaigns calls linkCloneToCampaign() on the matching
 *   template slug to close the loop. Rows that stay NULL for weeks signal
 *   copy that fails to convert.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignTemplateCategory =
  | 'grand_opening'
  | 'back_to_school'
  | 'summer_camp'
  | 'seasonal_promo'
  | 'product_launch'
  | 'athlete_spotlight'
  | 'community_event'
  | 'recurring_series';

export type CampaignTemplateDealCategory =
  | 'apparel'
  | 'food_beverage'
  | 'local_business'
  | 'training'
  | 'autograph'
  | 'social_media_promo';

export interface CampaignTemplate {
  id: string;
  slug: string;
  title: string;
  category: CampaignTemplateCategory;
  description: string;
  dealCategory: CampaignTemplateDealCategory;
  suggestedCompensationCents: number;
  suggestedDurationDays: number;
  deliverablesTemplate: string;
  targetSports: string[];
  targetGradYears: number[];
  heroImageUrl: string | null;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  category?: CampaignTemplateCategory;
  dealCategory?: CampaignTemplateDealCategory;
  targetSport?: string;
  limit?: number;
}

/**
 * Payload CampaignCreateForm consumes as `initialTemplate`. Shape matches
 * the form's internal state keys so the form can spread it into its
 * useState initializer without mapping fields.
 */
export interface CampaignTemplateClone {
  templateSlug: string;
  templateTitle: string;
  title: string;
  description: string;
  dealCategory: CampaignTemplateDealCategory;
  suggestedCompensationDollars: string;
  deliverablesTemplate: string;
  timelineStart: string;
  timelineEnd: string;
}

export interface TemplateUsageStat {
  templateId: string;
  slug: string;
  title: string;
  cloneCount: number;
  convertedCount: number;
  conversionRate: number;
  lastCloneAt: string | null;
}

// ---------------------------------------------------------------------------
// Supabase client plumbing
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil/campaign-templates] service role not configured.',
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  slug: string;
  title: string;
  category: CampaignTemplateCategory;
  description: string;
  deal_category: CampaignTemplateDealCategory;
  suggested_compensation_cents: number;
  suggested_duration_days: number;
  deliverables_template: string;
  target_sports: string[] | null;
  target_grad_years: number[] | null;
  hero_image_url: string | null;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TemplateRow): CampaignTemplate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    description: row.description,
    dealCategory: row.deal_category,
    suggestedCompensationCents: row.suggested_compensation_cents,
    suggestedDurationDays: row.suggested_duration_days,
    deliverablesTemplate: row.deliverables_template,
    targetSports: row.target_sports ?? [],
    targetGradYears: row.target_grad_years ?? [],
    heroImageUrl: row.hero_image_url,
    published: row.published,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------

export async function listTemplates(
  filters: TemplateFilters = {},
  sbOverride?: SupabaseClient,
): Promise<CampaignTemplate[]> {
  // listTemplates is called from a PUBLIC marketing page that may be
  // prerendered in environments without SUPABASE_SERVICE_ROLE_KEY. Degrade
  // gracefully to [] rather than crash the build.
  let sb: SupabaseClient;
  try {
    sb = sbOverride ?? getServiceRoleClient();
  } catch {
    return [];
  }

  let query = sb
    .from('campaign_templates')
    .select('*')
    .eq('published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(filters.limit ?? 100, 200)));

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.dealCategory) {
    query = query.eq('deal_category', filters.dealCategory);
  }
  if (filters.targetSport) {
    query = query.contains('target_sports', [filters.targetSport]);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as TemplateRow[]).map(mapRow);
}

// ---------------------------------------------------------------------------
// getTemplateBySlug
// ---------------------------------------------------------------------------

export async function getTemplateBySlug(
  slug: string,
  sbOverride?: SupabaseClient,
): Promise<CampaignTemplate | null> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { data, error } = await sb
    .from('campaign_templates')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as TemplateRow);
}

// ---------------------------------------------------------------------------
// Admin read (includes unpublished)
// ---------------------------------------------------------------------------

export async function listAllTemplatesAdmin(): Promise<CampaignTemplate[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('campaign_templates')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as TemplateRow[]).map(mapRow);
}

export async function getTemplateByIdAdmin(
  id: string,
): Promise<CampaignTemplate | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('campaign_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as TemplateRow);
}

// ---------------------------------------------------------------------------
// cloneTemplate
// ---------------------------------------------------------------------------

/**
 * Loads the template, logs a clone, and returns the CampaignCreateForm
 * pre-fill payload. Does NOT create a campaign — the brand still has to
 * post the form so createCampaign() can run its state-rule pre-eval and
 * consent-scope mapping with live state_rules data.
 */
export async function cloneTemplate(
  input: { templateId?: string; templateSlug?: string; brandId: string },
  sbOverride?: SupabaseClient,
): Promise<
  | { ok: true; template: CampaignTemplate; clone: CampaignTemplateClone }
  | { ok: false; error: string }
> {
  const sb = sbOverride ?? getServiceRoleClient();

  let template: CampaignTemplate | null = null;
  if (input.templateId) {
    template = await getTemplateByIdAdmin(input.templateId);
  } else if (input.templateSlug) {
    template = await getTemplateBySlug(input.templateSlug, sb);
  }
  if (!template) {
    return { ok: false, error: 'Template not found.' };
  }
  if (!template.published) {
    return { ok: false, error: 'Template is not available.' };
  }

  // Fire-and-forget clone logging. A failure should not block the brand
  // from actually using the template — we log the warning server-side.
  try {
    await sb.from('campaign_template_uses').insert({
      template_id: template.id,
      brand_id: input.brandId,
      cloned_at: new Date().toISOString(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaign-templates] clone log failed', err);
  }

  // Build timeline suggestions anchored on today. Brand edits before submit.
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + template.suggestedDurationDays);

  const clone: CampaignTemplateClone = {
    templateSlug: template.slug,
    templateTitle: template.title,
    title: template.title,
    description: template.description,
    dealCategory: template.dealCategory,
    suggestedCompensationDollars: String(
      Math.round(template.suggestedCompensationCents / 100),
    ),
    deliverablesTemplate: template.deliverablesTemplate,
    timelineStart: toISODate(today),
    timelineEnd: toISODate(end),
  };

  return { ok: true, template, clone };
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// linkCloneToCampaign — back-fill when a brand actually posts
// ---------------------------------------------------------------------------

/**
 * Finds the most recent unlinked clone for this brand + template slug and
 * back-fills cloned_into_campaign_id. Called by the campaign-create POST
 * path after a successful createCampaign() when the request indicated a
 * template_slug.
 */
export async function linkCloneToCampaign(
  input: { brandId: string; templateSlug: string; campaignId: string },
  sbOverride?: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: tpl } = await sb
    .from('campaign_templates')
    .select('id')
    .eq('slug', input.templateSlug)
    .maybeSingle<{ id: string }>();
  if (!tpl) return { ok: false, error: 'Template not found.' };

  // Take the most recent unlinked clone for this brand + template.
  const { data: latest } = await sb
    .from('campaign_template_uses')
    .select('id')
    .eq('template_id', tpl.id)
    .eq('brand_id', input.brandId)
    .is('cloned_into_campaign_id', null)
    .order('cloned_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!latest) return { ok: true }; // No clone on record — nothing to link.

  const { error } = await sb
    .from('campaign_template_uses')
    .update({ cloned_into_campaign_id: input.campaignId })
    .eq('id', latest.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// getTemplateUsageStats — admin analytics
// ---------------------------------------------------------------------------

export async function getTemplateUsageStats(): Promise<TemplateUsageStat[]> {
  const sb = getServiceRoleClient();

  const { data: templates } = await sb
    .from('campaign_templates')
    .select('id, slug, title, display_order, created_at')
    .order('display_order', { ascending: true });
  if (!templates) return [];

  const { data: uses } = await sb
    .from('campaign_template_uses')
    .select('template_id, cloned_into_campaign_id, cloned_at');
  const useRows =
    (uses as Array<{
      template_id: string;
      cloned_into_campaign_id: string | null;
      cloned_at: string;
    }> | null) ?? [];

  const byTemplate = new Map<
    string,
    { clones: number; converted: number; lastCloneAt: string | null }
  >();
  for (const r of useRows) {
    const cur = byTemplate.get(r.template_id) ?? {
      clones: 0,
      converted: 0,
      lastCloneAt: null,
    };
    cur.clones += 1;
    if (r.cloned_into_campaign_id) cur.converted += 1;
    if (!cur.lastCloneAt || r.cloned_at > cur.lastCloneAt) {
      cur.lastCloneAt = r.cloned_at;
    }
    byTemplate.set(r.template_id, cur);
  }

  return (templates as Array<{ id: string; slug: string; title: string }>).map(
    (t) => {
      const agg = byTemplate.get(t.id) ?? {
        clones: 0,
        converted: 0,
        lastCloneAt: null,
      };
      return {
        templateId: t.id,
        slug: t.slug,
        title: t.title,
        cloneCount: agg.clones,
        convertedCount: agg.converted,
        conversionRate:
          agg.clones === 0 ? 0 : Number((agg.converted / agg.clones).toFixed(3)),
        lastCloneAt: agg.lastCloneAt,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

export interface TemplateDraft {
  slug: string;
  title: string;
  category: CampaignTemplateCategory;
  description: string;
  dealCategory: CampaignTemplateDealCategory;
  suggestedCompensationCents: number;
  suggestedDurationDays: number;
  deliverablesTemplate: string;
  targetSports?: string[];
  targetGradYears?: number[];
  heroImageUrl?: string | null;
  published?: boolean;
  displayOrder?: number;
}

export type TemplatePatch = Partial<TemplateDraft>;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidTemplateSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 120 && SLUG_RE.test(slug);
}

export async function createTemplate(
  draft: TemplateDraft,
): Promise<
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string; code?: 'slug_conflict' }
> {
  if (!isValidTemplateSlug(draft.slug)) {
    return { ok: false, error: 'Invalid slug.' };
  }
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('campaign_templates')
    .insert({
      slug: draft.slug,
      title: draft.title,
      category: draft.category,
      description: draft.description,
      deal_category: draft.dealCategory,
      suggested_compensation_cents: draft.suggestedCompensationCents,
      suggested_duration_days: draft.suggestedDurationDays,
      deliverables_template: draft.deliverablesTemplate,
      target_sports: draft.targetSports ?? [],
      target_grad_years: draft.targetGradYears ?? [],
      hero_image_url: draft.heroImageUrl ?? null,
      published: draft.published ?? true,
      display_order: draft.displayOrder ?? 100,
    })
    .select('id, slug')
    .single();
  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, error: 'Slug already in use.', code: 'slug_conflict' };
    }
    return { ok: false, error: error?.message ?? 'Insert failed.' };
  }
  return { ok: true, id: (data as { id: string; slug: string }).id, slug: (data as { id: string; slug: string }).slug };
}

export async function updateTemplate(
  id: string,
  patch: TemplatePatch,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceRoleClient();
  const update: Record<string, unknown> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.dealCategory !== undefined) update.deal_category = patch.dealCategory;
  if (patch.suggestedCompensationCents !== undefined) {
    update.suggested_compensation_cents = patch.suggestedCompensationCents;
  }
  if (patch.suggestedDurationDays !== undefined) {
    update.suggested_duration_days = patch.suggestedDurationDays;
  }
  if (patch.deliverablesTemplate !== undefined) {
    update.deliverables_template = patch.deliverablesTemplate;
  }
  if (patch.targetSports !== undefined) update.target_sports = patch.targetSports;
  if (patch.targetGradYears !== undefined) {
    update.target_grad_years = patch.targetGradYears;
  }
  if (patch.heroImageUrl !== undefined) update.hero_image_url = patch.heroImageUrl;
  if (patch.published !== undefined) update.published = patch.published;
  if (patch.displayOrder !== undefined) update.display_order = patch.displayOrder;

  const { error } = await sb
    .from('campaign_templates')
    .update(update)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteTemplate(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('campaign_templates')
    .delete()
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
