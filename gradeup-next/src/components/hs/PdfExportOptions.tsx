'use client';

/**
 * PdfExportOptions — configurator for the brand performance PDF export.
 *
 * Renders a compact panel with:
 *   - A date-range selector (start / end ISO date inputs) that defaults
 *     to "last 90 days" on mount.
 *   - Three include/exclude toggles that map to query params on the
 *     export-pdf endpoint (perDeal, athletes, timeline).
 *   - An ExportPdfButton whose `href` is rebuilt from the current state.
 *
 * The component is intentionally self-contained — /hs/brand/performance
 * can drop it into the page header and forget about the URL shape.
 */
import { useMemo, useState } from 'react';
import { ExportPdfButton } from './ExportPdfButton';

export interface PdfExportOptionsProps {
  /** Slugified brand name used for the fallback filename on download. */
  brandSlug: string;
  /** Defaults to '/api/hs/brand/performance/export-pdf'. */
  endpoint?: string;
  /** Controls visual framing — 'inline' is compact, 'card' is elevated. */
  variant?: 'inline' | 'card';
}

function isoDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ninetyDaysAgo(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return d;
}

function todayDate(): Date {
  return new Date();
}

export function PdfExportOptions({
  brandSlug,
  endpoint = '/api/hs/brand/performance/export-pdf',
  variant = 'card',
}: PdfExportOptionsProps) {
  const [rangeStart, setRangeStart] = useState<string>(() =>
    isoDateString(ninetyDaysAgo()),
  );
  const [rangeEnd, setRangeEnd] = useState<string>(() =>
    isoDateString(todayDate()),
  );
  const [includePerDeal, setIncludePerDeal] = useState(true);
  const [includeAthletes, setIncludeAthletes] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (rangeStart) params.set('rangeStart', rangeStart);
    if (rangeEnd) params.set('rangeEnd', rangeEnd);
    if (!includePerDeal) params.set('perDeal', '0');
    if (!includeAthletes) params.set('athletes', '0');
    if (!includeTimeline) params.set('timeline', '0');
    const qs = params.toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
  }, [endpoint, rangeStart, rangeEnd, includePerDeal, includeAthletes, includeTimeline]);

  const filename = `gradeup-performance-${brandSlug}-${rangeEnd}.pdf`;

  const wrapperClass =
    variant === 'card'
      ? 'rounded-2xl border border-white/10 bg-white/[0.03] p-5'
      : '';

  const labelClass =
    'flex items-center gap-2 text-xs uppercase tracking-widest text-white/60';
  const inputClass =
    'mt-1 min-h-[44px] w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none';

  return (
    <section
      aria-labelledby="pdf-export-heading"
      className={wrapperClass}
    >
      <h3
        id="pdf-export-heading"
        className="font-display text-lg text-white"
      >
        Export performance report
      </h3>
      <p className="mt-1 text-xs text-white/60">
        Pick a reporting window and the sections to include, then download a
        branded PDF for your marketing team or leadership.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="pdf-range-start" className={labelClass}>
            Range start
          </label>
          <input
            id="pdf-range-start"
            type="date"
            value={rangeStart}
            max={rangeEnd || undefined}
            onChange={(e) => setRangeStart(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pdf-range-end" className={labelClass}>
            Range end
          </label>
          <input
            id="pdf-range-end"
            type="date"
            value={rangeEnd}
            min={rangeStart || undefined}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Sections to include</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={includePerDeal}
              onChange={(e) => setIncludePerDeal(e.target.checked)}
              className="h-4 w-4"
            />
            Per-deal breakdown
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={includeAthletes}
              onChange={(e) => setIncludeAthletes(e.target.checked)}
              className="h-4 w-4"
            />
            Athlete list
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={includeTimeline}
              onChange={(e) => setIncludeTimeline(e.target.checked)}
              className="h-4 w-4"
            />
            Timeline chart
          </label>
        </div>
      </fieldset>

      <div className="mt-5">
        <ExportPdfButton
          href={href}
          filename={filename}
          label="Download performance report"
          variant="primary"
        />
      </div>
    </section>
  );
}

export default PdfExportOptions;
