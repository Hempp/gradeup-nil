/**
 * HS Athlete — Verify GPA (Tier B)
 *
 * Athlete uploads a transcript PDF/image so ops can verify their GPA
 * and upgrade the profile from 'self_reported' to 'user_submitted'.
 *
 * Server Component:
 *   - Auth gate (redirects to /login with resume-path).
 *   - Loads the most recent submissions so we can render the right
 *     state: fresh form, waiting on review, approved success, or
 *     rejected (with a note) + resubmit.
 *
 * The file-upload primitive is rendered inside the Client Component
 * `TranscriptUploadForm`, which POSTs to /api/hs/transcripts/upload.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import TranscriptUploadForm from '@/components/hs/TranscriptUploadForm';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import type {
  TranscriptStatus,
  TranscriptSubmissionRow,
} from '@/lib/hs-nil/transcripts';

export const metadata: Metadata = {
  title: 'Verify your GPA — GradeUp HS',
  description:
    'Upload a transcript so we can verify your GPA and add a verified badge to your profile.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AthleteProfileRow {
  gpa: number | null;
  gpa_verification_tier: TranscriptStatus | 'self_reported' | 'user_submitted' | 'institution_verified' | string;
}

export default async function VerifyGpaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/onboarding/verify-gpa');
  }

  // Pull profile + submissions in parallel. Athletes read their own rows
  // under existing RLS policies, so we can use the session client here.
  const [profileRes, submissionsRes] = await Promise.all([
    supabase
      .from('hs_athlete_profiles')
      .select('gpa, gpa_verification_tier')
      .eq('user_id', user.id)
      .maybeSingle<AthleteProfileRow>(),
    supabase
      .from('transcript_submissions')
      .select(
        'id, athlete_user_id, storage_path, original_filename, file_size_bytes, mime_type, claimed_gpa, status, reviewer_user_id, reviewed_at, reviewer_notes, athlete_visible_note, approved_gpa, created_at'
      )
      .eq('athlete_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const submissions = (submissionsRes.data ?? []) as TranscriptSubmissionRow[];
  const latest = submissions[0] ?? null;

  const tier = profile?.gpa_verification_tier ?? 'self_reported';
  const profileGpa = profile?.gpa ?? null;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          GPA Verification
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Earn your verified badge.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          GradeUp shows brands both sides of your story — academics and
          athletics. Upload a transcript and we&rsquo;ll verify your GPA so
          your profile reads &ldquo;verified&rdquo; instead of
          &ldquo;self-reported.&rdquo;
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <OnboardingCard eyebrow="Your profile" title="Current status">
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <StatPair
              label="Recorded GPA"
              value={profileGpa !== null ? profileGpa.toFixed(2) : '—'}
            />
            <StatPair
              label="Verification tier"
              value={
                tier === 'institution_verified'
                  ? 'Institution verified'
                  : tier === 'user_submitted'
                    ? 'User-submitted (verified)'
                    : 'Self-reported'
              }
            />
          </dl>
        </OnboardingCard>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        {renderState({ latest, profileGpa })}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-sm text-white/60">
        <Link
          href="/hs/onboarding/next-steps"
          className="underline decoration-white/30 underline-offset-4 hover:text-white"
        >
          Back to onboarding
        </Link>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// State renderer — chooses form vs waiting vs success vs resubmit.
// ---------------------------------------------------------------------------

function renderState(args: {
  latest: TranscriptSubmissionRow | null;
  profileGpa: number | null;
}) {
  const { latest, profileGpa } = args;

  if (!latest) {
    return (
      <TranscriptUploadForm
        defaultClaimedGpa={profileGpa !== null ? profileGpa : undefined}
      />
    );
  }

  if (latest.status === 'pending_review') {
    return (
      <OnboardingCard
        accent
        eyebrow="Submitted"
        title="Your transcript is under review"
        description="A member of our ops team typically reviews within two business days. We'll email you the moment a decision is made."
      >
        <dl className="mt-3 grid gap-4 text-sm md:grid-cols-2">
          <StatPair label="Submitted" value={formatDate(latest.created_at)} />
          <StatPair label="Claimed GPA" value={latest.claimed_gpa.toFixed(2)} />
          <StatPair label="File" value={latest.original_filename} />
        </dl>
      </OnboardingCard>
    );
  }

  if (latest.status === 'approved') {
    return (
      <div className="space-y-6">
        <OnboardingCard
          accent
          eyebrow="Verified"
          title="Your GPA is verified"
          description="Your profile now carries a verified badge. Brands can see that your academic side has been checked."
        >
          <dl className="mt-3 grid gap-4 text-sm md:grid-cols-2">
            <StatPair
              label="Verified GPA"
              value={
                latest.approved_gpa !== null
                  ? latest.approved_gpa.toFixed(2)
                  : '—'
              }
            />
            <StatPair
              label="Verified on"
              value={latest.reviewed_at ? formatDate(latest.reviewed_at) : '—'}
            />
          </dl>
        </OnboardingCard>

        <details className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          <summary className="cursor-pointer font-semibold text-white">
            Need to update your GPA?
          </summary>
          <p className="mt-3">
            If your GPA has changed, upload a fresh transcript and we&rsquo;ll
            re-verify. The new submission replaces the current verification
            once approved.
          </p>
          <div className="mt-4">
            <TranscriptUploadForm
              defaultClaimedGpa={
                latest.approved_gpa !== null
                  ? latest.approved_gpa
                  : profileGpa ?? undefined
              }
            />
          </div>
        </details>
      </div>
    );
  }

  if (latest.status === 'resubmission_requested') {
    return (
      <div className="space-y-6">
        <OnboardingCard
          accent
          eyebrow="Needs resubmission"
          title="Please upload a cleaner copy"
          description="Your transcript was reviewed but we need a better copy before we can verify."
        >
          {latest.athlete_visible_note && (
            <p className="mt-3 rounded-md bg-black/30 p-3 text-sm text-white/80">
              {latest.athlete_visible_note}
            </p>
          )}
        </OnboardingCard>
        <TranscriptUploadForm
          defaultClaimedGpa={latest.claimed_gpa}
        />
      </div>
    );
  }

  // rejected
  return (
    <div className="space-y-6">
      <OnboardingCard
        eyebrow="Not verified"
        title="We couldn't verify this transcript"
        description="The most recent submission wasn't accepted. You can upload a new one below."
      >
        {latest.athlete_visible_note && (
          <p className="mt-3 rounded-md bg-black/30 p-3 text-sm text-white/80">
            {latest.athlete_visible_note}
          </p>
        )}
      </OnboardingCard>
      <TranscriptUploadForm
        defaultClaimedGpa={latest.claimed_gpa}
      />
    </div>
  );
}

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-base text-white">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
