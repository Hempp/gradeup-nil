'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { PILOT_STATES, STATE_RULES } from '@/lib/hs-nil/state-rules';

const SPORTS = [
  'football',
  'basketball',
  'soccer',
  'baseball',
  'softball',
  'volleyball',
  'track_field',
  'swimming',
  'tennis',
  'golf',
  'lacrosse',
  'wrestling',
  'cross_country',
] as const;

const CURRENT_YEAR = new Date().getUTCFullYear();
const GRAD_YEARS = [
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
  CURRENT_YEAR + 3,
  CURRENT_YEAR + 4,
];

export function AthleteDirectoryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    state: params.get('state') ?? '',
    sport: params.get('sport') ?? '',
    grad: params.get('grad') ?? '',
  };

  const update = useCallback(
    (key: 'state' | 'sport' | 'grad', value: string) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.push(qs ? `/athletes?${qs}` : '/athletes');
    },
    [params, router],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
      <label className="flex flex-col text-xs uppercase tracking-wide text-white/50">
        State
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          value={current.state}
          onChange={(e) => update('state', e.target.value)}
          aria-label="Filter by state"
        >
          <option value="">All pilot states</option>
          {PILOT_STATES.map((code) => (
            <option key={code} value={code}>
              {STATE_RULES[code]?.state ?? code}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs uppercase tracking-wide text-white/50">
        Sport
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          value={current.sport}
          onChange={(e) => update('sport', e.target.value)}
          aria-label="Filter by sport"
        >
          <option value="">All sports</option>
          {SPORTS.map((sport) => (
            <option key={sport} value={sport}>
              {sport.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs uppercase tracking-wide text-white/50">
        Class of
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          value={current.grad}
          onChange={(e) => update('grad', e.target.value)}
          aria-label="Filter by graduation year"
        >
          <option value="">Any year</option>
          {GRAD_YEARS.map((yr) => (
            <option key={yr} value={String(yr)}>
              {yr}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
