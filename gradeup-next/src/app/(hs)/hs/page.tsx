import type { Metadata } from 'next';
import { WaitlistForm } from '@/components/hs/WaitlistForm';

export const metadata: Metadata = {
  title: 'GradeUp HS — Name, Image, Likeness for High School Athletes',
  description:
    'The first NIL platform built for high-school scholar-athletes. Verified GPA, parental consent, state-compliant deals.',
};

export default function HSLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Phase 0 — Waitlist
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">
          NIL for the 3.9-GPA freshman.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          GradeUp is building the first NIL platform designed for high-school athletes and the
          parents who guide them. Verified grades. Parental consent built in. State-compliant
          by default.
        </p>
        <p className="mt-8 text-sm text-white/50">
          Now live in 6 states: California, Florida, Georgia, Illinois, New Jersey, and New York.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Verified GPA" body="Self-reported today. Institution-verified tomorrow. Every claim is labeled." />
          <Card title="Parents First" body="Dual signature. Custodial payouts. A real dashboard for the people writing the permission slip." />
          <Card title="State Compliant" body="Per-state rules engine handles disclosure windows, category bans, and agent requirements automatically." />
        </div>
      </section>

      <section className="px-6 pb-24">
        <WaitlistForm />
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-3 text-sm text-white/70">{body}</p>
    </div>
  );
}
