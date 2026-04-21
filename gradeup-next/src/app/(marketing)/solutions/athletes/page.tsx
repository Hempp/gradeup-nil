/**
 * /solutions/athletes — For Athletes landing.
 *
 * Voice: second-person, direct, agency-forward. Your GPA is your advantage.
 * Speaks to a high-school scholar-athlete in sophomore/junior year who
 * already has a phone, followers, and a grade point average — but no deal.
 *
 * Server Component. ISR 5-min.
 */
import type { Metadata } from 'next';
import {
  Trophy,
  Share2,
  BadgeCheck,
  TrendingUp,
  Rocket,
  Users,
} from 'lucide-react';
import {
  SolutionHero,
  ProblemProductProof,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';

export const revalidate = 300;

const PAGE_URL = '/solutions/athletes';

export const metadata: Metadata = {
  title: 'NIL for HS Athletes — Your GPA is the advantage | GradeUp',
  description:
    'The first NIL platform that pays you for your GPA. Tier-B-verified grade badges, share-the-win trajectory cards, and parental consent handled for you. Built for high-school scholar-athletes.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'GradeUp for Athletes — Your GPA is your advantage',
    description:
      'Get paid for your grades. Build a resume that compounds. First NIL platform built for HS scholar-athletes.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL athlete',
    'scholar-athlete NIL',
    'NIL for high school athletes',
    'get paid for GPA',
    'NIL deal high school',
    'verified GPA NIL badge',
    'HS athlete earnings trajectory',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Do I need a big following to get deals?',
    answer:
      'No. Local brands — restaurants, tutors, training facilities, small retail — care more about your GPA, sport, and community fit than your follower count. GradeUp is designed to make you findable by the brands in your state, not the brands chasing D1 quarterbacks.',
  },
  {
    question: 'What is a Tier-B verified GPA and why does it matter?',
    answer:
      'You upload a transcript, our reviewers verify it, and a verified-GPA badge appears on your profile. Brands filter by verified GPA because it&rsquo;s a trust signal — they&rsquo;re not just hoping you&rsquo;re the person you claim to be. Verified profiles get more deals. That&rsquo;s it.',
  },
  {
    question: 'What does &ldquo;share-the-win&rdquo; mean?',
    answer:
      'When a deal closes, you get an auto-generated trajectory card — your school, your sport, your verified GPA, and the deal earnings. Share it to Instagram, TikTok, X, or LinkedIn with one tap. We track the share as verified social proof, which compounds into your next deal.',
  },
  {
    question: 'Can I sign if I&rsquo;m a minor?',
    answer:
      'Yes. Most pilot states allow it with a parent or legal guardian&rsquo;s consent, which GradeUp collects and stores on every deal. Texas requires you to be at least 17; payment is held in trust until your 18th birthday (we handle that automatically). You don&rsquo;t have to figure it out — the platform does.',
  },
  {
    question: 'Will this hurt my future NCAA eligibility?',
    answer:
      'No. GradeUp follows your state&rsquo;s high-school athletic association rules and never permits things that would jeopardize eligibility — school IP, pay-for-play, or banned categories. Your future college coach will see a clean history.',
  },
  {
    question: 'How fast do I get paid?',
    answer:
      'Depends on the deal, but typical flow: brand funds escrow on signing, deliverable review happens within 48 hours of submission, and payout releases immediately after approval. Most first deals close within a week of matching.',
  },
];

export default function AthletesSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-athletes-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for Athletes"
        description="The first NIL platform built for high-school scholar-athletes. Verified GPA unlocks better deals. Share the win; compound the next."
        audience="High-school student-athletes (grades 8–12)"
      />

      <SolutionHero
        eyebrow="For athletes"
        title="Your GPA is your advantage."
        titleAccent="Get paid for it."
        subtitle="Verified grades unlock better deals. Share every win with a trajectory card that compounds into your next offer. Parental consent gets handled in the background. You focus on the sport and the studying."
        primaryCta={{
          label: 'Sign up as an athlete',
          href: '/signup?role=athlete',
          ariaLabel: 'Create a free athlete account',
        }}
        secondaryCta={{
          label: 'See what you&rsquo;re worth',
          href: '/hs/valuation',
        }}
        supportingNote="Free forever. Verified GPA in 24 hours. Takes 2 minutes."
      />

      <ProblemProductProof
        eyebrow="The athlete&rsquo;s problem"
        heading="You&rsquo;re doing the work. The old game rewards the wrong things."
        subheading="College NIL rewards followers and highlight reels. The version built for you rewards what you already do every night at your desk."
        steps={[
          {
            kind: 'problem',
            heading: 'Why deals ghost',
            body: 'If you&rsquo;re a sophomore with a 3.8 and 800 followers, most NIL platforms don&rsquo;t have a place for you. Brands can&rsquo;t filter by grade; your profile gets buried; deals ghost after the first message.',
            bullets: [
              'No way to signal academic excellence',
              'Brand filters ignore HS athletes entirely',
              'No parent-consent rail — so brands never close',
              'One-off deals with nothing to build on after',
            ],
          },
          {
            kind: 'product',
            heading: 'What we changed',
            body: 'Verified-GPA badge front and center. A deal feed filtered by your state and sport. Share-the-win trajectory cards after every deal. Parental consent collected once; reused every time. It&rsquo;s a profile that compounds.',
            bullets: [
              'Tier-B verified GPA badge brands can actually filter for',
              'Share-the-win cards with real earnings and real shares',
              'Deal feed tailored to your state&rsquo;s rules',
              'Parent consent flows automated — not your problem anymore',
            ],
          },
          {
            kind: 'proof',
            heading: 'Athletes are closing',
            body: 'The first concierge cohort closed every deal they were offered. The share-the-win trajectory cards have been reshared hundreds of times by athletes and their families. The flywheel is already turning.',
            bullets: [
              '100% close rate in the first pilot cohort',
              'Verified profiles get ~3× more deal views',
              'Published case studies with verified earnings',
            ],
          },
        ]}
      />

      <section aria-label="What athletes get" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              What you get
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              A profile that compounds with every deal.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              Everything here ships today. Your GPA, your trajectory, your
              leverage.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<BadgeCheck className="h-6 w-6" />}
              title="Tier-B verified GPA badge"
              body="Upload a transcript once. We verify, then a badge lives on your profile. Brands filter by verified GPA — and verified profiles get the best offers."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Earnings trajectory"
              body="Every deal closed adds to your public trajectory: GPA, sport, grade level, earnings to date. A resume that compounds from freshman year."
            />
            <FeatureCard
              icon={<Share2 className="h-6 w-6" />}
              title="Share-the-win cards"
              body="Auto-generated OG image after every deal. Share to IG, TikTok, X, LinkedIn in one tap. We track the share. Brands see it. Your next offer gets bigger."
            />
            <FeatureCard
              icon={<Trophy className="h-6 w-6" />}
              title="Deals matched to you"
              body="Local brands in your state looking for your sport, your grade level, your fit. No guessing. No cold outreach. The feed comes to you."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Parent consent — handled"
              body="We collect your parent&rsquo;s consent once. Every deal after that inherits it. You don&rsquo;t have to nag anyone, explain anything, or resend anything."
            />
            <FeatureCard
              icon={<Rocket className="h-6 w-6" />}
              title="Bridge to college"
              body="Your HS profile carries forward. When you commit, the trajectory doesn&rsquo;t reset — you walk onto campus with deals, earnings, and a proven record."
            />
          </div>
        </div>
      </section>

      <TestimonialQuote
        quote="I didn&rsquo;t think my grades mattered for NIL. That was the whole pitch of the old platforms — just get followers. GradeUp put my 3.9 on the profile, a local tutoring brand found me in a week, and my first deal paid more than my summer job."
        attribution="HS athlete, sophomore · California"
      />

      <CaseStudyTagStrip
        tags={['tier_b_verified', 'viral_share']}
        heading="Athletes closing deals, publicly."
        subheading="Case studies tagged with verified GPA or a viral share event."
      />

      <SolutionFaq
        scriptId="solutions-athletes-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Stuff you&rsquo;re actually wondering"
        subheading="Six common questions from HS athletes — and straight answers."
        items={FAQ_ITEMS}
      />

      <SolutionCtaBand
        heading="Build a profile that pays you through college."
        subheading="Two minutes to sign up. 24 hours to get a verified GPA badge. Free forever."
        primaryLabel="Sign up as an athlete"
        primaryHref="/signup?role=athlete"
        secondaryLabel="See what you&rsquo;re worth"
        secondaryHref="/hs/valuation"
        trustNote="Free · No credit card · NCAA-eligibility safe"
      />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-marketing p-6">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function TestimonialQuote({
  quote,
  attribution,
}: {
  quote: string;
  attribution: string;
}) {
  return (
    <section aria-label="Athlete quote" className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <blockquote className="font-display text-2xl sm:text-3xl font-semibold text-white leading-snug">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <p className="mt-5 text-sm uppercase tracking-widest text-[var(--accent-primary)]">
          {attribution}
        </p>
      </div>
    </section>
  );
}
