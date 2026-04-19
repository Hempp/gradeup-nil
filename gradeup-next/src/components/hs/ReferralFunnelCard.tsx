/**
 * ReferralFunnelCard — Server-Component-friendly presentation of the
 * four funnel steps for a single referrer:
 *
 *   Clicked → Signed up → Consent signed → First deal signed
 *
 * Stateless: takes numbers, renders a visually-grouped funnel with
 * drop-off percentages. Safe to render server-side or client-side.
 */

export interface ReferralFunnelStatsView {
  clicks: number;
  signupsCompleted: number;
  consentsSigned: number;
  firstDealsSigned: number;
}

interface ReferralFunnelCardProps {
  stats: ReferralFunnelStatsView;
}

function pct(n: number, of: number): string {
  if (of <= 0) return '—';
  return `${Math.round((n / of) * 100)}%`;
}

export function ReferralFunnelCard({ stats }: ReferralFunnelCardProps) {
  const steps: Array<{
    label: string;
    value: number;
    pctOfClicks: string;
    hint: string;
  }> = [
    {
      label: 'Clicked',
      value: stats.clicks,
      pctOfClicks: '100%',
      hint: 'Visitors who landed on GradeUp HS with your code.',
    },
    {
      label: 'Signed up',
      value: stats.signupsCompleted,
      pctOfClicks: pct(stats.signupsCompleted, stats.clicks),
      hint: 'Finished creating a GradeUp account (parent, athlete, or brand).',
    },
    {
      label: 'Consent signed',
      value: stats.consentsSigned,
      pctOfClicks: pct(stats.consentsSigned, stats.clicks),
      hint: 'Parents signed parental consent so deals can be reviewed.',
    },
    {
      label: 'First deal',
      value: stats.firstDealsSigned,
      pctOfClicks: pct(stats.firstDealsSigned, stats.clicks),
      hint: 'Their first NIL deal was signed and locked in.',
    },
  ];

  return (
    <section
      aria-labelledby="referral-funnel-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <h2
        id="referral-funnel-heading"
        className="font-display text-2xl text-white"
      >
        Your referral funnel
      </h2>
      <p className="mt-2 text-sm text-white/60">
        Every step someone referred by you crosses. We email you when each
        milestone happens.
      </p>

      <ol className="mt-6 grid gap-3 md:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.label}
            className="relative rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
                Step {i + 1}
              </span>
              <span className="text-xs text-white/50">{step.pctOfClicks}</span>
            </div>
            <p className="mt-2 font-display text-3xl text-white">
              {step.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {step.label}
            </p>
            <p className="mt-2 text-xs text-white/50">{step.hint}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ReferralFunnelCard;
