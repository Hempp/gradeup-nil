/**
 * HSDealCard — athlete-facing summary card for a single HS deal.
 *
 * Visual pattern mirrors OnboardingCard (dark bg, white/10 border) so deal
 * cards feel native to the /hs surface. The whole card is a link — the status
 * pill is decorative, not a separate control, so the entire hit area counts
 * toward the WCAG 2.5.5 44px touch target.
 *
 * Status pill tone is computed from the semantic DealCardStatus so callers
 * can think in product language ("waiting on you") rather than the DB enum.
 */
import Link from 'next/link';
import Image from 'next/image';

export type DealCardStatus =
  | 'awaiting_you'
  | 'awaiting_consent'
  | 'in_progress'
  | 'completed'
  | 'declined';

export interface HSDealCardProps {
  id: string;
  brandName: string;
  brandLogoUrl?: string | null;
  title: string;
  compensationAmount: number;
  status: DealCardStatus;
  /** Optional eyebrow line (e.g. deal_type label). */
  eyebrow?: string | null;
}

const STATUS_META: Record<
  DealCardStatus,
  { label: string; tone: string; sr: string }
> = {
  awaiting_you: {
    label: 'Waiting on you',
    tone: 'border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]',
    sr: 'This deal is waiting on your decision',
  },
  awaiting_consent: {
    label: 'Waiting on parent',
    tone: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    sr: 'This deal needs parental consent before it can be accepted',
  },
  in_progress: {
    label: 'In progress',
    tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    sr: 'This deal is active',
  },
  completed: {
    label: 'Completed',
    tone: 'border-white/15 bg-white/5 text-white/70',
    sr: 'This deal has been completed',
  },
  declined: {
    label: 'Declined',
    tone: 'border-white/15 bg-white/5 text-white/50',
    sr: 'This deal was declined',
  },
};

export function HSDealCard({
  id,
  brandName,
  brandLogoUrl,
  title,
  compensationAmount,
  status,
  eyebrow,
}: HSDealCardProps) {
  const meta = STATUS_META[status];
  const amountDisplay = `$${Math.round(compensationAmount).toLocaleString()}`;

  return (
    <Link
      href={`/hs/deals/${id}`}
      aria-label={`${title} with ${brandName}. ${meta.sr}. Compensation ${amountDisplay}.`}
      className="group relative block min-h-[44px] rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-900)] md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {brandLogoUrl ? (
            <Image
              src={brandLogoUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-sm font-semibold text-white/70"
            >
              {brandName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-white/50">
                {eyebrow}
              </p>
            )}
            <p className="truncate text-sm font-medium text-white/70">
              {brandName}
            </p>
          </div>
        </div>

        <p className="shrink-0 font-display text-2xl text-white md:text-3xl">
          {amountDisplay}
        </p>
      </div>

      <h3 className="mt-4 font-display text-xl text-white md:text-2xl">
        {title}
      </h3>

      <div className="mt-6 flex items-center justify-end">
        <span
          className={[
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
            meta.tone,
          ].join(' ')}
        >
          {meta.label}
        </span>
      </div>
    </Link>
  );
}

export default HSDealCard;
