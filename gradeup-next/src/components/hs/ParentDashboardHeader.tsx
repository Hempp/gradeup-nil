/**
 * ParentDashboardHeader
 * ----------------------------------------------------------------------------
 * Top-of-page greeting + status pill stack. Keep it calm: a parent who feels
 * anxious on load won't stick around. Big display-serif greeting, subtle pill
 * row, no alarming reds unless something is genuinely urgent (pending consent
 * requests bump the pill color to amber).
 */

export interface ParentDashboardHeaderProps {
  firstName: string;
  linkedCount: number;
  activeConsentCount: number;
  pendingRequestCount: number;
}

export function ParentDashboardHeader({
  firstName,
  linkedCount,
  activeConsentCount,
  pendingRequestCount,
}: ParentDashboardHeaderProps) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Parent Dashboard
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
        Welcome, {firstName}.
      </h1>
      <p className="mt-3 max-w-2xl text-white/70 md:text-lg">
        Your athlete&rsquo;s NIL control center. Review pending requests,
        manage consent, and stay in the loop on every deal.
      </p>

      <ul
        className="mt-6 flex flex-wrap gap-2"
        aria-label="Account status"
      >
        <StatusPill
          label={linkedCount === 1 ? 'athlete linked' : 'athletes linked'}
          count={linkedCount}
          tone="neutral"
        />
        <StatusPill
          label={activeConsentCount === 1 ? 'active consent' : 'active consents'}
          count={activeConsentCount}
          tone="success"
        />
        <StatusPill
          label={
            pendingRequestCount === 1 ? 'pending request' : 'pending requests'
          }
          count={pendingRequestCount}
          tone={pendingRequestCount > 0 ? 'warning' : 'neutral'}
        />
      </ul>
    </header>
  );
}

function StatusPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const classes: Record<typeof tone, string> = {
    neutral: 'border-white/15 bg-white/5 text-white/80',
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  };
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${classes[tone]}`}
    >
      <span className="font-display text-base leading-none">{count}</span>
      <span className="text-xs">{label}</span>
    </li>
  );
}

export default ParentDashboardHeader;
