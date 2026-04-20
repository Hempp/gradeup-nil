/**
 * /hs/unsubscribe/[token]
 *
 * Public unsubscribe landing. Server component — it performs the
 * opt-out server-side on render (GET unsubscribe flow) and shows a
 * friendly confirmation. The API route backs the POST one-click
 * flow some mail clients prefer.
 *
 * Note: rendering this page is itself the unsubscribe action. We
 * accept that tradeoff so mailbox preview fetches don't leave the
 * user half-opted-out; this is the industry-standard one-click
 * pattern.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { unsubscribeByToken } from '@/lib/hs-nil/nurture-sequences';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Unsubscribed — GradeUp NIL',
  description:
    'You have been removed from the GradeUp HS nurture email sequence.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params;

  let matched = false;
  let error: string | null = null;
  try {
    const result = await unsubscribeByToken(token);
    matched = result.matched;
  } catch (err) {
    error = err instanceof Error ? err.message : 'unsubscribe_failed';
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        GradeUp NIL · HS Pilot
      </p>
      <h1 className="font-display text-3xl text-white md:text-4xl">
        {error
          ? "Something went wrong."
          : matched
            ? "You've been opted out."
            : "Link no longer valid."}
      </h1>

      {error ? (
        <p className="max-w-md text-sm text-white/60">
          We hit an error processing this unsubscribe link. Reply to any
          GradeUp email and we&rsquo;ll remove you manually.
        </p>
      ) : matched ? (
        <>
          <p className="max-w-md text-sm text-white/70">
            We&rsquo;ve stopped sending you GradeUp HS nurture emails. You
            won&rsquo;t hear from this sequence again.
          </p>
          <p className="max-w-md text-xs text-white/50">
            If you change your mind later, you can re-join by signing up
            again on the waitlist form. This opt-out is permanent for the
            current signup.
          </p>
        </>
      ) : (
        <p className="max-w-md text-sm text-white/60">
          This unsubscribe link isn&rsquo;t recognised. You may have
          already opted out, or this link never existed. Nothing for you
          to do.
        </p>
      )}

      <Link
        href="/hs"
        className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] underline-offset-4 hover:underline"
      >
        Back to GradeUp HS
      </Link>
    </main>
  );
}
