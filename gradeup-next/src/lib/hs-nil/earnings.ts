/**
 * HS-NIL Earnings & Performance Aggregation Service
 * ----------------------------------------------------------------------------
 * Aggregation helpers for the completion-metrics surfaces:
 *
 *   - /hs/athlete/earnings — total earned, deal count, history
 *   - /hs/brand/performance — ROI summary, completed-deal history
 *   - dashboard summary cards (athlete + brand)
 *
 * "Completed" is precisely defined here: deal_status IN ('paid', 'completed').
 * Earlier statuses — 'approved', 'in_review', 'in_delivery', 'fully_signed',
 * etc. — are explicitly NOT counted as earnings. An athlete's earned-dollar
 * total should only ever reflect money that settled; anything less would
 * overstate earnings and undermine the "every dollar here is real" promise.
 *
 * Monetary values are returned in CENTS to avoid float drift at the UI
 * layer. `deals.compensation_amount` is stored as NUMERIC(10,2) in whole
 * dollars (per the existing schema + payouts.ts which multiplies by 100
 * when creating transfers). We convert once, here.
 *
 * All reads go through the caller's Supabase client — RLS on `deals` scopes
 * the athlete/brand to rows they're authorized to see. The page-level
 * gating (auth + role check) is still the caller's responsibility.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

const COMPLETED_STATUSES = ['paid', 'completed'] as const;

export interface AthleteEarningsSummary {
  totalEarnedCents: number;
  totalDeals: number;
  averageDealCents: number;
  highestDealCents: number;
  firstDealAt: string | null;
  mostRecentDealAt: string | null;
  /** Total earned during the current calendar month (UTC). */
  deltaThisMonthCents: number;
}

export interface BrandPerformanceSummary {
  totalSpendCents: number;
  totalDeals: number;
  /** Average days from deal creation → completion. Null if no completed deals. */
  averageCompletionDays: number | null;
  totalShareEvents: number;
  avgSharesPerDeal: number;
  firstDealAt: string | null;
  mostRecentDealAt: string | null;
}

export interface CompletedDeal {
  id: string;
  title: string;
  status: string;
  compensationCents: number;
  completedAt: string | null;
  createdAt: string;
  completionDays: number | null;
  shareCount: number;
  brandName: string;
  brandLogoUrl: string | null;
  athleteFirstName: string;
  athleteLastName: string;
  athleteSchool: string | null;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

interface DealRow {
  id: string;
  title: string;
  status: string;
  compensation_amount: number | string;
  completed_at: string | null;
  created_at: string;
  brand:
    | { id: string; company_name: string; logo_url: string | null }
    | null;
  athlete: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_id: string;
  } | null;
}

function dollarsToCents(v: number | string): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function diffInDays(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function startOfThisMonthIso(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return d.toISOString();
}

/**
 * Aggregate share-event counts for a batch of deals in a single query.
 * Returns a Map keyed by deal_id with the count. Deals with no events
 * are absent from the map (caller should default to 0).
 */
async function getShareCountsByDealIds(
  supabase: SupabaseClient,
  dealIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (dealIds.length === 0) return out;

  const { data, error } = await supabase
    .from('deal_share_events')
    .select('deal_id')
    .in('deal_id', dealIds);

  if (error || !data) return out;

  for (const row of data as Array<{ deal_id: string }>) {
    out.set(row.deal_id, (out.get(row.deal_id) ?? 0) + 1);
  }
  return out;
}

async function fetchAthleteRowId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

function mapRow(
  row: DealRow,
  shareCount: number,
  schoolByProfile: Map<string, string | null>,
): CompletedDeal {
  const completionDays =
    row.completed_at && row.created_at
      ? diffInDays(row.created_at, row.completed_at)
      : null;

  const athleteProfileId = row.athlete?.profile_id ?? null;
  const athleteSchool = athleteProfileId
    ? (schoolByProfile.get(athleteProfileId) ?? null)
    : null;

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    compensationCents: dollarsToCents(row.compensation_amount),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    completionDays,
    shareCount,
    brandName: row.brand?.company_name ?? 'Unknown brand',
    brandLogoUrl: row.brand?.logo_url ?? null,
    athleteFirstName: row.athlete?.first_name ?? 'Scholar',
    athleteLastName: row.athlete?.last_name ?? 'Athlete',
    athleteSchool,
  };
}

/**
 * Look up HS school names for a set of athlete profile ids in one query.
 * HS athletes store school_name on hs_athlete_profiles (keyed by user_id
 * == profiles.id == athletes.profile_id). College athletes may have a
 * school_id join — we skip that complexity here; dashboards that need it
 * can extend later.
 */
async function getHsSchoolsByProfileIds(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (profileIds.length === 0) return out;

  const { data, error } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id, school_name')
    .in('user_id', profileIds);

  if (error || !data) return out;

  for (const row of data as Array<{ user_id: string; school_name: string | null }>) {
    out.set(row.user_id, row.school_name ?? null);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Athlete: earnings summary + completed deals list
// ----------------------------------------------------------------------------

export async function getAthleteEarningsSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<AthleteEarningsSummary> {
  const empty: AthleteEarningsSummary = {
    totalEarnedCents: 0,
    totalDeals: 0,
    averageDealCents: 0,
    highestDealCents: 0,
    firstDealAt: null,
    mostRecentDealAt: null,
    deltaThisMonthCents: 0,
  };

  const athleteId = await fetchAthleteRowId(supabase, userId);
  if (!athleteId) return empty;

  const { data, error } = await supabase
    .from('deals')
    .select('id, status, compensation_amount, completed_at, created_at')
    .eq('athlete_id', athleteId)
    .in('status', [...COMPLETED_STATUSES])
    .order('completed_at', { ascending: true, nullsFirst: false });

  if (error || !data || data.length === 0) return empty;

  const monthStart = startOfThisMonthIso();
  let totalCents = 0;
  let highest = 0;
  let deltaMonth = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;

  for (const row of data as Array<{
    id: string;
    status: string;
    compensation_amount: number | string;
    completed_at: string | null;
    created_at: string;
  }>) {
    const cents = dollarsToCents(row.compensation_amount);
    totalCents += cents;
    if (cents > highest) highest = cents;
    const ts = row.completed_at ?? row.created_at;
    if (!firstAt || ts < firstAt) firstAt = ts;
    if (!lastAt || ts > lastAt) lastAt = ts;
    if (ts >= monthStart) deltaMonth += cents;
  }

  return {
    totalEarnedCents: totalCents,
    totalDeals: data.length,
    averageDealCents: data.length > 0 ? Math.round(totalCents / data.length) : 0,
    highestDealCents: highest,
    firstDealAt: firstAt,
    mostRecentDealAt: lastAt,
    deltaThisMonthCents: deltaMonth,
  };
}

export async function getAthleteCompletedDeals(
  supabase: SupabaseClient,
  userId: string,
  opts: ListOptions = {},
): Promise<CompletedDeal[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const athleteId = await fetchAthleteRowId(supabase, userId);
  if (!athleteId) return [];

  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, title, status, compensation_amount, completed_at, created_at,
       brand:brands(id, company_name, logo_url),
       athlete:athletes(id, first_name, last_name, profile_id)`,
    )
    .eq('athlete_id', athleteId)
    .in('status', [...COMPLETED_STATUSES])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];

  const rows = data as unknown as DealRow[];
  const shareMap = await getShareCountsByDealIds(
    supabase,
    rows.map((r) => r.id),
  );
  const profileIds = Array.from(
    new Set(
      rows
        .map((r) => r.athlete?.profile_id)
        .filter((v): v is string => typeof v === 'string'),
    ),
  );
  const schoolMap = await getHsSchoolsByProfileIds(supabase, profileIds);

  return rows.map((r) => mapRow(r, shareMap.get(r.id) ?? 0, schoolMap));
}

// ----------------------------------------------------------------------------
// Brand: performance summary + completed deals list
// ----------------------------------------------------------------------------

export async function getBrandPerformanceSummary(
  supabase: SupabaseClient,
  brandId: string,
): Promise<BrandPerformanceSummary> {
  const empty: BrandPerformanceSummary = {
    totalSpendCents: 0,
    totalDeals: 0,
    averageCompletionDays: null,
    totalShareEvents: 0,
    avgSharesPerDeal: 0,
    firstDealAt: null,
    mostRecentDealAt: null,
  };

  const { data, error } = await supabase
    .from('deals')
    .select('id, status, compensation_amount, completed_at, created_at')
    .eq('brand_id', brandId)
    .in('status', [...COMPLETED_STATUSES]);

  if (error || !data || data.length === 0) return empty;

  const rows = data as Array<{
    id: string;
    status: string;
    compensation_amount: number | string;
    completed_at: string | null;
    created_at: string;
  }>;

  let totalCents = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  const durations: number[] = [];

  for (const r of rows) {
    totalCents += dollarsToCents(r.compensation_amount);
    const ts = r.completed_at ?? r.created_at;
    if (!firstAt || ts < firstAt) firstAt = ts;
    if (!lastAt || ts > lastAt) lastAt = ts;
    if (r.completed_at) {
      const d = diffInDays(r.created_at, r.completed_at);
      if (d !== null) durations.push(d);
    }
  }

  const shareMap = await getShareCountsByDealIds(
    supabase,
    rows.map((r) => r.id),
  );
  let totalShares = 0;
  for (const n of shareMap.values()) totalShares += n;

  const avgDays =
    durations.length > 0
      ? Math.round(
          durations.reduce((acc, d) => acc + d, 0) / durations.length,
        )
      : null;

  return {
    totalSpendCents: totalCents,
    totalDeals: rows.length,
    averageCompletionDays: avgDays,
    totalShareEvents: totalShares,
    avgSharesPerDeal:
      rows.length > 0
        ? Math.round((totalShares / rows.length) * 10) / 10
        : 0,
    firstDealAt: firstAt,
    mostRecentDealAt: lastAt,
  };
}

export async function getBrandCompletedDeals(
  supabase: SupabaseClient,
  brandId: string,
  opts: ListOptions = {},
): Promise<CompletedDeal[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, title, status, compensation_amount, completed_at, created_at,
       brand:brands(id, company_name, logo_url),
       athlete:athletes(id, first_name, last_name, profile_id)`,
    )
    .eq('brand_id', brandId)
    .in('status', [...COMPLETED_STATUSES])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];

  const rows = data as unknown as DealRow[];
  const shareMap = await getShareCountsByDealIds(
    supabase,
    rows.map((r) => r.id),
  );
  const profileIds = Array.from(
    new Set(
      rows
        .map((r) => r.athlete?.profile_id)
        .filter((v): v is string => typeof v === 'string'),
    ),
  );
  const schoolMap = await getHsSchoolsByProfileIds(supabase, profileIds);

  return rows.map((r) => mapRow(r, shareMap.get(r.id) ?? 0, schoolMap));
}

// ----------------------------------------------------------------------------
// Formatting helpers (used by UI; pure so they're safe to re-export)
// ----------------------------------------------------------------------------

export function formatCentsUSD(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
