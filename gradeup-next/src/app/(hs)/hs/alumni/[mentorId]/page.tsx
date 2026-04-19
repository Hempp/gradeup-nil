/**
 * /hs/alumni/[mentorId] — mentor public profile.
 *
 * Shows the mentor's bio, college, sport, specialties, and the session-
 * request form. If the mentor has an active (non-revoked, non-expired)
 * trajectory share token we surface a "View my HS trajectory" link — this
 * is the mentor opting into their own history being visible; we do NOT
 * auto-generate a token if none exists.
 *
 * Privacy:
 *   - Mentor email + contact info are never rendered.
 *   - Athlete viewing this page sees the full bio and specialties — those
 *     are intentional public-within-platform surface.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createClient as createServiceClient,
} from '@supabase/supabase-js';
import {
  getMentorProfileById,
  formatAvailability,
} from '@/lib/hs-nil/mentors';
import MentorSessionRequestForm from '@/components/hs/MentorSessionRequestForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}): Promise<Metadata> {
  const { mentorId } = await params;
  const mentor = await getMentorProfileById(mentorId);
  if (!mentor) return { title: 'Mentor — GradeUp HS' };
  return {
    title: `${mentor.currentSport} mentor at ${mentor.collegeName} — GradeUp HS`,
    description: mentor.bio.slice(0, 160),
  };
}

interface MentorPageData {
  mentorFirstName: string | null;
  trajectoryShareToken: string | null;
}

async function loadMentorDisplayData(
  mentorUserId: string
): Promise<MentorPageData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { mentorFirstName: null, trajectoryShareToken: null };
  }
  const sb = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: authUser }, { data: shareRow }] = await Promise.all([
    sb.auth.admin.getUserById(mentorUserId),
    sb
      .from('hs_athlete_trajectory_shares')
      .select('public_token, expires_at, revoked_at')
      .eq('athlete_user_id', mentorUserId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{
        public_token: string;
        expires_at: string | null;
        revoked_at: string | null;
      }>(),
  ]);

  const mentorFirstName =
    (authUser?.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name ?? null;

  let trajectoryShareToken: string | null = null;
  if (shareRow?.public_token) {
    const isExpired =
      shareRow.expires_at &&
      new Date(shareRow.expires_at).getTime() < Date.now();
    if (!isExpired) {
      trajectoryShareToken = shareRow.public_token;
    }
  }

  return { mentorFirstName, trajectoryShareToken };
}

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/hs/alumni/${mentorId}`);
  }

  const mentor = await getMentorProfileById(mentorId);
  if (!mentor || (!mentor.visibleToHs && mentor.userId !== user.id)) {
    notFound();
  }

  const { mentorFirstName, trajectoryShareToken } = await loadMentorDisplayData(
    mentor.userId
  );
  const mentorDisplayName = mentorFirstName?.trim() || `${mentor.currentSport} mentor`;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <Link
          href="/hs/alumni"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Back to mentors
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {mentor.ncaaDivision} · {mentor.currentSport}
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          {mentorDisplayName}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {mentor.collegeName} · {mentor.collegeState}
        </p>
        <p className="mt-3 text-xs text-white/50">
          {formatAvailability(mentor.availability)}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-lg text-white">About</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-white/80">
            {mentor.bio}
          </p>

          {mentor.specialties.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Can help with
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {mentor.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs text-white/80"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {trajectoryShareToken && (
            <div className="mt-5">
              <Link
                href={`/hs/trajectory/${trajectoryShareToken}`}
                className="inline-flex items-center text-sm font-semibold text-[var(--accent-primary)] hover:underline"
              >
                View my HS trajectory →
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        {mentor.userId === user.id ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p>
              This is your public mentor profile. Edit it from your mentor
              setup page.
            </p>
            <Link
              href="/hs/alumni/setup"
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Edit profile
            </Link>
          </div>
        ) : mentor.availability === 'paused' ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            This mentor has paused new requests.
          </div>
        ) : (
          <MentorSessionRequestForm
            mentorId={mentor.id}
            mentorDisplayName={mentorDisplayName}
            acceptsMessageOnly={mentor.acceptsMessageOnly}
            acceptsVideoCall={mentor.acceptsVideoCall}
          />
        )}
      </section>
    </main>
  );
}
