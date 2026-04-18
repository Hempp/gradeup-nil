'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThanksContent() {
  const searchParams = useSearchParams();
  const rawPosition = searchParams.get('position');
  const position =
    rawPosition && /^\d+$/.test(rawPosition) ? Number(rawPosition) : null;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 pt-24 pb-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          You&rsquo;re on the list
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
          {position
            ? `You're #${position.toLocaleString()} in line.`
            : "You're in. We'll be in touch."}
        </h1>
        <p className="mt-6 text-lg text-white/70">
          We&rsquo;ll email you the moment GradeUp HS goes live in your state.
          In the meantime, two things move you up the list faster than anything
          else we do.
        </p>

        <ol className="mt-8 space-y-4">
          <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-display text-xl">1. Invite a teammate.</p>
            <p className="mt-2 text-sm text-white/70">
              Every signup from your school bumps you up in our rollout queue.
              We launch states, then schools, then athletes — in that order.
            </p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-display text-xl">2. Follow along.</p>
            <p className="mt-2 text-sm text-white/70">
              We publish pilot updates, state-by-state launch timelines, and
              the first round of brand partnerships in our newsletter. No fluff.
            </p>
          </li>
        </ol>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/hs"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Back to HS home
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-white/10 px-5 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            See the college product
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function HSThanksPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
          <section className="mx-auto max-w-2xl px-6 pt-24 pb-16">
            <p className="text-sm text-white/60">Loading&hellip;</p>
          </section>
        </main>
      }
    >
      <ThanksContent />
    </Suspense>
  );
}
