'use client';

/**
 * AnnualReportRangeSelector — client-side admin time-window picker for the
 * /hs/admin/annual-report page. Updates the URL query params so preview /
 * data / export buttons all see the same range without re-entry.
 *
 * Usage:
 *   <AnnualReportRangeSelector
 *     defaultYear={2026}
 *     defaultFrom="2026-04-20"
 *     defaultTo="2026-05-20"
 *   />
 */

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface AnnualReportRangeSelectorProps {
  defaultYear: number;
  defaultFrom?: string; // YYYY-MM-DD
  defaultTo?: string; // YYYY-MM-DD
}

const PRESETS: Array<{ id: string; label: string; apply: () => { from: string; to: string } }> = [
  {
    id: 'last-30',
    label: 'Last 30 days (concierge window)',
    apply: () => {
      const now = new Date();
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return { from: start, to: end };
    },
  },
  {
    id: 'last-90',
    label: 'First quarter (90 days)',
    apply: () => {
      const now = new Date();
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return { from: start, to: end };
    },
  },
  {
    id: 'ytd',
    label: 'Year to date',
    apply: () => {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
        .toISOString()
        .slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      return { from: start, to: end };
    },
  },
  {
    id: 'full-year',
    label: 'Full calendar year',
    apply: () => {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
        .toISOString()
        .slice(0, 10);
      const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31))
        .toISOString()
        .slice(0, 10);
      return { from: start, to: end };
    },
  },
];

export default function AnnualReportRangeSelector({
  defaultYear,
  defaultFrom,
  defaultTo,
}: AnnualReportRangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentYear = searchParams.get('year') ?? String(defaultYear);
  const currentFrom = searchParams.get('from') ?? defaultFrom ?? '';
  const currentTo = searchParams.get('to') ?? defaultTo ?? '';

  function pushParams(update: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(update)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    pushParams({
      year: String(formData.get('year') ?? defaultYear),
      from: String(formData.get('from') ?? '') || null,
      to: String(formData.get('to') ?? '') || null,
    });
  }

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const { from, to } = preset.apply();
    pushParams({ year: currentYear, from, to });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-widest text-white/60">
          Reporting window
        </legend>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/50">Report year</span>
            <input
              type="number"
              name="year"
              min={2025}
              max={2100}
              defaultValue={currentYear}
              className="w-full rounded bg-black/40 px-3 py-2 font-mono text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/50">Window start</span>
            <input
              type="date"
              name="from"
              defaultValue={currentFrom}
              className="w-full rounded bg-black/40 px-3 py-2 font-mono text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/50">Window end</span>
            <input
              type="date"
              name="to"
              defaultValue={currentTo}
              className="w-full rounded bg-black/40 px-3 py-2 font-mono text-sm text-white"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:opacity-90"
          >
            Apply
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="rounded border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
