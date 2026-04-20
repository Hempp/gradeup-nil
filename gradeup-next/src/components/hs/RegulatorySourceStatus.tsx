/**
 * RegulatorySourceStatus — per-source health indicator tile.
 *
 * Server-safe. Shows state/URL, last-checked, last-changed, and a
 * ForceRecheckButton (Client Component imported from a sibling file).
 */

import { ForceRecheckButton } from './ForceRecheckButton';

export interface RegulatorySourceStatusProps {
  id: string;
  stateCode: string;
  sourceUrl: string;
  sourceType: string;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  placeholderUrl?: boolean;
  active: boolean;
}

function ageLabel(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function staleTone(lastChecked: string | null): string {
  if (!lastChecked) return 'text-amber-200';
  const days =
    (Date.now() - new Date(lastChecked).getTime()) / (24 * 60 * 60 * 1000);
  if (days > 14) return 'text-[var(--color-error,#DA2B57)]';
  if (days > 9) return 'text-amber-200';
  return 'text-white/70';
}

export function RegulatorySourceStatus(props: RegulatorySourceStatusProps) {
  return (
    <li className="rounded-lg border border-white/10 bg-black/30 p-3 md:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            <span className="mr-2 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/70">
              {props.stateCode}
            </span>
            <span className="align-middle text-white/70">
              {props.sourceType}
            </span>
            {!props.active && (
              <span className="ml-2 rounded-full border border-white/30 px-2 py-0.5 text-[10px] uppercase text-white/60">
                inactive
              </span>
            )}
            {props.placeholderUrl && (
              <span className="ml-2 rounded-full border border-amber-400/50 px-2 py-0.5 text-[10px] uppercase text-amber-200">
                placeholder URL
              </span>
            )}
          </p>
          <p className="mt-1 break-all text-xs text-white/50">
            {props.sourceUrl}
          </p>
        </div>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-white/50">Last checked</dt>
        <dd className={['text-right', staleTone(props.lastCheckedAt)].join(' ')}>
          {ageLabel(props.lastCheckedAt)}
        </dd>
        <dt className="text-white/50">Last changed</dt>
        <dd className="text-right text-white/70">
          {ageLabel(props.lastChangedAt)}
        </dd>
      </dl>
      <div className="mt-3 flex justify-end">
        <ForceRecheckButton sourceId={props.id} stateCode={props.stateCode} />
      </div>
    </li>
  );
}

export default RegulatorySourceStatus;
