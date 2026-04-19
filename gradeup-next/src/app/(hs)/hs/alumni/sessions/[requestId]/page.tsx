/**
 * /hs/alumni/sessions/[requestId] — shared mentor-session thread.
 *
 * Rendered for BOTH roles — mentor and athlete — which role we show is
 * derived from the viewer's user_id vs the session row. Access is denied
 * if the viewer is neither party.
 */

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  getSessionRequest,
  listMessagesForSession,
  getMentorProfileById,
} from '@/lib/hs-nil/mentors';
import MentorSessionThread from '@/components/hs/MentorSessionThread';

export const metadata: Metadata = {
  title: 'Mentor session — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function resolveDisplayNames(
  requesterUserId: string,
  mentorUserId: string
): Promise<{ athleteName: string; mentorName: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { athleteName: 'Athlete', mentorName: 'Mentor' };
  }
  const sb = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: req }, { data: men }] = await Promise.all([
    sb.auth.admin.getUserById(requesterUserId),
    sb.auth.admin.getUserById(mentorUserId),
  ]);
  const athleteName =
    (req?.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name?.trim() || 'Athlete';
  const mentorName =
    (men?.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name?.trim() || 'Mentor';
  return { athleteName, mentorName };
}

export default async function MentorSessionThreadPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/hs/alumni/sessions/${requestId}`);
  }

  const sessionResult = await getSessionRequest(requestId, user.id);
  if (!sessionResult.ok) {
    if (sessionResult.code === 'forbidden' || sessionResult.code === 'not_found') {
      notFound();
    }
    throw new Error(sessionResult.error);
  }

  const session = sessionResult.data;
  const viewerRole: 'mentor' | 'athlete' =
    session.mentorUserId === user.id ? 'mentor' : 'athlete';

  const [messages, { athleteName, mentorName }, mentorProfile] =
    await Promise.all([
      listMessagesForSession(requestId, user.id),
      resolveDisplayNames(session.requesterUserId, session.mentorUserId),
      getMentorProfileById(session.mentorProfileId),
    ]);

  const mentorDisplayName = mentorName
    ? `${mentorName}${mentorProfile ? ` · ${mentorProfile.collegeName}` : ''}`
    : (mentorProfile?.collegeName ?? 'Your mentor');

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <MentorSessionThread
          session={session}
          initialMessages={messages}
          viewerUserId={user.id}
          viewerRole={viewerRole}
          mentorDisplayName={mentorDisplayName}
          athleteDisplayName={athleteName}
        />
      </section>
    </main>
  );
}
