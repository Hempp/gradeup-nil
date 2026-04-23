import Script from 'next/script';
import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildMarketingMetadata } from '@/lib/seo';

// ISR every 5 minutes
export const revalidate = 300;

export const metadata = buildMarketingMetadata({
  title:
    'How GradeUp compares to other NIL platforms | HS-first NIL',
  description:
    'How GradeUp HS-NIL differs from enterprise college NIL platforms and subscription-based NIL apps on parent-centered HS-NIL, transparent pricing, state compliance, and referrals.',
  path: '/compare',
  ogType: 'article',
});

const PUBLISHED_ISO = '2026-04-17T00:00:00Z';
const LAST_REVIEWED_HUMAN = 'April 17, 2026';

// Build-time static JSON-LD (Article schema). No user input enters this object.
const ARTICLE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline:
    'How GradeUp HS-NIL compares to other NIL platforms',
  description:
    'Side-by-side comparison of GradeUp HS-NIL against enterprise college NIL platforms and subscription-based NIL apps across audience, compliance, pricing transparency, and HS-specific product depth.',
  author: { '@type': 'Organization', name: 'GradeUp NIL' },
  publisher: { '@type': 'Organization', name: 'GradeUp NIL' },
  datePublished: PUBLISHED_ISO,
  dateModified: PUBLISHED_ISO,
  mainEntityOfPage: 'https://gradeup-nil.com/compare',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON ROWS
// ═══════════════════════════════════════════════════════════════════════════

// Two competitor archetypes we compare against. Deliberately not named —
// we describe the category they represent so the comparison is about
// product shape, not brand positioning.
type CompareRow = {
  dimension: string;
  gradeup: string;
  enterprise: string; // "Enterprise college NIL" archetype
  subscription: string; // "Subscription / fan-app NIL" archetype
};

const rows: CompareRow[] = [
  {
    dimension: 'Primary audience',
    gradeup: 'HS scholar-athletes + parents, extending into college',
    enterprise: 'College athletes via enterprise (schools, collectives)',
    subscription: 'College athletes + paying fans (subscription)',
  },
  {
    dimension: 'Self-serve signup for brands',
    gradeup: 'Yes — under two minutes, no sales call',
    enterprise: 'No — contact sales',
    subscription: 'No — contact sales',
  },
  {
    dimension: 'Self-serve signup for parents',
    gradeup: 'Yes — parents sign up first, then link their athlete',
    enterprise: 'No — no parent-facing surface',
    subscription: 'No — no parent-facing surface',
  },
  {
    dimension: 'Parental consent architecture',
    gradeup: 'Yes — scope-based consent, identity verification, audit log',
    enterprise: 'No — enterprise district contract implies out-of-band consent',
    subscription: 'No — not surfaced publicly',
  },
  {
    dimension: 'Per-state rules engine (automated)',
    gradeup: 'Yes — preflight validation against 7 pilot states',
    enterprise: 'Partial — published blog content, not a live engine',
    subscription: 'Asserted compliance, not demonstrated',
  },
  {
    dimension: 'State athletic association reporting',
    gradeup: 'Yes — free per-school transcripts, on-request, for state athletic associations',
    enterprise: 'No — sells to schools, not to state athletic associations',
    subscription: 'No',
  },
  {
    dimension: 'Public pricing',
    gradeup: 'Yes — 8% / 6% take-rate published; Brand Plus at $149/mo',
    enterprise: 'No — contact sales on every product page',
    subscription: 'No — contact sales for brand campaigns',
  },
  {
    dimension: 'HS-specific product',
    gradeup: 'Yes — core product; 7-state pilot, consent, disclosure pipeline',
    enterprise: 'No — college-first; HS via enterprise district pilots',
    subscription: 'No — single help-center article',
  },
  {
    dimension: 'Dual-audience (HS + college)',
    gradeup: 'Yes — built to preserve trajectory HS → college → alumni',
    enterprise: 'No — college-first; HS via enterprise-district only',
    subscription: 'No — college-first; HS footnoted',
  },
  {
    dimension: 'Viral referral system',
    gradeup: 'Yes — parent-to-parent referrals, tiered rewards',
    enterprise: 'No — enterprise sales-driven growth',
    subscription: 'Partial — fan subscription creates some network effect',
  },
  {
    dimension: 'Dispute resolution system',
    gradeup: 'Yes — structured dispute flow with admin mediation',
    enterprise: 'Not publicly surfaced',
    subscription:
      'Reported gap — public complaints of unfulfilled deals after content posted',
  },
  {
    dimension: 'Case studies with per-deal ROI',
    gradeup: 'Yes — verified case studies tied to share events and deal data',
    enterprise: 'No — scale claims + reviews, not per-deal ROI studies',
    subscription: 'Yes — sub-affiliate case studies with named brand numbers',
  },
  {
    dimension: 'Trajectory narrative / public share URLs',
    gradeup: 'Yes — /hs/trajectory/[token] with dynamic OG image',
    enterprise: 'No',
    subscription: 'No — profile shows subscribers and recent content only',
  },
  {
    dimension: 'PWA + push notifications',
    gradeup: 'Yes — PWA shell with push notification wiring',
    enterprise: 'Native apps; no PWA emphasis',
    subscription: 'Native apps; no PWA emphasis',
  },
  {
    dimension: 'Time-to-first-deal for a new user (estimate)',
    gradeup: 'Days — self-serve parent + brand signup, preflight at deal time',
    enterprise: 'Weeks to months — enterprise sales + legal review',
    subscription: 'Days for athlete-side; brand side is sales-gated',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════════

function Hero() {
  return (
    <section
      aria-label="Compare hero"
      className="relative overflow-hidden bg-black pt-32 pb-16 sm:pt-40 sm:pb-20"
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 0, 200, 0.08) 0%, transparent 50%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          Head-to-head comparison
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          GradeUp HS-NIL vs.{' '}
          <span className="gradient-text-cyan">enterprise college NIL</span>{' '}
          vs.{' '}
          <span className="text-[var(--accent-gold)]">
            subscription NIL apps
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          How the three categories actually differ — product shape, pricing
          posture, and who they were designed for. We&rsquo;re new; we know
          it. We win on specific axes. Here&rsquo;s the honest comparison.
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════════════

function CompareTable() {
  return (
    <section
      aria-label="Feature-by-feature comparison"
      className="bg-black pb-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[var(--marketing-gray-950)]">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">
              Feature-by-feature comparison of GradeUp HS-NIL against
              enterprise college NIL and subscription-based NIL platforms
              across {rows.length} dimensions
            </caption>
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Dimension
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-semibold text-[var(--accent-primary)] sm:px-6"
                >
                  GradeUp HS-NIL
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Enterprise college NIL
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Subscription NIL apps
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.dimension}
                  className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-white/90 sm:px-6 align-top"
                  >
                    {row.dimension}
                  </th>
                  <td className="px-4 py-3 text-white/90 sm:px-6 align-top">
                    {row.gradeup}
                  </td>
                  <td className="px-4 py-3 text-white/70 sm:px-6 align-top">
                    {row.enterprise}
                  </td>
                  <td className="px-4 py-3 text-white/70 sm:px-6 align-top">
                    {row.subscription}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40 sm:hidden">
          Scroll horizontally to compare all three categories.
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WHEN TO CHOOSE
// ═══════════════════════════════════════════════════════════════════════════

function WhenToChoose() {
  return (
    <section aria-label="When to choose each platform" className="bg-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-black p-6 md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-bold text-[var(--accent-primary)] mb-3">
              When to choose GradeUp
            </h3>
            <p className="text-sm text-white/80 leading-relaxed">
              If you&rsquo;re a high-school scholar-athlete, a parent, a local
              or regional brand running HS-facing deals, or a state athletic
              association compliance office — GradeUp is built for you. The
              platform is parent-first by architecture, publishes its fees
              transparently, validates every deal against per-state rules at
              creation time, and lets anyone sign up in minutes without a
              sales call. If &ldquo;contact sales&rdquo; is a dealbreaker, this
              is the one.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[var(--marketing-gray-950)] p-6">
            <h3 className="text-lg font-bold text-white mb-3">
              When enterprise college NIL might fit
            </h3>
            <p className="text-sm text-white/75 leading-relaxed">
              If you&rsquo;re already an enrolled college program or a
              collective with an enterprise budget, the established
              college-first platforms have deep integrations with school
              compliance offices and large athlete networks. Their pricing is
              bespoke and their sales cycles run weeks to months. For
              established Division-I programs with existing institutional
              procurement, that&rsquo;s a credible choice — it&rsquo;s simply
              not designed for a high-school parent or a local brand with a
              $200 budget.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[var(--marketing-gray-950)] p-6">
            <h3 className="text-lg font-bold text-white mb-3">
              When a subscription NIL app might fit
            </h3>
            <p className="text-sm text-white/75 leading-relaxed">
              If you&rsquo;re a college athlete who wants to turn an existing
              fan following into recurring subscription revenue, the
              subscription-based apps are purpose-built for that, and some run
              strong sub-affiliate brand-campaign funnels. The product is
              college-oriented; high school is usually a footnote, and the
              architecture assumes an already-of-age athlete rather than a
              parent-as-custodian relationship.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATED
// ═══════════════════════════════════════════════════════════════════════════

function UpdatedNotice() {
  return (
    <section
      aria-label="Update metadata"
      className="bg-[var(--marketing-gray-950)] py-12 border-y border-white/10"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-white/10 bg-black p-5">
          <p className="text-sm text-white/70">
            This page is updated{' '}
            <strong className="text-white">{LAST_REVIEWED_HUMAN}</strong>{' '}
            based on publicly available product information from platforms in
            each category. We re-audit this comparison when public product
            surfaces change materially or at least quarterly.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════════════════

function CompareCTA() {
  return (
    <section aria-label="Compare CTA" className="bg-black py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-[var(--accent-gold)]/10 p-10 text-center">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/15 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              See the pricing. Then decide.
            </h2>
            <p className="mt-4 text-white/70 max-w-2xl mx-auto">
              No sales call. Our take-rate, subscription price, and everything
              included is on one public page.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="btn-marketing-primary gap-2 w-full sm:w-auto">
                  See GradeUp pricing
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/signup/brand">
                <Button size="lg" className="btn-marketing-outline gap-2 w-full sm:w-auto">
                  Create a brand account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ComparePage() {
  return (
    <>
      <Script
        id="compare-article-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(ARTICLE_JSONLD)}
      </Script>
      <Hero />
      <CompareTable />
      <WhenToChoose />
      <UpdatedNotice />
      <CompareCTA />
    </>
  );
}
