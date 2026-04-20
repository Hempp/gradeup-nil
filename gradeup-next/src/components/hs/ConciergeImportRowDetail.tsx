'use client';

/**
 * ConciergeImportRowDetail
 * --------------------------------------------------------------------
 * Per-row expandable detail view — renders the raw CSV row as a
 * definition list plus, when present, validation and apply errors.
 * Used inside the batch detail page's row list.
 */

import { useState } from 'react';

export interface RowDetailProps {
  rowNumber: number;
  raw: Record<string, string>;
  validationStatus: 'valid' | 'invalid';
  validationErrors: string[];
  appliedAt: string | null;
  applyError: string | null;
  createdAthleteUserId: string | null;
  createdParentUserId: string | null;
}

export function ConciergeImportRowDetail(props: RowDetailProps) {
  const [open, setOpen] = useState(false);
  const {
    rowNumber,
    raw,
    validationStatus,
    validationErrors,
    appliedAt,
    applyError,
    createdAthleteUserId,
    createdParentUserId,
  } = props;

  const rowBadge =
    validationStatus === 'invalid'
      ? 'border-red-400/40 text-red-200 bg-red-500/10'
      : appliedAt && !applyError
        ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
        : applyError
          ? 'border-amber-400/40 text-amber-200 bg-amber-500/10'
          : 'border-white/20 text-white/80 bg-white/5';

  const rowLabel =
    validationStatus === 'invalid'
      ? 'invalid'
      : appliedAt && !applyError
        ? 'applied'
        : applyError
          ? 'apply failed'
          : 'ready';

  const athleteName =
    `${raw.athlete_first_name ?? ''} ${raw.athlete_last_name ?? ''}`.trim() ||
    '—';
  const parentName =
    `${raw.parent_first_name ?? ''} ${raw.parent_last_name ?? ''}`.trim() ||
    '—';

  return (
    <li className="rounded-md border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/90">
            <span className={['mr-2 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest', rowBadge].join(' ')}>
              Row {rowNumber} · {rowLabel}
            </span>
            {athleteName} <span className="text-white/40">↔</span> {parentName}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/50">
            {raw.athlete_email ?? ''} · {raw.parent_email ?? ''} · {raw.athlete_sport ?? '—'}
          </p>
        </div>
        <span className="text-xs text-white/50">{open ? 'Hide' : 'View'}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-3 py-3 text-xs text-white/80">
          {validationErrors.length > 0 && (
            <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 p-3">
              <p className="font-semibold text-red-200">Validation errors</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {validationErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {applyError && (
            <div className="mb-3 rounded border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="font-semibold text-amber-200">Apply failed</p>
              <p className="mt-1">{applyError}</p>
              <p className="mt-1 text-white/60">
                This row is retried automatically on the next Apply click.
                Already-succeeded rows are skipped.
              </p>
            </div>
          )}

          {appliedAt && !applyError && (
            <div className="mb-3 rounded border border-emerald-400/30 bg-emerald-500/10 p-3">
              <p className="font-semibold text-emerald-200">
                Applied {new Date(appliedAt).toLocaleString()}
              </p>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                {createdAthleteUserId && (
                  <>
                    <dt className="text-white/50">Athlete user</dt>
                    <dd className="font-mono">{createdAthleteUserId}</dd>
                  </>
                )}
                {createdParentUserId && (
                  <>
                    <dt className="text-white/50">Parent user</dt>
                    <dd className="font-mono">{createdParentUserId}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {Object.entries(raw).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-white/50">{key}</dt>
                <dd className="break-words">{value || <span className="text-white/30">—</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}
