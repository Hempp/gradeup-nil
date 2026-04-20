/**
 * HS-NIL Case Studies Service
 * ----------------------------------------------------------------------------
 * Backs the public /business/case-studies surface and the admin authoring
 * UI at /hs/admin/case-studies. Three tables:
 *
 *   case_studies          — top-level record + slug + body
 *   case_study_metrics    — 1-many stat cards
 *   case_study_quotes     — 1-many pull quotes
 *
 * Read path (public):
 *   - listPublishedCaseStudies()   — listing grid
 *   - getCaseStudyBySlug(slug)     — individual page
 *   Both use the anon/authenticated supabase client and rely on RLS
 *   (published=true) to scope rows.
 *
 * Write path (admin):
 *   - create / update / publish / unpublish / delete
 *   All writes require the service-role client; the service layer does NOT
 *   do the admin role check itself — that's the caller's job at the API
 *   layer. This mirrors admin-actions.ts.
 *
 * Autopopulate helper:
 *   - autoPopulateMetricsFromDeal(dealId) pulls the brand ROI + share
 *     counts + completion date + athlete first-name from the existing
 *     earnings + share services and returns suggested metric rows + quotes.
 *     Nothing is persisted — the admin reviews and accepts before saving.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { getShareCountsForDeal } from './share';
import { formatCentsUSD } from './earnings';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type CaseStudyQuoteRole =
  | 'athlete'
  | 'parent'
  | 'brand_marketer'
  | 'athletic_director'
  | 'other';

export interface CaseStudyMetric {
  id: string;
  caseStudyId: string;
  metricLabel: string;
  metricValue: string;
  metricHint: string | null;
  displayOrder: number;
}

export interface CaseStudyQuote {
  id: string;
  caseStudyId: string;
  quoteBody: string;
  attributedRole: CaseStudyQuoteRole;
  attributedName: string;
  displayOrder: number;
}

export interface CaseStudySummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  featuredOrder: number | null;
  updatedAt: string;
  topMetrics: CaseStudyMetric[];
}

export interface CaseStudyDetail extends CaseStudySummary {
  bodyMarkdown: string;
  dealId: string | null;
  brandId: string | null;
  athleteUserId: string | null;
  authorUserId: string | null;
  createdAt: string;
  metrics: CaseStudyMetric[];
  quotes: CaseStudyQuote[];
}

export interface CaseStudyDraft {
  slug: string;
  title: string;
  subtitle?: string | null;
  heroImageUrl?: string | null;
  bodyMarkdown?: string;
  dealId?: string | null;
  brandId?: string | null;
  athleteUserId?: string | null;
  tags?: string[];
  featuredOrder?: number | null;
  authorUserId: string;
}

export interface CaseStudyPatch {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  heroImageUrl?: string | null;
  bodyMarkdown?: string;
  dealId?: string | null;
  brandId?: string | null;
  athleteUserId?: string | null;
  tags?: string[];
  featuredOrder?: number | null;
  metrics?: Array<{
    metricLabel: string;
    metricValue: string;
    metricHint?: string | null;
    displayOrder: number;
  }>;
  quotes?: Array<{
    quoteBody: string;
    attributedRole: CaseStudyQuoteRole;
    attributedName: string;
    displayOrder: number;
  }>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
}

export interface AutoPopulateResult {
  dealId: string;
  brandId: string | null;
  athleteDisplay: string; // "Jasmine T." style
  completedAt: string | null;
  suggestedMetrics: Array<{
    metricLabel: string;
    metricValue: string;
    metricHint: string | null;
    displayOrder: number;
  }>;
  suggestedTags: string[];
}

// ----------------------------------------------------------------------------
// Shared: row mapping
// ----------------------------------------------------------------------------

interface CaseStudyRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
  body_markdown: string;
  deal_id: string | null;
  brand_id: string | null;
  athlete_user_id: string | null;
  published: boolean;
  published_at: string | null;
  featured_order: number | null;
  tags: string[] | null;
  author_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MetricRow {
  id: string;
  case_study_id: string;
  metric_label: string;
  metric_value: string;
  metric_hint: string | null;
  display_order: number;
}

interface QuoteRow {
  id: string;
  case_study_id: string;
  quote_body: string;
  attributed_role: CaseStudyQuoteRole;
  attributed_name: string;
  display_order: number;
}

function mapMetric(row: MetricRow): CaseStudyMetric {
  return {
    id: row.id,
    caseStudyId: row.case_study_id,
    metricLabel: row.metric_label,
    metricValue: row.metric_value,
    metricHint: row.metric_hint,
    displayOrder: row.display_order,
  };
}

function mapQuote(row: QuoteRow): CaseStudyQuote {
  return {
    id: row.id,
    caseStudyId: row.case_study_id,
    quoteBody: row.quote_body,
    attributedRole: row.attributed_role,
    attributedName: row.attributed_name,
    displayOrder: row.display_order,
  };
}

function toSummary(row: CaseStudyRow, metrics: CaseStudyMetric[]): CaseStudySummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    heroImageUrl: row.hero_image_url,
    tags: row.tags ?? [],
    published: row.published,
    publishedAt: row.published_at,
    featuredOrder: row.featured_order,
    updatedAt: row.updated_at,
    topMetrics: metrics.slice(0, 3),
  };
}

function toDetail(
  row: CaseStudyRow,
  metrics: CaseStudyMetric[],
  quotes: CaseStudyQuote[],
): CaseStudyDetail {
  return {
    ...toSummary(row, metrics),
    bodyMarkdown: row.body_markdown,
    dealId: row.deal_id,
    brandId: row.brand_id,
    athleteUserId: row.athlete_user_id,
    authorUserId: row.author_user_id,
    createdAt: row.created_at,
    metrics,
    quotes,
  };
}

// ----------------------------------------------------------------------------
// Service-role client (admin writes)
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil case-studies] Supabase service role not configured.',
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Slug helpers
// ----------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 120 && SLUG_RE.test(slug);
}

// ----------------------------------------------------------------------------
// Public reads
// ----------------------------------------------------------------------------

export async function listPublishedCaseStudies(
  supabase: SupabaseClient,
  opts: ListOptions = {},
): Promise<CaseStudySummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 60);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from('case_studies')
    .select(
      'id, slug, title, subtitle, hero_image_url, body_markdown, deal_id, brand_id, athlete_user_id, published, published_at, featured_order, tags, author_user_id, created_at, updated_at',
    )
    .eq('published', true)
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (opts.tags && opts.tags.length > 0) {
    query = query.overlaps('tags', opts.tags);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as CaseStudyRow[];
  const ids = rows.map((r) => r.id);
  const metricsByStudy = await fetchMetricsForStudies(supabase, ids);
  return rows.map((r) => toSummary(r, metricsByStudy.get(r.id) ?? []));
}

export async function getCaseStudyBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<CaseStudyDetail | null> {
  if (!isValidSlug(slug)) return null;

  const { data, error } = await supabase
    .from('case_studies')
    .select(
      'id, slug, title, subtitle, hero_image_url, body_markdown, deal_id, brand_id, athlete_user_id, published, published_at, featured_order, tags, author_user_id, created_at, updated_at',
    )
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as CaseStudyRow;

  const [metrics, quotes] = await Promise.all([
    fetchMetricsForStudy(supabase, row.id),
    fetchQuotesForStudy(supabase, row.id),
  ]);
  return toDetail(row, metrics, quotes);
}

// ----------------------------------------------------------------------------
// Admin reads (service-role client so drafts are visible)
// ----------------------------------------------------------------------------

export async function listAllCaseStudiesAdmin(): Promise<CaseStudySummary[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('case_studies')
    .select(
      'id, slug, title, subtitle, hero_image_url, body_markdown, deal_id, brand_id, athlete_user_id, published, published_at, featured_order, tags, author_user_id, created_at, updated_at',
    )
    .order('published', { ascending: false })
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  const rows = data as CaseStudyRow[];
  const metricsByStudy = await fetchMetricsForStudies(
    sb,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toSummary(r, metricsByStudy.get(r.id) ?? []));
}

export async function getCaseStudyByIdAdmin(
  id: string,
): Promise<CaseStudyDetail | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('case_studies')
    .select(
      'id, slug, title, subtitle, hero_image_url, body_markdown, deal_id, brand_id, athlete_user_id, published, published_at, featured_order, tags, author_user_id, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as CaseStudyRow;
  const [metrics, quotes] = await Promise.all([
    fetchMetricsForStudy(sb, row.id),
    fetchQuotesForStudy(sb, row.id),
  ]);
  return toDetail(row, metrics, quotes);
}

// ----------------------------------------------------------------------------
// Admin writes
// ----------------------------------------------------------------------------

export interface MutateResult {
  ok: boolean;
  id?: string;
  slug?: string;
  error?: string;
  code?:
    | 'invalid_slug'
    | 'slug_conflict'
    | 'not_found'
    | 'db_error';
}

export async function createCaseStudy(
  draft: CaseStudyDraft,
): Promise<MutateResult> {
  if (!isValidSlug(draft.slug)) {
    return { ok: false, error: 'Invalid slug', code: 'invalid_slug' };
  }
  const sb = getServiceRoleClient();

  // Check conflict first for a clean error path.
  const { data: existing } = await sb
    .from('case_studies')
    .select('id')
    .eq('slug', draft.slug)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: 'Slug already in use', code: 'slug_conflict' };
  }

  const { data, error } = await sb
    .from('case_studies')
    .insert({
      slug: draft.slug,
      title: draft.title,
      subtitle: draft.subtitle ?? null,
      hero_image_url: draft.heroImageUrl ?? null,
      body_markdown: draft.bodyMarkdown ?? '',
      deal_id: draft.dealId ?? null,
      brand_id: draft.brandId ?? null,
      athlete_user_id: draft.athleteUserId ?? null,
      tags: draft.tags ?? [],
      featured_order: draft.featuredOrder ?? null,
      author_user_id: draft.authorUserId,
    })
    .select('id, slug')
    .single();

  if (error || !data) {
    const msg = error?.message ?? 'Insert failed';
    const code = /unique|duplicate/i.test(msg) ? 'slug_conflict' : 'db_error';
    return { ok: false, error: msg, code };
  }
  return { ok: true, id: data.id, slug: data.slug };
}

export async function updateCaseStudy(
  id: string,
  patch: CaseStudyPatch,
): Promise<MutateResult> {
  const sb = getServiceRoleClient();

  if (patch.slug !== undefined && !isValidSlug(patch.slug)) {
    return { ok: false, error: 'Invalid slug', code: 'invalid_slug' };
  }

  const update: Record<string, unknown> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.subtitle !== undefined) update.subtitle = patch.subtitle;
  if (patch.heroImageUrl !== undefined) update.hero_image_url = patch.heroImageUrl;
  if (patch.bodyMarkdown !== undefined) update.body_markdown = patch.bodyMarkdown;
  if (patch.dealId !== undefined) update.deal_id = patch.dealId;
  if (patch.brandId !== undefined) update.brand_id = patch.brandId;
  if (patch.athleteUserId !== undefined) update.athlete_user_id = patch.athleteUserId;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.featuredOrder !== undefined) update.featured_order = patch.featuredOrder;

  if (Object.keys(update).length > 0) {
    const { error } = await sb.from('case_studies').update(update).eq('id', id);
    if (error) {
      const code = /unique|duplicate/i.test(error.message)
        ? 'slug_conflict'
        : 'db_error';
      return { ok: false, error: error.message, code };
    }
  }

  // Replace metrics + quotes when provided.
  if (patch.metrics) {
    await sb.from('case_study_metrics').delete().eq('case_study_id', id);
    if (patch.metrics.length > 0) {
      const rows = patch.metrics.map((m, idx) => ({
        case_study_id: id,
        metric_label: m.metricLabel,
        metric_value: m.metricValue,
        metric_hint: m.metricHint ?? null,
        display_order: m.displayOrder ?? idx,
      }));
      const { error: mErr } = await sb.from('case_study_metrics').insert(rows);
      if (mErr) return { ok: false, error: mErr.message, code: 'db_error' };
    }
  }

  if (patch.quotes) {
    await sb.from('case_study_quotes').delete().eq('case_study_id', id);
    if (patch.quotes.length > 0) {
      const rows = patch.quotes.map((q, idx) => ({
        case_study_id: id,
        quote_body: q.quoteBody,
        attributed_role: q.attributedRole,
        attributed_name: q.attributedName,
        display_order: q.displayOrder ?? idx,
      }));
      const { error: qErr } = await sb.from('case_study_quotes').insert(rows);
      if (qErr) return { ok: false, error: qErr.message, code: 'db_error' };
    }
  }

  return { ok: true, id };
}

export async function publishCaseStudy(id: string): Promise<MutateResult> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('case_studies')
    .update({ published: true, published_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Publish failed',
      code: error ? 'db_error' : 'not_found',
    };
  }
  return { ok: true, id: data.id, slug: data.slug };
}

export async function unpublishCaseStudy(
  id: string,
  reason?: string,
): Promise<MutateResult> {
  // reason is accepted for audit parity but not persisted on the row itself;
  // callers should log it via admin_audit_log in the API handler.
  void reason;
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('case_studies')
    .update({ published: false })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Unpublish failed',
      code: error ? 'db_error' : 'not_found',
    };
  }
  return { ok: true, id: data.id, slug: data.slug };
}

export async function deleteCaseStudy(id: string): Promise<MutateResult> {
  const sb = getServiceRoleClient();
  const { error } = await sb.from('case_studies').delete().eq('id', id);
  if (error) return { ok: false, error: error.message, code: 'db_error' };
  return { ok: true, id };
}

// ----------------------------------------------------------------------------
// Autopopulate from an existing deal
// ----------------------------------------------------------------------------

export async function autoPopulateMetricsFromDeal(
  dealId: string,
): Promise<AutoPopulateResult | null> {
  const sb = getServiceRoleClient();

  const { data: dealRow, error: dealErr } = await sb
    .from('deals')
    .select(
      `id, title, status, compensation_amount, completed_at, created_at, brand_id,
       brand:brands(id, company_name),
       athlete:athletes(id, first_name, last_name, profile_id)`,
    )
    .eq('id', dealId)
    .maybeSingle();

  if (dealErr || !dealRow) return null;

  type DealShape = {
    id: string;
    title: string;
    status: string;
    compensation_amount: number | string;
    completed_at: string | null;
    created_at: string;
    brand_id: string | null;
    brand: { id: string; company_name: string } | null;
    athlete: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_id: string;
    } | null;
  };
  const deal = dealRow as unknown as DealShape;

  const shareCounts = await getShareCountsForDeal(sb, deal.id);

  const compensationNum =
    typeof deal.compensation_amount === 'string'
      ? Number(deal.compensation_amount)
      : deal.compensation_amount;
  const compensationCents = Math.round(
    (Number.isFinite(compensationNum) ? compensationNum : 0) * 100,
  );

  const firstName = deal.athlete?.first_name?.trim() || 'Scholar';
  const lastInitial = (deal.athlete?.last_name?.trim()?.[0] ?? '').toUpperCase();
  const athleteDisplay = lastInitial
    ? `${firstName} ${lastInitial}.`
    : firstName;

  const daysToComplete =
    deal.completed_at && deal.created_at
      ? Math.max(
          1,
          Math.round(
            (new Date(deal.completed_at).getTime() -
              new Date(deal.created_at).getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null;

  const suggested: AutoPopulateResult['suggestedMetrics'] = [];
  suggested.push({
    metricLabel: 'Athlete earnings',
    metricValue: formatCentsUSD(compensationCents),
    metricHint: 'Gross compensation paid to the athlete for this deal.',
    displayOrder: 0,
  });

  if (shareCounts.total > 0) {
    suggested.push({
      metricLabel: 'Verified shares',
      metricValue: shareCounts.total.toLocaleString('en-US'),
      metricHint:
        'Deal shared to Instagram, LinkedIn, X, TikTok, or via copy-link after completion.',
      displayOrder: 1,
    });
  }

  if (daysToComplete !== null) {
    suggested.push({
      metricLabel: 'Days to completion',
      metricValue: daysToComplete.toString(),
      metricHint: 'From deal creation to paid / completed status.',
      displayOrder: 2,
    });
  }

  const suggestedTags: string[] = [];
  if (shareCounts.total >= 25) suggestedTags.push('viral_share');
  if (deal.athlete) suggestedTags.push('single_athlete');

  return {
    dealId: deal.id,
    brandId: deal.brand?.id ?? deal.brand_id ?? null,
    athleteDisplay,
    completedAt: deal.completed_at,
    suggestedMetrics: suggested,
    suggestedTags,
  };
}

// ----------------------------------------------------------------------------
// Internal fetch helpers
// ----------------------------------------------------------------------------

async function fetchMetricsForStudy(
  supabase: SupabaseClient,
  studyId: string,
): Promise<CaseStudyMetric[]> {
  const { data, error } = await supabase
    .from('case_study_metrics')
    .select(
      'id, case_study_id, metric_label, metric_value, metric_hint, display_order',
    )
    .eq('case_study_id', studyId)
    .order('display_order', { ascending: true });
  if (error || !data) return [];
  return (data as MetricRow[]).map(mapMetric);
}

async function fetchMetricsForStudies(
  supabase: SupabaseClient,
  studyIds: string[],
): Promise<Map<string, CaseStudyMetric[]>> {
  const out = new Map<string, CaseStudyMetric[]>();
  if (studyIds.length === 0) return out;

  const { data, error } = await supabase
    .from('case_study_metrics')
    .select(
      'id, case_study_id, metric_label, metric_value, metric_hint, display_order',
    )
    .in('case_study_id', studyIds)
    .order('display_order', { ascending: true });
  if (error || !data) return out;

  for (const row of data as MetricRow[]) {
    const arr = out.get(row.case_study_id) ?? [];
    arr.push(mapMetric(row));
    out.set(row.case_study_id, arr);
  }
  return out;
}

async function fetchQuotesForStudy(
  supabase: SupabaseClient,
  studyId: string,
): Promise<CaseStudyQuote[]> {
  const { data, error } = await supabase
    .from('case_study_quotes')
    .select(
      'id, case_study_id, quote_body, attributed_role, attributed_name, display_order',
    )
    .eq('case_study_id', studyId)
    .order('display_order', { ascending: true });
  if (error || !data) return [];
  return (data as QuoteRow[]).map(mapQuote);
}

// ----------------------------------------------------------------------------
// Minimal markdown parser (no runtime deps)
// ----------------------------------------------------------------------------

/**
 * Parse a small subset of Markdown (headings `#`, `##`, `###`; bold `**`;
 * italic `*`; links `[text](https://...)`; `-` / `*` / `1.` lists;
 * blockquote `>`; fenced code ```…```) into a typed AST. Deliberately
 * minimal — we control input (admins author studies) and avoid an npm
 * dependency. Renderer constructs React elements from the AST; no raw
 * HTML string ever reaches the DOM.
 */

export type MdInlineNode =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'link'; href: string; value: string };

export type MdBlockNode =
  | { type: 'h2' | 'h3' | 'h4' | 'p'; children: MdInlineNode[] }
  | { type: 'ul' | 'ol'; items: MdInlineNode[][] }
  | { type: 'blockquote'; children: MdInlineNode[][] }
  | { type: 'code'; value: string };

const INLINE_TOKEN_RE =
  /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/)[^)]+\))/g;

function parseInline(s: string): MdInlineNode[] {
  const out: MdInlineNode[] = [];
  let last = 0;
  for (const match of s.matchAll(INLINE_TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) out.push({ type: 'text', value: s.slice(last, idx) });
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      out.push({ type: 'strong', value: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      out.push({ type: 'em', value: token.slice(1, -1) });
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(((?:https?:\/\/)[^)]+)\)$/.exec(token);
      if (linkMatch) {
        out.push({ type: 'link', href: linkMatch[2], value: linkMatch[1] });
      } else {
        out.push({ type: 'text', value: token });
      }
    } else {
      out.push({ type: 'text', value: token });
    }
    last = idx + token.length;
  }
  if (last < s.length) out.push({ type: 'text', value: s.slice(last) });
  return out.length > 0 ? out : [{ type: 'text', value: s }];
}

export function parseMarkdownToAst(md: string): MdBlockNode[] {
  const blocks: MdBlockNode[] = [];

  const codeBlocks: string[] = [];
  const withCode = md.replace(/```([\s\S]*?)```/g, (_m, body: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(body.trim());
    return `\u0000CODE${idx}\u0000`;
  });

  const lines = withCode.split(/\r?\n/);
  let paragraph: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let bqLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const joined = paragraph.join(' ').trim();
    if (joined) blocks.push({ type: 'p', children: parseInline(joined) });
    paragraph = [];
  };
  const flushUl = () => {
    if (ulItems.length === 0) return;
    blocks.push({ type: 'ul', items: ulItems.map((i) => parseInline(i)) });
    ulItems = [];
  };
  const flushOl = () => {
    if (olItems.length === 0) return;
    blocks.push({ type: 'ol', items: olItems.map((i) => parseInline(i)) });
    olItems = [];
  };
  const flushBq = () => {
    if (bqLines.length === 0) return;
    blocks.push({
      type: 'blockquote',
      children: bqLines.map((l) => parseInline(l)),
    });
    bqLines = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
    flushBq();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const codeMatch = /^\u0000CODE(\d+)\u0000$/.exec(line.trim());
    if (codeMatch) {
      flushAll();
      blocks.push({ type: 'code', value: codeBlocks[Number(codeMatch[1])] ?? '' });
      continue;
    }

    if (line === '') {
      flushAll();
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushAll();
      blocks.push({ type: 'h2', children: parseInline(line.replace(/^#\s+/, '')) });
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushAll();
      blocks.push({ type: 'h3', children: parseInline(line.replace(/^##\s+/, '')) });
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushAll();
      blocks.push({ type: 'h4', children: parseInline(line.replace(/^###\s+/, '')) });
      continue;
    }
    if (/^>\s+/.test(line)) {
      flushParagraph();
      flushUl();
      flushOl();
      bqLines.push(line.replace(/^>\s+/, ''));
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      flushOl();
      flushBq();
      ulItems.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      flushUl();
      flushBq();
      olItems.push(line.replace(/^\s*\d+\.\s+/, ''));
      continue;
    }
    flushUl();
    flushOl();
    flushBq();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}
