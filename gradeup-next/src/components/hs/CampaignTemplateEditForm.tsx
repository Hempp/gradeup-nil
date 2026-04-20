'use client';

/**
 * CampaignTemplateEditForm — admin authoring UI for campaign_templates.
 *
 * Client Component. Handles both create and edit modes. Calls the admin
 * API routes; the server is the role-gate source of truth.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CampaignTemplate,
  CampaignTemplateCategory,
  CampaignTemplateDealCategory,
} from '@/lib/hs-nil/campaign-templates';

const CATEGORY_OPTIONS: ReadonlyArray<{
  id: CampaignTemplateCategory;
  label: string;
}> = [
  { id: 'grand_opening', label: 'Grand Opening' },
  { id: 'back_to_school', label: 'Back-to-School' },
  { id: 'summer_camp', label: 'Summer Camp' },
  { id: 'seasonal_promo', label: 'Seasonal Promo' },
  { id: 'product_launch', label: 'Product Launch' },
  { id: 'athlete_spotlight', label: 'Athlete Spotlight' },
  { id: 'community_event', label: 'Community Event' },
  { id: 'recurring_series', label: 'Recurring Series' },
];

const DEAL_CATEGORY_OPTIONS: ReadonlyArray<{
  id: CampaignTemplateDealCategory;
  label: string;
}> = [
  { id: 'apparel', label: 'Apparel' },
  { id: 'food_beverage', label: 'Food & beverage' },
  { id: 'local_business', label: 'Local business' },
  { id: 'training', label: 'Training / camps' },
  { id: 'autograph', label: 'Autograph' },
  { id: 'social_media_promo', label: 'Social-media promo' },
];

function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export interface CampaignTemplateEditFormProps {
  mode: 'create' | 'edit';
  initial: CampaignTemplate | null;
}

const inputCls =
  'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 min-h-[44px]';

export default function CampaignTemplateEditForm({
  mode,
  initial,
}: CampaignTemplateEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [category, setCategory] = useState<CampaignTemplateCategory>(
    initial?.category ?? 'grand_opening',
  );
  const [dealCategory, setDealCategory] =
    useState<CampaignTemplateDealCategory>(initial?.dealCategory ?? 'local_business');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [compDollars, setCompDollars] = useState(
    initial ? String(Math.round(initial.suggestedCompensationCents / 100)) : '',
  );
  const [durationDays, setDurationDays] = useState(
    initial ? String(initial.suggestedDurationDays) : '14',
  );
  const [deliverables, setDeliverables] = useState(
    initial?.deliverablesTemplate ?? '',
  );
  const [sportsInput, setSportsInput] = useState(
    (initial?.targetSports ?? []).join(', '),
  );
  const [gradYearsInput, setGradYearsInput] = useState(
    (initial?.targetGradYears ?? []).join(', '),
  );
  const [heroImageUrl, setHeroImageUrl] = useState(initial?.heroImageUrl ?? '');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [displayOrder, setDisplayOrder] = useState(
    initial ? String(initial.displayOrder) : '100',
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const effectiveSlug = useMemo(
    () => (slugTouched || mode === 'edit' ? slug : deriveSlug(title)),
    [slug, slugTouched, title, mode],
  );

  const parsedSports = useMemo(
    () =>
      sportsInput
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z_]+$/.test(s))
        .slice(0, 40),
    [sportsInput],
  );
  const parsedGradYears = useMemo(
    () =>
      gradYearsInput
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 2024 && n <= 2040)
        .slice(0, 10),
    [gradYearsInput],
  );

  function validate(): string | null {
    if (title.trim().length < 1) return 'Title is required.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(effectiveSlug)) {
      return 'Slug must be kebab-case (lowercase, hyphens).';
    }
    const cents = Math.round(Number(compDollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      return 'Suggested compensation must be a non-negative number.';
    }
    const d = Number(durationDays);
    if (!Number.isInteger(d) || d < 1 || d > 365) {
      return 'Duration must be between 1 and 365 days.';
    }
    return null;
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStatus(null);

    const body = {
      slug: effectiveSlug,
      title: title.trim(),
      category,
      description,
      dealCategory,
      suggestedCompensationCents: Math.round(Number(compDollars) * 100),
      suggestedDurationDays: Number(durationDays),
      deliverablesTemplate: deliverables,
      targetSports: parsedSports,
      targetGradYears: parsedGradYears,
      heroImageUrl: heroImageUrl.trim() || null,
      published,
      displayOrder: Number(displayOrder) || 100,
    };

    const url =
      mode === 'create'
        ? '/api/hs/admin/campaign-templates'
        : `/api/hs/admin/campaign-templates/${initial!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        slug?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Save failed.');
        return;
      }
      setStatus('Saved.');
      startTransition(() => {
        router.push('/hs/admin/campaign-templates');
        router.refresh();
      });
    } catch {
      setError('Unexpected error saving.');
    }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm('Delete this template? Clone history is preserved.')) return;
    try {
      const res = await fetch(
        `/api/hs/admin/campaign-templates/${initial.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Delete failed.');
        return;
      }
      startTransition(() => {
        router.push('/hs/admin/campaign-templates');
        router.refresh();
      });
    } catch {
      setError('Unexpected error deleting.');
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8"
      noValidate
    >
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}
      {status && !error && (
        <div className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {status}
        </div>
      )}

      <Field label="Title" htmlFor="t-title">
        <input
          id="t-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Slug" htmlFor="t-slug" hint="kebab-case. Used in URLs.">
        <input
          id="t-slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={inputCls}
          disabled={mode === 'edit'}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Category" htmlFor="t-cat">
          <select
            id="t-cat"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as CampaignTemplateCategory)
            }
            className={inputCls}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deal category" htmlFor="t-dcat">
          <select
            id="t-dcat"
            value={dealCategory}
            onChange={(e) =>
              setDealCategory(e.target.value as CampaignTemplateDealCategory)
            }
            className={inputCls}
          >
            {DEAL_CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description" htmlFor="t-desc" hint="2-3 sentences selling the concept.">
        <textarea
          id="t-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} min-h-[120px] py-2`}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Suggested compensation (USD)"
          htmlFor="t-comp"
          hint="National baseline per athlete."
        >
          <input
            id="t-comp"
            type="number"
            min="0"
            step="1"
            required
            value={compDollars}
            onChange={(e) => setCompDollars(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Duration (days)" htmlFor="t-dur">
          <input
            id="t-dur"
            type="number"
            min="1"
            max="365"
            required
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Display order" htmlFor="t-ord" hint="Lower renders first.">
          <input
            id="t-ord"
            type="number"
            min="0"
            max="10000"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="Deliverables template"
        htmlFor="t-deliv"
        hint="Multi-line. Copied verbatim into brand's campaign draft."
      >
        <textarea
          id="t-deliv"
          rows={6}
          value={deliverables}
          onChange={(e) => setDeliverables(e.target.value)}
          className={`${inputCls} min-h-[160px] py-2 font-mono text-xs`}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Target sports"
          htmlFor="t-sports"
          hint="Comma-separated. e.g. basketball, football, soccer."
        >
          <input
            id="t-sports"
            value={sportsInput}
            onChange={(e) => setSportsInput(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field
          label="Target grad years"
          htmlFor="t-years"
          hint="Comma-separated. e.g. 2027, 2028."
        >
          <input
            id="t-years"
            value={gradYearsInput}
            onChange={(e) => setGradYearsInput(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Hero image URL" htmlFor="t-hero" hint="Optional.">
        <input
          id="t-hero"
          type="url"
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </Field>

      <label className="mt-4 flex items-center gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5"
        />
        Published (visible on the browse page)
      </label>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : mode === 'create' ? 'Create template' : 'Save changes'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => void remove()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-400/40 px-5 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}
