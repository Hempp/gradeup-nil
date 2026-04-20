/**
 * /solutions — persona landing index.
 *
 * Gateway to the five persona-specific landings (parents, athletes, brands,
 * athletic directors, state AD portal). Mirrors Opendorse's /solutions/*
 * pattern but adapted to HS-first positioning.
 *
 * Server Component. ISR revalidate every 5 min so copy edits propagate
 * without redeploy-pressure.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users,
  Trophy,
  Store,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { SolutionHero, PersonaCard, SolutionSchema } from '@/components/marketing';

export const revalidate = 300;

const PAGE_URL = '/solutions';

export const metadata: Metadata = {
  title: 'Solutions — Built for every side of the high-school NIL deal',
  description:
    'Parents, athletes, brands, high-school athletic directors, and state associations — each get a product built for their side of the deal. Verified grades, parental consent, state-by-state compliance.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'GradeUp NIL — Solutions for every persona',
    description:
      'The only NIL platform built HS-first. One product. Five front doors: parents, athletes, brands, ADs, state associations.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL',
    'NIL platform solutions',
    'HS NIL parents athletes brands',
    'state athletic association NIL',
    'high school athletic director NIL',
  ],
};

export default function SolutionsIndexPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-index-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL Solutions"
        description="Persona landing pages for parents, athletes, brands, ADs, and state associations."
        audience="Parents, student-athletes, brands, athletic directors, state athletic associations"
      />

      <SolutionHero
        eyebrow="Solutions"
        title="One NIL platform."
        titleAccent="Five front doors."
        subtitle="Parents, scholar-athletes, brands, high-school ADs, and state associations each get a product built for their side of the deal — all sharing one source of truth so every deal stays compliant."
        primaryCta={{
          label: 'See how it works',
          href: '/#how-it-works',
          ariaLabel: 'Jump to how GradeUp works',
        }}
        secondaryCta={{
          label: 'Browse case studies',
          href: '/business/case-studies',
        }}
        supportingNote="Live in California, Florida, Georgia, Illinois, New Jersey, New York, and Texas."
      />

      <section
        aria-label="Choose your persona"
        className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              Pick your side
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              Where do you fit?
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              Each persona gets the product built for them. The deal rails,
              consent rails, and disclosure rails are the same underneath — so
              every side sees the same truth.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PersonaCard
              eyebrow="For parents"
              title="Your scholar-athlete&rsquo;s first NIL deal — without the risk."
              description="Dual signature. State-compliant consent. Custodial payouts. A parent dashboard for the person actually signing the permission slip."
              href="/solutions/parents"
              icon={<Users className="h-6 w-6" />}
              bullets={[
                'Parental consent built into every deal',
                'Custodial payouts through Stripe Connect',
                'Real-time view of what your athlete is signing',
              ]}
              ctaLabel="For parents"
            />
            <PersonaCard
              eyebrow="For athletes"
              title="Your GPA is your advantage. Get paid for it."
              description="Verified grades unlock better deals. See your earnings trajectory, share wins publicly, and build a resume that compounds."
              href="/solutions/athletes"
              icon={<Trophy className="h-6 w-6" />}
              bullets={[
                'Tier-B-verified GPA badge on your profile',
                'Share-the-win trajectory with OG image',
                'Parental consent auto-handled in the background',
              ]}
              ctaLabel="For athletes"
            />
            <PersonaCard
              eyebrow="For brands"
              title="Reach HS scholar-athletes in your state — compliance handled."
              description="Local restaurants, tutors, training facilities, boutique retail, fitness studios. Self-serve deal builder; state-by-state rules baked in."
              href="/solutions/brands"
              icon={<Store className="h-6 w-6" />}
              bullets={[
                'Filter athletes by sport, state, and GPA',
                'FMV-priced offers in minutes',
                'Verified deliverables before payout',
              ]}
              ctaLabel="For brands"
            />
            <PersonaCard
              eyebrow="For athletic directors"
              title="Compliance your school doesn&rsquo;t have bandwidth to build."
              description="Parent consent, state disclosure, audit trail — all handled automatically. Every deal in your school is visible in one list."
              href="/solutions/ads"
              icon={<GraduationCap className="h-6 w-6" />}
              bullets={[
                'Automatic state-disclosure filings',
                'Parent-signed consent on every deal',
                'One-click audit export',
              ]}
              ctaLabel="For athletic directors"
            />
            <PersonaCard
              eyebrow="For state associations"
              title="Every NIL deal in your state. One read-only dashboard. Free."
              description="You can&rsquo;t govern what you can&rsquo;t see. The GradeUp State-AD Portal gives your compliance office a read-only view across every member school."
              href="/solutions/state-ads"
              icon={<ShieldCheck className="h-6 w-6" />}
              bullets={[
                'Read-only member-school activity',
                'Disclosure-window compliance signals',
                'Zero cost to your association',
              ]}
              ctaLabel="For state associations"
            />
            <Link
              href="/business/case-studies"
              className="card-marketing p-6 flex flex-col justify-center h-full hover-lift transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Browse all case studies"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-gold)] mb-2">
                Proof
              </span>
              <h3 className="text-xl font-bold text-white mb-2">
                Real deals. Verified earnings.
              </h3>
              <p className="text-white/70 text-sm mb-4 leading-relaxed">
                Every public case study is tied to a completed deal and an
                on-platform share event. No marketing fluff.
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)]">
                Browse case studies
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
