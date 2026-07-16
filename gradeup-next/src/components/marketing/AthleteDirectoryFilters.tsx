'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();

  const current = {
    state: params.get('state') ?? '',
    sport: params.get('sport') ?? '',
    grad: params.get('grad') ?? '',
    gpa: params.get('gpa') ?? '',
  };

  const update = useCallback(
    (key: 'state' | 'sport' | 'grad' | 'gpa', value: string) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      startTransition(() => router.push(qs ? `/athletes?${qs}` : '/athletes'));
    },
    [params, router],
  );

  // GPA tiers — thresholds map to the scholar-athlete narrative. Values are
  // minimums; "3.5" matches an athlete with gpa >= 3.5.
  const GPA_TIERS = [
    { value: '',    label: 'Any GPA' },
    { value: '3.0', label: '3.0+' },
    { value: '3.5', label: '3.5+ (Scholar)' },
    { value: '3.8', label: '3.8+ (Honors)' },
  ];

  return (
    <div
      aria-busy={isPending}
      className={`marketing-dark flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4${
        isPending ? ' opacity-60 transition-opacity' : ''
      }`}
    >
      <label className="flex flex-col text-xs uppercase tracking-wide text-[var(--ink-meta)]">
        State
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-[var(--hairline)] bg-[var(--cream-surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
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

      <label className="flex flex-col text-xs uppercase tracking-wide text-[var(--ink-meta)]">
        Sport
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-[var(--hairline)] bg-[var(--cream-surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
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

      <label className="flex flex-col text-xs uppercase tracking-wide text-[var(--ink-meta)]">
        Class of
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-[var(--hairline)] bg-[var(--cream-surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
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

      <label className="flex flex-col text-xs uppercase tracking-wide text-[var(--ink-meta)]">
        Scholar tier
        <select
          className="mt-1 min-w-[10rem] rounded-md border border-[var(--hairline)] bg-[var(--cream-surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
          value={current.gpa}
          onChange={(e) => update('gpa', e.target.value)}
          aria-label="Filter by minimum GPA"
        >
          {GPA_TIERS.map((tier) => (
            <option key={tier.value} value={tier.value}>
              {tier.label}
            </option>
          ))}
        </select>
      </label>

      {isPending ? (
        <span
          aria-live="polite"
          className="self-center text-xs uppercase tracking-wide text-[var(--ink-meta)]"
        >
          Updating…
        </span>
      ) : null}
    </div>
  );
}
