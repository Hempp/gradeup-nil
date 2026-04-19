/**
 * /hs/admin/transitions/[id] — single-transition review surface.
 *
 * Renders the full application + the athlete's HS trajectory summary +
 * a signed (300s TTL) URL to the enrollment proof, then hands off to
 * TransitionReviewPanel for the verify/deny decision.
 *
 * The HS trajectory summary is pulled directly from hs_athlete_profiles.
 * TRAJECTORY-FORGE is adding a dedicated service in parallel; if that
 * ships later we can swap the read call without touching the page shape.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getTransitionById,
  getEnrollmentProofSignedUrl,
  ncaaDivisionLabel,
  transitionStatusLabel,
} from '@/lib/hs-nil/transitions';
import TransitionReviewPanel from '@/components/hs/TransitionReviewPanel';

export const metadata: Metadata = {
  title: 'Transition detail — GradeUp HS Admin',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAdminOr404(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'admin') notFound();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface HsProfileRow {
  state_code: string;
  sport: string;
  school_name: string;
  graduation_year: number;
  gpa: number | null;
  gpa_verification_tier: string;
  verified_at: string | null;
}

export default async function AdminTransitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOr404();

  const { id } = await params;
  const row = await getTransitionById(id);
  if (!row) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select(
      'state_code, sport, school_name, graduation_year, gpa, gpa_verification_tier, verified_at'
    )
    .eq('user_id', row.athlete_user_id)
    .maybeSingle<HsProfileRow>();

  const proofSignedUrl = row.enrollment_proof_storage_path
    ? await getEnrollmentProofSignedUrl(
        row.enrollment_proof_storage_path,
        300
      )
    : null;

  const statusTone =
    row.status === 'verified'
      ? 'text-emerald-300'
      : row.status === 'denied'
        ? 'text-[var(--color-error,#DA2B57)]'
        : row.status === 'cancelled'
          ? 'text-white/60'
          : 'text-amber-200';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <Link href="/hs/admin/transitions" className="hover:text-white">
            Transitions
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80 font-mono">{row.id.slice(0, 8)}</span>
        </nav>

        <header className="mt-6">
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${statusTone}`}
          >
            {transitionStatusLabel(row.status)}
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            {row.college_name}, {row.college_state}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {ncaaDivisionLabel(row.ncaa_division)} · matriculation{' '}
            {fmtDate(row.matriculation_date)} · continuing sport:{' '}
            {row.sport_continued ? 'yes' : 'no'}
          </p>
        </header>

        <section className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white md:text-2xl">
            Application
          </h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <Fact label="Transition ID" value={row.id} mono />
            <Fact label="Athlete user" value={row.athlete_user_id} mono />
            <Fact label="Requested" value={fmtDate(row.requested_at)} />
            {row.confirmed_at ? (
              <Fact label="Resolved" value={fmtDate(row.confirmed_at)} />
            ) : null}
            <Fact
              label="Proof storage path"
              value={row.enrollment_proof_storage_path ?? '— not uploaded —'}
              mono
            />
            <Fact label="College state" value={row.college_state} />
          </dl>
          {row.denial_reason ? (
            <div className="mt-4 rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/5 p-3 text-sm text-white/80">
              <span className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-error,#DA2B57)]">
                Prior denial reason
              </span>
              {row.denial_reason}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white md:text-2xl">
            HS trajectory summary
          </h2>
          {profile ? (
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <Fact label="HS school" value={profile.school_name} />
              <Fact label="Sport" value={profile.sport} />
              <Fact label="State" value={profile.state_code} />
              <Fact
                label="Graduation year"
                value={String(profile.graduation_year)}
              />
              <Fact
                label="GPA"
                value={
                  profile.gpa !== null
                    ? `${profile.gpa.toFixed(2)} (${profile.gpa_verification_tier})`
                    : '— not provided —'
                }
              />
              <Fact
                label="Academically verified"
                value={profile.verified_at ? 'Yes' : 'No'}
              />
            </dl>
          ) : (
            <p className="mt-4 text-sm text-white/60">
              No HS profile on file. Investigate before verifying.
            </p>
          )}
        </section>

        {row.status === 'pending' ? (
          <section className="mt-6">
            <TransitionReviewPanel
              transitionId={row.id}
              athleteUserId={row.athlete_user_id}
              collegeName={row.college_name}
              proofSignedUrl={proofSignedUrl}
              proofStoragePath={row.enrollment_proof_storage_path}
            />
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            This transition is{' '}
            <strong>{transitionStatusLabel(row.status)}</strong>. No further
            action is available from this surface — transitions are
            one-way.
          </section>
        )}
      </section>
    </main>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd
        className={[
          'mt-0.5 text-white',
          mono ? 'font-mono text-xs break-all' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
