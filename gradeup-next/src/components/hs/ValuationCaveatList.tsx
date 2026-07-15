'use client';

/**
 * Plain-language caveats rendered under a valuation result. Intentionally
 * understated — the honest framing (v1 estimate, real market varies)
 * is what makes parents trust the number rather than tune it out.
 */

import { AlertCircle, Info } from 'lucide-react';

interface ValuationCaveatListProps {
  caveats: string[];
}

export function ValuationCaveatList({ caveats }: ValuationCaveatListProps) {
  if (caveats.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
        <Info className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
        Things to know
      </div>
      <ul className="space-y-2.5">
        {caveats.map((caveat, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm leading-relaxed text-[var(--ink-muted)]"
          >
            <AlertCircle
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--ink-meta)]"
              aria-hidden="true"
            />
            <span>{caveat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ValuationCaveatList;
