/**
 * CampaignTemplateCard — shared card renderer for the template browse
 * surfaces (brand-facing + public marketing). Deliberately presentation-
 * only: the card does not know whether it lives on an authed or anon
 * page; the parent chooses the CTA href.
 *
 * Accessibility: the wrapping <article> uses a semantic heading (h3)
 * with an htmlFor-linked action button. Cards are keyboard-reachable
 * via the single primary <a> / <Link>.
 */

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

const DEAL_CATEGORY_LABEL: Record<string, string> = {
  apparel: 'Apparel',
  food_beverage: 'Food & Beverage',
  local_business: 'Local Business',
  training: 'Training / Camps',
  autograph: 'Autograph',
  social_media_promo: 'Social-Media Promo',
};

function formatUsd(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString()}`;
}

export interface CampaignTemplateCardProps {
  template: CampaignTemplate;
  /**
   * URL the primary CTA routes to. Brand-side uses
   * `/hs/brand/campaigns/new?template=${slug}`, marketing-side uses
   * `/hs/signup/brand?template=${slug}`.
   */
  ctaHref: string;
  /** Button label. Default: "Clone this template". */
  ctaLabel?: string;
}

export default function CampaignTemplateCard({
  template,
  ctaHref,
  ctaLabel = 'Clone this template',
}: CampaignTemplateCardProps) {
  const cardId = `tpl-${template.id}`;
  const descId = `${cardId}-desc`;
  return (
    <article
      aria-labelledby={`${cardId}-title`}
      aria-describedby={descId}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20 focus-within:border-[var(--accent-primary)]"
    >
      {template.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={template.heroImageUrl}
          alt=""
          className="mb-5 h-32 w-full rounded-xl object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          aria-hidden="true"
          className="mb-5 flex h-32 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-white/5"
        >
          <span className="font-display text-3xl text-white/30">
            {CATEGORY_LABEL[template.category]?.[0] ?? '+'}
          </span>
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        {CATEGORY_LABEL[template.category] ?? template.category}
      </p>
      <h3
        id={`${cardId}-title`}
        className="mt-2 font-display text-2xl leading-tight text-white"
      >
        {template.title}
      </h3>
      <p id={descId} className="mt-3 flex-1 text-sm leading-relaxed text-white/70">
        {template.description}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
        <div>
          <dt className="text-white/50">Category</dt>
          <dd className="mt-1 font-semibold text-white">
            {DEAL_CATEGORY_LABEL[template.dealCategory] ?? template.dealCategory}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">Suggested</dt>
          <dd className="mt-1 font-semibold text-white">
            {formatUsd(template.suggestedCompensationCents)}
            <span className="ml-1 font-normal text-white/50">
              / {template.suggestedDurationDays}d
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] leading-snug text-white/40">
        National baseline — adjust 20-30% up for CA / NY / TX.
      </p>

      <Link
        href={ctaHref}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        aria-label={`${ctaLabel} — ${template.title}`}
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
