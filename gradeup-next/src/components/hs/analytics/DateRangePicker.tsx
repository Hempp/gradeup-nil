'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * DateRangePicker — URL-persisted ?from=YYYY-MM-DD&to=YYYY-MM-DD control.
 *
 * Preserves all other query parameters so it can coexist with StateFilter
 * and future filters without stomping state. Submit is a form action so
 * that the page can be SSR-rendered with the new range.
 */

interface Props {
  /** Default days if URL params missing — purely for the placeholder. */
  defaultDays: number;
}

function isoToYmd(iso: string): string {
  return iso.slice(0, 10);
}

function daysAgoYmd(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DateRangePicker({ defaultDays }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const fromDefault = useMemo(() => daysAgoYmd(defaultDays), [defaultDays]);
  const toDefault = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fromValue = searchParams.get('from') ?? fromDefault;
  const toValue = searchParams.get('to') ?? toDefault;

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const from = String(fd.get('from') ?? '').trim();
      const to = String(fd.get('to') ?? '').trim();
      const params = new URLSearchParams(searchParams.toString());
      if (from) params.set('from', from);
      else params.delete('from');
      if (to) params.set('to', to);
      else params.delete('to');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname]
  );

  const ymdRe = '\\d{4}-\\d{2}-\\d{2}';

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
      aria-label="Date range filter"
    >
      <label className="flex flex-col text-xs">
        <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
          From
        </span>
        <input
          name="from"
          type="date"
          defaultValue={isoToYmd(fromValue)}
          pattern={ymdRe}
          className="w-40 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>
      <label className="flex flex-col text-xs">
        <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
          To
        </span>
        <input
          name="to"
          type="date"
          defaultValue={isoToYmd(toValue)}
          pattern={ymdRe}
          className="w-40 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--accent-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-black"
      >
        Apply
      </button>
    </form>
  );
}
