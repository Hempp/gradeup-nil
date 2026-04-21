import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Consent signing-link not-found page.
 *
 * Parents hit this when a signing URL is invalid, expired, already used, or
 * revoked. The default Next.js 404 dead-ends them — this page tells them
 * what happened and shows them the path forward (ask the athlete to resend,
 * or call support). This is the single highest-stakes recovery surface in
 * the product.
 */

export const metadata: Metadata = {
  title: 'Signing link unavailable — GradeUp HS',
  description:
    'This parental consent signing link is no longer valid. Here is how to get a fresh one.',
};

export default function ConsentTokenNotFound() {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Signing link
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          This link isn&rsquo;t active anymore.
        </h1>
        <p className="mt-5 text-lg text-white/70">
          Signing links are short-lived and one-time-use — they expire for your
          protection. Nothing is wrong with your account.
        </p>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="font-display text-2xl">What to do next</h2>
          <ol className="mt-4 space-y-4 text-sm text-white/80 md:text-base">
            <li>
              <span className="mr-2 font-semibold text-white">1.</span>
              Ask your athlete to open their GradeUp HS account and tap{' '}
              <em>Request parental consent</em>. A fresh link will arrive in
              your inbox within a minute.
            </li>
            <li>
              <span className="mr-2 font-semibold text-white">2.</span>
              Check your spam folder — our emails come from{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white">
                consent@gradeupnil.com
              </code>
              .
            </li>
            <li>
              <span className="mr-2 font-semibold text-white">3.</span>
              Still stuck? A real person responds within one business day.
            </li>
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:support@gradeupnil.com?subject=Expired%20consent%20signing%20link"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Email support
            </a>
            <a
              href="tel:+18667234738"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Call 1-866-723-4738
            </a>
          </div>
        </section>

        <p className="mt-10 text-sm text-white/50">
          <Link
            href="/hs"
            className="underline decoration-white/30 underline-offset-2 hover:text-white"
          >
            Back to GradeUp HS
          </Link>
        </p>
      </div>
    </main>
  );
}
