/**
 * Spanish parents solution page — /es/solutions/parents.
 *
 * Reuses SolutionHero, ProblemProductProof, CaseStudyTagStrip, SolutionFaq,
 * SolutionSchema, and SolutionCtaBand from the marketing component library,
 * passing Spanish strings from the dictionary.
 */
import type { Metadata } from 'next';
import {
  Heart,
  ShieldCheck,
  Wallet,
  Eye,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import {
  SolutionHero,
  ProblemProductProof,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const revalidate = 300;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';
const PAGE_URL = '/es/solutions/parents';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.parents.metadata.title,
    description: dict.parents.metadata.description,
    alternates: {
      canonical: `${BASE_URL}${PAGE_URL}`,
      languages: {
        en: `${BASE_URL}/solutions/parents`,
        es: `${BASE_URL}${PAGE_URL}`,
        'x-default': `${BASE_URL}/solutions/parents`,
      },
    },
    openGraph: {
      title: dict.parents.metadata.title,
      description: dict.parents.metadata.description,
      url: `${BASE_URL}${PAGE_URL}`,
      locale: 'es_US',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export default async function SpanishParentsPage() {
  const dict = await getDictionary('es');
  const p = dict.parents;

  const faqItems = [
    { question: p.faq.q1, answer: p.faq.a1 },
    { question: p.faq.q2, answer: p.faq.a2 },
    { question: p.faq.q3, answer: p.faq.a3 },
    { question: p.faq.q4, answer: p.faq.a4 },
    { question: p.faq.q5, answer: p.faq.a5 },
    { question: p.faq.q6, answer: p.faq.a6 },
  ];

  return (
    <>
      <SolutionSchema
        scriptId="solutions-parents-es-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL para padres"
        description={p.metadata.description}
        audience="Padres y tutores legales de atletas de preparatoria"
      />

      <SolutionHero
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        titleAccent={p.hero.titleAccent}
        subtitle={p.hero.subtitle}
        primaryCta={{
          label: p.hero.ctaPrimary,
          href: '/signup?role=parent',
          ariaLabel: p.hero.ctaPrimary,
        }}
        secondaryCta={{
          label: p.hero.ctaSecondary,
          href: '/es/hs#waitlist',
        }}
        supportingNote={p.hero.supportingNote}
      />

      <ProblemProductProof
        eyebrow={p.problem.eyebrow}
        heading={p.problem.heading}
        subheading={p.problem.subheading}
        steps={[
          {
            kind: 'problem',
            heading: p.problem.oldStoryHeading,
            body: p.problem.oldStoryBody,
            bullets: [
              p.problem.oldBullet1,
              p.problem.oldBullet2,
              p.problem.oldBullet3,
              p.problem.oldBullet4,
            ],
          },
          {
            kind: 'product',
            heading: p.problem.productHeading,
            body: p.problem.productBody,
            bullets: [
              p.problem.productBullet1,
              p.problem.productBullet2,
              p.problem.productBullet3,
              p.problem.productBullet4,
            ],
          },
          {
            kind: 'proof',
            heading: p.problem.proofHeading,
            body: p.problem.proofBody,
            bullets: [
              p.problem.proofBullet1,
              p.problem.proofBullet2,
              p.problem.proofBullet3,
            ],
          },
        ]}
      />

      <section aria-label={p.features.heading} className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              {p.features.eyebrow}
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              {p.features.heading}
            </h2>
            <p className="mt-3 text-white/70 text-lg">{p.features.subheading}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title={p.features.dualConsentTitle}
              body={p.features.dualConsentBody}
            />
            <FeatureCard
              icon={<Wallet className="h-6 w-6" />}
              title={p.features.custodialTitle}
              body={p.features.custodialBody}
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title={p.features.stateTitle}
              body={p.features.stateBody}
            />
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title={p.features.visibilityTitle}
              body={p.features.visibilityBody}
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6" />}
              title={p.features.auditTitle}
              body={p.features.auditBody}
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-6 w-6" />}
              title={p.features.ncaaTitle}
              body={p.features.ncaaBody}
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Parent quote"
        className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <blockquote className="font-display text-2xl sm:text-3xl font-semibold text-white leading-snug">
            &ldquo;{p.quote.text}&rdquo;
          </blockquote>
          <p className="mt-5 text-sm uppercase tracking-widest text-[var(--accent-primary)]">
            {p.quote.attribution}
          </p>
        </div>
      </section>

      <CaseStudyTagStrip
        tags={['parent_quote', 'tier_b_verified']}
        heading={p.caseStudies.heading}
        subheading={p.caseStudies.subheading}
      />

      <SolutionFaq
        scriptId="solutions-parents-es-faq-jsonld"
        pageUrl={PAGE_URL}
        heading={p.faq.heading}
        subheading={p.faq.subheading}
        items={faqItems}
      />

      <SolutionCtaBand
        heading={p.ctaBand.heading}
        subheading={p.ctaBand.subheading}
        primaryLabel={p.ctaBand.primary}
        primaryHref="/signup?role=parent"
        secondaryLabel={p.ctaBand.secondary}
        secondaryHref="/es/business/case-studies?tag=parent_quote"
        trustNote={p.ctaBand.trustNote}
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
