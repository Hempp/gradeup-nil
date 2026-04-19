/**
 * RewardPerkBadge — inline pill rendering a single active perk.
 *
 * Pure. Deliberately dense so a row of perks reads at a glance
 * on the rewards dashboard or tooltip.
 */

import type { PerkName } from '@/lib/hs-nil/referral-rewards';

const PERK_COPY: Record<PerkName, { label: string; subtitle: string }> = {
  match_priority_boost_level_1: {
    label: 'Match boost',
    subtitle: '+0.3 (90 days)',
  },
  match_priority_boost_level_2: {
    label: 'Match boost',
    subtitle: '+0.5 (permanent)',
  },
  match_priority_boost_level_3: {
    label: 'Match boost',
    subtitle: '+0.8 (permanent)',
  },
  match_priority_boost_level_4: {
    label: 'Match boost',
    subtitle: '+1.0 (permanent)',
  },
  trajectory_extended_ttl: {
    label: 'Extended shares',
    subtitle: '+60 days per share',
  },
  waitlist_invite_priority: {
    label: 'Priority activation',
    subtitle: 'Front of batch',
  },
  concierge_direct_line: {
    label: 'Founder line',
    subtitle: 'Direct access',
  },
};

interface RewardPerkBadgeProps {
  perkName: PerkName;
  expiresAt?: string | null;
  /** Force a compact (single-line) render. Defaults to full pill. */
  compact?: boolean;
}

function formatExpiry(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RewardPerkBadge({
  perkName,
  expiresAt,
  compact = false,
}: RewardPerkBadgeProps) {
  const copy = PERK_COPY[perkName] ?? {
    label: perkName,
    subtitle: '',
  };
  const expiryText = formatExpiry(expiresAt);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/80">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
        {copy.label}
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span
          className="h-2 w-2 rounded-full bg-[var(--accent-primary)]"
          aria-hidden="true"
        />
        {copy.label}
      </div>
      <div className="mt-0.5 text-xs text-white/60">{copy.subtitle}</div>
      {expiryText ? (
        <div className="mt-1 text-[11px] font-mono uppercase tracking-widest text-white/40">
          expires {expiryText}
        </div>
      ) : null}
    </div>
  );
}

export default RewardPerkBadge;
