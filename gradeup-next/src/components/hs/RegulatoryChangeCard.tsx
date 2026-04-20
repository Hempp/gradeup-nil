/**
 * RegulatoryChangeCard — one item in the /hs/admin/regulatory-monitor queue.
 *
 * Server-safe React. Shows:
 *   - State code + source URL
 *   - Detection timestamp
 *   - Diff summary (already a short string from the service layer)
 *   - Link to the per-event review page
 *
 * The review action is NOT inline here — a change event often needs the
 * admin to open the source URL in a new tab, compare by eye, and then
 * record a structured outcome. That workflow lives on /events/[id].
 */

import Link from 'next/link';

export interface RegulatoryChangeCardProps {
  eventId: string;
  stateCode: string;
  sourceUrl: string;
  detectedAt: string;
  diffSummary: string | null;
  reviewOutcome?:
    | 'no_change'
    | 'minor_update'
    | 'rule_change'
    | 'unable_to_parse'
    | null;
  unreviewed?: boolean;
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function outcomeBadge(
  outcome: RegulatoryChangeCardProps['reviewOutcome']
): { label: string; cls: string } {
  switch (outcome) {
    case 'rule_change':
      return {
        label: 'rule change',
        cls: 'border-[var(--color-error,#DA2B57)]/60 text-[var(--color-error,#DA2B57)]',
      };
    case 'minor_update':
      return {
        label: 'minor update',
        cls: 'border-amber-400/60 text-amber-200',
      };
    case 'no_change':
      return {
        label: 'no change',
        cls: 'border-emerald-400/40 text-emerald-200',
      };
    case 'unable_to_parse':
      return {
        label: 'fetch failed',
        cls: 'border-white/40 text-white/70',
      };
    default:
      return {
        label: 'unreviewed',
        cls: 'border-[var(--accent-primary)]/50 text-[var(--accent-primary)]',
      };
  }
}

export function RegulatoryChangeCard(props: RegulatoryChangeCardProps) {
  const badge = outcomeBadge(props.reviewOutcome);
  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg text-white">
            <span className="mr-2 rounded border border-white/15 bg-black/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-white/70">
              {props.stateCode}
            </span>
            <span className="truncate align-middle text-sm text-white/80">
              {props.sourceUrl}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/50">
            Detected {formatAge(props.detectedAt)}
          </p>
        </div>
        <span
          className={[
            'whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
            badge.cls,
          ].join(' ')}
        >
          {badge.label}
        </span>
      </header>

      <p className="mt-3 break-words text-sm text-white/80">
        {props.diffSummary ?? '(no diff summary)'}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/hs/admin/regulatory-monitor/events/${encodeURIComponent(
            props.eventId
          )}`}
          className="text-xs font-semibold text-[var(--accent-primary)] underline-offset-4 hover:underline"
        >
          Review event →
        </Link>
        <a
          href={props.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white/80"
        >
          Open source page ↗
        </a>
      </footer>
    </li>
  );
}

export default RegulatoryChangeCard;
