/**
 * AnnualReportExecutiveSummary — top-of-report prose block.
 *
 * Server Component. Takes a pre-generated summary string (from
 * annual-report-narrative.ts::generateExecutiveSummary) so the founder
 * can swap in their hand-edited version without touching this file.
 */

import React from 'react';

export interface AnnualReportExecutiveSummaryProps {
  reportLabel: string;
  rangeStart: string;
  rangeEnd: string;
  summary: string;
}

export default function AnnualReportExecutiveSummary({
  reportLabel,
  rangeStart,
  rangeEnd,
  summary,
}: AnnualReportExecutiveSummaryProps) {
  const paragraphs = summary.split('\n\n').filter(Boolean);
  return (
    <section
      id="executive-summary"
      aria-labelledby="exec-summary-heading"
      className="rounded-xl border border-white/10 bg-[var(--marketing-gray-800)] p-6"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {reportLabel}
        </p>
        <h2
          id="exec-summary-heading"
          className="mt-2 font-display text-2xl text-white md:text-3xl"
        >
          Executive Summary
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Window: {rangeStart.slice(0, 10)} to {rangeEnd.slice(0, 10)}
        </p>
      </header>
      <div className="mt-4 space-y-4 text-base text-white/80 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
