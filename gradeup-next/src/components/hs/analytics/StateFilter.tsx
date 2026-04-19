'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * StateFilter — URL-persisted ?state=XX dropdown. Preserves other params.
 */

interface Props {
  /** Options: [{code:'CA', label:'California'}, ...]. "all" is injected at top. */
  options: Array<{ code: string; label: string }>;
}

export default function StateFilter({ options }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = searchParams.get('state') ?? 'all';

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      const v = e.target.value;
      if (!v || v === 'all') params.delete('state');
      else params.set('state', v);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname]
  );

  return (
    <label className="flex flex-col text-xs">
      <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
        State
      </span>
      <select
        name="state"
        defaultValue={current}
        onChange={onChange}
        className="w-40 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
      >
        <option value="all">All states</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label} ({o.code})
          </option>
        ))}
      </select>
    </label>
  );
}
