/**
 * /athletes/[username]/support/thanks
 *
 * Return URL after a successful Stripe Checkout for a supporter payment.
 * Shows a clean confirmation to the supporter. Does not expose payment
 * details beyond a success message + return link.
 *
 * Webhook is the source of truth for payment state — this page is purely
 * the supporter's confirmation UX.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Thanks for your support — GradeUp NIL',
  description:
    'Your supporter payment to a GradeUp scholar-athlete is being processed.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function SupportThanksPage({ params }: PageProps) {
  const { username } = await params;

  return (
    <main className="marketing-dark min-h-screen bg-[var(--marketing-gray-900)] text-[var(--ink)]">
      <section className="mx-auto max-w-2xl px-6 py-20">
        <div className="flex items-center gap-3 text-[var(--cobalt)]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-widest">
            Payment received
          </p>
        </div>

        <h1 className="mt-4 font-display text-4xl text-[var(--ink)] md:text-5xl">
          Thanks for supporting @{username}.
        </h1>

        <p className="mt-4 text-lg text-[var(--ink-muted)]">
          Stripe will send you a receipt by email. Once the payment settles,
          the athlete will reach out with your shoutout or personalized
          message.
        </p>

        <section className="mt-10 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6">
          <h2 className="font-display text-lg text-[var(--ink)]">A quick note on taxes</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Supporter payments are NIL transactions, not charitable donations.
            They are <strong className="text-[var(--ink)]">not tax-deductible</strong>
            {' '}and no 501(c)(3) receipt will be issued. The athlete reports
            this amount as NIL income.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/athletes/${encodeURIComponent(username)}`}
            className="btn-marketing-outline inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            Back to profile
          </Link>
          <Link
            href="/athletes"
            className="btn-marketing-primary inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          >
            Explore more athletes
          </Link>
        </div>
      </section>
    </main>
  );
}
