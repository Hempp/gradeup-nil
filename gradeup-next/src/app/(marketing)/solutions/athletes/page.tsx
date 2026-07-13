/**
 * /solutions/athletes — For Athletes landing.
 *
 * Voice: second-person, direct, agency-forward. Your GPA is your advantage.
 * Speaks to a high-school scholar-athlete in sophomore/junior year who
 * already has a phone, followers, and a grade point average — but no deal.
 *
 * Server Component. ISR 5-min.
 */
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
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/solutions/athletes';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'For scholar-athletes — GradeUp, part of StatStaq',
    description:
      'GradeUp verifies your GPA in three tiers, from self-reported to institution-verified. Once you qualify, StatStaq\'s team produces your content, values your brand, sources your deals, and negotiates your contracts.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL athlete',
    'scholar-athlete NIL',
    'NIL for high school athletes',
    'get paid for GPA',
    'NIL deal high school',
    '3-tier GPA verification',
    'HS athlete earnings trajectory',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Do I need a big following to get deals?',
    answer:
      'No. Local brands — restaurants, tutors, training facilities, small retail — care more about your GPA, sport, and community fit than your follower count. GradeUp verifies your GPA so you&rsquo;re findable; StatStaq&rsquo;s team does the outreach and matching in your state, not the brands chasing D1 quarterbacks.',
  },
  {
    question: 'How does GPA verification work?',
    answer:
      'You start self-reported. Upload a transcript and our OCR review can auto-approve you on the spot — if it reads at least 90% confidence and your extracted GPA is within 0.05 of what you claimed. Your school can also confirm your GPA directly, which is the strongest tier. Brands filter by verified GPA because it&rsquo;s a trust signal, and a verified badge is what puts you in front of StatStaq&rsquo;s deal-sourcing team.',
  },
  {
    question: 'What does &ldquo;share-the-win&rdquo; mean?',
    answer:
      'When a deal closes, StatStaq&rsquo;s team turns it into an auto-generated trajectory card — your school, your sport, your verified GPA, and the deal. Share it to Instagram, TikTok, X, or LinkedIn with one tap. We track the share as verified social proof, which StatStaq uses to source your next deal.',
  },
  {
    question: 'Can I sign if I&rsquo;m a minor?',
    answer:
      'Yes. Most pilot states allow it with a parent or legal guardian&rsquo;s consent, which GradeUp collects and stores on every deal. Texas requires you to be at least 17; payment is held in trust until your 18th birthday (we handle that automatically). GradeUp handles the compliance rails; StatStaq handles the deal itself.',
  },
  {
    question: 'Will this hurt my future NCAA eligibility?',
    answer:
      'No. GradeUp follows your state&rsquo;s high-school athletic association rules, and StatStaq never negotiates anything that would jeopardize eligibility — school IP, pay-for-play, or banned categories. Your future college coach will see a clean history.',
  },
  {
    question: 'How fast do I get paid?',
    answer:
      'Depends on the deal. Typical flow: the brand funds escrow at signing, StatStaq reviews your deliverable within 48 hours of submission, and payout releases as soon as it&rsquo;s approved. There&rsquo;s no guaranteed timeline to your first deal — but StatStaq&rsquo;s team is the one running the search and the negotiation, not you.',
  },
];

export default function AthletesSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-athletes-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for Athletes"
        description="GradeUp verifies your GPA in three tiers, from self-reported to institution-verified. Once you qualify, StatStaq&rsquo;s team produces your content, values your brand, sources your deals, and negotiates your contracts."
        audience="High-school student-athletes (grades 8–12)"
      />

      <SolutionHero
        eyebrow="For athletes"
        title="Your GPA is your advantage."
        titleAccent="StatStaq gets you paid."
        subtitle="Verify your GPA, and StatStaq&rsquo;s team takes over: they produce your content, value your brand, source your deals, and negotiate your contracts. Parental consent gets handled in the background. You focus on the sport and the studying."
        primaryCta={{
          label: 'Qualify with your GPA',
          href: '/signup?role=athlete',
          ariaLabel: 'Create a free athlete account and start GPA verification',
        }}
        secondaryCta={{
          label: 'See what you&rsquo;re worth',
          href: '/hs/valuation',
        }}
        supportingNote="Free forever. GPA verification in three tiers. Takes 2 minutes to start."
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
            body: 'A verified-GPA badge, in three tiers, front and center. A deal feed StatStaq curates by your state and sport. Content StatStaq produces after every deal. Parental consent collected once and reused every time. It&rsquo;s a profile that compounds — and a team that runs it.',
            bullets: [
              '3-tier verified GPA badge brands can actually filter for',
              'StatStaq-produced share cards after every deal',
              'Deal feed tailored to your state&rsquo;s rules',
              'Parent consent flows automated — not your problem anymore',
            ],
          },
          {
            kind: 'proof',
            heading: 'The proof is published, not promised',
            body: 'StatStaq&rsquo;s team is already producing, valuing, sourcing, and negotiating for verified athletes. Every closed deal becomes a case study — tied to a verified GPA, a real school, and an on-platform share — published as it happens, not projected.',
            bullets: [
              'Case studies published as deals close, not projected',
              'Every case study ties to a verified GPA and a real athlete',
              'No stock numbers — what closed is what you see',
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
              title="Three tiers, verified GPA"
              body="Start self-reported. Upload a transcript and it auto-approves at ≥90% OCR confidence and within ±0.05 of your claimed GPA — or your school verifies you directly for the top tier. Any tier gets you in front of StatStaq."
            />
            <FeatureCard
              icon={<Share2 className="h-6 w-6" />}
              title="StatStaq produces your content"
              body="StatStaq&rsquo;s team turns every closed deal into content — the trajectory card, the caption, the deliverable brief. You show up; they handle production. Share it in one tap."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="StatStaq values your brand"
              body="Your GPA, sport, grade level, and closed deals build a public trajectory that shows exactly what you&rsquo;re worth — a valuation StatStaq&rsquo;s team uses to price your next deal."
            />
            <FeatureCard
              icon={<Trophy className="h-6 w-6" />}
              title="StatStaq sources your deals"
              body="Local brands in your state looking for your sport, your grade level, your fit — StatStaq&rsquo;s team finds them and brings the deal to you. No cold outreach, no guessing."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="StatStaq negotiates your contracts"
              body="You don&rsquo;t set the price or read the fine print alone. StatStaq&rsquo;s team negotiates terms, deliverables, and pay on your behalf, and GradeUp keeps parental consent on file for every deal."
            />
            <FeatureCard
              icon={<Rocket className="h-6 w-6" />}
              title="Bridge to college"
              body="Your HS profile carries forward. When you commit, the trajectory doesn&rsquo;t reset — you walk onto campus already qualified, with StatStaq&rsquo;s team representing you from day one."
            />
          </div>
        </div>
      </section>

      <TestimonialQuote
        quote="I didn&rsquo;t think my grades mattered for NIL. That was the whole pitch of the old platforms — just get followers. GradeUp verified my 3.9, and StatStaq&rsquo;s team found the brand, wrote the contract, and got it signed. My first deal paid more than my summer job."
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
        subheading="GradeUp qualifies you. StatStaq represents you. Verify your GPA, and their team takes it from there."
        primaryLabel="Qualify with your GPA"
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
