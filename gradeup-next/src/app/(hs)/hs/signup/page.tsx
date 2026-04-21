import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * HS signup role picker.
 *
 * Lives inside the (hs) route group, so the HSLayout feature-flag gate
 * already 404s non-flagged users — no extra check needed here.
 *
 * Mirrors the college role picker's card layout but surfaces the HS-specific
 * role set: athlete, parent/guardian (separate role because parents manage
 * their athlete's consent), coach, brand, athletic director. The HS side
 * uses the dark marketing aesthetic (matches /hs landing) rather than the
 * light auth card chrome.
 */

export const metadata: Metadata = {
  title: 'Join GradeUp HS — Choose Your Role',
  description: 'Sign up for the high-school NIL platform built for scholar-athletes and the parents who guide them.',
};

interface HSRoleCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function HSRoleCard({ href, title, description, icon }: HSRoleCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-[var(--accent-primary)] hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-900)]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] transition-colors group-hover:bg-[var(--accent-primary)] group-hover:text-black">
        {icon}
      </div>
      <h3 className="font-display text-xl text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-primary)] opacity-60 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        Continue
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

export default function HSSignupPage() {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          High-School NIL
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
          Who&rsquo;s joining?
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          GradeUp HS is built for scholar-athletes, the parents who guide them,
          and the local brands that sponsor them. Pick your role to continue.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HSRoleCard
            href="/hs/signup/athlete"
            title="HS Athlete"
            description="I compete in high-school sports and want to start building my NIL profile."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <path d="M12 22V8" />
                <path d="m5 12 7-4 7 4" />
              </svg>
            }
          />

          <HSRoleCard
            href="/hs/signup/parent"
            title="Parent / Guardian"
            description="My child is a high-school athlete. I manage consent, payouts, and oversight."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M21 15v6" />
                <path d="M18 18h6" />
              </svg>
            }
          />

          <HSRoleCard
            href="/hs/waitlist?role=coach"
            title="HS Coach"
            description="I coach high-school athletes and want visibility into my program's NIL activity."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 6.1H3" />
                <path d="M21 12.1H3" />
                <path d="M15.1 18H3" />
              </svg>
            }
          />

          <HSRoleCard
            href="/hs/signup/brand"
            title="Local Brand"
            description="I represent a local business interested in sponsoring HS scholar-athletes."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                <path d="M12 3v6" />
              </svg>
            }
          />

          <HSRoleCard
            href="/hs/waitlist?role=ad"
            title="Athletic Director"
            description="I oversee NIL compliance for a high-school athletics program."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
        </div>

        <div className="mt-8 flex items-center justify-between text-sm text-white/60">
          <Link
            href="/signup?bracket=college"
            className="inline-flex items-center gap-1 transition-colors hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to college signup
          </Link>
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
