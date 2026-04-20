/**
 * AnnualReportKeyFindingCard — renders one of the 5 key findings.
 *
 * Server Component. The `sourceField` is visible to admins in the
 * preview to help fact-check the number before publishing.
 */

import React from 'react';
import type { KeyFinding } from '@/lib/hs-nil/annual-report-narrative';

export interface AnnualReportKeyFindingCardProps {
  finding: KeyFinding;
  index: number;
  showSource?: boolean;
}

export default function AnnualReportKeyFindingCard({
  finding,
  index,
  showSource = false,
}: AnnualReportKeyFindingCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Finding {String(index + 1).padStart(2, '0')}
      </p>
      <h3 className="mt-2 font-display text-lg text-white md:text-xl">
        {finding.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{finding.body}</p>
      {showSource ? (
        <p className="mt-3 text-xs font-mono text-white/40">
          source: <code>{finding.sourceField}</code>
        </p>
      ) : null}
    </article>
  );
}
