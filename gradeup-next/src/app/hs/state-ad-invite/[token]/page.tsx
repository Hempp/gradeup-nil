/**
 * /hs/state-ad-invite/[token] — PUBLIC invitation landing page.
 *
 * Lives OUTSIDE the (hs) route-group layout so it isn't blocked by the
 * FEATURE_HS_NIL flag-gate (the invited AD reaches this URL before they
 * have any flags at all, and often before they have an account).
 *
 * Server Component. Reads the token through the service-role client, shows
 * invitation status (pending / expired / revoked / accepted), and routes
 * the visitor to the acceptance flow (which itself handles signup).
 *
 * Robots: noindex, nofollow — these URLs should never be crawled.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'State Compliance Portal invitation — GradeUp NIL',
  description:
    'Accept your invitation to the GradeUp NIL state compliance portal.',
  robots: { index: false, follow: false },
};

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

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default async function StateAdInviteLandingPage({ params }: PageProps) {
  // If FEATURE_HS_NIL is globally off we hide this page entirely so the
  // admin flow isn't leaked. We do NOT 404 when the flag is on — this
  // page is specifically for people who don't have the flag in their
  // session yet.
  if (!isFeatureEnabled('HS_NIL')) {
    notFound();
  }

  const { token } = await params;
  if (!token || token.length > 200) notFound();

  const invitation = await loadInvitation(token);
  if (!invitation) notFound();

  const acceptHref = `/hs/state-ad-invite/${encodeURIComponent(token)}/accept`;
  // If they need to sign up first, this is the path the login page
  // will redirect back to.
  const loginNext = encodeURIComponent(acceptHref);
  const loginHref = `/login?next=${loginNext}`;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          GradeUp NIL · State Compliance Portal
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          {invitation.status === 'pending'
            ? `You're invited to review NIL compliance for ${invitation.stateCode}`
            : 'Invitation notice'}
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Issued to <strong>{invitation.organizationName}</strong>.
        </p>

        {invitation.status === 'pending' ? (
          <PendingPanel
            stateCode={invitation.stateCode}
            organizationName={invitation.organizationName}
            expiresAt={invitation.expiresAt}
            loginHref={loginHref}
            acceptHref={acceptHref}
          />
        ) : invitation.status === 'accepted' ? (
          <StatusPanel
            title="Already accepted"
            body="This invitation has already been redeemed. If you believe this is an error, contact your GradeUp administrator."
          />
        ) : invitation.status === 'revoked' ? (
          <StatusPanel
            title="Invitation revoked"
            body="A GradeUp administrator revoked this invitation before it was accepted. Please request a new invitation if you still need access."
          />
        ) : (
          <StatusPanel
            title="Invitation expired"
            body={`This invitation expired on ${fmtDate(invitation.expiresAt)}. Please request a new invitation.`}
          />
        )}

        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-white/60">
          <p className="font-semibold text-white/80">
            Questions before accepting?
          </p>
          <p className="mt-2">
            Reply directly to the invitation email, or contact GradeUp at{' '}
            <Link
              href="mailto:support@gradeupnil.com"
              className="text-[var(--accent-primary)] underline decoration-white/30 underline-offset-2 hover:text-[var(--accent-primary)]"
            >
              support@gradeupnil.com
            </Link>
            . We&rsquo;re happy to walk through the data model and audit
            surface before you sign in.
          </p>
        </div>
      </section>
    </main>
  );
}

function PendingPanel({
  stateCode,
  organizationName,
  expiresAt,
  loginHref,
  acceptHref,
}: {
  stateCode: string;
  organizationName: string;
  expiresAt: string;
  loginHref: string;
  acceptHref: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-white/80">
        GradeUp NIL is extending read-only portal access to{' '}
        <strong>{organizationName}</strong> so you can monitor the
        high-school NIL activity in <strong>{stateCode}</strong> under your
        jurisdiction.
      </p>
      <h2 className="mt-6 font-display text-lg text-white">What you get</h2>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        <li>
          Every HS NIL deal signed in {stateCode}, with per-deal compliance
          status (parental consent, disclosure sent, rule version).
        </li>
        <li>
          Every outbound disclosure emitted to your office — successful and
          failed — with payload previews.
        </li>
        <li>
          First-name + last-initial athlete references. No email, phone,
          DOB, or parent PII.
        </li>
        <li>
          Full audit trail of your own portal access, visible inside the
          portal itself.
        </li>
      </ul>

      <h2 className="mt-6 font-display text-lg text-white">Next step</h2>
      <p className="mt-2 text-sm text-white/70">
        Accepting takes two steps:
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/70">
        <li>
          Sign in or create a GradeUp account with your professional email.
        </li>
        <li>
          Confirm acceptance; you&rsquo;ll be routed directly into the
          portal.
        </li>
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={loginHref}
          className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
        >
          Sign in to continue
        </Link>
        <Link
          href={acceptHref}
          className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
        >
          I&rsquo;m already signed in
        </Link>
      </div>
      <p className="mt-4 text-xs text-white/50">
        Invitation expires {fmtDate(expiresAt)}.
      </p>
    </div>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/70">{body}</p>
      <div className="mt-5">
        <Link
          href="mailto:support@gradeupnil.com"
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
        >
          Contact GradeUp
        </Link>
      </div>
    </div>
  );
}
