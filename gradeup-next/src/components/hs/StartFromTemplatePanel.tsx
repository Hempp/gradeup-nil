'use client';

/**
 * StartFromTemplatePanel — sits above the blank CampaignCreateForm on
 * /hs/brand/campaigns/new and offers a one-click "start from a proven
 * template" affordance. When the brand arrives via ?template=SLUG the
 * server-side page already loaded the template; this panel is the
 * DEFAULT state when no template query is present.
 *
 * The panel fetches 3-4 top templates client-side so the parent page
 * stays server-rendered + fast. Rendered collapsed-by-default as a
 * disclosure — a brand manager who already knows what they want can
 * ignore it.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CampaignTemplate } from '@/lib/hs-nil/campaign-templates';

const CATEGORY_LABEL: Record<string, string> = {
  grand_opening: 'Grand Opening',
  back_to_school: 'Back-to-School',
  summer_camp: 'Summer Camp',
  seasonal_promo: 'Seasonal Promo',
  product_launch: 'Product Launch',
  athlete_spotlight: 'Athlete Spotlight',
  community_event: 'Community Event',
  recurring_series: 'Recurring Series',
};

function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default function StartFromTemplatePanel() {
  const [templates, setTemplates] = useState<CampaignTemplate[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/hs/brand/campaign-templates?limit=4');
        if (!res.ok) return;
        const data = (await res.json()) as { templates: CampaignTemplate[] };
        if (!cancelled) setTemplates(data.templates ?? []);
      } catch {
        if (!cancelled) setTemplates([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = templates?.length ?? 0;

  return (
    <section
      aria-labelledby="sft-heading"
      className="mt-6 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="sft-heading"
            className="font-display text-lg text-white"
          >
            Start from a proven template
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Pre-filled title, compensation, deliverables, and timeline. Clone in
            a click and edit whatever you want before saving.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="sft-list"
          className="min-h-[44px] shrink-0 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:border-white/40"
        >
          {expanded ? 'Hide' : count > 0 ? `Show ${count}` : 'Show'}
        </button>
      </div>

      {expanded && (
        <div id="sft-list" className="mt-5 grid gap-3 md:grid-cols-2">
          {templates === null && (
            <p className="text-sm text-white/50" aria-live="polite">
              Loading templates...
            </p>
          )}
          {templates !== null && templates.length === 0 && (
            <p className="text-sm text-white/50">No templates available yet.</p>
          )}
          {templates !== null &&
            templates.map((t) => (
              <Link
                key={t.id}
                href={`/hs/brand/campaigns/new?template=${encodeURIComponent(t.slug)}`}
                className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[var(--accent-primary)]/60"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  {CATEGORY_LABEL[t.category] ?? t.category}
                </p>
                <h3 className="mt-1 font-semibold text-white">{t.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-white/60">
                  {t.description}
                </p>
                <p className="mt-2 text-xs text-white/70">
                  <span className="font-semibold">
                    {formatUsd(t.suggestedCompensationCents)}
                  </span>
                  <span className="text-white/40"> · {t.suggestedDurationDays}d</span>
                </p>
              </Link>
            ))}
        </div>
      )}

      <p className="mt-3 text-xs text-white/50">
        Prefer the full catalog?{' '}
        <Link
          href="/hs/brand/campaigns/templates"
          className="font-semibold text-[var(--accent-primary)] underline-offset-2 hover:underline"
        >
          Browse all templates
        </Link>
      </p>
    </section>
  );
}
