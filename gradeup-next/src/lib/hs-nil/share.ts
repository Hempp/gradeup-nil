/**
 * HS-NIL Share-the-Win Service
 * ----------------------------------------------------------------------------
 * Backs the celebration page + the brand's share-metrics card. Three
 * responsibilities:
 *
 *   1. `getShareTemplatesForDeal(dealId)` — pulls brand-authored templates
 *      from `deal_share_templates` and, when a row for a supported platform
 *      is absent, returns a synthesized default built from deal metadata.
 *      Defaults are NEVER persisted — they are ephemeral render fallbacks.
 *
 *   2. `recordShareEvent({ dealId, userId, userRole, platform, templateId,
 *      userAgent })` — appends a row to `deal_share_events`. Used by the
 *      /api/hs/deals/[id]/share-event handler. RLS guarantees the user can
 *      only insert events on their own user_id.
 *
 *   3. `getShareCountsForDeal(dealId)` — aggregates event rows for the
 *      brand's share-metrics card. Returns per-platform counts plus
 *      first-share and most-recent-share timestamps.
 *
 * Placeholder strategy:
 *   Stored templates and default templates both use the curly-brace form
 *   `{athleteFirstName}`, `{brandName}`, `{schoolName}`. We substitute via
 *   `String.prototype.replace` and never evaluate the string in any dynamic
 *   code path. Dollar-brace form is deliberately NOT supported so that a
 *   JS template literal accidentally re-interpolating would fail noisily
 *   instead of silently leaking a local symbol.
 *
 *   Note that default template copy contains emoji (user-facing social
 *   copy that a parent would actually post). Emojis are ONLY in the
 *   literal default-copy strings below — nowhere else.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type SharePlatform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'generic';
export type EventPlatform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'copy_link';
export type UserRole = 'athlete' | 'parent';

export interface ShareTemplate {
  id: string | null; // null when the row was synthesized as a default
  platform: SharePlatform;
  copyTemplate: string;
  hashtags: string[] | null;
  isDefault: boolean;
}

export interface RenderedShareTemplate extends ShareTemplate {
  /** `copyTemplate` after placeholders have been substituted. */
  renderedCopy: string;
}

export interface ShareRenderContext {
  athleteFirstName: string;
  brandName: string;
  schoolName: string;
}

export interface RecordShareEventInput {
  dealId: string;
  userId: string;
  userRole: UserRole;
  platform: EventPlatform;
  templateId?: string | null;
  userAgent?: string | null;
}

export interface ShareCounts {
  total: number;
  byPlatform: Record<EventPlatform, number>;
  firstShareAt: string | null;
  lastShareAt: string | null;
}

// ----------------------------------------------------------------------------
// Default templates (ephemeral fallback when the brand hasn't authored one)
// ----------------------------------------------------------------------------
//
// The default copy intentionally contains emoji — these strings are the
// literal text a parent would paste into an Instagram post. Emojis are
// scoped to the template-string value only; they are not used in any
// other code, comment, or identifier in this codebase.

export const DEFAULT_TEMPLATES: Record<SharePlatform, { copy: string; hashtags: string[] | null }> = {
  instagram: {
    copy: '{athleteFirstName} just earned their first NIL deal with {brandName}. Proud of the hustle AND the grades. 📚🏆 #GradeUpNIL',
    hashtags: ['GradeUpNIL', 'ScholarAthlete'],
  },
  linkedin: {
    copy: 'Thrilled to see {athleteFirstName} earn a partnership with {brandName} as a scholar-athlete. Their dedication to both academics and athletics is the future of NIL.',
    hashtags: ['NIL', 'ScholarAthlete', 'GradeUpNIL'],
  },
  x: {
    copy: '{athleteFirstName} 📚 + {brandName} 🏆. First NIL deal, verified GPA, all of 16 years old. Proud mom post. #GradeUpNIL',
    hashtags: ['GradeUpNIL'],
  },
  tiktok: {
    copy: '{athleteFirstName} just landed their first NIL deal with {brandName}. Scholar-athlete life. 📚🏆 #GradeUpNIL',
    hashtags: ['GradeUpNIL', 'ScholarAthlete'],
  },
  generic: {
    copy: "I'm excited to announce my partnership with {brandName} — my first NIL deal as a scholar-athlete at {schoolName}.",
    hashtags: null,
  },
};

export const SUPPORTED_SHARE_PLATFORMS: SharePlatform[] = [
  'instagram',
  'linkedin',
  'x',
  'tiktok',
  'generic',
];

// ----------------------------------------------------------------------------
// Placeholder substitution
// ----------------------------------------------------------------------------
//
// Safe substitution: exact-match `{key}` tokens only. No regex backreferences,
// no dynamic-eval paths. Unknown placeholders are left as-is (brand authors
// see exactly what was left unfilled so they can catch typos).

const PLACEHOLDER_RE = /\{(athleteFirstName|brandName|schoolName)\}/g;

export function renderShareCopy(template: string, ctx: ShareRenderContext): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    switch (key) {
      case 'athleteFirstName':
        return ctx.athleteFirstName;
      case 'brandName':
        return ctx.brandName;
      case 'schoolName':
        return ctx.schoolName;
      default:
        return _match;
    }
  });
}

// ----------------------------------------------------------------------------
// getShareTemplatesForDeal
// ----------------------------------------------------------------------------

interface StoredTemplateRow {
  id: string;
  platform: SharePlatform;
  copy_template: string;
  hashtags: string[] | null;
}

/**
 * Fetch brand-authored templates and synthesize defaults for any missing
 * platform. Always returns one template per supported platform, in a
 * stable order.
 *
 * Pass `ctx` to get `renderedCopy` filled in. If `ctx` is omitted, the
 * caller should render later (e.g. the brand-side form editor).
 */
export async function getShareTemplatesForDeal(
  supabase: SupabaseClient,
  dealId: string,
  ctx?: ShareRenderContext,
): Promise<RenderedShareTemplate[]> {
  const { data, error } = await supabase
    .from('deal_share_templates')
    .select('id, platform, copy_template, hashtags')
    .eq('deal_id', dealId);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/share] getShareTemplatesForDeal failed — falling back to defaults', {
      dealId,
      error: error.message,
    });
  }

  const stored = (data ?? []) as StoredTemplateRow[];
  const byPlatform = new Map<SharePlatform, StoredTemplateRow>();
  for (const row of stored) {
    byPlatform.set(row.platform, row);
  }

  return SUPPORTED_SHARE_PLATFORMS.map((platform) => {
    const row = byPlatform.get(platform);
    if (row) {
      const copyTemplate = row.copy_template;
      return {
        id: row.id,
        platform,
        copyTemplate,
        hashtags: row.hashtags,
        isDefault: false,
        renderedCopy: ctx ? renderShareCopy(copyTemplate, ctx) : copyTemplate,
      };
    }
    const fallback = DEFAULT_TEMPLATES[platform];
    return {
      id: null,
      platform,
      copyTemplate: fallback.copy,
      hashtags: fallback.hashtags,
      isDefault: true,
      renderedCopy: ctx ? renderShareCopy(fallback.copy, ctx) : fallback.copy,
    };
  });
}

// ----------------------------------------------------------------------------
// recordShareEvent
// ----------------------------------------------------------------------------

export interface RecordShareEventResult {
  ok: boolean;
  eventId?: string;
  reason?: string;
}

export async function recordShareEvent(
  supabase: SupabaseClient,
  input: RecordShareEventInput,
): Promise<RecordShareEventResult> {
  const { dealId, userId, userRole, platform, templateId, userAgent } = input;

  const { data, error } = await supabase
    .from('deal_share_events')
    .insert({
      deal_id: dealId,
      user_id: userId,
      user_role: userRole,
      platform,
      template_id: templateId ?? null,
      user_agent: userAgent ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true, eventId: (data as { id: string }).id };
}

// ----------------------------------------------------------------------------
// getShareCountsForDeal
// ----------------------------------------------------------------------------

interface EventRow {
  platform: EventPlatform;
  created_at: string;
}

export async function getShareCountsForDeal(
  supabase: SupabaseClient,
  dealId: string,
): Promise<ShareCounts> {
  const empty: ShareCounts = {
    total: 0,
    byPlatform: {
      instagram: 0,
      linkedin: 0,
      x: 0,
      tiktok: 0,
      copy_link: 0,
    },
    firstShareAt: null,
    lastShareAt: null,
  };

  const { data, error } = await supabase
    .from('deal_share_events')
    .select('platform, created_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return empty;
  }

  const rows = data as EventRow[];
  if (rows.length === 0) return empty;

  const counts: ShareCounts = {
    ...empty,
    byPlatform: { ...empty.byPlatform },
    total: rows.length,
    firstShareAt: rows[0].created_at,
    lastShareAt: rows[rows.length - 1].created_at,
  };

  for (const r of rows) {
    if (r.platform in counts.byPlatform) {
      counts.byPlatform[r.platform] += 1;
    }
  }
  return counts;
}
