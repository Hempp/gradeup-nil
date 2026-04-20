/**
 * English dictionary (default locale).
 *
 * This is the source-of-truth dictionary: every other locale must have a
 * matching shape. The `Dictionary` type is inferred from this file so that
 * TypeScript flags missing keys in translation files automatically.
 *
 * Convention:
 *   - Nest by page (home, parents, valuation, caseStudies, pricing, hsLanding)
 *   - "common" holds navigation, footer, and cross-page shared UI
 *   - Interpolation is done at the call site (simple string concatenation);
 *     we intentionally avoid {handlebars} to keep the hook dependency-free.
 */

// Build the English dictionary literal first so TypeScript infers precise
// nesting, then type-assert it to the inferred shape so that additional
// locales (es, ...) can match the shape without each value being pinned
// to its literal type.
const _en = {
  common: {
    nav: {
      athletes: 'Athletes',
      brands: 'Brands',
      howItWorks: 'How It Works',
      valuation: 'NIL Valuation',
      solutions: 'Solutions',
      solutionsOverview: 'Overview — all personas',
      solutionsParents: 'Parents',
      solutionsAthletes: 'Athletes',
      solutionsBrands: 'Brands',
      solutionsAds: 'Athletic Directors',
      solutionsStateAds: 'State AD Portal',
      caseStudies: 'Case Studies',
      blog: 'Blog',
      pricing: 'Pricing',
      discover: 'Discover',
      opportunities: 'Opportunities',
      logIn: 'Log In',
      getStarted: 'Get Started',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    footer: {
      tagline: 'NIL, built for the people actually signing the permission slip.',
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      rights: 'All rights reserved.',
    },
    localeSwitcher: {
      label: 'Language',
      ariaLabel: 'Select language',
      english: 'English',
      spanish: 'Español',
    },
    fallbackBanner: {
      message:
        'This page is not yet available in Spanish. Showing the English version.',
      dismiss: 'Dismiss',
    },
    ctas: {
      signUpAthlete: 'Join as Athlete - It\u2019s Free',
      partnerBrand: 'Partner as Brand',
      createAthleteProfile: 'Create athlete profile',
      createBrandAccount: 'Create brand account',
      startBrandPlus: 'Start Brand Plus',
      learnMore: 'Learn more',
      seeCaseStudies: 'See the case studies',
      joinWaitlist: 'Join the GradeUp HS waitlist',
    },
  },

  home: {
    metadata: {
      title: 'GradeUp NIL — Your GPA is Worth Money',
      description:
        'The only NIL platform where grades unlock better deals. Higher GPA = higher value. Get paid for your excellence.',
    },
    hero: {
      badge: 'NCAA Compliant Platform',
      titleLine1: 'Your GPA',
      titleLine2: 'Is Worth',
      titleLine3: 'Money.',
      subtitle:
        'The only NIL platform where grades unlock better deals. Higher GPA = higher value. Get paid for your excellence.',
      dualAudience:
        'Built for scholar-athletes from 8th grade through senior year of college, with the parents, coaches, and athletic directors who support them.',
      ctaAthlete: 'Join as Athlete - It\u2019s Free',
      ctaBrand: 'Partner as Brand',
      trustNcaa: 'NCAA Compliant',
      trustNoCard: 'No credit card',
      trustSignup: '2-min signup',
      statsPaid: 'Paid to Athletes',
      statsVerified: 'Verified Athletes',
      statsAvgGpa: 'Avg Athlete GPA',
    },
    partners: {
      schoolsTrusted: 'Athletes from 40+ universities trust GradeUp',
      brandsHeading: 'Brand partners actively recruiting',
    },
    valuationCta: {
      eyebrow: 'New \u00B7 Free',
      heading: 'What\u2019s your scholar-athlete worth?',
      body: 'Sport, state, grades, followers — answer five questions and get an honest NIL value range. No signup needed to see the number.',
      cta: 'Find out what your athlete is worth',
    },
    featured: {
      eyebrow: 'Real Athletes, Real Earnings',
      title: 'Scholar-Athletes',
      titleAccent: 'Getting Paid',
      subtitle:
        'Meet verified athletes earning through GradeUp. Their GPA is their competitive advantage.',
      ctaHeading: 'See Yourself Here?',
      ctaBody: 'Your academic excellence + athletic talent = opportunity',
      ctaPrimary: 'Create Your Profile - Free',
      ctaSecondary: 'Browse Opportunities',
      trustVerified: 'All athletes verified',
      trustCompliant: 'NCAA compliant',
      trustSpeed: 'Deals in 48hrs',
    },
    howItWorks: {
      eyebrow: 'See It In Action',
      titlePrefix: 'From',
      titleMid: 'Signup',
      titleTo: 'to',
      titleAccent: 'Payday',
      subtitle:
        'Watch how GradeUp works, then follow the simple steps to start earning.',
      step1Title: 'Create Profile',
      step1Desc: 'Sign up and connect your academic records in minutes.',
      step1Stat: '10 min avg',
      step2Title: 'Get Verified',
      step2Desc: 'We verify your enrollment, sport, and GPA for authenticity.',
      step2Stat: '24hr verification',
      step3Title: 'Get Paid',
      step3Desc: 'Match with brands and start earning based on your value.',
      step3Stat: '$1,850 avg deal',
      sideHeading: 'Three Simple Steps',
      sideBody:
        'Our 68% conversion rate means most athletes close deals within a week.',
      finalCta: 'Start Your Journey',
      finalNote: 'Free to join \u00B7 No credit card required',
    },
    provenResults: {
      eyebrow: 'Proven results',
      heading: 'Real deals. Verified earnings. Public case studies.',
      body:
        'Every study is tied to a completed deal, on-platform share events, and a real scholar-athlete. See exactly how brand ROI adds up — before you spend a dollar.',
      cta: 'See the case studies',
    },
    finalCta: {
      socialProof: '847 athletes already earning',
      title1: 'Ready to Turn Your',
      title2: 'GPA Into Opportunity?',
      body:
        'Join hundreds of scholar-athletes already earning through GradeUp. Your academic excellence deserves to be rewarded.',
      ctaAthlete: 'Join as Athlete',
      ctaBrand: 'Partner as Brand',
      statPaid: '$127,450+ paid out',
      statDeals: '412 deals completed',
      statGpa: '3.72 avg GPA',
    },
  },

  parents: {
    metadata: {
      title: 'NIL for Parents — A first deal without the risk | GradeUp',
      description:
        'The safest way for your scholar-athlete to sign their first NIL deal. Dual-signed consent, custodial payouts, state-by-state compliance, and a parent dashboard for the person who writes the permission slip.',
    },
    hero: {
      eyebrow: 'For parents',
      title: 'Your scholar-athlete\u2019s first NIL deal,',
      titleAccent: 'without the risk.',
      subtitle:
        'You\u2019re the one actually signing the permission slip. GradeUp is the only NIL platform built for that reality — dual-signed consent on every deal, custodial payouts into an account you control, and state-by-state compliance handled in the background.',
      ctaPrimary: 'Sign up as a parent',
      ctaSecondary: 'Request a concierge invite',
      supportingNote: 'Free to start. No credit card. No commitment.',
    },
    problem: {
      eyebrow: 'The parent\u2019s problem',
      heading: 'NIL is loud. Most of it isn\u2019t built for you.',
      subheading:
        'College NIL platforms are built for 20-year-olds with an agent. Your athlete is 15. You\u2019re the one reading the fine print at midnight. Here\u2019s what changes.',
      oldStoryHeading: 'The old NIL story',
      oldStoryBody:
        'Most platforms assume the athlete is the decision-maker. For high school, that\u2019s you. Consent is buried, money flow is opaque, and nobody explains what a \u201Cdisclosure window\u201D is.',
      oldBullet1: 'Confusing terms written for college athletes',
      oldBullet2: 'No visibility into which brands your child is talking to',
      oldBullet3: 'State rules that change every six months',
      oldBullet4: 'Payouts that skip the parent entirely',
      productHeading: 'What GradeUp does differently',
      productBody:
        'A parent dashboard that mirrors the athlete\u2019s view. Dual signature required on every deal. Custodial Stripe Connect account in your name. Plain-English disclosures on everything.',
      productBullet1: 'Dual-signed consent — no deal goes live without your signature',
      productBullet2: 'Custodial payout into a Stripe account you own',
      productBullet3: 'State-compliant disclosures filed for you automatically',
      productBullet4: 'Every deal visible in your parent dashboard in real-time',
      proofHeading: 'Parents already using it',
      proofBody:
        'We ran the first 20 California parents through a concierge-run pilot before shipping the product. Every deal closed. Zero compliance issues. Every parent kept their dashboard.',
      proofBullet1: '20+ California families in the concierge pilot',
      proofBullet2: '7 pilot states live today',
      proofBullet3: 'Zero deals filed late — disclosure automation caught them all',
    },
    features: {
      eyebrow: 'What you get',
      heading: 'A parent dashboard, not a marketing pitch.',
      subheading:
        'Everything below is already in the product. Not a roadmap, not a future state — the working platform, today.',
      dualConsentTitle: 'Dual-signed consent',
      dualConsentBody:
        'Every deal requires both the athlete and a parent signature before it can go live. No gray area, no \u201Cimplied\u201D consent, no surprise contracts.',
      custodialTitle: 'Custodial payouts',
      custodialBody:
        'Money flows into a Stripe Connect account in your name. You decide what happens next — save, invest, or gift to your athlete.',
      stateTitle: 'State-compliant, automatically',
      stateBody:
        'The platform already knows your state\u2019s rules. Disclosure filing, banned categories, minimum-age checks — all handled without you lifting a finger.',
      visibilityTitle: 'Full visibility',
      visibilityBody:
        'Your parent dashboard mirrors your athlete\u2019s. Every brand conversation, every deal, every payout — visible in real-time.',
      auditTitle: 'Audit trail on demand',
      auditBody:
        'Every signature, every disclosure, every payout — logged forever. You can export a clean PDF for tax season or a lawyer in two clicks.',
      ncaaTitle: 'NCAA-eligibility safe',
      ncaaBody:
        'Built to preserve future NCAA eligibility. No school IP. No pay-for-play. No banned categories. Future college coaches will thank you.',
    },
    quote: {
      text: 'I signed the permission slip at 10pm on a Tuesday, saw the deal in my dashboard by Wednesday, and watched the first payout hit my Stripe on Saturday. That\u2019s the shortest distance between \u2018this is scary\u2019 and \u2018this is real\u2019 I\u2019ve ever seen.',
      attribution: 'Parent, Los Angeles, CA \u00B7 Concierge pilot',
    },
    caseStudies: {
      heading: 'Real parents. Real deals. Real payouts.',
      subheading:
        'Published case studies tagged with a parent voice or a parent-verified transcript.',
    },
    faq: {
      heading: 'Questions parents actually ask',
      subheading: 'Six things every parent wants answered before they sign.',
      q1: 'Does my athlete need to be 18 to sign a deal?',
      a1: 'No. In most pilot states, athletes under 18 can sign with a parent or legal guardian\u2019s written consent, which we collect and store as part of every deal. Texas requires the athlete be at least 17 and holds the payment in trust until they turn 18 — GradeUp handles that automatically.',
      q2: 'Where does the money actually go?',
      a2: 'Into a custodial Stripe Connect account that you, the parent, own and control. Payouts route to your account and you decide how to route them from there — save, invest, gift, or transfer. GradeUp never holds your athlete\u2019s earnings beyond the short window between deal completion and payout release.',
      q3: 'Is this NCAA-safe for college recruiting later?',
      a3: 'Yes. GradeUp is built to preserve future NCAA eligibility. We follow each state\u2019s high-school athletic association rules (which are what governs your athlete today), and we never allow school IP, pay-for-play, or banned categories like gambling, alcohol, or cannabis.',
      q4: 'What if I don\u2019t want my athlete doing a particular deal?',
      a4: 'You approve every deal before it activates. No deal exists on your athlete\u2019s profile until you, as the parent, sign. If you decline, the deal never happens. You can also pause or withdraw consent at any time.',
      q5: 'What data do you collect on my child?',
      a5: 'The minimum to run a compliant deal: name, school, sport, sport season, and self-reported GPA (optionally verified via Tier B transcript review). We do not sell data, do not ship third-party ad trackers to your athlete\u2019s dashboard, and follow COPPA/FERPA-aligned practices. Full privacy policy at /privacy.',
      q6: 'How much does this cost us?',
      a6: 'Signing up as a parent is free. Athletes are free too. GradeUp takes a small platform fee only when a deal closes — it comes out of the brand\u2019s budget, not out of your athlete\u2019s earnings.',
    },
    ctaBand: {
      heading: 'Ready to sign with confidence?',
      subheading:
        'Create a free parent account. We\u2019ll walk you through the first deal.',
      primary: 'Sign up as a parent',
      secondary: 'Browse case studies',
      trustNote: 'Free \u00B7 No credit card \u00B7 COPPA/FERPA-aligned',
    },
  },

  valuation: {
    metadata: {
      title: 'NIL Valuation Calculator — GradeUp HS',
      description:
        'Find out what your high-school scholar-athlete\u2019s NIL is worth. Free, instant estimate. Factors in sport, state, grade level, social following, and GPA.',
    },
    hero: {
      badge: 'Free \u00B7 60-second estimate',
      titlePrefix: 'What\u2019s your',
      titleAccent: 'scholar-athlete',
      titleSuffix: 'worth?',
      subtitle:
        'You know your kid is a scholar-athlete. We think these ranges make sense. Answer a few questions and we\u2019ll give you an honest NIL value range — no email required to see your number.',
      trustStateRules: 'State-rules aware',
      trustMarketData: 'Public market data',
      trustNoSignup: 'No signup to see estimate',
    },
    howItWorks: {
      heading: 'How this works',
      body: 'Our v1 model blends five public-market signals into a range calibrated against reported high-school NIL deal data from 2024\u20132026.',
      factor1Title: 'Sport demand',
      factor1Body:
        'Football and basketball drive most HS NIL deal volume. Women\u2019s basketball and niche sports command premium deals in their segments.',
      factor2Title: 'State brand density',
      factor2Body:
        'California, Texas, Florida, Georgia, and New York carry higher multipliers thanks to headquartered consumer brands and larger media markets.',
      factor3Title: 'Social reach',
      factor3Body:
        'Log-scale follower buckets. Advertisers pay more per follower as scale grows — but the first thousand matter most for proving authenticity.',
      factor4Title: 'Grade level',
      factor4Body:
        'Seniors and college-bound athletes carry a premium because brand activation is near-term. Underclassmen discount reflects a longer payoff.',
      factor5Title: 'GPA + verification',
      factor5Body:
        'Our differentiator: scholar-athlete framing. Verified 3.9+ GPAs unlock education and financial-services sponsors that won\u2019t touch unverified claims.',
      notModeledHeading: 'What we don\u2019t model:',
      notModeledBody:
        'specific deal offers you\u2019ve received, regional rivalries, local-brand affinity, your kid\u2019s off-court story. The range is a starting point — GradeUp HS helps you verify credentials, match with brands, and close real deals when your state goes live.',
      seeCaseStudies: 'See real deal case studies',
      joinWaitlist: 'Join the GradeUp HS waitlist',
    },
    trustFooter:
      'This calculator returns v1 estimates based on publicly reported deal ranges. Real market numbers vary widely. Nothing here is an offer, quote, or legal advice.',
  },

  caseStudies: {
    metadata: {
      title: 'Case Studies — GradeUp HS',
      description:
        'How real scholar-athlete partnerships performed. Verified earnings, share counts, and brand ROI from the GradeUp HS concierge era.',
    },
    hero: {
      badge: 'Proven results from the concierge era',
      titlePrefix: 'Case studies.',
      titleAccent: 'Verified earnings.',
      subtitle:
        'Every number you see here is tied to a completed deal, an on-platform share event, and a real scholar-athlete. Names are abbreviated for privacy; brand attribution is always shown.',
    },
    filters: {
      all: 'All',
      foodBeverage: 'Food & beverage',
      multiAthlete: 'Multi-athlete',
      tierBVerified: 'Verified GPA',
      viralShare: 'Viral share',
      parentQuote: 'Parent voice',
      california: 'California',
    },
    empty: {
      heading: 'No case studies yet for this filter',
      body: 'Try clearing the filter or check back soon — we publish new studies as deals close.',
      cta: 'Show all case studies',
    },
  },

  pricing: {
    metadata: {
      title: 'Pricing — GradeUp HS-NIL',
      description:
        'Transparent NIL pricing for HS scholar-athletes, their parents, and local brands. No sales calls. No hidden fees. 8% take-rate on deals.',
    },
    hero: {
      badge: 'Transparent pricing',
      titlePrefix: 'Pricing that doesn\u2019t require a',
      titleAccent: 'sales call.',
      subtitle:
        'We publish our take-rate, our subscription price, and what\u2019s included — so parents, athletes, brands, and compliance officers can read this page, decide, and sign up in minutes.',
    },
    tiers: {
      mostPopular: 'Most popular for brands',
      athletesName: 'Athletes',
      athletesHeadline: 'Free forever',
      athletesPrice: '$0',
      athletesPriceDetail: 'per month',
      athletesDescription:
        'Free forever for HS scholar-athletes. The platform take-rate is applied to deal compensation only — you never pay out-of-pocket.',
      athletesCta: 'Create athlete profile',
      athletesFeature1: 'Free profile, matching, and dashboard',
      athletesFeature2: 'Take-rate: 8% on deals under $500',
      athletesFeature3: 'Take-rate: 6% on deals $500 and above',
      athletesFeature4: 'Parent custodian receives 92\u201394% of gross',
      athletesFeature5: 'Per-state rules engine, included',
      athletesFeature6: 'Parental consent flow, included',
      brandsName: 'Brands',
      brandsHeadline: 'No monthly minimum',
      brandsPrice: '$0',
      brandsPriceDetail: 'to sign up',
      brandsDescription:
        'Free to sign up. 8% platform fee per completed deal. No monthly minimums. No hidden costs.',
      brandsCta: 'Create brand account',
      brandsFeature1: 'Self-serve brand signup in under two minutes',
      brandsFeature2: '8% platform fee on completed deals only',
      brandsFeature3: 'No monthly minimum, no seat fees',
      brandsFeature4: 'Real-time state-rule preflight on every deal',
      brandsFeature5: 'Escrow-at-signing protects both parties',
      brandsFeature6: 'Upgrade to Brand Plus any time',
      brandPlusName: 'Brand Plus',
      brandPlusHeadline: 'For regional brands running campaigns',
      brandPlusPrice: '$149',
      brandPlusPriceDetail: 'per month, or $1,490/yr (save $298)',
      brandPlusDescription:
        'Unlocks unlimited campaigns, priority athlete matching, a branded case study on our site, and a 1-on-1 onboarding call. Platform fee reduced to 5% on completed deals.',
      brandPlusCta: 'Start Brand Plus',
      brandPlusFeature1: 'Unlimited active campaigns',
      brandPlusFeature2: 'Priority athlete matching in the queue',
      brandPlusFeature3: 'Branded case study on gradeup-nil.com',
      brandPlusFeature4: '1-on-1 onboarding call with our team',
      brandPlusFeature5: 'Reduced 5% platform fee on completed deals',
      brandPlusFeature6: 'Dedicated support (email + Slack Connect)',
    },
    alwaysFree: {
      heading: 'Always free',
      body: 'Three groups never pay us — as a matter of policy, not just pricing.',
      alwaysZero: 'Always $0',
      stateAd: 'State athletic associations',
      stateAdDetail: '$0 — always free. Non-commercial. Read-only compliance portal.',
      parents: 'Parents',
      parentsDetail: '$0 — never a fee. Parents pay nothing, ever.',
      schools: 'Individual high schools',
      schoolsDetail:
        '$0 in year 1 for pilot-state schools. Custom enterprise pricing planned for 2027+.',
    },
    table: {
      heading: 'Every feature, every tier',
      subheading: 'Nothing hidden behind an enterprise call.',
      featureColumn: 'Feature',
      athletesColumn: 'Athletes',
      brandsColumn: 'Brands',
      brandPlusColumn: 'Brand Plus',
      caption:
        'Feature availability across Athletes, Brands, and Brand Plus tiers',
    },
    faq: {
      heading: 'Frequently asked questions',
      q1: 'Why is it free for parents?',
      a1: 'Parents are the trusted adults in the HS-NIL system. We do not charge them. Ever. Parents never see a fee for signing up, approving a deal, or acting as the custodian of their athlete\u2019s earnings. Our take-rate on brand deals pays for the platform, compliance, and state-disclosure infrastructure.',
      q2: 'What is a "take-rate"?',
      a2: 'A take-rate is the percentage of a completed deal that the platform retains to cover its costs. GradeUp\u2019s take-rate is 8% on deals under $500 and 6% on deals of $500 or more. The remaining 92\u201394% goes to the parent custodian account for the benefit of the athlete. For example, on a $300 deal, the athlete\u2019s custodian receives $276; on a $1,000 deal, the custodian receives $940.',
      q3: 'How do I know my deal is in compliance?',
      a3: 'Every deal is validated in real time against the current rules for the athlete\u2019s state. Our per-state rules engine checks for prohibited categories (alcohol, tobacco, gambling, etc.), disclosure windows, amount caps where applicable, and consent scope. Non-compliant deals are rejected at creation, before anyone signs. The state athletic association receives an auditable disclosure record for every completed deal in their state.',
      q4: 'What happens if the platform fee would eat too much of a small deal?',
      a4: 'We already designed for this: below $500 the take-rate is 8%, so on a $50 deal the fee is $4. We do not charge flat minimums that disproportionately impact small deals. If a deal ever fails state-rule validation, no fee is charged because no deal occurred.',
      q5: 'Do you charge schools?',
      a5: 'No. Individual high schools pay $0 in year 1 of a pilot state. Future custom enterprise pricing may exist for schools seeking advanced reporting or integrations starting in 2027, but there is no fee today.',
      q6: 'Do you charge the state athletic association?',
      a6: 'No. The State AD compliance portal is always free. It is a non-commercial public-good product. State athletic associations get read-only visibility into every deal in their state at no cost.',
      q7: 'Are there any application fees?',
      a7: 'No. We do not charge athletes, parents, or brands an application fee to use the platform. There is no fee to create a profile, browse athletes, browse brands, or post an opportunity.',
      q8: 'What about Brand Plus — can I cancel?',
      a8: 'Yes. Brand Plus is month-to-month or annual. Cancel any time; the cancellation takes effect at the end of your current billing cycle. We do not prorate mid-cycle refunds. Full terms live on our subscription-terms page.',
    },
    finalCta: {
      heading: 'Start free. No sales call.',
      body:
        'Create your account today. Review the terms. Run your first deal this week.',
      primary: 'Create a brand account',
      secondary: 'Create an athlete profile',
      disclaimer:
        'We do not charge application fees. We do not charge athletes. Parents never see a fee. Our take-rate pays for platform + compliance + state-disclosure infrastructure.',
    },
  },

  hsLanding: {
    metadata: {
      title: 'GradeUp HS — Name, Image, Likeness for High School Athletes',
      description:
        'The first NIL platform built for high-school scholar-athletes. Verified GPA, parental consent, state-compliant deals.',
    },
    phase: 'Phase 0 — Waitlist',
    title: 'NIL for the 3.9-GPA freshman.',
    body:
      'GradeUp is building the first NIL platform designed for high-school athletes and the parents who guide them. Verified grades. Parental consent built in. State-compliant by default.',
    states: 'Now live in 6 states: California, Florida, Georgia, Illinois, New Jersey, and New York.',
    verifiedGpaTitle: 'Verified GPA',
    verifiedGpaBody:
      'Self-reported today. Institution-verified tomorrow. Every claim is labeled.',
    parentsTitle: 'Parents First',
    parentsBody:
      'Dual signature. Custodial payouts. A real dashboard for the people writing the permission slip.',
    stateTitle: 'State Compliant',
    stateBody:
      'Per-state rules engine handles disclosure windows, category bans, and agent requirements automatically.',
  },
};

// Recursive type that replaces literal string types in `_en` with plain
// `string`. This is what other locales must match — they should conform
// to the shape of the English dictionary but are free to use any string
// values, not the exact English literals.
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof _en>;

export const en: Dictionary = _en;
