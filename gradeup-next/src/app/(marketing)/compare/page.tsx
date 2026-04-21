import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ISR every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title:
    'GradeUp HS-NIL vs. Opendorse vs. NIL Club | Compare High-School NIL Platforms',
  description:
    'See how GradeUp compares to Opendorse and NIL Club on parent-centered HS-NIL, transparent pricing, state compliance, and viral referral systems.',
  openGraph: {
    title:
      'GradeUp HS-NIL vs. Opendorse vs. NIL Club | Compare High-School NIL Platforms',
    description:
      'See how GradeUp compares to Opendorse and NIL Club on parent-centered HS-NIL, transparent pricing, state compliance, and viral referral systems.',
    type: 'article',
  },
  alternates: { canonical: '/compare' },
};

const PUBLISHED_ISO = '2026-04-17T00:00:00Z';
const LAST_REVIEWED_HUMAN = 'April 17, 2026';

// Build-time static JSON-LD (Article schema). No user input enters this object.
const ARTICLE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline:
    'GradeUp HS-NIL vs. Opendorse vs. NIL Club — how they actually differ',
  description:
    'Side-by-side comparison of GradeUp HS-NIL, Opendorse, and NIL Club across audience, compliance, pricing transparency, and HS-specific product depth.',
  author: { '@type': 'Organization', name: 'GradeUp NIL' },
  publisher: { '@type': 'Organization', name: 'GradeUp NIL' },
  datePublished: PUBLISHED_ISO,
  dateModified: PUBLISHED_ISO,
  mainEntityOfPage: 'https://gradeup-nil.com/compare',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON ROWS
// ═══════════════════════════════════════════════════════════════════════════

type CompareRow = {
  dimension: string;
  gradeup: string;
  opendorse: string;
  nilClub: string;
};

const rows: CompareRow[] = [
  {
    dimension: 'Primary audience',
    gradeup: 'HS scholar-athletes + parents, extending into college',
    opendorse: 'College athletes via enterprise (schools, collectives)',
    nilClub: 'College athletes + paying fans (subscription)',
  },
  {
    dimension: 'Self-serve signup for brands',
    gradeup: 'Yes — under two minutes, no sales call',
    opendorse: 'No — contact sales',
    nilClub: 'No — contact sales',
  },
  {
    dimension: 'Self-serve signup for parents',
    gradeup: 'Yes — parents sign up first, then link their athlete',
    opendorse: 'No — no parent-facing surface',
    nilClub: 'No — no parent-facing surface',
  },
  {
    dimension: 'Parental consent architecture',
    gradeup: 'Yes — scope-based consent, identity verification, audit log',
    opendorse: 'No — enterprise district contract implies out-of-band consent',
    nilClub: 'No — not surfaced publicly',
  },
  {
    dimension: 'Per-state rules engine (automated)',
    gradeup: 'Yes — preflight validation against 7 pilot states',
    opendorse: 'Partial — blog post cataloguing state rules; not a live engine',
    nilClub: 'Asserted compliance, not demonstrated',
  },
  {
    dimension: 'State AD compliance portal',
    gradeup: 'Yes — free read-only portal for state athletic associations',
    opendorse: 'No — sells to schools, not to state athletic associations',
    nilClub: 'No',
  },
  {
    dimension: 'Public pricing',
    gradeup: 'Yes — 8% / 6% take-rate published; Brand Plus at $149/mo',
    opendorse: 'No — contact sales on every product page',
    nilClub: 'No — contact sales for brand campaigns',
  },
  {
    dimension: 'HS-specific product',
    gradeup: 'Yes — core product; 7-state pilot, consent, disclosure pipeline',
    opendorse:
      'No — one blog post + 3-year district enterprise contract pilot',
    nilClub: 'No — single help-center article',
  },
  {
    dimension: 'Dual-audience (HS + college)',
    gradeup: 'Yes — built to preserve trajectory HS → college → alumni',
    opendorse: 'No — college-first; HS via enterprise-district only',
    nilClub: 'No — college-first; HS footnoted',
  },
  {
    dimension: 'Viral referral system',
    gradeup: 'Yes — parent-to-parent referrals, tiered rewards',
    opendorse: 'No — enterprise sales-driven growth',
    nilClub: 'Partial — fan subscription creates some network effect',
  },
  {
    dimension: 'Dispute resolution system',
    gradeup: 'Yes — structured dispute flow with admin mediation',
    opendorse: 'Not publicly surfaced',
    nilClub:
      'Reported gap — public complaints of unfulfilled deals after content posted',
  },
  {
    dimension: 'Case studies with per-deal ROI',
    gradeup: 'Yes — verified case studies tied to share events and deal data',
    opendorse: 'No — scale claims + reviews, not per-deal ROI studies',
    nilClub: 'Yes — sub-affiliate case studies with named brand numbers',
  },
  {
    dimension: 'Trajectory narrative / public share URLs',
    gradeup: 'Yes — /hs/trajectory/[token] with dynamic OG image',
    opendorse: 'No',
    nilClub: 'No — profile shows subscribers and recent content only',
  },
  {
    dimension: 'PWA + push notifications',
    gradeup: 'Yes — PWA shell with push notification wiring',
    opendorse: 'Native apps; no PWA emphasis',
    nilClub: 'Native apps; no PWA emphasis',
  },
  {
    dimension: 'Funding raised (public sources)',
    gradeup: 'Bootstrapped',
    opendorse: '$38.9M across 16 investors (PitchBook)',
    nilClub: '~$2M (TMV + Notre Dame; PitchBook / Crunchbase)',
  },
  {
    dimension: 'Scale claimed (athletes / deals)',
    gradeup: 'Pre-launch concierge MVP',
    opendorse: '175,000+ athletes · $250M+ NIL compensation processed',
    nilClub: '650,000+ athletes · $50M+ paid · 1.7B follower reach',
  },
  {
    dimension: 'Time-to-first-deal for a new user (estimate)',
    gradeup: 'Days — self-serve parent + brand signup, preflight at deal time',
    opendorse: 'Weeks to months — enterprise sales + legal review',
    nilClub: 'Days for athlete-side; brand side is sales-gated',
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
          <span className="gradient-text-cyan">Opendorse</span> vs.{' '}
          <span className="text-[var(--accent-gold)]">NIL Club</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          How the three platforms actually differ — from public sources, with
          citations. We&rsquo;re new; we know it. We win on specific axes.
          Here&rsquo;s the honest comparison.
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
              Feature-by-feature comparison of GradeUp HS-NIL, Opendorse, and
              NIL Club across {rows.length} dimensions
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
                  Opendorse
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  NIL Club
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
                    {row.opendorse}
                  </td>
                  <td className="px-4 py-3 text-white/70 sm:px-6 align-top">
                    {row.nilClub}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40 sm:hidden">
          Scroll horizontally to compare all three platforms.
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
              When Opendorse might fit
            </h3>
            <p className="text-sm text-white/75 leading-relaxed">
              If you&rsquo;re already an enrolled college program or a
              collective with an enterprise budget, Opendorse is the incumbent:
              175,000+ athletes, $250M+ in NIL compensation processed, and deep
              integrations with school compliance offices. Their pricing is
              bespoke and their sales cycle is weeks to months. For established
              Division-I programs with existing institutional procurement,
              Opendorse is a credible choice — it&rsquo;s simply not designed
              for a high-school parent or a local brand with a $200 budget.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[var(--marketing-gray-950)] p-6">
            <h3 className="text-lg font-bold text-white mb-3">
              When NIL Club might fit
            </h3>
            <p className="text-sm text-white/75 leading-relaxed">
              If you&rsquo;re a college athlete who wants to turn an existing
              fan following into recurring subscription revenue, NIL Club is
              purpose-built for that. Their sub-affiliate brand campaigns
              (SoFi, Coinbase, Amazon Prime Student, Subway) show strong
              conversion numbers for advertisers. The product is
              college-oriented; high school is a single help-center article,
              and the architecture assumes an already-of-age athlete rather
              than a parent-as-custodian relationship.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCES + UPDATED
// ═══════════════════════════════════════════════════════════════════════════

function SourcesAndUpdated() {
  const sources = [
    { label: 'Opendorse homepage (opendorse.com)', href: 'https://opendorse.com/' },
    { label: 'Opendorse enterprise site (biz.opendorse.com)', href: 'https://biz.opendorse.com/' },
    { label: 'PitchBook — Opendorse company profile', href: 'https://pitchbook.com/profiles/company/57762-64' },
    { label: 'Opendorse "NIL at Four" annual report (July 2025)', href: 'https://biz.opendorse.com/wp-content/uploads/2025/07/NIL-at-Four-Monetizing-the-New-Reality_July2025.pdf' },
    { label: 'Opendorse blog — high-school NIL state-by-state', href: 'https://biz.opendorse.com/blog/nil-high-school/' },
    { label: 'County 17 — Wyoming HS Opendorse contract (April 2026)', href: 'https://county17.com/2026/04/16/trustees-take-first-step-on-opendorse-policy/' },
    { label: 'NIL Club homepage (nilclub.com)', href: 'https://nilclub.com' },
    { label: 'NIL Club sub-affiliate case studies', href: 'https://nilclub.com/business/case-studies?type=sub-affiliate' },
    { label: 'PitchBook — NIL Club company profile', href: 'https://pitchbook.com/profiles/company/454329-28' },
    { label: 'Crunchbase — NIL Club profile', href: 'https://www.crunchbase.com/organization/nil-club' },
    { label: 'KWCH (Sept 2024) — Kansas school warning on HS NIL app', href: 'https://www.kwch.com/2024/09/19/app-claims-help-high-school-athletes-make-money-kansas-school-warns-against-joining/' },
  ];

  return (
    <section
      aria-label="Sources and update metadata"
      className="bg-[var(--marketing-gray-950)] py-12 border-y border-white/10"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-white/10 bg-black p-5 mb-8">
          <p className="text-sm text-white/70">
            This page is updated <strong className="text-white">{LAST_REVIEWED_HUMAN}</strong> based on public sources.
            Last reviewed against competitor sites on{' '}
            <strong className="text-white">{LAST_REVIEWED_HUMAN}</strong>. We
            re-audit this comparison when competitor public surfaces change
            materially or at least quarterly.
          </p>
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-4">
          Sources
        </h2>
        <p className="text-sm text-white/60 mb-4">
          All claims above are drawn from publicly accessible sources. We do
          not use private or non-public data to compare competitors.
        </p>
        <ul className="list-disc pl-6 text-sm text-white/75 space-y-2">
          {sources.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] underline underline-offset-2"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
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
  // Structured data. Build-time static; no user input.
  const jsonLdString = JSON.stringify(ARTICLE_JSONLD);
  return (
    <>
      <Script
        id="compare-article-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {jsonLdString}
      </Script>
      <Hero />
      <CompareTable />
      <WhenToChoose />
      <SourcesAndUpdated />
      <CompareCTA />
    </>
  );
}
