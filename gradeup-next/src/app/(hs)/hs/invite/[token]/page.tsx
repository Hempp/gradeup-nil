/**
 * /hs/invite/[token]
 *
 * Landing page for a waitlist invite link. Three paths:
 *
 *   1. `?opt_out=1` — Mark the waitlist row as opted_out and render a
 *      brief confirmation page. No redirect, no cookie.
 *
 *   2. Valid, unconverted token — Drop an hs_invite cookie carrying
 *      { role, state_code, token } and redirect the visitor to the
 *      appropriate signup page (athlete / parent / coach / brand).
 *
 *   3. Unknown or already-converted token — Redirect to /hs landing.
 *
 * The cookie is short-lived (30 min). The signup pages read it on
 * success and call reconcileSignupToWaitlist() to flip the row to
 * 'converted'.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  lookupInviteToken,
  markOptedOut,
  type InviteTokenLookup,
} from '@/lib/hs-nil/waitlist-activation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Your GradeUp HS invite — GradeUp NIL',
  description: 'Claim your spot on the GradeUp HS pilot.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ROLE_SIGNUP_PATH: Record<InviteTokenLookup['role'], string> = {
  athlete: '/hs/signup/athlete',
  parent: '/hs/signup/parent',
  // Coach role: no dedicated HS signup page yet, route to the generic
  // signup picker with a query param so the client UI can prompt
  // for the coach path when we build it.
  coach: '/hs/signup?from=invite&role=coach',
  brand: '/hs/signup/brand',
};

function isTruthyOptOut(raw: string | string[] | undefined): boolean {
  if (!raw) return false;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === '1' || value === 'true' || value === 'yes';
}

export default async function InviteTokenPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const search = await searchParams;
  const wantsOptOut = isTruthyOptOut(search.opt_out);

  let lookup: InviteTokenLookup | null = null;
  try {
    lookup = await lookupInviteToken(token);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs/invite] lookup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    lookup = null;
  }

  // Unknown or consumed token → send them to the landing page. We do
  // not leak whether the token ever existed.
  if (!lookup || lookup.activation_state === 'converted') {
    redirect('/hs');
  }

  if (wantsOptOut) {
    // Best-effort opt-out. We never throw here — the UX should always
    // tell the user they're done.
    try {
      await markOptedOut(token);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs/invite] opt-out failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return (
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl md:text-5xl">You&rsquo;re opted out.</h1>
          <p className="mt-4 text-white/70">
            We&rsquo;ve removed you from GradeUp HS waitlist outreach. You
            won&rsquo;t receive any more emails about the pilot.
          </p>
          <p className="mt-4 text-sm text-white/50">
            Changed your mind? You can rejoin the waitlist any time from the{' '}
            <Link href="/hs" className="text-[var(--accent-primary)] hover:underline">
              GradeUp HS page
            </Link>
            .
          </p>
        </section>
      </main>
    );
  }

  // Opted-out or bounced tokens that the user revisits — if we got
  // here we know activation_state is 'invited' or (edge case) 'waiting'.
  // Anything else (opted_out, bounced) shouldn't proceed to signup.
  if (
    lookup.activation_state !== 'invited' &&
    lookup.activation_state !== 'waiting'
  ) {
    redirect('/hs');
  }

  // Drop the cookie. Payload is not sensitive — just a pointer — so
  // no signing is required; the server re-validates the token on the
  // signup path via reconcileSignupToWaitlist().
  const jar = await cookies();
  jar.set(
    'hs_invite',
    JSON.stringify({
      role: lookup.role,
      state_code: lookup.state_code,
      token,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30, // 30 minutes
    }
  );

  const dest = ROLE_SIGNUP_PATH[lookup.role];
  redirect(dest);
}
