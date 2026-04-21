/**
 * HS-NIL Brand Directory Service
 * ----------------------------------------------------------------------------
 * Backs the public /brands index + /brands/[slug] detail surface and the
 * authenticated /hs/brand/public-profile settings screen.
 *
 * Columns live on `brands` (additive — see migration 20260420_011). Reads for
 * the public directory go through the anon Supabase client + RLS. Writes use
 * the service-role client and the service layer verifies ownership.
 *
 * PII discipline: the public read path surfaces ONLY the opt-in columns
 * documented below + aggregate counts. Never returns athlete PII, deal
 * amounts, or contact info.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface PublicBrand {
  id: string;
  slug: string;
  companyName: string;
  bio: string | null;
  website: string | null;
  avatarUrl: string | null;
  city: string | null;
  region: string | null;
  targetStates: string[];
  dealCategories: string[];
  completedDealCount: number;
  activeCampaignCount: number;
  claimedAt: string | null;
}

export interface PublicBrandSummary {
  id: string;
  slug: string;
  companyName: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  region: string | null;
  targetStates: string[];
  dealCategories: string[];
}

export interface DirectoryListOptions {
  stateCode?: string;
  dealCategory?: string;
  limit?: number;
  offset?: number;
}

export type MutateCode =
  | 'invalid_slug'
  | 'reserved_slug'
  | 'slug_conflict'
  | 'slug_locked'
  | 'not_found'
  | 'forbidden'
  | 'invalid_fields'
  | 'db_error';

export type MutateResult<T> =
  | { ok: true; data: T; error?: never; code?: never }
  | { ok: false; data?: never; error: string; code: MutateCode };

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_SLUG = 3;
const MAX_SLUG = 64;
const MAX_BIO = 500;

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'auth', 'login', 'signup', 'logout', 'dashboard',
  'brands', 'brand', 'athletes', 'athlete', 'parents', 'parent',
  'blog', 'business', 'case-studies', 'solutions', 'pricing',
  'compare', 'discover', 'opportunities', 'help', 'privacy',
  'terms', 'subscription-terms', 'hs', 'nil', 'gradeup',
  'settings', 'account', 'billing', 'support', 'about',
  'contact', 'careers', 'press', 'new', 'edit', 'create',
]);

// ----------------------------------------------------------------------------
// Slug helpers
// ----------------------------------------------------------------------------

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG);
}

export function isValidSlugShape(slug: string): boolean {
  return (
    slug.length >= MIN_SLUG && slug.length <= MAX_SLUG && SLUG_RE.test(slug)
  );
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

// ----------------------------------------------------------------------------
// Service-role client (write path + server-privileged reads)
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil brand-directory] Supabase service role not configured.',
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Row shape
// ----------------------------------------------------------------------------

interface BrandPublicRow {
  id: string;
  company_name: string;
  public_slug: string | null;
  public_visibility: boolean;
  public_bio: string | null;
  public_website: string | null;
  public_avatar_url: string | null;
  public_location_city: string | null;
  public_location_region: string | null;
  claimed_public_slug_at: string | null;
  hs_target_states: string[] | null;
  hs_deal_categories: string[] | null;
  is_hs_enabled: boolean | null;
}

const PUBLIC_PROJECTION =
  'id, company_name, public_slug, public_visibility, public_bio, public_website, public_avatar_url, public_location_city, public_location_region, claimed_public_slug_at, hs_target_states, hs_deal_categories, is_hs_enabled';

function toSummary(row: BrandPublicRow): PublicBrandSummary | null {
  if (!row.public_slug || !row.public_visibility) return null;
  return {
    id: row.id,
    slug: row.public_slug,
    companyName: row.company_name,
    bio: row.public_bio,
    avatarUrl: row.public_avatar_url,
    city: row.public_location_city,
    region: row.public_location_region,
    targetStates: row.hs_target_states ?? [],
    dealCategories: row.hs_deal_categories ?? [],
  };
}

// ----------------------------------------------------------------------------
// Public reads
// ----------------------------------------------------------------------------

export async function listPublicBrands(
  supabase: SupabaseClient,
  opts: DirectoryListOptions = {},
): Promise<PublicBrandSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 60);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from('brands')
    .select(PUBLIC_PROJECTION)
    .eq('public_visibility', true)
    .not('public_slug', 'is', null)
    .order('claimed_public_slug_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (opts.stateCode) {
    const code = opts.stateCode.toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) {
      query = query.contains('hs_target_states', [code]);
    }
  }
  if (opts.dealCategory) {
    const cat = opts.dealCategory.toLowerCase();
    if (/^[a-z_]+$/.test(cat)) {
      query = query.contains('hs_deal_categories', [cat]);
    }
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as BrandPublicRow[])
    .map(toSummary)
    .filter((r): r is PublicBrandSummary => r !== null);
}

export async function getPublicBrandBySlug(
  slug: string,
): Promise<PublicBrand | null> {
  const normalized = slug.toLowerCase();
  if (!isValidSlugShape(normalized)) return null;

  // Service-role read so we can also pull aggregate counts without
  // authing the reader. The projection is strictly public-safe.
  const sb = getServiceRoleClient();

  const { data, error } = await sb
    .from('brands')
    .select(PUBLIC_PROJECTION)
    .ilike('public_slug', normalized)
    .eq('public_visibility', true)
    .maybeSingle<BrandPublicRow>();

  if (error || !data || !data.public_slug) return null;

  // Aggregates — no PII, no amounts.
  const [{ count: completedCount }, { count: activeCount }] = await Promise.all(
    [
      sb
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', data.id)
        .in('status', ['paid', 'completed']),
      sb
        .from('hs_brand_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', data.id)
        .eq('status', 'open'),
    ],
  );

  return {
    id: data.id,
    slug: data.public_slug,
    companyName: data.company_name,
    bio: data.public_bio,
    website: data.public_website,
    avatarUrl: data.public_avatar_url,
    city: data.public_location_city,
    region: data.public_location_region,
    targetStates: data.hs_target_states ?? [],
    dealCategories: data.hs_deal_categories ?? [],
    completedDealCount: completedCount ?? 0,
    activeCampaignCount: activeCount ?? 0,
    claimedAt: data.claimed_public_slug_at,
  };
}

export async function checkSlugAvailable(
  slug: string,
): Promise<{ available: boolean; reason?: MutateCode }> {
  const normalized = slug.toLowerCase();
  if (!isValidSlugShape(normalized)) {
    return { available: false, reason: 'invalid_slug' };
  }
  if (isReservedSlug(normalized)) {
    return { available: false, reason: 'reserved_slug' };
  }
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('brands')
    .select('id')
    .ilike('public_slug', normalized)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (data) return { available: false, reason: 'slug_conflict' };
  return { available: true };
}

// ----------------------------------------------------------------------------
// Ownership helper
// ----------------------------------------------------------------------------

async function assertBrandOwnership(
  sb: SupabaseClient,
  brandId: string,
  actorUserId: string,
): Promise<MutateResult<never> | null> {
  const { data } = await sb
    .from('brands')
    .select('id, profile_id, public_slug, claimed_public_slug_at')
    .eq('id', brandId)
    .maybeSingle<{
      id: string;
      profile_id: string;
      public_slug: string | null;
      claimed_public_slug_at: string | null;
    }>();
  if (!data) return { ok: false, code: 'not_found', error: 'Brand not found' };
  if (data.profile_id !== actorUserId) {
    return { ok: false, code: 'forbidden', error: 'Not authorized' };
  }
  return null;
}

// ----------------------------------------------------------------------------
// Writes
// ----------------------------------------------------------------------------

export async function claimPublicSlug(params: {
  brandId: string;
  slug: string;
  actorUserId: string;
}): Promise<MutateResult<{ id: string; slug: string }>> {
  const normalized = params.slug.toLowerCase().trim();
  if (!isValidSlugShape(normalized)) {
    return { ok: false, code: 'invalid_slug', error: 'Invalid slug shape' };
  }
  if (isReservedSlug(normalized)) {
    return { ok: false, code: 'reserved_slug', error: 'Slug is reserved' };
  }

  const sb = getServiceRoleClient();
  const ownershipErr = await assertBrandOwnership(
    sb,
    params.brandId,
    params.actorUserId,
  );
  if (ownershipErr) return ownershipErr;

  // Semi-immutable: refuse re-claim if already set.
  const { data: existing } = await sb
    .from('brands')
    .select('public_slug, claimed_public_slug_at')
    .eq('id', params.brandId)
    .maybeSingle<{ public_slug: string | null; claimed_public_slug_at: string | null }>();
  if (existing?.public_slug) {
    return {
      ok: false,
      code: 'slug_locked',
      error: 'Slug already claimed. Contact support to change it.',
    };
  }

  const { data: conflict } = await sb
    .from('brands')
    .select('id')
    .ilike('public_slug', normalized)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (conflict) {
    return { ok: false, code: 'slug_conflict', error: 'Slug already taken' };
  }

  const { data, error } = await sb
    .from('brands')
    .update({
      public_slug: normalized,
      claimed_public_slug_at: new Date().toISOString(),
    })
    .eq('id', params.brandId)
    .select('id, public_slug')
    .single();

  if (error || !data) {
    const msg = error?.message ?? 'Claim failed';
    const code: MutateCode = /unique|duplicate/i.test(msg)
      ? 'slug_conflict'
      : 'db_error';
    return { ok: false, error: msg, code };
  }
  return { ok: true, data: { id: data.id, slug: data.public_slug as string } };
}

export interface UpdatePublicProfileFields {
  bio?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  region?: string | null;
}

export async function updatePublicProfile(params: {
  brandId: string;
  fields: UpdatePublicProfileFields;
  actorUserId: string;
}): Promise<MutateResult<{ id: string }>> {
  const sb = getServiceRoleClient();
  const ownershipErr = await assertBrandOwnership(
    sb,
    params.brandId,
    params.actorUserId,
  );
  if (ownershipErr) return ownershipErr;

  const update: Record<string, unknown> = {};
  const f = params.fields;

  if (f.bio !== undefined) {
    if (f.bio !== null && f.bio.length > MAX_BIO) {
      return {
        ok: false,
        code: 'invalid_fields',
        error: `Bio must be ${MAX_BIO} characters or fewer`,
      };
    }
    update.public_bio = f.bio;
    update.public_bio_updated_at = new Date().toISOString();
  }
  if (f.website !== undefined) {
    if (f.website !== null && f.website !== '') {
      if (!/^https:\/\/[^\s]+$/i.test(f.website)) {
        return {
          ok: false,
          code: 'invalid_fields',
          error: 'Website must be an https:// URL',
        };
      }
    }
    update.public_website = f.website === '' ? null : f.website;
  }
  if (f.avatarUrl !== undefined) {
    update.public_avatar_url = f.avatarUrl;
  }
  if (f.city !== undefined) {
    update.public_location_city = f.city;
  }
  if (f.region !== undefined) {
    if (f.region !== null && !/^[A-Z]{2}$/.test(f.region)) {
      return {
        ok: false,
        code: 'invalid_fields',
        error: 'Region must be a 2-letter state code',
      };
    }
    update.public_location_region = f.region;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, data: { id: params.brandId } };
  }

  const { data, error } = await sb
    .from('brands')
    .update(update)
    .eq('id', params.brandId)
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Update failed',
      code: 'db_error',
    };
  }
  return { ok: true, data: { id: data.id } };
}

export async function setVisibility(params: {
  brandId: string;
  visible: boolean;
  actorUserId: string;
}): Promise<MutateResult<{ id: string; visible: boolean }>> {
  const sb = getServiceRoleClient();
  const ownershipErr = await assertBrandOwnership(
    sb,
    params.brandId,
    params.actorUserId,
  );
  if (ownershipErr) return ownershipErr;

  // Visibility requires a claimed slug — otherwise there's no URL to serve.
  if (params.visible) {
    const { data: row } = await sb
      .from('brands')
      .select('public_slug')
      .eq('id', params.brandId)
      .maybeSingle<{ public_slug: string | null }>();
    if (!row?.public_slug) {
      return {
        ok: false,
        code: 'invalid_fields',
        error: 'Claim a public slug before enabling visibility',
      };
    }
  }

  const { data, error } = await sb
    .from('brands')
    .update({ public_visibility: params.visible })
    .eq('id', params.brandId)
    .select('id, public_visibility')
    .single<{ id: string; public_visibility: boolean }>();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Visibility update failed',
      code: 'db_error',
    };
  }
  return { ok: true, data: { id: data.id, visible: data.public_visibility } };
}

// ----------------------------------------------------------------------------
// View-log (lightweight analytics)
// ----------------------------------------------------------------------------

function sha256HexUnsalted(value: string): string {
  // Deterministic hash with a per-process salt if provided; fine for
  // coarse unique-visitor heuristics. No crypto guarantee implied.
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  const out = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return out.toString(16);
}

function clientIpFromRequest(req: Request): string {
  const hdr = req.headers;
  return (
    hdr.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdr.get('x-real-ip') ||
    hdr.get('cf-connecting-ip') ||
    'unknown'
  );
}

export async function logBrandView(params: {
  brandId: string;
  req: Request;
}): Promise<void> {
  try {
    const sb = getServiceRoleClient();
    const hdrs = params.req.headers;
    const ua = (hdrs.get('user-agent') ?? '').slice(0, 180) || null;
    const ref = (hdrs.get('referer') ?? '').slice(0, 180) || null;
    const salt = process.env.HS_NIL_IP_HASH_SALT ?? 'gradeup-nil';
    const ip = clientIpFromRequest(params.req);
    const ipHash = sha256HexUnsalted(`${salt}::${ip}`);

    await sb.from('brand_profile_view_log').insert({
      brand_id: params.brandId,
      user_agent_hint: ua,
      referrer_hint: ref,
      ip_hash: ipHash,
    });
  } catch {
    // Logging is best-effort; never fail the request.
  }
}
