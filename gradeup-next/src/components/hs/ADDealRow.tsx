/**
 * ADDealRow — compact row for the AD's deal list.
 *
 * Server-safe. Pure presentational; receives the denormalised row shape
 * from listDealsInState() and renders a status pill, anon athlete name,
 * school/sport, brand, compensation, and a compliance flag.
 */

import Link from 'next/link';
import type { AdDealRow as AdDealRowData } from '@/lib/hs-nil/state-ad-portal';

export interface ADDealRowProps {
  row: AdDealRowData;
  href: string;
}

function statusTone(status: string): string {
  if (status === 'paid' || status === 'completed') return 'text-emerald-200 border-emerald-400/40 bg-emerald-400/10';
  if (status === 'cancelled' || status === 'dispute') return 'text-[var(--color-error,#DA2B57)] border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10';
  if (status === 'pending' || status === 'negotiating') return 'text-amber-200 border-amber-400/40 bg-amber-400/10';
  return 'text-white/80 border-white/20 bg-white/5';
}

function disclosureTone(
  requiresDisclosure: boolean,
  disclosureStatus: string | null
): { label: string; cls: string } {
  if (!requiresDisclosure) {
    return {
      label: 'N/A',
      cls: 'text-white/60 border-white/15 bg-white/5',
    };
  }
  if (disclosureStatus === 'sent') {
    return {
      label: 'Disclosed',
      cls: 'text-emerald-200 border-emerald-400/40 bg-emerald-400/10',
    };
  }
  if (disclosureStatus === 'failed') {
    return {
      label: 'Failed',
      cls: 'text-[var(--color-error,#DA2B57)] border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10',
    };
  }
  if (disclosureStatus === 'pending') {
    return {
      label: 'Pending',
      cls: 'text-amber-200 border-amber-400/40 bg-amber-400/10',
    };
  }
  return {
    label: 'Awaiting',
    cls: 'text-white/70 border-white/20 bg-white/5',
  };
}

function fmtMoney(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ADDealRow({ row, href }: ADDealRowProps) {
  const disclosure = disclosureTone(row.requiresDisclosure, row.disclosureStatus);
  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07]">
      <Link href={href} className="block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {row.title}
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              {row.athleteAnon}
              {row.athleteSchool ? ` · ${row.athleteSchool}` : ''}
              {row.athleteSport ? ` · ${row.athleteSport}` : ''}
            </p>
            {row.brandName ? (
              <p className="mt-0.5 text-xs text-white/50">
                Brand: {row.brandName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
                statusTone(row.status),
              ].join(' ')}
            >
              {row.status.replace(/_/g, ' ')}
            </span>
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
                disclosure.cls,
              ].join(' ')}
            >
              {disclosure.label}
            </span>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/70">
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-white/40">
              Compensation
            </dt>
            <dd className="mt-0.5 font-mono text-white/80">
              {fmtMoney(row.compensationAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-white/40">
              Signed
            </dt>
            <dd className="mt-0.5 font-mono text-white/80">
              {fmtDate(row.signedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-white/40">
              Consent
            </dt>
            <dd className="mt-0.5 font-mono text-white/80">
              {row.hasConsent ? 'On file' : 'Missing'}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

export default ADDealRow;
