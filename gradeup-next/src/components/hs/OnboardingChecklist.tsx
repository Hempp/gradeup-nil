/**
 * OnboardingChecklist — vertical progress list for post-signup pages.
 *
 * Items render with a numbered marker (or checkmark when completed) on the
 * left and a label/hint on the right. Items can be:
 *   - completed: green check, muted text, no link
 *   - active: numbered circle, white text, clickable link
 *   - disabled: numbered circle, muted text, "Coming soon" tag
 *
 * The component is deliberately presentational — pages compose the list
 * with real data from the Supabase session / profile row.
 */

import Link from 'next/link';

export interface ChecklistItem {
  label: string;
  hint?: string;
  completed?: boolean;
  disabled?: boolean;
  /**
   * Right-hand status label. Typical values: "Required", "Coming soon",
   * "1 pending", "Verified". Ignored if completed.
   */
  status?: string;
  href?: string;
}

export interface OnboardingChecklistProps {
  items: ChecklistItem[];
}

export function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  return (
    <ol className="space-y-3">
      {items.map((item, idx) => {
        const number = idx + 1;
        const isInteractive = !item.completed && !item.disabled && item.href;

        const inner = (
          <div
            className={[
              'flex min-h-[72px] items-start gap-4 rounded-xl border p-4 transition-colors',
              item.completed
                ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5'
                : item.disabled
                  ? 'border-white/5 bg-white/[0.02] opacity-60'
                  : 'border-white/10 bg-white/5 hover:border-white/30',
            ].join(' ')}
          >
            <Marker number={number} completed={item.completed} disabled={item.disabled} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    'text-base font-medium',
                    item.completed ? 'text-white/80' : item.disabled ? 'text-white/50' : 'text-white',
                  ].join(' ')}
                >
                  {item.label}
                </span>
                {item.status && !item.completed && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/60">
                    {item.status}
                  </span>
                )}
                {item.completed && (
                  <span className="rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--accent-primary)]">
                    Done
                  </span>
                )}
              </div>
              {item.hint && (
                <p className="mt-1 text-sm text-white/60">{item.hint}</p>
              )}
            </div>
            {isInteractive && (
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-1 text-white/50"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </div>
        );

        return (
          <li key={`${number}-${item.label}`}>
            {isInteractive && item.href ? (
              <Link
                href={item.href}
                className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Marker({
  number,
  completed,
  disabled,
}: {
  number: number;
  completed?: boolean;
  disabled?: boolean;
}) {
  if (completed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-black">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span className="sr-only">Completed</span>
      </div>
    );
  }
  return (
    <div
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-lg',
        disabled
          ? 'border-white/15 text-white/40'
          : 'border-white/25 text-white',
      ].join(' ')}
      aria-hidden="true"
    >
      {number}
    </div>
  );
}

export default OnboardingChecklist;
