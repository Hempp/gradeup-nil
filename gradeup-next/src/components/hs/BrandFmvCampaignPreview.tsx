'use client';

/**
 * Renders a "what this campaign would look like if posted today" preview
 * for brands who want to sanity-check before signing up.
 *
 * Mirrors the shape that BrandDealCreateForm / CampaignCreateForm will
 * produce on the post-signup side, but rendered read-only from the FMV
 * calculator inputs alone. Intentionally uses the same visual language
 * as HSCampaignCard so the brand gets a continuous experience from
 * "play with numbers" -> "create the real thing".
 */

import { Clock, MapPin, Target, Users } from 'lucide-react';
import {
  formatValuationCents,
  DELIVERABLE_LABELS,
  BRAND_VERTICAL_LABELS,
  SPORT_LABELS,
  GRAD_LABELS,
  FOLLOWER_LABELS,
  type BrandValuationInput,
  type BrandValuationResult,
} from '@/lib/hs-nil/valuation';
import { STATE_RULES } from '@/lib/hs-nil/state-rules';

interface BrandFmvCampaignPreviewProps {
  input: BrandValuationInput;
  result: BrandValuationResult;
}

export function BrandFmvCampaignPreview({
  input,
  result,
}: BrandFmvCampaignPreviewProps) {
  const deliverableLabel = DELIVERABLE_LABELS[input.brand.deliverableType];
  const verticalLabel = BRAND_VERTICAL_LABELS[input.brand.vertical];
  const sportLabel = SPORT_LABELS[input.sport];
  const gradLabel = GRAD_LABELS[input.gradLevel];
  const followerLabel = FOLLOWER_LABELS[input.followerCountBucket];
  const rules = STATE_RULES[input.stateCode];

  // Generate a suggested campaign title from the brand vertical + sport.
  // Deterministic, no randomness, so the preview is stable on re-render.
  const suggestedTitle = buildSuggestedTitle(input);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Campaign preview
      </div>
      <h3 className="font-display text-2xl text-white">{suggestedTitle}</h3>
      <p className="mt-2 text-sm text-white/60">
        This is roughly what your brief would look like on GradeUp HS
        today. You can edit everything after signup.
      </p>

      {/* Meta row */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewRow
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
          label="Vertical"
          value={verticalLabel}
        />
        <PreviewRow
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Athletes"
          value={`${input.brand.athleteCount} x ${sportLabel}`}
        />
        <PreviewRow
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
          label="Market"
          value={`${input.stateCode} HS (${gradLabel})`}
        />
        <PreviewRow
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          label="Deliverable"
          value={deliverableLabel}
        />
      </div>

      {/* Athlete profile criteria */}
      <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Athlete criteria
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Tag>{sportLabel}</Tag>
          <Tag>{input.stateCode}</Tag>
          <Tag>{gradLabel}</Tag>
          <Tag>{followerLabel} followers</Tag>
          {input.verifiedGpa && <Tag tone="gold">Verified GPA</Tag>}
          {input.tierBSubmitted && (
            <Tag tone="gold">Transcript on file</Tag>
          )}
        </div>
      </div>

      {/* Compensation block */}
      <div className="mt-5 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
          Compensation (per athlete)
        </div>
        <div className="mt-1 font-display text-2xl text-white">
          {formatValuationCents(result.perDeliverableCents.low)}
          <span className="mx-2 text-white/40">&ndash;</span>
          {formatValuationCents(result.perDeliverableCents.high)}
        </div>
        <div className="mt-1 text-xs text-white/60">
          Campaign total:{' '}
          {formatValuationCents(result.campaignTotalCents.low)}
          {' '}&ndash;{' '}
          {formatValuationCents(result.campaignTotalCents.high)}
        </div>
      </div>

      {/* Deliverable terms */}
      <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Deliverable terms
        </div>
        <ul className="mt-2 space-y-1 text-sm text-white/80">
          {buildDeliverableTerms(input).map((term, i) => (
            <li key={i}>&middot; {term}</li>
          ))}
        </ul>
      </div>

      {/* State-rule flags */}
      {rules && (
        <div className="mt-5 rounded-lg border border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)]">
            State rules pre-check ({input.stateCode})
          </div>
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            <li>
              &middot; Status: <strong>{rules.status}</strong>
            </li>
            {rules.disclosureWindowHours !== null && (
              <li>
                &middot; Disclosure window: {rules.disclosureWindowHours}h
                to {rules.disclosureRecipient ?? 'recipient TBD'}
              </li>
            )}
            {rules.bannedCategories.length > 0 && (
              <li>
                &middot; Banned categories:{' '}
                {rules.bannedCategories.join(', ')}
              </li>
            )}
            {rules.paymentDeferredUntilAge18 && (
              <li>
                &middot; Payments custodial-trust until age 18
              </li>
            )}
          </ul>
        </div>
      )}

      {input.brand.campaignNotes && (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Your notes
          </div>
          <p className="mt-1 text-sm italic text-white/70">
            &ldquo;{input.brand.campaignNotes}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

function buildSuggestedTitle(input: BrandValuationInput): string {
  const vertical = BRAND_VERTICAL_LABELS[input.brand.vertical];
  const sport = SPORT_LABELS[input.sport];
  const n = input.brand.athleteCount;
  if (n === 1) {
    return `${vertical} x ${sport} HS Athlete — ${input.stateCode}`;
  }
  return `${vertical} x ${n} ${sport} HS Athletes — ${input.stateCode}`;
}

function buildDeliverableTerms(input: BrandValuationInput): string[] {
  switch (input.brand.deliverableType) {
    case 'single_post':
      return [
        'One social post (IG / TikTok / X) featuring the brand.',
        '7-day minimum visibility after posting.',
        'Athlete retains content; brand receives usage rights for 30 days.',
      ];
    case 'three_post_series':
      return [
        'Three posts across 2-4 weeks (series cadence).',
        'Tagging + hashtag requirements per brand brief.',
        'Bundle pricing applied (2.2x single-post, not 3x).',
      ];
    case 'in_person_appearance':
      return [
        'One in-person appearance (store visit, event, clinic).',
        'Duration: up to 2 hours on-site.',
        'One wrap-up social post within 48h of the event.',
      ];
    case 'multi_month_campaign':
      return [
        'Multi-month engagement (typically 3-6 months).',
        'Monthly post cadence + optional in-person touchpoint.',
        'Category exclusivity negotiable at signing.',
      ];
  }
}

function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'gold';
}) {
  const cls =
    tone === 'gold'
      ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] ring-[var(--accent-gold)]/20'
      : 'bg-white/5 text-white/70 ring-white/10';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function PreviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
        {icon}
      </span>
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50">
          {label}
        </div>
        <div className="text-sm font-medium text-white">{value}</div>
      </div>
    </div>
  );
}

export default BrandFmvCampaignPreview;
