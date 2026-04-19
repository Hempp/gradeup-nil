/**
 * /hs/athlete/mentor-sessions — athlete's session threads.
 *
 * Lists the athlete's mentor sessions, grouped into active (pending +
 * accepted) and history (declined/completed/cancelled/expired).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listSessionsForUser,
  sessionStatusLabel,
  type MentorSessionRequest,
} from '@/lib/hs-nil/mentors';

export const metadata: Metadata = {
  title: 'Your mentor sessions — GradeUp HS',
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
              : 'Async messages'}
          </p>
        </div>
        <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)]">
          {sessionStatusLabel(session.status)}
        </span>
      </div>
    </Link>
  );
}

export default async function AthleteMentorSessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/athlete/mentor-sessions');
  }

  const sessions = await listSessionsForUser(user.id, 'athlete');
  const active = sessions.filter((s) =>
    ['pending', 'accepted'].includes(s.status)
  );
  const history = sessions.filter(
    (s) => !['pending', 'accepted'].includes(s.status)
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Your mentor sessions
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          Your mentorship threads
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Track every request and conversation. Reach out to more mentors any
          time.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Active</h2>
          <Link
            href="/hs/alumni"
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            Find another mentor →
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No active sessions yet. Browse the{' '}
            <Link
              href="/hs/alumni"
              className="font-semibold text-[var(--accent-primary)] hover:underline"
            >
              alumni mentor network
            </Link>{' '}
            to start one.
          </div>
        ) : (
          <div className="space-y-3">
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
