/**
 * /blog/state-nil-rules/[stateSlug] — per-state NIL rules blog page.
 *
 * All 51 pages (50 states + DC) are pre-rendered at build time via
 * generateStaticParams, then revalidated daily. Each page pulls live from
 * STATE_RULES + STATE_METADATA, so editing either TypeScript source file
 * is the only maintenance path — no markdown files to wrangle.
 *
 * SEO pattern:
 *   - Title: "[State] High-School NIL Rules (2026) | GradeUp"
 *   - Description: plain-English summary keyed off the state's permission status
 *   - Canonical: /blog/state-nil-rules/[slug]
 *   - JSON-LD: schema.org/Article with datePublished + dateModified from
 *     the state's lastReviewed timestamp, plus FAQ JSON-LD (injected by
 *     StateBlogFaq -> SolutionFaq).
 */
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import {
  ALL_STATE_CODES,
  getStateBlogData,
  permissionStatusLabel,
  permissionStatusDescription,
  slugifyStateCode,
  unslugifyToCode,
  countPermittedNeighbors,
} from '@/lib/hs-nil/state-blog-content';
import {
  StateBlogHero,
  StateRuleAtAGlance,
  StateNeighborsSidebar,
  StateBlogFaq,
  SolutionCtaBand,
} from '@/components/marketing';
import type { StateNILRules, PermissionStatus } from '@/lib/hs-nil/state-rules';

// Statically render every state at build time.
export async function generateStaticParams() {
  return ALL_STATE_CODES.map((code) => ({
    stateSlug: slugifyStateCode(code),
  }));
}

// Rebuild each page once per day. Any rule edit propagates within 24h.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ stateSlug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { stateSlug } = await params;
  const code = unslugifyToCode(stateSlug);
  if (!code) {
    return { title: 'Not found | GradeUp' };
  }
  const data = getStateBlogData(code);
  const title = `${data.name} High-School NIL Rules (2026) | GradeUp`;
  const description = buildMetaDescription(data.name, data.status, data.rules);

  return {
    title,
    description,
    alternates: { canonical: data.canonicalPath },
    openGraph: {
      title: `${data.name} HS NIL rules — GradeUp`,
      description,
      type: 'article',
      url: data.canonicalPath,
    },
    robots: { index: true, follow: true },
    keywords: [
      `${data.name} high school NIL`,
      `${data.name} NIL rules`,
      `${data.name} HS NIL`,
      `${data.meta.governingBody} NIL`,
      `high school NIL ${data.name}`,
      'HS NIL by state',
    ],
  };
}

function buildMetaDescription(
  stateName: string,
  status: PermissionStatus,
  rules: StateNILRules,
): string {
  switch (status) {
    case 'permitted': {
      const parts: string[] = [];
      parts.push(`High-school NIL is permitted in ${stateName}.`);
      if (rules.requiresParentalConsent) parts.push('Parental consent required.');
      if (rules.disclosureWindowHours) {
        parts.push(
          `Disclosures due within ${rules.disclosureWindowHours} hours.`,
        );
      }
      if (rules.minimumAge !== null) {
        parts.push(`Minimum age: ${rules.minimumAge}.`);
      }
      if (rules.paymentDeferredUntilAge18) {
        parts.push('Payments held in trust until age 18.');
      }
      parts.push(
        'Full compliance breakdown, FAQ, and signup details inside.',
      );
      return parts.join(' ');
    }
    case 'limited':
      return `High-school NIL is permitted with restrictions in ${stateName}. Full rule breakdown, consent and disclosure requirements, and FAQ inside.`;
    case 'transitioning':
      return `${stateName}'s HS NIL policy is currently transitioning. Latest status, governing-body link, and how to get notified when rules finalize.`;
    case 'prohibited':
      return `High-school NIL is not currently permitted in ${stateName}. Status summary, regional context, and how to prepare for when rules change.`;
  }
}

export default async function StateBlogPage({ params }: PageProps) {
  const { stateSlug } = await params;
  const code = unslugifyToCode(stateSlug);
  if (!code) {
    notFound();
  }
  const data = getStateBlogData(code);
  const { name, status, rules, meta, neighbors, canonicalPath } = data;

  const quickFacts = buildQuickFacts(data);

  return (
    <>
      <ArticleSchema
        stateName={name}
        status={status}
        rules={rules}
        canonicalPath={canonicalPath}
      />

      <StateBlogHero
        stateName={name}
        status={status}
        statusLabel={permissionStatusLabel(status)}
        statusDescription={permissionStatusDescription(status)}
        governingBody={meta.governingBody}
        lastReviewed={rules.lastReviewed}
        quickFacts={quickFacts}
      />

      {status === 'permitted' || status === 'limited' ? (
        <>
          <StateRuleAtAGlance
            rules={rules}
            stateName={name}
            governingBody={meta.governingBodyFull}
          />
          <HowGradeUpHandlesState
            stateName={name}
            rules={rules}
            governingBody={meta.governingBody}
          />
          <WhatThisMeansForParents
            stateName={name}
            rules={rules}
            governingBody={meta.governingBody}
          />
          <WhatThisMeansForBrands
            stateName={name}
            rules={rules}
            governingBody={meta.governingBody}
            topSports={meta.topSports}
            approxAthleteCount={meta.approxAthleteCount}
          />
        </>
      ) : status === 'transitioning' ? (
        <TransitioningStateBody
          stateName={name}
          governingBody={meta.governingBodyFull}
          announcementUrl={meta.announcementUrl}
        />
      ) : (
        <ProhibitedStateBody
          stateName={name}
          stateCode={code}
          governingBody={meta.governingBody}
          topSports={meta.topSports}
        />
      )}

      <StateNeighborsSidebar stateName={name} neighbors={neighbors} />

      <StateBlogFaq
        stateName={name}
        stateCode={code}
        rules={rules}
        governingBody={meta.governingBody}
        pageUrl={canonicalPath}
      />

      <SourcesBlock
        stateName={name}
        governingBody={meta.governingBodyFull}
        announcementUrl={meta.announcementUrl}
        lastReviewed={rules.lastReviewed}
      />

      {renderFinalCta(data)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers & sub-sections
// ---------------------------------------------------------------------------

function buildQuickFacts(
  data: ReturnType<typeof getStateBlogData>,
): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [
    {
      label: 'Governing body',
      value: data.meta.governingBody,
    },
    {
      label: 'Approx. HS athletes',
      value: `~${data.meta.approxAthleteCount.toLocaleString()}`,
    },
  ];
  if (data.status === 'permitted' || data.status === 'limited') {
    if (data.rules.disclosureWindowHours !== null) {
      facts.push({
        label: 'Disclosure window',
        value: `${data.rules.disclosureWindowHours}h`,
      });
    }
    if (data.rules.minimumAge !== null) {
      facts.push({
        label: 'Minimum age',
        value: `${data.rules.minimumAge}+`,
      });
    } else {
      facts.push({
        label: 'Minimum age',
        value: 'None',
      });
    }
  } else {
    facts.push({
      label: 'HS NIL status',
      value: permissionStatusLabel(data.status),
    });
    facts.push({
      label: 'Top sports',
      value: data.meta.topSports.slice(0, 2).join(', '),
    });
  }
  return facts;
}

function HowGradeUpHandlesState({
  stateName,
  rules,
  governingBody,
}: {
  stateName: string;
  rules: StateNILRules;
  governingBody: string;
}) {
  const bullets: string[] = [];
  if (rules.requiresParentalConsent) {
    bullets.push(
      `Every deal in ${stateName} requires a parent or legal-guardian signature — we block the go-live step until we have one on file.`,
    );
  }
  if (rules.disclosureWindowHours !== null) {
    const recipientName =
      rules.disclosureRecipient === 'school'
        ? 'the athlete\'s school'
        : rules.disclosureRecipient === 'both'
        ? 'both the school AND the state athletic association'
        : 'the state athletic association';
    bullets.push(
      `When a deal is signed, GradeUp files the required disclosure to ${recipientName} inside the ${rules.disclosureWindowHours}-hour window, automatically.`,
    );
  }
  if (rules.minimumAge !== null) {
    bullets.push(
      `Our deal validator blocks any deal for athletes below ${rules.minimumAge} — the age floor ${governingBody} enforces — so you can't sign by mistake.`,
    );
  }
  if (rules.paymentDeferredUntilAge18) {
    bullets.push(
      `Payments are captured on contract sign but held in a custodial trust until the athlete's 18th birthday, then released to the parent's Stripe Connect account. Zero manual tracking for you.`,
    );
  }
  if (rules.agentRegistrationRequired) {
    bullets.push(
      `${stateName} requires NIL agents to be registered with the state. GradeUp operates as a marketplace, not an agent — but we flag any third-party agent entering a deal so you can verify registration.`,
    );
  }
  bullets.push(
    `Every deal is scored against ${stateName}'s banned-category list and blocked if it would violate state rules (gambling, alcohol, tobacco, cannabis, adult, weapons — plus any state-specific additions).`,
  );

  return (
    <section
      aria-label={`How GradeUp handles ${stateName}`}
      className="bg-black py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
          On-platform
        </span>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
          How GradeUp handles {stateName}
        </h2>
        <p className="mt-3 text-white/70 max-w-2xl">
          Compliance isn&rsquo;t a checklist on a marketing page — it&rsquo;s
          code. Here&rsquo;s exactly what the platform does when your athlete
          is in {stateName}.
        </p>

        <ul className="mt-8 space-y-3">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/85"
            >
              <span
                aria-hidden="true"
                className="mt-1 flex-shrink-0 h-2 w-2 rounded-full bg-[var(--accent-success)]"
              />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WhatThisMeansForParents({
  stateName,
  rules,
  governingBody,
}: {
  stateName: string;
  rules: StateNILRules;
  governingBody: string;
}) {
  return (
    <section
      aria-label={`What this means for parents in ${stateName}`}
      className="bg-[var(--marketing-gray-950)] py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-gold)]">
          For parents
        </span>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
          What this means for parents in {stateName}
        </h2>

        <div className="mt-6 space-y-5 text-white/75 leading-relaxed max-w-3xl">
          <p>
            You&rsquo;re the one signing the permission slip. In {stateName},{' '}
            {governingBody} treats {rules.requiresParentalConsent ? 'parental consent as a hard requirement — no deal is valid without your signature.' : 'parental involvement as strongly recommended, though not always required by statute.'}{' '}
            GradeUp enforces dual signature on every minor deal regardless of
            what the state requires, because the downside of getting consent
            wrong outweighs the 30 seconds it takes to sign.
          </p>
          <p>
            {rules.disclosureWindowHours !== null
              ? `The other thing you won't have to remember: the ${rules.disclosureWindowHours}-hour disclosure clock. The moment your athlete signs, our system files the compliance report with ${rules.disclosureRecipient === 'school' ? 'the school administration' : rules.disclosureRecipient === 'both' ? 'both the school and the state association' : 'the state association'}. If the filing fails, an operator follows up before the window closes.`
              : `${stateName} does not mandate a specific disclosure window, but GradeUp still records every deal's metadata in case ${governingBody} requests records.`}
          </p>
          <p>
            {rules.paymentDeferredUntilAge18
              ? `${stateName} holds payment in trust until your athlete turns 18. GradeUp automates that: the brand's money is captured up front, but the transfer to your custodial account is scheduled for your athlete's 18th birthday. You don't track anything.`
              : 'Money routes through a custodial Stripe Connect account that you own as the parent. We never hold your athlete\'s earnings beyond the short release window after deal completion.'}
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/solutions/parents"
            className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
          >
            See the parent experience
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhatThisMeansForBrands({
  stateName,
  rules,
  governingBody,
  topSports,
  approxAthleteCount,
}: {
  stateName: string;
  rules: StateNILRules;
  governingBody: string;
  topSports: string[];
  approxAthleteCount: number;
}) {
  return (
    <section
      aria-label={`What this means for brands in ${stateName}`}
      className="bg-black py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
          For brands
        </span>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
          What this means for brands working in {stateName}
        </h2>

        <div className="mt-6 space-y-5 text-white/75 leading-relaxed max-w-3xl">
          <p>
            {stateName} is a{' '}
            {approxAthleteCount > 200_000
              ? 'top-tier market'
              : approxAthleteCount > 80_000
              ? 'mid-sized market'
              : 'compact market'}{' '}
            with an estimated {approxAthleteCount.toLocaleString()} high-school
            athletes across sports dominated by{' '}
            {topSports.slice(0, 3).join(', ')}. {governingBody} has
            published a usable HS-NIL framework, which means your deals can
            actually close — not just exist as PR announcements.
          </p>
          <p>
            Compliance overhead is the normal reason brands avoid HS NIL. In{' '}
            {stateName}, GradeUp absorbs that:{' '}
            {rules.disclosureWindowHours !== null
              ? `we file the ${rules.disclosureWindowHours}-hour disclosure, `
              : ''}
            we validate consent, we check banned categories, and we refuse
            deals that involve school IP. You write the brief, we handle the
            paperwork, the athlete (and parent) sign, the deliverable ships.
          </p>
          <p>
            {rules.agentRegistrationRequired
              ? `${stateName} also requires NIL agents/representatives to be registered with the state. If you work with external talent reps, verify registration before you send a contract. GradeUp's marketplace model sidesteps that requirement for you directly.`
              : `${stateName} does not require agent registration, so brand-direct outreach through the platform is the simplest path.`}
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/signup/brand"
            className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
          >
            Partner as a brand
          </Link>
        </div>
      </div>
    </section>
  );
}

function TransitioningStateBody({
  stateName,
  governingBody,
  announcementUrl,
}: {
  stateName: string;
  governingBody: string;
  announcementUrl: string | null;
}) {
  return (
    <section
      aria-label={`${stateName} transitioning status`}
      className="bg-[var(--marketing-gray-950)] py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
          Transitioning
        </span>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
          {stateName}&rsquo;s rules are in flux
        </h2>
        <div className="mt-5 space-y-4 text-white/75 leading-relaxed max-w-3xl">
          <p>
            {governingBody} has not published a final HS-NIL policy that
            GradeUp has verified and encoded. That doesn&rsquo;t mean nothing
            is happening — state associations often issue guidance, interim
            rules, or board memos before a formal policy drops. We watch for
            those.
          </p>
          <p>
            Our recommendation: don&rsquo;t sign an NIL deal in {stateName}{' '}
            today unless you&rsquo;ve verified directly with {governingBody}{' '}
            that the activity is permitted. An improperly-structured deal can
            cost eligibility. Join our interest list and we&rsquo;ll email you
            the moment {stateName} flips to an active pilot.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/hs"
            className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
          >
            Join the interest list
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          {announcementUrl ? (
            <a
              href={announcementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
            >
              {governingBody} announcements
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProhibitedStateBody({
  stateName,
  stateCode,
  governingBody,
  topSports,
}: {
  stateName: string;
  stateCode: Parameters<typeof countPermittedNeighbors>[0];
  governingBody: string;
  topSports: string[];
}) {
  const permittedNeighbors = countPermittedNeighbors(stateCode);

  return (
    <section
      aria-label={`${stateName} HS NIL not permitted`}
      className="bg-[var(--marketing-gray-950)] py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/20 bg-white/5 text-white/70">
          Not yet permitted
        </span>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
          {stateName} does not permit HS NIL yet
        </h2>

        <div className="mt-5 space-y-4 text-white/75 leading-relaxed max-w-3xl">
          <p>
            {governingBody} currently prohibits high-school athletes in{' '}
            {stateName} from signing NIL deals while retaining athletic
            eligibility. Signing a deal risks the athlete&rsquo;s eligibility.
          </p>
          <p>
            {permittedNeighbors > 0
              ? `${permittedNeighbors} neighboring states currently allow HS NIL. Cross-border pressure is real — multiple state associations have reversed course within 6–18 months of seeing their neighbors act.`
              : `None of ${stateName}'s immediate neighbors currently permit HS NIL either, but the national trend is clear: the majority of the country has moved in the past three years.`}
          </p>
          <p>
            Practical move right now: build the audience. Nothing in{' '}
            {governingBody}&rsquo;s prohibition stops your athlete from
            growing their following, creating content, or building a personal
            brand around {topSports[0]?.toLowerCase() ?? 'their sport'}. When
            the rule changes, that audience converts directly into
            deal leverage — and when your athlete enrolls in college, college
            NIL opens immediately.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-6">
          <h3 className="text-white font-semibold text-lg">
            Get notified when {stateName} changes the rules
          </h3>
          <p className="mt-2 text-white/70">
            Join our interest list. The moment {governingBody} flips its
            policy, your account is enabled — no re-registration needed.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href="/hs"
              className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
            >
              Join the interest list
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/compare"
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
            >
              Compare to other platforms
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SourcesBlock({
  stateName,
  governingBody,
  announcementUrl,
  lastReviewed,
}: {
  stateName: string;
  governingBody: string;
  announcementUrl: string | null;
  lastReviewed: string;
}) {
  return (
    <section
      aria-label={`${stateName} NIL rules sources`}
      className="bg-black py-12 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-white">
          Sources & citations
        </h2>
        <ul className="mt-4 space-y-2 text-white/70 text-sm">
          <li>
            Governing body:{' '}
            <strong className="text-white">{governingBody}</strong>.{' '}
            {announcementUrl ? (
              <a
                href={announcementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] underline underline-offset-2 hover:text-white"
              >
                Visit their site
              </a>
            ) : (
              // TODO(blog-seo): populate STATE_METADATA.announcementUrl for this state.
              <span>Official URL pending verification.</span>
            )}
            .
          </li>
          <li>
            GradeUp rule engine last reviewed: <strong>{lastReviewed}</strong>.
          </li>
          <li>
            Athlete-count and top-sport figures are public-data estimates
            (primarily NFHS Participation Survey 2023–2024 and state AA annual
            reports). Exact values should be sourced from {governingBody}{' '}
            directly.
          </li>
        </ul>
      </div>
    </section>
  );
}

function renderFinalCta(data: ReturnType<typeof getStateBlogData>) {
  const { status, slug, name } = data;

  if (status === 'permitted' || status === 'limited') {
    return (
      <SolutionCtaBand
        heading={`Ready to run your first ${name} deal?`}
        subheading="Athlete, parent, and brand sign-ups are all free. GradeUp routes every deal through the compliance engine so you can focus on the work, not the forms."
        primaryLabel="Create a free athlete profile"
        primaryHref={`/hs/signup/athlete?ref=state-${slug}`}
        secondaryLabel="Sign up as a parent"
        secondaryHref={`/hs/signup/parent?ref=state-${slug}`}
        trustNote={`Built for ${name} families and brands. No credit card required.`}
      />
    );
  }

  return (
    <SolutionCtaBand
      heading={`${name} changes the rules — we&rsquo;ll tell you first.`}
      subheading="Join the interest list and be first in line when your state activates."
      primaryLabel="Join the interest list"
      primaryHref={`/hs?ref=state-${slug}`}
      secondaryLabel="Compare platforms"
      secondaryHref="/compare"
      trustNote="No spam. We email when real news breaks."
    />
  );
}

// ---------------------------------------------------------------------------
// JSON-LD Article schema
// ---------------------------------------------------------------------------

function ArticleSchema({
  stateName,
  status,
  rules,
  canonicalPath,
}: {
  stateName: string;
  status: PermissionStatus;
  rules: StateNILRules;
  canonicalPath: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonicalPath}#article`,
    headline: `${stateName} High-School NIL Rules (2026)`,
    description: buildMetaDescription(stateName, status, rules),
    datePublished: rules.lastReviewed,
    dateModified: rules.lastReviewed,
    mainEntityOfPage: canonicalPath,
    url: canonicalPath,
    inLanguage: 'en-US',
    author: {
      '@type': 'Organization',
      name: 'GradeUp NIL',
      url: '/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'GradeUp NIL',
      url: '/',
    },
    about: {
      '@type': 'Thing',
      name: `${stateName} high-school Name, Image, and Likeness rules`,
    },
  };

  return (
    <Script
      id={`state-blog-article-${canonicalPath.split('/').pop()}-jsonld`}
      type="application/ld+json"
      strategy="afterInteractive"
    >
      {JSON.stringify(jsonLd)}
    </Script>
  );
}
