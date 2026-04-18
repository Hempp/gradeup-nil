/**
 * AdminSignalBadge — compact pill summarising a single ops-queue count.
 *
 * Used at the top of /hs/admin as a quick-glance row so the operator can
 * see every bucket's load in one line without scrolling the cards.
 *
 * Color rules mirror AdminQueueCard:
 *   0        → calm (green)
 *   1–5      → attention (yellow)
 *   6+       → urgent (red)
 *
 * The component is purely presentational; all data comes from the server
 * component that queries counts.
 */
import Link from 'next/link';

export interface AdminSignalBadgeProps {
  label: string;
  count: number;
  href?: string;
  /** Override the default thresholds for badges that want different tiers. */
  thresholds?: { warn: number; urgent: number };
}

function toneFor(count: number, thresholds: { warn: number; urgent: number }) {
  if (count === 0) {
    return {
      border: 'border-emerald-400/30',
      bg: 'bg-emerald-400/10',
      text: 'text-emerald-200',
      dot: 'bg-emerald-300',
    };
  }
  if (count >= thresholds.urgent) {
    return {
      border: 'border-[var(--color-error,#DA2B57)]/50',
      bg: 'bg-[var(--color-error,#DA2B57)]/10',
      text: 'text-[var(--color-error,#DA2B57)]',
      dot: 'bg-[var(--color-error,#DA2B57)]',
    };
  }
  if (count >= thresholds.warn) {
    return {
      border: 'border-amber-400/40',
      bg: 'bg-amber-400/10',
      text: 'text-amber-200',
      dot: 'bg-amber-300',
    };
  }
  return {
    border: 'border-white/20',
    bg: 'bg-white/5',
    text: 'text-white/80',
    dot: 'bg-white/60',
  };
}

export function AdminSignalBadge({
  label,
  count,
  href,
  thresholds = { warn: 1, urgent: 6 },
}: AdminSignalBadgeProps) {
  const tone = toneFor(count, thresholds);
  const inner = (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
        tone.border,
        tone.bg,
        tone.text,
      ].join(' ')}
    >
      <span
        aria-hidden
        className={['h-1.5 w-1.5 rounded-full', tone.dot].join(' ')}
      />
      <span className="tabular-nums">{count}</span>
      <span className="text-white/70">{label}</span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link
      href={href}
      className="transition hover:opacity-80"
      aria-label={`${count} ${label} — see details`}
    >
      {inner}
    </Link>
  );
}

export default AdminSignalBadge;
