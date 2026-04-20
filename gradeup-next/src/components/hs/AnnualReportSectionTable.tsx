/**
 * AnnualReportSectionTable — reusable table renderer for a labeled section
 * of the annual report. Server Component (no state). Admin-side preview only.
 *
 * Accepts a title + optional narrative + a flat array of row objects and
 * an ordered column list. Values that look like cents numbers can be
 * formatted via the optional `formatter` column override.
 */

import React from 'react';

export interface AnnualReportSectionColumn<T> {
  key: keyof T & string;
  label: string;
  align?: 'left' | 'right';
  format?: (value: T[keyof T], row: T) => string;
}

export interface AnnualReportSectionTableProps<T> {
  title: string;
  id?: string;
  narrative?: string;
  rows: T[];
  columns: AnnualReportSectionColumn<T>[];
  /** Message to show when `rows` is empty. */
  emptyMessage?: string;
  /** How many rows to render; omit for all. */
  limit?: number;
}

export default function AnnualReportSectionTable<T extends Record<string, unknown>>({
  title,
  id,
  narrative,
  rows,
  columns,
  emptyMessage = 'No data for this window.',
  limit,
}: AnnualReportSectionTableProps<T>) {
  const displayed = typeof limit === 'number' ? rows.slice(0, limit) : rows;

  return (
    <section
      className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
      aria-labelledby={id}
      id={id}
    >
      <header>
        <h3 id={id} className="font-display text-lg text-white md:text-xl">
          {title}
        </h3>
        {narrative ? (
          <p className="mt-2 text-sm text-white/70">{narrative}</p>
        ) : null}
      </header>

      {displayed.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">{emptyMessage}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={
                      col.align === 'right' ? 'px-3 py-2 text-right' : 'px-3 py-2'
                    }
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => {
                    const raw = row[col.key];
                    const formatted = col.format
                      ? col.format(raw as T[keyof T], row)
                      : raw === null || raw === undefined
                        ? '—'
                        : String(raw);
                    return (
                      <td
                        key={col.key}
                        className={
                          col.align === 'right'
                            ? 'px-3 py-2 text-right font-mono text-white/80'
                            : 'px-3 py-2 text-white/80'
                        }
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {typeof limit === 'number' && rows.length > limit ? (
            <p className="mt-2 text-xs text-white/40">
              Showing {limit} of {rows.length} rows. Export CSV for full data.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
