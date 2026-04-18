import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ConsentRequestForm from '@/components/hs/ConsentRequestForm';

/**
 * Athlete-facing page that initiates a parental-consent flow.
 *
 * Server Component. Requires an authenticated Supabase user; unauthenticated
 * visitors are redirected to /login with a redirectTo back to this page so
 * they resume where they left off after signing in.
 *
 * Feature-flagged at the (hs) layout boundary — no need to re-check here.
 */

export const metadata: Metadata = {
  title: 'Request Parental Consent — GradeUp HS',
  description:
    'Send a parent or legal guardian a secure signing link so you can start reviewing NIL deals.',
};

// The form posts to a rate-limited, auth-gated API route. Keep this page fully
// dynamic so the auth check runs on every request.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConsentRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/consent/request');
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Parental Consent
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">
            Request your parent&rsquo;s consent.
          </h1>
          <p className="mt-4 text-white/70">
            You can&rsquo;t accept NIL deals as a minor until a parent or legal
            guardian signs off. Fill this out and we&rsquo;ll email them a
            secure signing link. They set the ground rules; you get cleared to
            review deals within that scope.
          </p>
          <p className="mt-2 text-sm text-white/50">
            Already sent one?{' '}
            <Link
              href="/hs/consent/manage"
              className="font-semibold text-[var(--accent-primary)] hover:underline"
            >
              Check the status
            </Link>
            .
          </p>
        </header>

        <section className="mt-10">
          <ConsentRequestForm />
        </section>

        <aside className="mt-12 rounded-xl border border-white/10 bg-black/30 p-5 text-xs text-white/60">
          <p>
            <strong className="text-white/80">Heads up:</strong> Banned
            categories (gambling, alcohol, tobacco, cannabis, adult content,
            weapons) are blocked at the platform level — your parent&rsquo;s
            consent cannot opt into them. School logos, uniforms, mascots, and
            pay-for-play are also blocked.
          </p>
        </aside>
      </div>
    </main>
  );
}
