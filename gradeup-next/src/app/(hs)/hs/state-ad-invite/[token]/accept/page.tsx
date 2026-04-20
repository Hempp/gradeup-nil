/**
 * /hs/state-ad-invite/[token]/accept
 *
 * Authenticated acceptance page. The visitor must be logged in — if they
 * aren't we redirect to /login?next=<this-url> so the login flow returns
 * them here. Once auth'd they see the invitation summary and can confirm
 * acceptance via the StateAdAcceptInvitationForm client component.
 *
 * Lives inside the (hs) route group so FEATURE_HS_NIL gates it. That's
 * fine here: the invitee is already on the platform to reach this
 * page — they authenticated first.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { StateAdAcceptInvitationForm } from '@/components/hs/StateAdAcceptInvitationForm';

export const metadata: Metadata = {
  title: 'Accept state compliance portal invitation — GradeUp NIL',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

interface InviteView {
  stateCode: string;
  organizationName: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
  expiresAt: string;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadInvitation(token: string): Promise<InviteView | null> {
  const sb = getServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from('state_ad_invitations')
    .select('state_code, organization_name, accepted_at, rejected_at, expires_at')
    .eq('invitation_token', token)
    .maybeSingle();
  if (!data) return null;
  const now = Date.now();
  let status: InviteView['status'] = 'pending';
  if (data.accepted_at) status = 'accepted';
  else if (data.rejected_at) status = 'revoked';
  else if (new Date(data.expires_at as string).getTime() < now) status = 'expired';
  return {
    stateCode: data.state_code as string,
    organizationName: data.organization_name as string,
    status,
    expiresAt: data.expires_at as string,
  };
}

export default async function StateAdAcceptPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length > 200) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(
      `/hs/state-ad-invite/${encodeURIComponent(token)}/accept`
    );
    redirect(`/login?next=${next}`);
  }

  const invitation = await loadInvitation(token);
  if (!invitation) notFound();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          State Compliance Portal · Confirm acceptance
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Confirm portal access
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Signed in as <span className="font-mono">{user.email}</span>.
        </p>

        {invitation.status !== 'pending' ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-display text-xl text-white">
              {invitation.status === 'accepted'
                ? 'Already accepted'
                : invitation.status === 'revoked'
                  ? 'Invitation revoked'
                  : 'Invitation expired'}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {invitation.status === 'accepted'
                ? 'This invitation was already redeemed. Head to the portal or contact GradeUp if you expected a fresh invitation.'
                : invitation.status === 'revoked'
                  ? 'A GradeUp administrator revoked this invitation. Request a new one to regain access.'
                  : 'This invitation is past its expiry. Request a new invitation from GradeUp to continue.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {invitation.status === 'accepted' ? (
                <Link
                  href="/hs/ad-portal"
                  className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
                >
                  Open portal
                </Link>
              ) : null}
              <Link
                href="mailto:support@gradeupnil.com"
                className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
              >
                Contact GradeUp
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <StateAdAcceptInvitationForm
              token={token}
              stateCode={invitation.stateCode}
              organizationName={invitation.organizationName}
            />
          </div>
        )}
      </section>
    </main>
  );
}
