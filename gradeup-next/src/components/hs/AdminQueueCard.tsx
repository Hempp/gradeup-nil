/**
 * AdminQueueCard — one tile on the /hs/admin landing grid.
 *
 * Shows a single operational queue (transcripts, disclosures, links, etc.)
 * with:
 *   - title + count (big number, tabular)
 *   - a priority color (green/yellow/red) driven by thresholds
 *   - up to three preview rows (summary + optional timestamp)
 *   - a "See all" link to the domain detail page
 *
 * Pure server-safe React — no client hooks. The parent server component
 * queries Supabase and passes the shaped data in. "Coming soon" /
 * TODO-linking for write actions is handled on the detail pages, not here.
 */
import Link from 'next/link';

export interface AdminQueuePreview {
  id: string;
  summary: string;
  detail?: string | null;
  timestamp?: string | null;
}

export interface AdminQueueCardProps {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  href: string;
  linkLabel?: string;
  previews: AdminQueuePreview[];
  /** Thresholds for (warn, urgent). Defaults to (1, 6). */
  thresholds?: { warn: number; urgent: number };
  emptyMessage?: string;
  footnote?: string;
}

function tone(count: number, thresholds: { warn: number; urgent: number }) {
  if (count === 0) {
    return {
      ring: 'ring-emerald-400/20',
      chipBorder: 'border-emerald-400/30',
      chipBg: 'bg-emerald-400/10',
      chipText: 'text-emerald-200',
      countText: 'text-emerald-200',
      label: 'Clear',
    };
  }
  if (count >= thresholds.urgent) {
    return {
      ring: 'ring-[var(--color-error,#DA2B57)]/30',
      chipBorder: 'border-[var(--color-error,#DA2B57)]/50',
      chipBg: 'bg-[var(--color-error,#DA2B57)]/10',
      chipText: 'text-[var(--color-error,#DA2B57)]',
      countText: 'text-[var(--color-error,#DA2B57)]',
      label: 'Urgent',
    };
  }
  if (count >= thresholds.warn) {
    return {
      ring: 'ring-amber-400/25',
      chipBorder: 'border-amber-400/40',
      chipBg: 'bg-amber-400/10',
      chipText: 'text-amber-200',
      countText: 'text-amber-200',
      label: 'Attention',
    };
  }
  return {
    ring: 'ring-white/10',
    chipBorder: 'border-white/20',
    chipBg: 'bg-white/5',
    chipText: 'text-white/80',
    countText: 'text-white',
    label: 'Idle',
  };
}

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminQueueCard({
  id,
  title,
  subtitle,
  count,
  href,
  linkLabel = 'See all',
  previews,
  thresholds = { warn: 1, urgent: 6 },
  emptyMessage = 'Nothing waiting right now.',
  footnote,
}: AdminQueueCardProps) {
  const t = tone(count, thresholds);
  const headingId = `admin-queue-${id}-title`;
  return (
    <article
      aria-labelledby={headingId}
      className={[
        'rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1',
        t.ring,
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id={headingId}
            className="font-display text-xl text-white md:text-2xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
            t.chipBorder,
            t.chipBg,
            t.chipText,
          ].join(' ')}
        >
          {t.label}
        </span>
      </header>

      <div className="mt-4 flex items-baseline gap-3">
        <span
          className={[
            'font-display text-5xl tabular-nums leading-none',
            t.countText,
          ].join(' ')}
          aria-label={`${count} items`}
        >
          {count}
        </span>
        <span className="text-sm text-white/50">
          {count === 1 ? 'item' : 'items'} to review
        </span>
      </div>

      <div className="mt-5">
        {previews.length === 0 ? (
          <p className="text-sm text-white/50">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {previews.slice(0, 3).map((row) => {
              const ts = formatTimestamp(row.timestamp);
              return (
                <li
                  key={row.id}
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-2"
                >
                  <p className="truncate text-sm text-white/90">
                    {row.summary}
                  </p>
                  {(row.detail || ts) && (
                    <p className="mt-0.5 truncate text-xs text-white/50">
                      {[row.detail, ts].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {footnote ? (
        <p className="mt-4 text-xs text-white/40">{footnote}</p>
      ) : null}

      <div className="mt-5 flex items-center justify-end">
        <Link
          href={href}
          aria-labelledby={headingId}
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {linkLabel}
          <span aria-hidden className="ml-1">
            &rarr;
          </span>
        </Link>
      </div>
    </article>
  );
}

export default AdminQueueCard;
