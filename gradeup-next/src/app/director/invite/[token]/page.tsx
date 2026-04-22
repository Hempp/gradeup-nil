/**
 * /director/invite/[token]
 *
 * Public accept page for athletic director invitations sent by athletes.
 * Stand-alone — does NOT use the marketing or dashboard layout.
 * No auth required; the AD creates their account here.
 *
 * Server Component shell: fetches invitation data via the GET endpoint,
 * then renders DirectorInviteClient (a 'use client' component) with the
 * data pre-loaded.
 *
 * Robots: noindex, nofollow.
 */

import type { Metadata } from 'next';
import { DirectorInviteClient } from './DirectorInviteClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Accept athlete verification invitation — GradeUp NIL',
  description: 'Create your Athletic Director account and start verifying student-athletes.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

interface InvitationData {
  invitedEmail: string;
  invitedName: string | null;
  invitedTitle: string | null;
  athleteName: string;
  schoolName: string;
  expiresAt: string;
}

interface FetchResult {
  invitation?: InvitationData;
  error?: string;
  code?: string;
}

async function fetchInvitation(token: string): Promise<FetchResult> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  try {
    const res = await fetch(`${base}/api/director/invitation/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    const json = (await res.json()) as { ok?: boolean; invitation?: InvitationData; error?: string; code?: string };
    if (!res.ok) {
      return { error: json.error ?? 'Invitation not found', code: json.code };
    }
    return { invitation: json.invitation };
  } catch {
    return { error: 'Could not load invitation details' };
  }
}

export default async function DirectorInvitePage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length > 200) {
    return (
      <ErrorShell
        title="Invitation not found"
        body="This link appears to be invalid. Please check the email you received and try again."
      />
    );
  }

  const result = await fetchInvitation(token);

  if (!result.invitation) {
    const isExpired = result.code === 'expired';
    const isUsed = result.code === 'already_accepted';

    return (
      <ErrorShell
        title={
          isExpired
            ? 'Invitation expired'
            : isUsed
              ? 'Already accepted'
              : 'Invitation unavailable'
        }
        body={result.error ?? 'This invitation link is no longer valid.'}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <DirectorInviteClient token={token} invitation={result.invitation} />
    </main>
  );
}

function ErrorShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          GradeUp NIL · Athletic Director Invite
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">{title}</h1>
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/70">{body}</p>
          <div className="mt-5">
            <a
              href="mailto:support@gradeupnil.com"
              className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
            >
              Contact support
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
