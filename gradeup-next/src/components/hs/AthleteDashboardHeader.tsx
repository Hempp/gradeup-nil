/**
 * AthleteDashboardHeader — top section of /hs/athlete.
 *
 * Greeting + school/sport line + status pills. Pure presentational.
 * The parent page builds the pill list based on DB state so the header
 * itself doesn't have to know about Supabase.
 *
 * Pills use an ARIA live region so dynamic updates (e.g. "Consent active"
 * flipping on) are announced to assistive tech without a full nav.
 */
import type { ReactNode } from 'react';

export type StatusPillTone = 'success' | 'warning' | 'neutral';

export interface StatusPill {
  label: string;
  tone: StatusPillTone;
  /** Optional longer description for screen readers. */
  srLabel?: string;
}

export interface AthleteDashboardHeaderProps {
  firstName: string;
  school?: string | null;
  sport?: string | null;
  pills: StatusPill[];
  /** Optional right-side slot for CTAs (e.g. "Edit profile"). */
  action?: ReactNode;
}

const TONE_CLS: Record<StatusPillTone, string> = {
  // Accent-primary for wins, amber for attention, muted for neutral facts.
  success:
    'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
  warning: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  neutral: 'border-white/15 bg-white/5 text-white/70',
};

export function AthleteDashboardHeader({
  firstName,
  school,
  sport,
  pills,
  action,
}: AthleteDashboardHeaderProps) {
  const metaParts = [sport, school].filter(
    (v): v is string => Boolean(v && v.trim()),
  );

  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Athlete dashboard
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
          Welcome back, {firstName}.
        </h1>
        {metaParts.length > 0 && (
          <p className="mt-2 text-sm text-white/60">{metaParts.join(' • ')}</p>
        )}

        {pills.length > 0 && (
          <ul
            aria-live="polite"
            aria-label="Account status"
            className="mt-5 flex flex-wrap gap-2"
          >
            {pills.map((p) => (
              <li
                key={`${p.tone}-${p.label}`}
                className={[
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                  TONE_CLS[p.tone],
                ].join(' ')}
              >
                <span aria-hidden="true">{p.label}</span>
                <span className="sr-only">{p.srLabel ?? p.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export default AthleteDashboardHeader;
