'use client';

/**
 * Admin authoring form for a case study.
 *
 * Client Component. Handles:
 *   - create (when initial === null) or update (when initial provided)
 *   - metric add/remove/reorder
 *   - quote add/remove/reorder
 *   - publish / unpublish / delete
 *   - autopopulate from an existing deal id
 *
 * Calls the admin API routes; the server is the role-gate source of truth.
 */

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CaseStudyMetricEditor,
  type MetricDraft,
  type QuoteDraft,
} from './CaseStudyMetricEditor';
import type {
  CaseStudyDetail,
  CaseStudyQuoteRole,
} from '@/lib/hs-nil/case-studies';

interface CaseStudyEditFormProps {
  mode: 'create' | 'edit';
  initial: CaseStudyDetail | null;
}

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

export function CaseStudyEditForm({ mode, initial }: CaseStudyEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [heroImageUrl, setHeroImageUrl] = useState(initial?.heroImageUrl ?? '');
  const [body, setBody] = useState(initial?.bodyMarkdown ?? '');
  const [tagsInput, setTagsInput] = useState(
    (initial?.tags ?? []).join(', '),
  );
  const [dealId, setDealId] = useState(initial?.dealId ?? '');
  const [brandId, setBrandId] = useState(initial?.brandId ?? '');
  const [featuredOrder, setFeaturedOrder] = useState<string>(
    initial?.featuredOrder !== null && initial?.featuredOrder !== undefined
      ? String(initial.featuredOrder)
      : '',
  );
  const [metrics, setMetrics] = useState<MetricDraft[]>(
    (initial?.metrics ?? []).map((m) => ({
      metricLabel: m.metricLabel,
      metricValue: m.metricValue,
      metricHint: m.metricHint,
      displayOrder: m.displayOrder,
    })),
  );
  const [quotes, setQuotes] = useState<QuoteDraft[]>(
    (initial?.quotes ?? []).map((q) => ({
      quoteBody: q.quoteBody,
      attributedRole: q.attributedRole,
      attributedName: q.attributedName,
      displayOrder: q.displayOrder,
    })),
  );
  const [autopopulateDealId, setAutopopulateDealId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const published = initial?.published ?? false;

  const effectiveSlug = useMemo(
    () => (slugTouched || mode === 'edit' ? slug : deriveSlug(title)),
    [slug, slugTouched, title, mode],
  );

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => /^[a-z0-9_]+$/.test(t))
        .slice(0, 12),
    [tagsInput],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);
      setError(null);

      const payload = {
        slug: effectiveSlug,
        title,
        subtitle: subtitle.trim() ? subtitle.trim() : null,
        heroImageUrl: heroImageUrl.trim() ? heroImageUrl.trim() : null,
        bodyMarkdown: body,
        dealId: dealId.trim() ? dealId.trim() : null,
        brandId: brandId.trim() ? brandId.trim() : null,
        tags: parsedTags,
        featuredOrder: featuredOrder.trim()
          ? Number.parseInt(featuredOrder.trim(), 10)
          : null,
        metrics,
        quotes,
      };

      startTransition(async () => {
        const url =
          mode === 'create'
            ? '/api/hs/admin/case-studies'
            : `/api/hs/admin/case-studies/${initial?.id}`;
        const method = mode === 'create' ? 'POST' : 'PATCH';
        const res = await fetch(url, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) {
          setError(json?.error ?? `Save failed (${res.status})`);
          return;
        }
        setStatus('Saved.');
        if (mode === 'create' && json?.id) {
          router.push(`/hs/admin/case-studies/${json.id}/edit`);
        } else {
          router.refresh();
        }
      });
    },
    [
      mode,
      initial?.id,
      effectiveSlug,
      title,
      subtitle,
      heroImageUrl,
      body,
      dealId,
      brandId,
      parsedTags,
      featuredOrder,
      metrics,
      quotes,
      router,
    ],
  );

  const onPublish = useCallback(async () => {
    if (!initial) return;
    setError(null);
    setStatus(null);
    const res = await fetch(
      `/api/hs/admin/case-studies/${initial.id}/publish`,
      { method: 'POST' },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setError(json?.error ?? 'Publish failed');
      return;
    }
    setStatus('Published.');
    router.refresh();
  }, [initial, router]);

  const onUnpublish = useCallback(async () => {
    if (!initial) return;
    const reason = window.prompt('Reason for unpublishing (for audit log):');
    if (reason === null) return;
    setError(null);
    setStatus(null);
    const res = await fetch(
      `/api/hs/admin/case-studies/${initial.id}/unpublish`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setError(json?.error ?? 'Unpublish failed');
      return;
    }
    setStatus('Unpublished — now a draft.');
    router.refresh();
  }, [initial, router]);

  const onDelete = useCallback(async () => {
    if (!initial) return;
    if (!window.confirm(`Permanently delete "${initial.title}"?`)) return;
    const res = await fetch(`/api/hs/admin/case-studies/${initial.id}`, {
      method: 'DELETE',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setError(json?.error ?? 'Delete failed');
      return;
    }
    router.push('/hs/admin/case-studies');
  }, [initial, router]);

  const onAutopopulate = useCallback(async () => {
    if (!initial || !autopopulateDealId.trim()) {
      setError('Enter a deal id first.');
      return;
    }
    setError(null);
    setStatus(null);
    const res = await fetch(
      `/api/hs/admin/case-studies/${initial.id}/autopopulate`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dealId: autopopulateDealId.trim() }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setError(json?.error ?? 'Autopopulate failed');
      return;
    }
    type Suggestion = {
      metricLabel: string;
      metricValue: string;
      metricHint: string | null;
      displayOrder: number;
    };
    const suggestedMetrics = (json.suggestedMetrics ?? []) as Suggestion[];
    const suggestedTags = (json.suggestedTags ?? []) as string[];
    setMetrics(suggestedMetrics);
    setDealId(autopopulateDealId.trim());
    if (json.brandId) setBrandId(String(json.brandId));
    if (suggestedTags.length > 0) {
      const merged = Array.from(
        new Set([...parsedTags, ...suggestedTags]),
      );
      setTagsInput(merged.join(', '));
    }
    setStatus(
      `Suggested metrics loaded${
        json.athleteDisplay ? ` for ${json.athleteDisplay}` : ''
      }. Review + Save to persist.`,
    );
  }, [initial, autopopulateDealId, parsedTags]);

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Core</h2>
        <label className="block text-sm">
          <span className="text-white/70">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">
            Slug (kebab-case, unique; default derived from title)
          </span>
          <input
            value={effectiveSlug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white font-mono"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Subtitle</span>
          <input
            value={subtitle ?? ''}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={300}
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Hero image URL (optional)</span>
          <input
            value={heroImageUrl ?? ''}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            maxLength={1024}
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
        </label>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="text-white/70">Deal id (anchor, optional)</span>
            <input
              value={dealId ?? ''}
              onChange={(e) => setDealId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white font-mono text-xs"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">Brand id (anchor, optional)</span>
            <input
              value={brandId ?? ''}
              onChange={(e) => setBrandId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white font-mono text-xs"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">Featured order (blank = unfeatured)</span>
            <input
              type="number"
              min={0}
              max={10000}
              value={featuredOrder}
              onChange={(e) => setFeaturedOrder(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-white/70">
            Tags (comma-separated, lowercase, [a-z0-9_])
          </span>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
          {parsedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsedTags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/80"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </label>
      </section>

      {mode === 'edit' && (
        <section className="rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Autopopulate from an existing deal
          </h2>
          <p className="text-sm text-white/70">
            Paste a completed deal id. We&apos;ll pull the brand ROI + share counts
            + completion date and pre-fill metrics. Athlete name is masked to
            first name + last initial. Review before saving.
          </p>
          <div className="flex gap-3">
            <input
              placeholder="deal id (uuid)"
              value={autopopulateDealId}
              onChange={(e) => setAutopopulateDealId(e.target.value)}
              className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white font-mono text-xs"
            />
            <Button type="button" onClick={onAutopopulate}>
              Fetch suggestions
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Stat cards (metrics)</h2>
        <CaseStudyMetricEditor
          metrics={metrics}
          onChange={setMetrics}
          quotes={quotes}
          onQuotesChange={setQuotes}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-2">
        <h2 className="text-lg font-semibold text-white">Body (Markdown)</h2>
        <p className="text-xs text-white/50">
          Supports # / ## / ### headings, **bold**, *italic*, [links](https://),
          bullet lists (-, *), numbered lists (1.), blockquotes (&gt;), and fenced code.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          maxLength={60000}
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white font-mono text-sm"
        />
      </section>

      {(status || error) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            error
              ? 'bg-red-500/10 border border-red-500/30 text-red-200'
              : 'bg-green-500/10 border border-green-500/30 text-green-200'
          }`}
        >
          {error ?? status}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {mode === 'edit' && !published && (
          <Button type="button" onClick={onPublish}>
            Publish
          </Button>
        )}
        {mode === 'edit' && published && (
          <Button type="button" variant="outline" onClick={onUnpublish}>
            Unpublish
          </Button>
        )}
        {mode === 'edit' && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            className="ml-auto"
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

// Re-export the role type for form siblings.
export type { CaseStudyQuoteRole };
