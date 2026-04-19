/**
 * /hs/alumni/sessions — mentor's inbound requests + active sessions.
 *
 * Mentor-facing landing for everything they're on. Three groups:
 *   - Pending (awaiting their response)
 *   - Active (accepted, in-progress)
 *   - History (completed, declined, etc.)
 *
 * Only visible when the caller has an alumni_mentor_profiles row — if they
 * don't, we redirect to /hs/alumni/setup.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listSessionsForUser,
  getMentorProfileByUserId,
  sessionStatusLabel,
  type MentorSessionRequest,
} from '@/lib/hs-nil/mentors';

export const metadata: Metadata = {
  title: 'Mentor sessions — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function SessionRow({ session }: { session: MentorSessionRequest }) {
  return (
    <Link
      href={`/hs/alumni/sessions/${session.id}`}
      className="block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-white/25 hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {session.requestedTopic}
          </p>
          <p className="mt-1 text-xs text-white/60">
            {session.requestedFormat === 'video_call'
              ? 'Video call'
              : 'Async messages'}{' '}
            · requested {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)]">
          {sessionStatusLabel(session.status)}
        </span>
      </div>
    </Link>
  );
}

export default async function MentorSessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/alumni/sessions');
  }

  const profile = await getMentorProfileByUserId(user.id);
  if (!profile) {
    redirect('/hs/alumni/setup');
  }

  const sessions = await listSessionsForUser(user.id, 'mentor');
  const pending = sessions.filter((s) => s.status === 'pending');
  const active = sessions.filter((s) => s.status === 'accepted');
  const history = sessions.filter(
    (s) => !['pending', 'accepted'].includes(s.status)
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Mentor hub
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          Your mentorship requests
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Everyone who has asked to learn from you. Pending requests are
          waiting on your response.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/hs/alumni/setup"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Edit mentor profile
          </Link>
          <Link
            href={`/hs/alumni/${profile.id}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            View public profile
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <h2 className="font-display text-xl text-white">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Nothing waiting on you right now.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <h2 className="font-display text-xl text-white">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No active threads. Accept a request to start one.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {active.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <h2 className="font-display text-xl text-white">History</h2>
          <div className="mt-4 space-y-3">
            {history.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
