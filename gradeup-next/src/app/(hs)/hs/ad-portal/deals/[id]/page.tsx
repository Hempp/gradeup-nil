/**
 * /hs/ad-portal/deals/[id] — Single-deal compliance deep dive.
 *
 * Calls getDealComplianceDetail(), which (a) verifies the deal is scoped
 * to this AD's state and (b) logs state_ad_portal_views('deal_detail',
 * dealId). 404s if the deal doesn't exist or isn't in-state.
 *
 * Read-only. Shows deal terms, parental-consent audit reference
 * (id + timestamps, no PII), disclosure emit log, content moderation
 * status (if known), and signing timestamps.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  getDealComplianceDetail,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';

export const metadata: Metadata = {
  title: 'Deal detail — State Compliance Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function requireStateAd(selectedState: string | undefined): Promise<{
  userId: string;
  active: StateAdAssignment;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const assignments = await listAssignmentsForUser(user.id);
  if (assignments.length === 0) notFound();
  const active =
    (selectedState
      ? assignments.find((a) => a.stateCode === selectedState)
      : assignments[0]) ?? assignments[0];
  if (!active) notFound();
  return { userId: user.id, active };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMoney(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default async function AdPortalDealDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  const stateCode = Array.isArray(search.state) ? search.state[0] : search.state;
  const { userId, active } = await requireStateAd(stateCode);

  const detail = await getDealComplianceDetail(id, userId, active.stateCode);
  if (!detail) notFound();

  const qs = `?state=${encodeURIComponent(active.stateCode)}`;
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href={`/hs/ad-portal${qs}`} className="hover:text-white">
            Portal
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <Link href={`/hs/ad-portal/deals${qs}`} className="hover:text-white">
            Deals
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">{detail.deal.id.slice(0, 8)}</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            {active.stateCode} · Compliance detail
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            {detail.deal.title}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Deal ID <span className="font-mono">{detail.deal.id}</span>
          </p>
        </header>

        <Section title="Deal terms">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Fact label="Status" value={detail.deal.status.replace(/_/g, ' ')} />
            <Fact label="Type" value={detail.deal.dealType ?? '—'} />
            <Fact
              label="Compensation"
              value={fmtMoney(detail.deal.compensationAmount)}
            />
            <Fact label="Created" value={fmtDate(detail.deal.createdAt)} />
            <Fact label="Signed" value={fmtDate(detail.deal.signedAt)} />
            <Fact
              label="State"
              value={detail.deal.stateCode}
            />
          </dl>
        </Section>

        <Section title="Athlete">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Fact label="Name" value={detail.athlete.anonymizedName} />
            <Fact label="School" value={detail.athlete.school ?? '—'} />
            <Fact label="Sport" value={detail.athlete.sport ?? '—'} />
            <Fact
              label="Grad year"
              value={detail.athlete.graduationYear?.toString() ?? '—'}
            />
          </dl>
          <p className="mt-3 text-xs text-white/40">
            First name + last initial only. No further PII is available on this
            surface.
          </p>
        </Section>

        <Section title="Brand">
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Fact
              label="Company"
              value={detail.brand.companyName ?? '—'}
            />
          </dl>
        </Section>

        <Section title="Parental consent (audit reference)">
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Fact
              label="Consent ID"
              value={
                detail.parentalConsentRef.consentId
                  ? detail.parentalConsentRef.consentId.slice(0, 12)
                  : 'Missing'
              }
              mono
            />
            <Fact
              label="Signed"
              value={fmtDate(detail.parentalConsentRef.signedAt)}
            />
            <Fact
              label="Expires"
              value={fmtDate(detail.parentalConsentRef.expiresAt)}
            />
          </dl>
          <p className="mt-3 text-xs text-white/40">
            The consent record itself contains parent name and signature
            metadata. Those are intentionally not exposed here; the consent
            ID is enough to audit chain-of-custody through GradeUp.
          </p>
        </Section>

        <Section title="Disclosures">
          {detail.disclosures.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              No disclosure rows linked to this deal.
            </p>
          ) : (
            <ul className="space-y-3">
              {detail.disclosures.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      {d.recipient}
                    </p>
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
                        d.status === 'sent'
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                          : d.status === 'failed'
                            ? 'border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 text-[var(--color-error,#DA2B57)]'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-200',
                      ].join(' ')}
                    >
                      {d.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/70">
                    <Fact
                      label="Scheduled"
                      value={fmtDate(d.scheduledFor)}
                      small
                    />
                    <Fact label="Sent" value={fmtDate(d.sentAt)} small />
                  </dl>
                  {d.failureReason ? (
                    <p className="mt-2 rounded-md border border-[var(--color-error,#DA2B57)]/30 bg-[var(--color-error,#DA2B57)]/5 px-3 py-2 text-xs text-[var(--color-error,#DA2B57)]">
                      <span className="font-semibold">Failed:</span>{' '}
                      {d.failureReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Signing timestamps">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Fact
              label="Created"
              value={fmtDate(detail.signingTimestamps.createdAt)}
            />
            <Fact
              label="Signed"
              value={fmtDate(detail.signingTimestamps.signedAt)}
            />
            <Fact
              label="Paid"
              value={fmtDate(detail.signingTimestamps.paidAt)}
            />
            <Fact
              label="Completed"
              value={fmtDate(detail.signingTimestamps.completedAt)}
            />
          </dl>
        </Section>

        {detail.contentModerationStatus ? (
          <Section title="Content moderation">
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              Latest deliverable moderation status:{' '}
              <strong>{detail.contentModerationStatus}</strong>
            </p>
          </Section>
        ) : null}

        <p className="mt-10 text-xs text-white/40">
          This view has been recorded in your portal-access audit log.
        </p>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Fact({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd
        className={[
          small ? 'text-xs' : 'text-sm',
          mono ? 'font-mono' : '',
          'mt-0.5 text-white/80',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
