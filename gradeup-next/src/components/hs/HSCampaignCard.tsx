/**
 * HSCampaignCard — athlete-facing summary card for one open campaign.
 * Whole card is a link so the 44px touch target is satisfied. The
 * "invited" badge and "consent gap" hint are decorative text inside.
 */

import Link from 'next/link';

export interface HSCampaignCardProps {
  id: string;
  title: string;
  dealCategory: string;
  baseCompensationCents: number;
  invited: boolean;
  consentCovered: boolean;
  athleteSelection: 'open_to_apply' | 'invited_only' | 'hybrid';
}

const CATEGORY_LABEL: Record<string, string> = {
  apparel: 'Apparel',
  food_beverage: 'Food & beverage',
  local_business: 'Local business',
  training: 'Training',
  autograph: 'Autograph',
  social_media_promo: 'Social-media promo',
};

export default function HSCampaignCard(props: HSCampaignCardProps) {
  const dollars = (props.baseCompensationCents / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const categoryLabel =
    CATEGORY_LABEL[props.dealCategory] ?? props.dealCategory;

  return (
    <Link
      href={`/hs/athlete/campaigns/${props.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {categoryLabel}
          </p>
          <p className="mt-1 truncate font-display text-lg text-white">
            {props.title}
          </p>
          <p className="mt-1 text-sm text-white/70">
            ${dollars} base per athlete
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {props.invited && (
            <span className="inline-flex items-center rounded-full border border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
              Invited
            </span>
          )}
          {!props.consentCovered && (
            <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              Needs consent
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
