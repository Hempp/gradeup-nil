'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { PILOT_STATES, STATE_RULES } from '@/lib/hs-nil/state-rules';

const DEAL_CATEGORIES = [
  'apparel',
  'food_beverage',
  'local_business',
  'training',
  'autograph',
  'social_media_promo',
] as const;

export function BrandDirectoryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    state: params.get('state') ?? '',
    category: params.get('category') ?? '',
  };

  const update = useCallback(
    (key: 'state' | 'category', value: string) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.push(qs ? `/brands?${qs}` : '/brands');
    },
    [params, router],
  );

  return (
    <div className="marketing-dark flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4">
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
        Deal category
        <select
          className="mt-1 min-w-[12rem] rounded-md border border-[var(--hairline)] bg-[var(--cream-surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
          value={current.category}
          onChange={(e) => update('category', e.target.value)}
          aria-label="Filter by deal category"
        >
          <option value="">All categories</option>
          {DEAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
