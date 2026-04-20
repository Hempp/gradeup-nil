/**
 * blog-content.ts — Evergreen blog post catalog for /blog/[slug].
 *
 * Phase 16 complement to Phase 14's state-rules blog: 20 SEO-targeted
 * posts that cover the broader NIL-education surface. Content is kept in
 * TypeScript (not markdown) so it ships with the build, tree-shakes per
 * page, and deploys atomically with the rest of the site.
 *
 * Tone: parent-first on parent-targeted posts, coach/practical on the
 * athlete-targeted posts, operator-level on brand posts. We teach first
 * and CTA second — the conversion path is internal links plus a tailored
 * final CTA, not pop-ups.
 *
 * Editorial model: one author byline ("GradeUp Editorial"), real
 * publishedAt / updatedAt dates, reading-minutes computed from body word
 * count. FAQ schema + Article schema emitted on each page.
 *
 * Maintenance: to add a post, append a new BlogPost object to BLOG_POSTS.
 * The index page, sitemap, and dynamic route pick it up automatically.
 */

export type BlogAudience =
  | 'parents'
  | 'athletes'
  | 'brands'
  | 'state_ads'
  | 'coaches'
  | 'general';

export type BlogCategory =
  | 'basics'
  | 'parents'
  | 'athletes'
  | 'brands'
  | 'compliance'
  | 'money'
  | 'strategy';

/**
 * A single body section. `paragraphs` is the default renderer; `bulletList`
 * renders a <ul>; `pullQuote` renders a large italicized callout.
 * At least one of the three should be present on every section.
 */
export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bulletList?: string[];
  pullQuote?: string;
}

export interface BlogPostFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  heroEyebrow: string;
  category: BlogCategory;
  audience: BlogAudience;
  keywords: string[];
  published: boolean;
  publishedAt: string; // ISO date (YYYY-MM-DD)
  updatedAt: string; // ISO date
  body: BlogSection[];
  faqs: BlogPostFaq[];
  /** 3+ other slugs in this catalog for internal linking. */
  related: string[];
  /** Default state-rules slug to link from this post (CA for general posts). */
  stateRulesSlug?: string;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function audienceLabel(audience: BlogAudience): string {
  switch (audience) {
    case 'parents':
      return 'For parents';
    case 'athletes':
      return 'For athletes';
    case 'brands':
      return 'For brands';
    case 'state_ads':
      return 'For state ADs';
    case 'coaches':
      return 'For coaches';
    case 'general':
      return 'General';
  }
}

export function categoryLabel(category: BlogCategory): string {
  switch (category) {
    case 'basics':
      return 'NIL basics';
    case 'parents':
      return 'Parent playbook';
    case 'athletes':
      return 'Athlete playbook';
    case 'brands':
      return 'Brand playbook';
    case 'compliance':
      return 'Compliance';
    case 'money':
      return 'Money & taxes';
    case 'strategy':
      return 'Strategy';
  }
}

/** Canonical URL path for a blog post. */
export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}

/** Word count across all paragraphs + bullets in a post body. */
function wordCount(post: BlogPost): number {
  let total = 0;
  const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  for (const section of post.body) {
    total += count(section.heading);
    if (section.paragraphs) {
      for (const p of section.paragraphs) total += count(p);
    }
    if (section.bulletList) {
      for (const b of section.bulletList) total += count(b);
    }
    if (section.pullQuote) total += count(section.pullQuote);
  }
  return total;
}

/** Reading minutes — 200 wpm floor, rounded up, min 2. */
export function readingMinutes(post: BlogPost): number {
  const words = wordCount(post);
  return Math.max(2, Math.ceil(words / 200));
}

/** Default persona solution page for an audience. */
export function audienceSolutionPath(audience: BlogAudience): string {
  switch (audience) {
    case 'parents':
      return '/solutions/parents';
    case 'athletes':
      return '/solutions/athletes';
    case 'brands':
      return '/solutions/brands';
    case 'state_ads':
      return '/solutions/state-ads';
    case 'coaches':
      return '/solutions/ads';
    case 'general':
      return '/solutions/parents';
  }
}

/** Final-CTA shape for the article page. */
export interface AudienceCta {
  heading: string;
  subheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  trustNote?: string;
}

export function audienceCta(post: BlogPost): AudienceCta {
  const ref = `ref=blog-${post.slug}`;
  switch (post.audience) {
    case 'parents':
      return {
        heading: 'Get early access for your family',
        subheading:
          'Join the HS waitlist. We invite parents in small cohorts as each state activates — compliance engine on, concierge support included.',
        primaryLabel: 'Request waitlist invite',
        primaryHref: `/hs?${ref}`,
        secondaryLabel: 'See the parent experience',
        secondaryHref: '/solutions/parents',
        trustNote: 'Parent-first. No credit card. Free to start.',
      };
    case 'athletes':
      return {
        heading: 'Build your scholar-athlete profile',
        subheading:
          'Your GPA plus your sport plus your story — priced by brands who want scholar-athletes specifically. Free to create.',
        primaryLabel: 'Create a free athlete profile',
        primaryHref: `/hs/signup/athlete?${ref}`,
        secondaryLabel: 'See the athlete experience',
        secondaryHref: '/solutions/athletes',
        trustNote: 'Parental consent required for minors. We handle the signatures.',
      };
    case 'brands':
      return {
        heading: 'Post your first campaign',
        subheading:
          'Sign up as a brand, target by sport, state, and GPA band, and launch a compliant HS NIL campaign in minutes.',
        primaryLabel: 'Post your first campaign',
        primaryHref: `/hs/signup/brand?${ref}`,
        secondaryLabel: 'See the brand experience',
        secondaryHref: '/solutions/brands',
        trustNote: 'State-by-state compliance handled automatically.',
      };
    case 'state_ads':
      return {
        heading: 'Request state-AD portal access',
        subheading:
          'A single dashboard for every disclosure, every member school, every flagged deal. Built for the governing body.',
        primaryLabel: 'Request portal access',
        primaryHref: `/solutions/state-ads?${ref}`,
        secondaryLabel: 'Read the state-AD overview',
        secondaryHref: '/solutions/state-ads',
        trustNote: 'Zero rip-and-replace — we plug into your existing member-school roster.',
      };
    case 'coaches':
      return {
        heading: 'Built for athletic directors',
        subheading:
          'Your compliance layer, already wired. Verify athletes, audit deals, keep your program eligible.',
        primaryLabel: 'See the AD experience',
        primaryHref: '/solutions/ads',
        secondaryLabel: 'Compare platforms',
        secondaryHref: '/compare',
        trustNote: 'No setup fees during the concierge era.',
      };
    case 'general':
      return {
        heading: 'Learn what GradeUp can do for your family',
        subheading:
          'We reward scholar-athletes — the GPA is the asset. Request an invite and see the compliance-first workflow in action.',
        primaryLabel: 'Request waitlist invite',
        primaryHref: `/hs?${ref}`,
        secondaryLabel: 'Browse state rules',
        secondaryHref: '/blog/state-nil-rules',
        trustNote: 'No credit card. Free to start.',
      };
  }
}

// ---------------------------------------------------------------------------
// BLOG_POSTS — 20 evergreen posts
// ---------------------------------------------------------------------------

const PUBLISHED = '2026-04-20';
const UPDATED = '2026-04-20';

export const BLOG_POSTS: BlogPost[] = [
  // 1
  {
    slug: 'what-is-hs-nil',
    title: 'What is high-school NIL? A 2026 primer',
    description:
      'Plain-English explainer of high-school Name, Image, and Likeness (NIL) — who can participate, what counts as a deal, and how rules vary by state.',
    heroEyebrow: 'NIL 101',
    category: 'basics',
    audience: 'general',
    keywords: [
      'what is high school NIL',
      'HS NIL explained',
      'name image likeness high school',
      'NIL 2026',
      'is HS NIL legal',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'parental-consent-explained',
      'how-athletes-get-first-nil-deal',
      'parents-guide-to-nil',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'What NIL actually means',
        paragraphs: [
          'NIL stands for Name, Image, and Likeness — the legal right of an individual athlete to be paid for the commercial use of their identity. Before 2021 at the NCAA level, and before 2022 at most high-school associations, student-athletes could not receive money for that use without losing eligibility. That changed fast. By 2026, the majority of U.S. states allow some form of high-school NIL activity, with the rest either in transition or scheduled to consider policy changes.',
          'At the high-school level, NIL is not pay-for-play. Your athlete cannot be paid for scoring touchdowns. They can be paid for appearing in a local restaurant\'s Instagram post, signing autographs at a brand event, or licensing their likeness to a trading-card company. The distinction is the commercial activity, not the athletic performance.',
        ],
      },
      {
        heading: 'Who sets the rules for high-school NIL',
        paragraphs: [
          'Three layers of authority stack on top of each other. First: the state athletic association (CIF in California, UIL in Texas, FHSAA in Florida, and so on). They set the floor — whether NIL is permitted at all, what categories are banned, how disclosures are filed. Second: the school district, which can add stricter rules but cannot loosen state rules. Third: federal tax law, which treats NIL income as self-employment income the same way it treats any other 1099 work.',
          'The practical consequence: your athlete\'s eligibility is set by the state they compete in — not where the brand is located, not where the deal is signed, not where your family lives if that differs from where they play.',
        ],
      },
      {
        heading: 'What counts as an NIL deal',
        bulletList: [
          'Paid social-media posts (Instagram, TikTok, YouTube) featuring a product or service.',
          'Paid appearances — autograph signings, grand openings, camps.',
          'Licensing deals — trading cards, jerseys, video-game likenesses.',
          'Paid endorsements in print, web, or broadcast advertising.',
          'Revenue share from merchandise (t-shirts, hoodies) sold using the athlete\'s name.',
          'Paid use of the athlete\'s likeness in any content the brand publishes.',
        ],
      },
      {
        heading: 'What does NOT count as NIL at the HS level',
        paragraphs: [
          'Nothing tied to game performance. Nothing using school IP (team name, logo, uniform) without school permission — most state AAs explicitly ban that. Nothing from banned categories: almost universally gambling, alcohol, tobacco, cannabis, adult content, and weapons. Several states also ban performance-enhancing supplements, CBD, and firearms of any kind.',
          'Also: no booster-style pass-through. A booster cannot pay an athlete through a "consulting agreement" that is really a recruiting inducement. Most state AAs treat that as a pay-for-play violation and will pull eligibility.',
        ],
      },
      {
        heading: 'How GradeUp fits into the picture',
        paragraphs: [
          'GradeUp is a compliance-first marketplace that connects scholar-athletes (student-athletes with verified grades) to brands running local, state-compliant campaigns. The compliance engine runs every deal against the athlete\'s state rules before the deal can go live — parental consent, disclosure windows, banned categories, minimum age. Brands get reach without legal overhead. Parents get a paper trail. Athletes get a portfolio that travels with them into college.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is high-school NIL legal in every state?',
        a: 'No. By April 2026, the majority of states permit it, but several still prohibit it and others are actively drafting rules. Your athlete\'s eligibility depends on the state they compete in — always check the state rules page for your state.',
      },
      {
        q: 'Can my high-school athlete sign an NIL deal without me?',
        a: 'In almost every permitting state, no. Most state athletic associations require parent or legal-guardian consent on every HS NIL contract. GradeUp enforces dual signature on every minor deal regardless of state rule.',
      },
      {
        q: 'Does signing an NIL deal affect college recruiting?',
        a: 'A well-structured NIL portfolio can help. Colleges increasingly see NIL performance as a signal of brand value. A poorly structured deal — one that violates state rules or uses school IP without permission — can hurt eligibility and recruiting. The compliance engine exists to keep deals in the green zone.',
      },
      {
        q: 'Do high-school NIL deals pay taxes?',
        a: 'Yes. NIL income is 1099 self-employment income at the federal level, and most states treat it the same. Minor athletes owe taxes just like adult earners; the parent is typically the filer of record. See our post on NIL taxes for minors for details.',
      },
    ],
  },

  // 2
  {
    slug: 'parental-consent-explained',
    title: 'Parental consent for NIL: what parents need to know',
    description:
      'How parental-consent requirements work across high-school NIL, what you\'re actually signing, and how GradeUp handles consent for you automatically.',
    heroEyebrow: 'Parent playbook',
    category: 'parents',
    audience: 'parents',
    keywords: [
      'parental consent NIL',
      'high school NIL parent approval',
      'minor NIL deal parent signature',
      'NIL consent form',
      'parent guide NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'parents-guide-to-nil',
      'nil-contracts-explained',
      'nil-taxes-and-filings-for-minors',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Why parental consent is the first checkpoint',
        paragraphs: [
          'Your high-school athlete is a minor. In every state that allows HS NIL, the contract is between the brand and the athlete — but the consent to that contract runs through you. That is not ceremonial. It is the legal gate that makes the whole transaction enforceable, auditable, and eligible.',
          'When a state athletic association reviews a deal, the first thing they look for is the parent signature. If it is missing, the deal is void in their eyes, even if the brand already paid. If it is present, the deal has a legitimate paper trail and the athlete\'s eligibility stays protected.',
        ],
      },
      {
        heading: 'What you are actually consenting to',
        bulletList: [
          'The specific deliverables (one Instagram post, three TikToks, a live appearance, etc.).',
          'The use of your athlete\'s name, image, and likeness by the brand — how, where, for how long.',
          'The payment amount, payment method, and payment timing.',
          'Exclusivity clauses, if any (the brand\'s right to prevent your athlete signing with competitors).',
          'Moral and behavior clauses — conditions under which the brand can terminate.',
          'The method of disclosure to the state athletic association (the platform handles this on GradeUp).',
        ],
      },
      {
        heading: 'What a good parental-consent process looks like',
        paragraphs: [
          'Written consent, not verbal. A clear scope of deliverables so the brand can\'t keep asking for more. An explicit term (30 days, 90 days, 6 months — not "in perpetuity"). A termination clause that either party can invoke with written notice. Payment through a custodial account the parent controls, not an account in the minor\'s name that the minor can spend from unilaterally.',
          'GradeUp enforces all of the above by default. Every minor deal routes through the parent\'s dashboard, surfaces the scope and term in plain English, and locks the go-live step until the parent has signed. If you need to pull the plug, there\'s one button — we handle the brand conversation.',
        ],
      },
      {
        heading: 'What parents should never sign away',
        paragraphs: [
          'Do not sign an NIL contract that grants the brand perpetual rights to your athlete\'s likeness. Do not sign one that assigns future NIL income to the brand as "royalties" in exchange for an up-front payment — that is effectively a loan against your minor\'s earnings. Do not sign one that commits your athlete to performance-enhancing or health-and-wellness categories without a physician review. Do not sign one with a morality clause so broad that a B grade or a loud parent at a game could trigger termination.',
        ],
        pullQuote:
          'Your signature protects your athlete. Treat it with the same rigor you\'d treat a college application.',
      },
    ],
    faqs: [
      {
        q: 'Do both parents need to sign?',
        a: 'It depends on the custody arrangement. If one parent is the sole legal guardian, their signature alone is sufficient. In joint-custody situations, most state associations accept either parent\'s signature unless the custody order specifies otherwise. GradeUp surfaces the custody question during onboarding so you can configure it once.',
      },
      {
        q: 'What if my athlete is 18 but still in high school?',
        a: 'If your athlete has reached the age of majority in your state (18 in most states), they can legally sign contracts on their own. Many state AAs still require parental notification even for 18-year-old seniors. GradeUp keeps the dual-signature flow on by default but lets you opt out once the athlete is 18.',
      },
      {
        q: 'Can I revoke consent after a deal is signed?',
        a: 'Yes, subject to the terms of the contract. Most GradeUp-facilitated contracts include a termination clause either party can invoke with written notice. If the brand has already published content, revoking consent does not automatically remove that content — you have to negotiate removal as part of the termination.',
      },
    ],
  },

  // 3
  {
    slug: 'how-athletes-get-first-nil-deal',
    title: 'How to get your first NIL deal in high school',
    description:
      'A practical checklist for high-school athletes landing their first legitimate NIL deal — profile, audience, outreach, and what to avoid.',
    heroEyebrow: 'Athlete playbook',
    category: 'athletes',
    audience: 'athletes',
    keywords: [
      'first NIL deal',
      'high school NIL how to',
      'get my first NIL deal',
      'NIL athlete guide',
      'landing NIL deals',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'what-brands-want-in-athletes',
      'social-media-strategy-for-athletes',
      'nil-for-scholar-athletes',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Before you reach out to anyone, do the foundation',
        paragraphs: [
          'Your first NIL deal is not about shooting your shot with a Fortune 500 brand. It is about making yourself signable to a local business for a real dollar amount. The checklist is short but it is non-negotiable: a verified athlete profile, a clear audience number (not inflated, not vanity), and at least three pieces of content that show you on-camera as a person — not just game highlights.',
          'Local businesses do not need 100,000 followers. They need trust. A scholar-athlete with a 3.7 GPA, 800 engaged local followers, and a coherent personal brand will out-convert an inflated 10,000-follower account every time.',
        ],
      },
      {
        heading: 'Step 1: Build the profile that brands actually read',
        bulletList: [
          'Full name, high school, sport, grad year, verified GPA.',
          'A single clean headshot and 3–5 action photos (phone quality is fine if the lighting is clean).',
          'A 60-second intro video on your GradeUp profile — eye contact, mention your school, your sport, your GPA, one thing you care about outside of sport.',
          'Links to your social accounts, with follower counts pulled live (brands verify manually, inflation is caught instantly).',
          'Any endorsements from coaches or teachers — a single quote goes a long way.',
        ],
      },
      {
        heading: 'Step 2: Pick your first 5 local targets',
        paragraphs: [
          'Not 50. Five. Businesses within 20 miles of your school that already market to your demographic. The youth physical-therapy clinic your teammate uses. The family-owned sporting-goods store. The local smoothie place students actually walk to after practice. Skip the national chains on attempt one — their social budgets are locked up two quarters in advance.',
          'For each target, note three facts: who currently runs their social presence, whether they have ever used a local person in their ads, and one thing you genuinely like about their product or service. You will use all three in the outreach message.',
        ],
      },
      {
        heading: 'Step 3: The outreach message that works',
        paragraphs: [
          'Keep it under 120 words. Subject line is your name, sport, and one useful fact ("Jordan M., basketball, 3.8 GPA, Lincoln High"). Body: you know who they are, you like the specific thing, here is what you can offer (one Instagram reel plus one appearance, for example), here is the price range, here is your GradeUp profile link. Sign off with your school and grad year so they know what they are working with.',
          'If you hear back, the GradeUp platform handles the rest — contract, consent, disclosure, payment, all inside the compliance engine. You focus on delivering the content on time.',
        ],
      },
      {
        heading: 'What to avoid on your first deal',
        bulletList: [
          'Trading services for product. Burger coupons are not NIL compensation at a rate that protects your career.',
          'Signing anything without your parent reading it first — even if you are 17 and convinced you understand it.',
          'Any deal that uses your school name, logo, or uniform without written school permission.',
          'Any banned-category deal (gambling, alcohol, tobacco, cannabis, adult, weapons). The compliance engine blocks these, but brands will still try.',
          'Perpetual-rights language. Your first deal should be 30–90 days, not forever.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much should my first NIL deal pay?',
        a: 'In 2026, local HS NIL deals typically fall between $50 and $500 per post, with hybrid content-plus-appearance packages reaching $1,000 and up in markets with strong sports culture. See our post on NIL deal compensation ranges for a complete breakdown.',
      },
      {
        q: 'Do I need a manager or agent for my first deal?',
        a: 'No. Many states also require agents to be registered with the state AA, which adds friction. GradeUp operates as a marketplace — we replace the agent function for local deals. When you move to college or national-scale deals, professional representation may be worth considering.',
      },
      {
        q: 'How long does the first deal usually take to close?',
        a: 'From first outreach to signed contract: typically 7–21 days at the local level. The compliance steps on GradeUp (consent, disclosure) add less than a day because they run in parallel with contract signing.',
      },
    ],
  },

  // 4
  {
    slug: 'nil-deal-compensation-ranges',
    title: 'What HS NIL deals actually pay in 2026',
    description:
      'Honest compensation ranges for high-school NIL deals in 2026 — broken down by follower count, sport, region, and deal type.',
    heroEyebrow: 'Money & taxes',
    category: 'money',
    audience: 'athletes',
    keywords: [
      'HS NIL how much money',
      'high school NIL pay',
      'NIL deal amounts 2026',
      'NIL compensation ranges',
      'how much do HS athletes make NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-athletes-get-first-nil-deal',
      'how-to-value-a-local-nil-deal',
      'nil-taxes-and-filings-for-minors',
    ],
    stateRulesSlug: 'texas',
    body: [
      {
        heading: 'The honest distribution',
        paragraphs: [
          'Most high-school NIL deals in 2026 pay between $100 and $1,000. Viral-headline deals ($50,000+ for a top-ranked recruit) exist but they distort the picture — they are a tiny fraction of transactions. If you are a competitive scholar-athlete with a real but modest audience, the realistic window for your first deal is three figures, not six.',
          'Brands price HS NIL the same way they price any micro-influencer relationship: they look at reach, engagement, relevance to their product, and whether the activation is local. The GPA premium is real but moderate — brands that specifically want scholar-athletes pay 15–30% above the equivalent audience without the academic signal.',
        ],
      },
      {
        heading: 'By follower count (single Instagram post, local brand)',
        bulletList: [
          '500–2,000 followers: $50–$200 per post, plus product fee.',
          '2,000–10,000 followers: $150–$500 per post.',
          '10,000–50,000 followers: $500–$2,000 per post.',
          '50,000–200,000 followers: $1,500–$7,500 per post (national brands start entering).',
          '200,000+ followers: $7,500+ per post, typically negotiated as multi-post packages.',
        ],
      },
      {
        heading: 'By sport (rough 2026 multipliers on the ranges above)',
        bulletList: [
          'Football, basketball, baseball: 1.0x (the reference cohort).',
          'Women\'s volleyball, softball: 0.9x–1.0x (fast-rising category).',
          'Track & field, wrestling, cross-country: 0.6x–0.8x (smaller audience, loyal brands).',
          'Swim, tennis, golf: 0.7x–0.9x (affluent brand fit, smaller audience).',
          'Lacrosse, hockey: 1.0x–1.2x in geographies where the sport has traction.',
        ],
      },
      {
        heading: 'By deal type',
        paragraphs: [
          'Single social post: the entry point, low four figures at the high end. Post-plus-appearance packages typically 2–3x a single post because the appearance itself has fulfillment cost for the athlete. Multi-post campaigns (3–5 posts over 30 days) usually price at a 20% discount to the sum of individual posts because the brand gets compounding exposure.',
          'Licensing deals — trading cards, apparel lines — look different. They are typically structured as an up-front fee plus a revenue share. The up-front is often modest ($500–$2,500) but the revenue share can dwarf that if the product moves.',
        ],
      },
      {
        heading: 'The scholar-athlete premium',
        paragraphs: [
          'Brands who specifically recruit on GradeUp for GPA-verified athletes pay meaningfully more than baseline — often 15–30% above the ranges above. The reason is not charity. It is that a scholar-athlete audience converts. Parents follow scholar-athletes. Coaches follow. Teachers follow. The audience density for high-intent buyers (education services, tutoring, ACT/SAT prep, healthy-living brands, local restaurants) is significantly higher per follower than a pure-athletic account.',
        ],
        pullQuote:
          'Your GPA is not a feel-good bonus. It is a measurable audience-quality signal that brands pay extra to access.',
      },
    ],
    faqs: [
      {
        q: 'Do all HS NIL deals pay in cash?',
        a: 'No. Many first deals are hybrid — cash plus product plus appearance fee. Pure product deals ("swag for a post") are common but undervalue you; always get at least a modest cash component so the deal has a verifiable market rate.',
      },
      {
        q: 'Who actually receives the money?',
        a: 'In most states, the funds route through a parent-controlled custodial account. In states that defer payment until age 18 (notably Texas for certain deal structures), the platform captures the money up front and holds it in trust until the athlete\'s 18th birthday. GradeUp handles the routing automatically.',
      },
      {
        q: 'Is there a minimum deal size?',
        a: 'No regulatory minimum, but deals under ~$50 rarely justify the tax-filing and compliance overhead. GradeUp sets a $25 platform floor on its self-serve brand tools to keep the marketplace healthy.',
      },
    ],
  },

  // 5
  {
    slug: 'nil-for-scholar-athletes',
    title: 'Why your GPA is your biggest NIL asset',
    description:
      'For high-school athletes, a strong GPA is the single most under-priced advantage in NIL — here\'s why brands pay more for scholar-athletes.',
    heroEyebrow: 'Athlete playbook',
    category: 'athletes',
    audience: 'athletes',
    keywords: [
      'scholar athlete NIL',
      'GPA NIL high school',
      'academic NIL advantage',
      'grades NIL value',
      'scholar athlete brand deals',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-athletes-get-first-nil-deal',
      'what-brands-want-in-athletes',
      'hs-to-college-nil-pipeline',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The audience-quality argument',
        paragraphs: [
          'Brands do not buy followers. They buy conversions. A follower who converts — who clicks, buys, shows up — is worth 100 followers who do not. For years, the assumption was that athletic audiences converted well because they were highly engaged. That is partly true, but scholar-athlete audiences convert dramatically better because the composition of the audience is different: parents, teachers, other scholar-athletes, college recruiters, and local community members who already trust the brand signal.',
          'Put plainly: a 3,000-follower scholar-athlete account with a 4.0 GPA outperforms a 3,000-follower pure-athletic account on almost every conversion metric that matters to a local brand.',
        ],
      },
      {
        heading: 'The brand-safety argument',
        paragraphs: [
          'Brands run from risk. A scholar-athlete with a verified GPA, a visible pattern of long-term commitments (honor roll, AP courses, clubs), and a clean social history is the lowest-risk NIL signature a brand can make. Verified grades also remove one of the big brand fears — that a minor athlete will drop out of eligibility mid-campaign.',
          'This matters most in higher-value deals. Locally you might win the deal on charm. At the $1,000+ tier, you win on being the lowest-risk candidate in the room.',
        ],
      },
      {
        heading: 'The brand-fit argument',
        paragraphs: [
          'Certain brand categories are specifically hunting scholar-athletes: tutoring services, test-prep companies, healthy-food franchises, financial-literacy programs, technology education, and the increasingly large category of "youth development" brands. None of these brands want a pure athletic endorsement. They want the composite — athlete plus student plus community member.',
          'On GradeUp, brands filter by verified GPA band (3.0+, 3.5+, 3.8+) because that filter generates measurably better campaign performance. Your GPA is a search term in the brand dashboard.',
        ],
      },
      {
        heading: 'What "verified GPA" means on GradeUp',
        bulletList: [
          'Transcript-verified: a real school transcript reviewed by our operations team (not self-reported).',
          'Refreshed every semester — the GPA number shown to brands is current.',
          'Badged on your public profile: brands see the "GPA verified" mark the same way they see your sport verification.',
          'Privacy-preserved: brands see the GPA number, not the transcript.',
        ],
      },
      {
        heading: 'What to do with this information',
        paragraphs: [
          'Protect the GPA the same way you protect a key eligibility metric. Use it on your GradeUp profile prominently. Include it in your outreach messages to brands. If your sport has a small audience, your GPA is the compensating factor that justifies brand interest — lead with it.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What GPA do brands consider "scholar-athlete" range?',
        a: 'The common filter tiers on GradeUp are 3.0+, 3.5+, and 3.8+. Above 3.8 unlocks the highest brand-premium category and tends to attract test-prep and higher-education sponsors specifically.',
      },
      {
        q: 'Does a verified GPA matter more than follower count?',
        a: 'For local, brand-safety-conscious campaigns, yes. Follower count still matters for reach-driven campaigns. The two compound — a 3.8 GPA with 10,000 engaged local followers is roughly equivalent to a 2.8 GPA with 30,000 followers for most local brand campaigns.',
      },
      {
        q: 'How often should I update my GPA on the platform?',
        a: 'Every semester. GradeUp prompts you at the start of each semester; if your GPA changes materially, the badge refreshes within 72 hours of transcript upload.',
      },
    ],
  },

  // 6
  {
    slug: 'parents-guide-to-nil',
    title: 'A parent\'s complete guide to NIL',
    description:
      'Everything a parent of a high-school athlete needs to know about NIL — before, during, and after the first deal.',
    heroEyebrow: 'Parent playbook',
    category: 'parents',
    audience: 'parents',
    keywords: [
      'parent guide NIL',
      'NIL parent advice',
      'HS NIL for parents',
      'parental guide high school NIL',
      'should my child do NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'parental-consent-explained',
      'nil-contracts-explained',
      'nil-taxes-and-filings-for-minors',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Before any deal: get the foundation right',
        paragraphs: [
          'Two things need to exist before your athlete even thinks about a deal: a compliance-ready profile (verified grades, verified enrollment, parent-linked account) and a shared family understanding of what kinds of deals are acceptable. The second is easy to skip and painful to recover from.',
          'Sit down for 20 minutes as a family. Decide your categories: no alcohol, no gambling, no firearms, no cannabis — that is the universal baseline. Then layer in your family\'s specifics: maybe no energy drinks, maybe no political content, maybe nothing that pulls practice time more than twice a month. Write them down. GradeUp lets you encode some of these as hard filters in the parent dashboard.',
        ],
      },
      {
        heading: 'During the deal: what the parent dashboard actually does',
        bulletList: [
          'Shows every active deal your athlete has signed — scope, compensation, timeline, deliverables.',
          'Surfaces the contract in plain English plus the full legal version.',
          'Requires your signature before any deal goes live (minor deals are blocked until signed).',
          'Routes payment to the custodial account you control.',
          'Shows state-specific disclosures filed on your behalf (timestamp, recipient, status).',
          'Sends you a notification any time a brand sends a message, a new deal offer, or a renewal.',
        ],
      },
      {
        heading: 'After the deal: tracking the money',
        paragraphs: [
          'Your athlete\'s earnings are their earnings — but they are taxable, and the IRS does not care that the earner is 15. In most states, you\'ll file a return for your minor that includes 1099 income. In most tax situations, that income gets taxed at the kiddie-tax rate above a modest threshold. Your CPA handles the filing; GradeUp provides the 1099 forms directly in the parent dashboard at year-end.',
          'Conversation we\'d encourage you to have early: where does the money go? Some families split earnings three ways — save, invest, spend. Some hold it all until the athlete turns 18. Some route a chunk directly to a college savings account. There is no right answer — but the default of "figure it out later" is the worst answer, because without structure the money tends to evaporate.',
        ],
      },
      {
        heading: 'The conversations worth having up front',
        bulletList: [
          'What percentage of earnings is savings vs. spending?',
          'Where do earnings go at age 18 — fully to the athlete, or stay shared?',
          'If the athlete is offered a deal you don\'t like, who decides?',
          'How do we handle a deal that conflicts with school or practice schedule?',
          'What happens if the athlete gets injured or changes sports?',
          'Do we share NIL news with college recruiters? (Usually: yes.)',
        ],
      },
      {
        heading: 'What GradeUp handles so you don\'t have to',
        paragraphs: [
          'Compliance filing in every permitting state, on time, every time. Banned-category enforcement. Age-floor enforcement (no deal goes live if your athlete is below the state\'s minimum age). Payment escrow and release. Custodial-account routing. Year-end tax forms. State-AA disclosure logs. We operate as the compliance layer so you can operate as a parent.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much time will NIL realistically take from my family?',
        a: 'For a first deal: 1–3 hours of your time total (contract review, signature, payment setup). The athlete\'s time varies by deliverable — expect 2–8 hours of content creation per paid post. GradeUp shaves the administrative overhead (disclosure, compliance) to essentially zero for the family.',
      },
      {
        q: 'Can I say no to a deal my athlete wants?',
        a: 'Yes, absolutely. Your signature is required; without it, the deal cannot go live. Best practice: establish a shared family rubric before the first deal so the conversations feel collaborative rather than adversarial.',
      },
      {
        q: 'Will NIL affect college financial aid or scholarships?',
        a: 'NIL income is reportable income and can marginally affect need-based aid. It does not directly affect athletic scholarships at the college level. See our post on NIL and scholarships for details.',
      },
    ],
  },

  // 7
  {
    slug: 'how-brands-run-nil-campaigns',
    title: 'How brands run HS NIL campaigns — and what makes them work',
    description:
      'Operator-level breakdown of how brands plan, launch, and measure high-school NIL campaigns — from brief to deliverable to ROI.',
    heroEyebrow: 'Brand playbook',
    category: 'brands',
    audience: 'brands',
    keywords: [
      'HS NIL campaign how to',
      'brand NIL campaign',
      'launch NIL campaign',
      'NIL marketing ROI',
      'high school NIL marketing',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'brand-vertical-fit-hs-nil',
      'what-brands-want-in-athletes',
      'how-to-value-a-local-nil-deal',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'What a working HS NIL campaign actually looks like',
        paragraphs: [
          'A successful high-school NIL campaign has three features: it is local or hyper-local (the athletes are within reach of your physical customers), it is specific (a single product, a single call-to-action, a single timeframe), and it is structured (the athletes know what to post, when, and why). Campaigns that skip any of those three fail in predictable ways.',
          'Local: brand proximity to the athlete\'s audience is the single biggest conversion predictor. An out-of-state national brand on a local athlete\'s account underperforms a local shop roughly 3:1 in click-through on category-matched content.',
        ],
      },
      {
        heading: 'The brief: six elements, no fluff',
        bulletList: [
          'The product or service being promoted (one, not three).',
          'The specific call-to-action (visit store, use code, follow account, book appointment).',
          'The content format and count (e.g., one Reel + one static post + one story).',
          'The timeframe (a 7-day window usually beats a 30-day window for conversion).',
          'The target athlete profile (sport, GPA band, location, follower range).',
          'The compliance constraints — any categories or claims to avoid.',
        ],
      },
      {
        heading: 'The launch sequence that converts',
        paragraphs: [
          'Phase 1 (week 0): the athlete introduces themselves and teases the partnership. Phase 2 (week 1): the product-in-use content lands. Phase 3 (week 2): the call-to-action content, with the clearest incentive. This cadence works because it builds familiarity before it asks for action — the classic three-touch marketing principle applied to a 14-day window.',
          'One-off single-post campaigns can work for awareness, but for measurable conversion, multi-touch beats single-touch almost always. The cost differential is small; the lift is 2–5x.',
        ],
      },
      {
        heading: 'How GradeUp structures brand campaigns',
        paragraphs: [
          'Brief template with the six elements above, pre-loaded. Athlete filter by sport, GPA band, location, and follower range. Automated contract generation per athlete (state-specific terms baked in). Consent and disclosure handled automatically — brand never touches the state athletic association. Deliverables tracked in the brand dashboard; release of payment conditioned on deliverable completion and content moderation.',
          'The operator reality: a brand can go from brief to live campaign with 5 athletes in 3–5 business days on GradeUp. Without a platform, the same workflow typically takes 3–6 weeks due to compliance uncertainty and multi-state paperwork.',
        ],
      },
      {
        heading: 'Measuring ROI',
        bulletList: [
          'Engagement rate on partnered content (benchmark vs. brand\'s own content).',
          'Click-through on unique UTMs per athlete (GradeUp generates these automatically).',
          'Conversion via dedicated coupon codes per athlete (tied to Stripe or POS).',
          'Foot-traffic attribution for physical-location campaigns (manual or via partner platforms).',
          'Follower growth on the brand\'s own account during and after the campaign.',
          'Cost per new customer acquired — the metric that matters for renewal decisions.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How many athletes should my first campaign use?',
        a: '3–5 is the sweet spot for first campaigns — enough to get a statistically meaningful sample of engagement and conversion, small enough to manage without a dedicated campaign manager. Scale up once you have a performance baseline.',
      },
      {
        q: 'What\'s a realistic budget for a first local campaign?',
        a: 'For a 5-athlete, 3-post, 30-day local campaign targeting micro-influencers (1k–10k followers), expect $2,500–$7,500 total — inclusive of platform fee. National-brand campaigns aimed at mid-tier athletes land in the $15,000–$50,000 range.',
      },
      {
        q: 'How long before I see ROI?',
        a: 'For local conversion-focused campaigns: 2–6 weeks from launch to measurable customer acquisition. For brand-awareness campaigns: 60–90 days before the lift shows in aided brand recall. Short-term conversion beats long-term awareness for first-campaign decisions.',
      },
    ],
  },

  // 8
  {
    slug: 'brand-vertical-fit-hs-nil',
    title: 'Which brand verticals fit HS NIL best',
    description:
      'Not every brand category fits high-school NIL. Here are the verticals that consistently perform — and the ones that consistently don\'t.',
    heroEyebrow: 'Brand playbook',
    category: 'brands',
    audience: 'brands',
    keywords: [
      'best brand NIL verticals',
      'HS NIL brand categories',
      'what brands do NIL',
      'NIL vertical fit',
      'high school NIL marketing categories',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-brands-run-nil-campaigns',
      'how-to-value-a-local-nil-deal',
      'nil-for-underrepresented-athletes',
    ],
    stateRulesSlug: 'florida',
    body: [
      {
        heading: 'The three tiers of fit',
        paragraphs: [
          'Brand verticals divide roughly into three tiers for HS NIL: natural fit (campaigns typically outperform benchmarks), conditional fit (campaigns work with thoughtful creative but require extra care), and poor fit (campaigns almost always underperform, regardless of spend).',
          'The tiers are not about the brand being good or bad — they\'re about whether the audience overlap between a scholar-athlete\'s following and the brand\'s target customer is dense enough to move the needle. When the overlap is thin, no amount of execution rescues the campaign.',
        ],
      },
      {
        heading: 'Natural fit — outperform without heroics',
        bulletList: [
          'Local restaurants and food service (especially youth-friendly fast-casual).',
          'Sporting goods and athletic apparel (local stores, not national chains).',
          'Tutoring, test prep, and academic services.',
          'Sports medicine, physical therapy, and youth health clinics.',
          'Local gyms and youth training programs.',
          'Banks and credit unions with youth financial-literacy programs.',
          'Technology education (coding camps, STEM programs).',
          'Local car dealerships (youth-driver programs).',
          'Healthy-living and functional beverage brands.',
        ],
      },
      {
        heading: 'Conditional fit — works with care',
        bulletList: [
          'National QSR chains (works locally if the individual franchise sponsors).',
          'Entertainment venues and events (needs age-appropriate targeting).',
          'Apparel brands outside athletics (works for fashion-forward athletes specifically).',
          'Subscription services (works for student-relevant services, not general consumer).',
          'Auto services (works for teen-driver focused messaging).',
          'Beauty and grooming (works with strong parental collaboration).',
        ],
      },
      {
        heading: 'Poor fit — almost always underperforms',
        bulletList: [
          'Real estate (audience is not in-market).',
          'Insurance (audience does not hold the purchase decision).',
          'Luxury goods (rarely converts from scholar-athlete audiences).',
          'B2B services (audience has no business purchasing authority).',
          'Complex financial products (parents tune out; athletes are not the decision-maker).',
          'Anything with universal category bans (gambling, alcohol, tobacco, cannabis, adult, weapons).',
        ],
      },
      {
        heading: 'What predicts vertical fit',
        paragraphs: [
          'Three questions. One: does a 15–17-year-old realistically hold influence over this purchase decision (even if they\'re not the buyer)? Two: does the brand\'s local-market footprint overlap with the athlete\'s audience? Three: does the product or service benefit from association with academic excellence (the scholar-athlete signal)? If any two are yes, the vertical is worth testing. If all three are yes, it usually outperforms.',
        ],
        pullQuote:
          'Vertical fit beats creative brilliance. A great ad for a poor-fit vertical still underperforms a decent ad for a natural-fit vertical.',
      },
    ],
    faqs: [
      {
        q: 'Can alcohol brands ever run HS NIL?',
        a: 'No. Alcohol is a universally banned category for HS athletes across every state association. Even an adjacent category (non-alcoholic beer, alcohol-branded apparel) typically gets flagged and blocked by the compliance engine.',
      },
      {
        q: 'What about crypto or sports-betting adjacent categories?',
        a: 'Gambling is universally banned. Crypto falls into a gray zone that GradeUp currently does not facilitate at the HS level — the regulatory risk and age-appropriateness concerns outweigh the campaign upside.',
      },
      {
        q: 'How do I know if my vertical will work before I spend?',
        a: 'Run a 3-athlete pilot for 2–4 weeks with a clear measurement plan (UTMs, unique codes). Pilot cost is usually 10–15% of full-campaign spend and tells you definitively whether your vertical converts.',
      },
    ],
  },

  // 9
  {
    slug: 'nil-compliance-for-schools',
    title: 'HS NIL compliance for athletic directors',
    description:
      'The athletic director\'s guide to high-school NIL compliance — what you need to track, what liability looks like, and how to get audit-ready without building software.',
    heroEyebrow: 'For athletic directors',
    category: 'compliance',
    audience: 'coaches',
    keywords: [
      'athletic director NIL',
      'HS NIL compliance AD',
      'school NIL compliance',
      'NIL audit athletic director',
      'high school athletic director NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'state-athletic-association-disclosure',
      'nil-compliance-for-schools',
      'what-is-hs-nil',
    ],
    stateRulesSlug: 'texas',
    body: [
      {
        heading: 'Your compliance footprint, in four buckets',
        bulletList: [
          'Awareness: do you know which of your athletes have active NIL deals?',
          'Documentation: do you have a record of each deal\'s scope, compensation, and parties?',
          'Disclosure: is the required filing to the state athletic association happening on time?',
          'Category enforcement: are any deals in banned categories, using school IP, or functioning as pay-for-play?',
        ],
      },
      {
        heading: 'Why awareness is the hardest part',
        paragraphs: [
          'Most HS ADs first learn about an athlete\'s NIL deal when something has already gone wrong — a posted photo in school uniform, a social post a parent complained about, an off-platform deal that flew under the radar. The awareness gap is not a character flaw; it\'s a structural problem. Athletes and families have no automatic obligation to tell the AD about a deal unless the deal requires something that only the AD can provide (like a facility).',
          'The solution is not more paperwork. It\'s a platform where deals are logged by default, with the AD getting read-only visibility on deals involving their athletes. GradeUp\'s AD dashboard is that read-only layer — you see your program\'s deals without becoming the bottleneck.',
        ],
      },
      {
        heading: 'Documentation you actually need',
        paragraphs: [
          'Per state association and per legal counsel, the minimum for each HS NIL deal is: signed contract copy, parental consent record, disclosure-filed timestamp, category verification, and evidence that no school IP was used. GradeUp stores all five for every deal involving your athletes, accessible from your AD dashboard in two clicks.',
          'If your state AA audits your program — which is becoming more common, especially for schools with high-profile athletes — the ability to produce this documentation within hours rather than weeks determines whether the audit goes smoothly.',
        ],
      },
      {
        heading: 'School IP: the fastest way to cause a problem',
        paragraphs: [
          'Using the school name, team mascot, logo, or uniform in an NIL context without school permission is the single most common reason deals get flagged — and the easiest to avoid. Athletes rarely do it maliciously; they just don\'t know the rule. Your compliance engine should block it before it goes live, and GradeUp does.',
          'Corollary: if your athletic department actively wants to license school IP for certain NIL activities (a sponsored Senior Night campaign, for example), you need a written license agreement with the athlete and the brand. We can help with the template.',
        ],
      },
      {
        heading: 'Liability, in plain English',
        paragraphs: [
          'Your program is generally not liable for an athlete\'s individual NIL deal — the contract is between the athlete and the brand. Your liability risk is concentrated in three scenarios: school IP used without permission, coaches or staff involved in brokering the deal (which can look like recruiting inducement), and failure to enforce state-AA rules you were aware of.',
          'All three are addressable through clean separation: your program does not broker deals, does not license IP without written consent, and uses a compliance platform that maintains the documentation trail.',
        ],
        pullQuote:
          'The goal is not to prevent NIL. It\'s to prevent your program from accidentally owning NIL risk that actually belongs to the athlete and the brand.',
      },
    ],
    faqs: [
      {
        q: 'Do I have to approve every NIL deal my athletes sign?',
        a: 'In almost no state. You have to be aware and documented. Approval typically rests with the parent or legal guardian, not the AD. Your job is oversight, not gatekeeping.',
      },
      {
        q: 'What if an athlete signs an off-platform deal I don\'t know about?',
        a: 'Most state associations put the disclosure obligation on the athlete (via parent). If they fail to disclose, the eligibility consequence falls on the athlete — not your program — unless your school was complicit. A clean record from your side is the best defense.',
      },
      {
        q: 'Can I require my athletes to use GradeUp specifically?',
        a: 'Most state associations do not allow schools to mandate a specific platform. You can strongly recommend a compliance platform and provide it at no cost to your athletes; GradeUp\'s AD-tier offering is designed for that model.',
      },
    ],
  },

  // 10
  {
    slug: 'hs-to-college-nil-pipeline',
    title: 'Your HS NIL portfolio goes to college — here\'s how it helps',
    description:
      'A strong HS NIL portfolio pays dividends in college recruiting, early brand relationships, and earning potential — if you build it right.',
    heroEyebrow: 'Strategy',
    category: 'strategy',
    audience: 'athletes',
    keywords: [
      'HS NIL college recruiting',
      'NIL portfolio college',
      'high school to college NIL',
      'college NIL preparation',
      'NIL resume college',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'nil-for-scholar-athletes',
      'how-athletes-get-first-nil-deal',
      'social-media-strategy-for-athletes',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The portfolio is the pitch',
        paragraphs: [
          'College coaches and NIL collectives look at two things when evaluating a recruit\'s commercial potential: current audience and proven execution. Current audience is obvious — followers, engagement, reach. Proven execution is the one athletes consistently underestimate. It\'s the record of deals actually delivered: content on time, deliverables met, sponsor retention, clean compliance history.',
          'A scholar-athlete who has completed six local deals in high school is meaningfully more attractive to a college program with an active NIL collective than one who has completed none — even if their social following is identical.',
        ],
      },
      {
        heading: 'What transfers cleanly to college',
        bulletList: [
          'Your social audience (Instagram, TikTok, YouTube follower count).',
          'Your content archive (posts and videos are searchable, reusable creative).',
          'Your deliverables track record (on-time percentage, sponsor repeat rate).',
          'Your verified GPA and academic history.',
          'Your brand relationships (local sponsors often want to follow you to college).',
          'Your GradeUp profile and history — the full portfolio exports for college recruiters on request.',
        ],
      },
      {
        heading: 'What doesn\'t transfer',
        paragraphs: [
          'Eligibility and school IP. Your HS eligibility is your HS eligibility; college has its own framework with different rules, different banned categories, and different disclosure requirements. Any deal you have that uses your HS\'s brand does not automatically extend to your college\'s brand — you re-sign, with the new IP holder\'s permission, or you don\'t.',
          'Your local HS following mostly does transfer, but expect a dip in engagement immediately after college commitment as your audience updates expectations about your content. That\'s normal and usually recovers within 90 days of arriving on campus.',
        ],
      },
      {
        heading: 'How to build a portfolio colleges will actually read',
        bulletList: [
          'Complete at least 3 paid deals before senior year — it\'s the minimum for "track record" language.',
          'Diversify: not all same-category deals. Local restaurant + test prep + sporting goods reads better than three smoothie shops.',
          'Document your conversion: UTM click-throughs, coupon redemptions, follower-growth impact. Numbers make the pitch.',
          'Collect one-line testimonials from each sponsor. Three quotes is worth 300 followers.',
          'Keep the compliance record spotless — no disclosure failures, no flagged categories. Recruiters filter on this.',
        ],
      },
      {
        heading: 'The GradeUp export',
        paragraphs: [
          'At senior-year milestone, you can generate a one-page portfolio PDF from your GradeUp profile: total earnings, deal count, sponsor names, engagement metrics, and a signed compliance record. Coaches and NIL collectives read this in seconds and it dramatically accelerates the recruiting conversation.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Will NIL earnings affect my NCAA eligibility?',
        a: 'Well-structured, rule-compliant HS NIL deals do not affect NCAA eligibility. Poorly structured ones (pay-for-play, booster-routed, undisclosed) absolutely can. The compliance engine exists to keep every deal in the safe zone.',
      },
      {
        q: 'Can my HS sponsors follow me to college?',
        a: 'Yes, subject to new contracts under college NIL rules. Many brand relationships that start in HS expand in college because the audience grows and the risk profile stays low for a trusted athlete.',
      },
      {
        q: 'How early should I think about the portfolio?',
        a: 'Sophomore year at the latest. The portfolio compounds: three deals in three years beats three deals in three months because repeat sponsors and retained audience matter.',
      },
    ],
  },

  // 11
  {
    slug: 'nil-taxes-and-filings-for-minors',
    title: 'NIL taxes for minor athletes: what families should know',
    description:
      'How high-school NIL income is taxed for minors — federal basics, state variations, and the paperwork parents should expect.',
    heroEyebrow: 'Money & taxes',
    category: 'money',
    audience: 'parents',
    keywords: [
      'NIL taxes minor',
      'high school NIL tax filing',
      'kiddie tax NIL',
      'NIL 1099 minor',
      'parent NIL tax guide',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'parents-guide-to-nil',
      'parental-consent-explained',
      'nil-deal-compensation-ranges',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Disclaimer before anything else',
        pullQuote:
          'This is educational content, not legal or tax advice. Every family\'s situation is different. Talk to a CPA who has filed returns with 1099 income for minors before signing any deal.',
        paragraphs: [
          'With that said: the baseline framework for HS NIL taxation is stable enough across most U.S. jurisdictions that a few clear principles apply. Knowing them before the first deal helps you ask your CPA the right questions.',
        ],
      },
      {
        heading: 'Federal baseline: NIL income is self-employment income',
        paragraphs: [
          'At the federal level, NIL payments are 1099-NEC income, the same classification used for freelance work. The athlete files a Schedule C (or C-EZ) to report the income and any deductible expenses (agent fees, travel, equipment directly used for content creation). Self-employment tax — the 15.3% social-security-plus-Medicare contribution — applies on net earnings above the threshold.',
          'For minors, two common questions: who files, and how does the "kiddie tax" interact? Answer: the parent typically files the minor\'s return (or oversees the filing), and unearned income above a modest threshold may be taxed at the parent\'s marginal rate rather than the minor\'s. Earned NIL income is usually taxed at the minor\'s bracket, which is often lower than the parent\'s — that\'s the bright side.',
        ],
      },
      {
        heading: 'State-level variation',
        paragraphs: [
          'Most states treat NIL income the same way they treat other 1099 income. A handful of states (California, Illinois, New York) have additional minor-earnings reporting requirements. Several states have no state income tax (Texas, Florida, Tennessee, among others), which simplifies filing.',
          'In states that require payment be deferred until age 18 (Texas for certain structures, notably), the tax year in which income is recognized may shift. Your CPA will address this — but be aware that deferred payment does not necessarily mean deferred tax reporting.',
        ],
      },
      {
        heading: 'Paperwork to expect',
        bulletList: [
          'Form 1099-NEC from every payer (brand or platform) paying the athlete $600+ in a calendar year.',
          'Form W-9 — the athlete provides this to the brand before first payment (GradeUp collects this during onboarding).',
          'Schedule C on the federal return — reports the income and any expenses.',
          'Schedule SE — calculates self-employment tax.',
          'State equivalent forms, where applicable.',
          'Kiddie-tax Form 8814 or 8615, where applicable.',
        ],
      },
      {
        heading: 'Deductions worth tracking',
        paragraphs: [
          'Common deductible expenses for HS NIL athletes include: phone or camera equipment used primarily for content creation, a portion of home internet, travel to paid appearances, specific wardrobe required by a brand (not everyday clothes), platform fees, and any agent or legal fees incurred. Keep receipts; your CPA decides what qualifies.',
          'Do not deduct: everyday sports equipment used for athletic participation (that\'s not NIL-related), routine clothing, meals with friends, anything not directly connected to generating NIL income.',
        ],
      },
      {
        heading: 'Where GradeUp helps',
        paragraphs: [
          'At year-end, the parent dashboard exports a summary of all earnings, all 1099s filed, and all platform fees paid — formatted for your CPA. The custodial Stripe Connect account shows a transaction-level record of every deal. Tax preparation is still your and your CPA\'s responsibility, but the raw data is collected for you.',
        ],
      },
    ],
    faqs: [
      {
        q: 'At what earnings level do we need to file?',
        a: 'Earned income of any amount generally requires a tax filing for a minor who has 1099 income. The filing threshold is low — often a few hundred dollars of self-employment income triggers filing — so expect to file even if the athlete only earns modestly. Your CPA confirms your exact situation.',
      },
      {
        q: 'Does NIL income affect our family\'s taxes?',
        a: 'It affects your filing complexity (the kiddie-tax computation can pull some earnings into your marginal bracket), but it does not directly raise your family\'s aggregate tax rate. Most families find the net tax cost modest relative to the earnings.',
      },
      {
        q: 'Can I put the earnings into a college savings account and avoid tax?',
        a: 'You can place the earnings into a 529 plan or custodial IRA, but the tax on the earned income itself still applies — the account affects what happens to the post-tax dollars, not the tax event. Again, this is a CPA conversation.',
      },
    ],
  },

  // 12
  {
    slug: 'how-nil-works-with-scholarships',
    title: 'Does an NIL deal affect scholarships?',
    description:
      'How NIL income interacts with athletic scholarships, academic scholarships, and need-based financial aid — what to watch for.',
    heroEyebrow: 'Money & taxes',
    category: 'money',
    audience: 'parents',
    keywords: [
      'NIL scholarship impact',
      'does NIL affect scholarship',
      'NIL financial aid',
      'college scholarship NIL',
      'NIL income FAFSA',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'nil-taxes-and-filings-for-minors',
      'parents-guide-to-nil',
      'hs-to-college-nil-pipeline',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The short answer',
        paragraphs: [
          'Well-structured NIL income does not affect athletic or academic scholarships. It can affect need-based financial aid because it counts as reportable student income on the FAFSA. The magnitude depends on your family\'s financial profile and how the FAFSA formula treats the additional earnings.',
          'There\'s no single rule that covers every situation; what follows is the baseline framework and the key questions to raise with a financial-aid counselor.',
        ],
      },
      {
        heading: 'Athletic scholarships',
        paragraphs: [
          'HS NIL activity does not reduce or change a college athletic scholarship, as long as the HS NIL was compliant with state rules and NCAA guidelines. This is because athletic scholarships are merit-based (performance in the sport), not need-based. The NCAA does not currently apply a means test to athletic scholarships based on outside income.',
          'The one caveat: if your HS NIL activity was not compliant (pay-for-play, booster-routed, undisclosed), it can affect eligibility entirely, which effectively cancels the scholarship. The fix is simple — keep every deal in the compliance lane.',
        ],
      },
      {
        heading: 'Academic scholarships',
        paragraphs: [
          'Merit-based academic scholarships (university or private) are generally unaffected by NIL income because they are awarded on academic merit, not need. Some academic scholarships have small "outside income" questionnaires, but they almost universally exclude 1099 earnings from reportable figures.',
          'The scholar-athlete premium works in the other direction here: many academic scholarships actively reward scholar-athletes who demonstrate responsibility, business literacy, and social-media fluency. A well-documented NIL track record strengthens merit-scholarship applications, it doesn\'t weaken them.',
        ],
      },
      {
        heading: 'Need-based financial aid (FAFSA)',
        paragraphs: [
          'This is where NIL income matters. The FAFSA treats student earnings as an input to the Student Aid Index (SAI), which determines the family\'s expected contribution. Student income is weighted more heavily than parent income — so a $10,000 NIL year can reduce a student\'s need-based aid by a few thousand dollars depending on the formula and the school.',
          'Key point: this is not a reason to avoid NIL. It\'s a reason to plan. A common approach is to route a meaningful share of NIL earnings into a qualified retirement account (custodial Roth IRA) or a 529 plan, which can reduce the FAFSA income hit while preserving the earnings.',
        ],
      },
      {
        heading: 'What to ask a financial-aid counselor before signing a major deal',
        bulletList: [
          'How does my school-specific aid formula treat student 1099 income?',
          'Is there a FAFSA year in which this income will be assessed? (The FAFSA look-back year matters a lot.)',
          'What tax-advantaged accounts can I use to buffer the aid-formula impact?',
          'Are there any state aid programs that treat NIL income differently than federal aid?',
          'If my athlete\'s NIL income exceeds the expected-contribution threshold, what\'s our next-best option?',
        ],
      },
    ],
    faqs: [
      {
        q: 'At what income level should I start worrying about FAFSA impact?',
        a: 'Rough ballpark: cumulative NIL earnings under $5,000–$7,500 per year typically have minimal FAFSA impact. Above that, it starts to matter and warrants a specific conversation with your financial-aid counselor.',
      },
      {
        q: 'Can I transfer NIL earnings to a parent account to avoid FAFSA impact?',
        a: 'Moving money from student to parent reduces the student-income hit (parent income is weighted less). But this is a complex move with gift-tax implications and should be done with CPA guidance — not improvised.',
      },
      {
        q: 'Does an NIL deal affect need-based aid for siblings?',
        a: 'It affects the overall expected family contribution calculation, which can marginally shift aid for siblings. The effect is usually small but worth modeling if multiple children are in college simultaneously.',
      },
    ],
  },

  // 13
  {
    slug: 'nil-vs-amateur-status',
    title: 'HS NIL and amateur status — the truth',
    description:
      'Cutting through the noise on whether high-school NIL affects amateur status for college recruiting and Olympic pathways.',
    heroEyebrow: 'Strategy',
    category: 'compliance',
    audience: 'athletes',
    keywords: [
      'NIL amateur status',
      'does NIL affect amateur',
      'amateurism high school NIL',
      'NIL college eligibility',
      'amateur athlete NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'hs-to-college-nil-pipeline',
      'what-is-hs-nil',
      'how-athletes-get-first-nil-deal',
    ],
    stateRulesSlug: 'florida',
    body: [
      {
        heading: 'The outdated assumption',
        paragraphs: [
          'For decades, "amateur status" was the gatekeeper that kept athletes from being paid. Lose amateur status, lose eligibility. That framework was built before NIL existed and has not kept pace. Today, "amateur" means something different: you can be paid for commercial use of your identity without losing eligibility, as long as the payment isn\'t for athletic performance.',
          'The NCAA formally removed the prohibition on NIL compensation in 2021. Most state high-school associations followed between 2022 and 2025. Olympic governing bodies (USOPC and the individual national federations) have their own rules, most of which now allow NIL activity with specific structure requirements.',
        ],
      },
      {
        heading: 'What still violates amateur status',
        bulletList: [
          'Payment for athletic performance (winning a game, scoring points, making a team).',
          'Booster-routed payments that function as recruiting inducements.',
          'School-facilitated "NIL deals" that are really disguised scholarships.',
          'Agent representation in states that require registration, without registering.',
          'Failure to disclose a deal where disclosure is required — in some state AAs, the non-disclosure itself is the eligibility violation.',
        ],
      },
      {
        heading: 'What does NOT violate amateur status (in permitting states)',
        bulletList: [
          'Paid social-media content for a brand the athlete personally endorses.',
          'Paid appearances at brand events (restaurant openings, store launches).',
          'Licensed merchandise sales (t-shirts, posters, trading cards).',
          'Royalties from content the athlete created that a brand licenses.',
          'Any well-structured NIL deal that routes through the compliance engine.',
        ],
      },
      {
        heading: 'Olympic pathways',
        paragraphs: [
          'If your athlete is aiming at an Olympic sport (swimming, gymnastics, track, wrestling, etc.), there\'s a separate layer: the sport\'s national governing body. USOPC has broadly adopted NIL-permissive policies, but individual sport federations can impose specific rules. Example: swim athletes must meet FINA eligibility standards, which historically restricted certain kinds of endorsement.',
          'For any Olympic-track athlete, check the national governing body\'s current NIL guidance before signing. The conservative move is to keep deals well inside the most restrictive framework your athlete might have to comply with — local brand, no banned categories, no perpetual rights, properly disclosed.',
        ],
      },
      {
        heading: 'The practical filter',
        paragraphs: [
          'If a deal pays for who the athlete is, not what they do on the field, it\'s almost always safe. If it pays for athletic performance, or if it routes through a booster, or if it exists to induce commitment to a specific school, it\'s almost always unsafe. GradeUp\'s compliance engine encodes exactly this distinction — every deal is checked against these principles before it can go live.',
        ],
        pullQuote:
          'Amateur status in 2026 is not about not being paid. It is about the structure of the payment.',
      },
    ],
    faqs: [
      {
        q: 'Can my athlete sign with a collective in high school?',
        a: 'HS NIL collectives exist but are controversial — most state AAs have not clarified the rules, and several associations have flagged specific collective structures as potential amateurism violations. The current conservative stance: avoid collective signings at the HS level until clearer guidance exists.',
      },
      {
        q: 'What about international athletes in U.S. high schools?',
        a: 'Student-visa status (F-1 visa typically) prohibits most forms of paid work, including NIL. There\'s no federal carve-out yet. International HS athletes should consult an immigration attorney before signing any paid NIL deal.',
      },
      {
        q: 'If my athlete reclassifies or repeats a grade, does NIL history carry over?',
        a: 'NIL history stays with the athlete and is not reset by reclassification. Eligibility clocks at the state-AA and NCAA levels are governed by separate rules, which you should check per sport.',
      },
    ],
  },

  // 14
  {
    slug: 'social-media-strategy-for-athletes',
    title: 'Social-media strategy for student-athletes on NIL',
    description:
      'A practical content strategy for scholar-athletes building an audience that converts for NIL — without sacrificing school, sport, or sanity.',
    heroEyebrow: 'Athlete playbook',
    category: 'athletes',
    audience: 'athletes',
    keywords: [
      'student athlete social media',
      'NIL content strategy',
      'high school athlete social media',
      'scholar athlete Instagram',
      'NIL audience building',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-athletes-get-first-nil-deal',
      'what-brands-want-in-athletes',
      'nil-for-scholar-athletes',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The three-bucket content model',
        paragraphs: [
          'You cannot out-post a content machine. You can out-authentic one. The three-bucket model: sport content (highlights, practice, games — what you\'re known for), life content (school, friends, family, behind-the-scenes — who you are), and voice content (opinions, reactions, commentary — what you think). Most student-athletes over-post sport and under-post the other two, which leaves them looking identical to every other athlete in their sport.',
          'Target ratio: 40% sport, 30% life, 30% voice. Tune from there based on what your specific audience engages with.',
        ],
      },
      {
        heading: 'Platform priorities in 2026',
        bulletList: [
          'Instagram: still the default for brand deal discovery. Reels outperform static for reach by a lot.',
          'TikTok: best for audience growth; brand deals typically trail Instagram.',
          'YouTube Shorts: underutilized — great for longer-form athlete content that brands license.',
          'YouTube long-form: high-effort but extremely high value for a long-term personal brand.',
          'X / Twitter: declining for athlete-audience work unless you are specifically building a sports-commentary brand.',
          'Threads, Bluesky, other emerging platforms: track but do not front-load effort here yet.',
        ],
      },
      {
        heading: 'What engagement looks like, not just followers',
        paragraphs: [
          'Follower count is a vanity metric. The two metrics brands actually pay for are engagement rate (likes plus comments plus saves as a percentage of reach) and save rate (what percentage of viewers save your content to rewatch). A 3,000-follower account with a 10% engagement rate beats a 30,000-follower account with a 1% engagement rate every time.',
          'Save rate matters more than any other single signal because saves indicate content worth rewatching — which is how brand content sticks in the buying consideration window.',
        ],
      },
      {
        heading: 'The weekly rhythm that sustains',
        bulletList: [
          'Monday: practice or training content (sport bucket).',
          'Tuesday: school or study content (life bucket).',
          'Wednesday: take or opinion content (voice bucket).',
          'Thursday: game prep or teammate content (sport bucket, but collaborative).',
          'Friday or Saturday: game highlights (sport bucket, timed to game schedule).',
          'Sunday: family or rest content (life bucket).',
        ],
      },
      {
        heading: 'Things not to do',
        paragraphs: [
          'Do not buy followers. It is the single fastest way to get caught by a brand vetting your account. Do not post in school uniform without school permission (state-AA rules vary). Do not comment on recruitment with anything other than "excited to be considered." Do not let the content become a second job that pulls you out of academic time — the GPA is the foundation, not the extra.',
          'Do not make the feed exclusively about sport. The scholar-athlete positioning depends on showing the scholar part of the equation.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much time per week should I spend on content?',
        a: 'Aim for 3–5 hours per week for active creators. More than that and academic performance starts to slip (we\'ve seen the pattern). Less than that and the algorithm stops rewarding you consistently.',
      },
      {
        q: 'Should I respond to every DM?',
        a: 'No. Respond to brand DMs within 24 hours. Respond to peer DMs and parent DMs on your own schedule. Everything else can wait. Your attention is valuable.',
      },
      {
        q: 'Does my coach need to know about my social strategy?',
        a: 'Loop them in. Coaches appreciate transparency and can often help you avoid team-chemistry issues that social posts can create. The goal is collaboration, not approval.',
      },
    ],
  },

  // 15
  {
    slug: 'what-brands-want-in-athletes',
    title: 'What brands actually look for in HS NIL athletes',
    description:
      'Behind the scenes of brand vetting — what decision-makers actually prioritize when evaluating scholar-athlete partnerships.',
    heroEyebrow: 'Strategy',
    category: 'strategy',
    audience: 'athletes',
    keywords: [
      'what brands want NIL',
      'brand NIL criteria',
      'NIL athlete evaluation',
      'HS NIL brand vetting',
      'get noticed by brands NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-athletes-get-first-nil-deal',
      'social-media-strategy-for-athletes',
      'nil-for-scholar-athletes',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The four-factor brand checklist',
        paragraphs: [
          'Decision-makers at a brand do not evaluate athletes on a single dimension. They run through four factors, usually in this order: brand safety, audience quality, reliability signal, and creative fit. You can ace three of these and still miss the deal if you fail the fourth. You can be mediocre on three and get signed if you are exceptional on the one that matters most to that specific brand.',
          'Understanding the four-factor model gives you leverage. When you pitch, you address the factor you know the brand weighs heaviest — not whatever you\'re most proud of.',
        ],
      },
      {
        heading: 'Factor 1: Brand safety',
        paragraphs: [
          'The number-one filter. A brand-safe athlete has a clean social history (no content that would embarrass a sponsor if screenshotted), no affiliation with controversial causes or figures in a way that would alienate the brand\'s customers, and a stable personal life the brand doesn\'t need to audit. Verified grades and compliance history act as strong proxies here — both signal that the athlete takes structure and responsibility seriously.',
          'Mistake athletes make: assuming that "brand safety" means "boring." It doesn\'t. Brand-safe athletes have strong opinions and distinctive content. What they don\'t have is content that pulls on the brand\'s public-relations risk.',
        ],
      },
      {
        heading: 'Factor 2: Audience quality',
        paragraphs: [
          'Not audience size. Audience quality. Is the audience local to the brand\'s target market? Is it the right age demo? Does it engage at a rate that justifies the CPM the brand is paying? A 5,000-follower account where 70% of followers are within 50 miles of the brand\'s stores is more valuable than a 50,000-follower account scattered across the country.',
          'Brands pull follower demographics from platform analytics (Instagram Insights, for example) and from the athlete\'s explicit targeting data on the GradeUp profile. If you can articulate your audience in one sentence — "mostly 13–19-year-olds within 30 miles of my school, 55% female, high engagement on fitness and academic content" — you outperform 90% of athletes who can\'t.',
        ],
      },
      {
        heading: 'Factor 3: Reliability signal',
        paragraphs: [
          'Brands have been burned by athletes who missed deliverables, changed the scope mid-deal, or ghosted after payment. The cost of that is enormous — not just the deal, but the brand\'s willingness to run future HS NIL campaigns at all.',
          'Your reliability signal is your deliverable history: on-time percentage, sponsor-repeat rate, no-flag compliance record. First deal is hard; after you have three clean deals under your belt, the data starts working for you. GradeUp surfaces your reliability stats to brands automatically.',
        ],
      },
      {
        heading: 'Factor 4: Creative fit',
        paragraphs: [
          'The least important of the four for local deals, the most important for bigger ones. Creative fit is whether the brand\'s visual and tonal identity matches your content. A high-energy QSR brand fits an energetic, fast-paced content style. A thoughtful tutoring service fits a more measured, educational-adjacent tone.',
          'You cannot be a creative fit for every brand, and you shouldn\'t try. Pick the 3–5 brand archetypes that match your natural style and focus your pitching there. The "cast a wide net" approach produces low-fit matches and burns your reliability stats on deals that underperform.',
        ],
      },
    ],
    faqs: [
      {
        q: 'If I\'m new, how do I show reliability?',
        a: 'Offer a no-cost or low-cost first deal with a clear deliverable. A local business that signs a $250 first deal with you becomes the testimonial and track record that unlocks the next $1,500 deal. Treat the first deal as a portfolio investment, not an income event.',
      },
      {
        q: 'What content should I delete before reaching out to brands?',
        a: 'Anything showing banned-category content (alcohol, gambling, etc.), anything that reads as bullying or exclusionary, and anything that uses school IP without permission. Everything else is fine — brands are more lenient than athletes think, as long as the four factors hold up.',
      },
      {
        q: 'Does my follower count need to grow before brands will talk to me?',
        a: 'Not as much as you think. Local brands start deals with athletes at 500 followers regularly. What matters more is a clear audience description and a first deal willingness.',
      },
    ],
  },

  // 16
  {
    slug: 'nil-contracts-explained',
    title: 'Reading your first NIL contract — a parent\'s guide',
    description:
      'A section-by-section walkthrough of a typical HS NIL contract — what each clause means, what to push back on, and what to never sign away.',
    heroEyebrow: 'Parent playbook',
    category: 'parents',
    audience: 'parents',
    keywords: [
      'NIL contract explained',
      'reading NIL contract',
      'first NIL contract parent',
      'HS NIL agreement',
      'NIL contract red flags',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'parental-consent-explained',
      'parents-guide-to-nil',
      'nil-taxes-and-filings-for-minors',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Contracts are not scary — they\'re just checklists',
        paragraphs: [
          'An NIL contract is a document that answers six questions: who, what, when, how much, how long, and what happens if something goes wrong. If any of those six is ambiguous, the contract is not ready to sign. If all six are clear, the contract is usually fine to sign after a quick review.',
          'GradeUp contracts are built from a standardized template that answers all six by default. Custom deals from outside platforms can have any structure — which is why we encourage running non-GradeUp deals through the compliance engine before signing.',
        ],
      },
      {
        heading: 'Section 1: Parties',
        paragraphs: [
          'Who\'s signing. The brand (legal entity name, address, representative signing), the athlete (full legal name), and the parent or guardian (if the athlete is a minor). Verify the brand\'s legal name matches their public-facing name or is clearly a parent company. An LLC you don\'t recognize can be legitimate, but do a 2-minute search before signing.',
        ],
      },
      {
        heading: 'Section 2: Scope of work',
        paragraphs: [
          'What the athlete will do. This should be specific: "one Instagram Reel under 60 seconds featuring Product X, one static post featuring the product, one Instagram Story. All content to be published within a 14-day window starting [date]." Vague scope is the single most common source of dispute — "ongoing social media support" means nothing and commits your athlete to infinite content.',
        ],
      },
      {
        heading: 'Section 3: Rights granted',
        paragraphs: [
          'What the brand can do with the athlete\'s name, image, and likeness. Read this carefully. Minimum acceptable: use the created content on the brand\'s channels for the campaign term plus a reasonable archival window (often 12 months). Red flags: "in perpetuity," "worldwide unlimited rights," "sublicense to third parties without notice." Push back on all three.',
          'A reasonable rights grant says: the brand can use this content on their channels for the campaign term and archive it for up to 12 months after. Anything beyond that should either come with extra compensation or be cut from the contract.',
        ],
      },
      {
        heading: 'Section 4: Compensation and payment',
        paragraphs: [
          'Amount, method, and timing. "$750 total, paid via Stripe Connect to the custodial account, 50% on contract signature, 50% on deliverable completion." Watch for: payment contingent on performance metrics ("paid if the post gets 10,000 views") — this is risky and often unfair, because algorithmic reach is outside the athlete\'s control. Payment on completion is reasonable; payment on engagement outcome is usually not.',
        ],
      },
      {
        heading: 'Section 5: Term and termination',
        paragraphs: [
          'Start date, end date, and how either party can exit early. Reasonable: 30–90 days with 7 days\' written notice for termination. Unreasonable: 1-year terms with 30-day notice (locks your athlete into a bad deal). Always negotiate: the right to terminate if the brand uses the athlete\'s likeness outside the agreed scope.',
        ],
      },
      {
        heading: 'Section 6: Warranties and representations',
        paragraphs: [
          'Mutual promises. The brand promises its product is legal and won\'t harm anyone; the athlete promises to deliver the content as agreed, follow FTC disclosure rules (#ad, #sponsored), and not do anything that materially harms the brand\'s reputation. The athlete\'s "morals clause" should be narrow and tied to specific behavior, not broad ("anything that reflects poorly on the brand"). Push back on broad morals clauses.',
        ],
        pullQuote:
          'A good morals clause specifies conduct. A bad one specifies perception. Insist on the first.',
      },
      {
        heading: 'Section 7: Compliance and disclosure',
        paragraphs: [
          'State-AA compliance, FTC disclosure, and tax paperwork. The contract should spell out who files what and by when. On GradeUp, the platform handles all state-AA filings automatically; FTC disclosure is the athlete\'s responsibility in their actual post (the "#ad" or "#sponsored" tag). Tax paperwork (W-9, 1099) is handled by the platform.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Should I have a lawyer review every contract?',
        a: 'For GradeUp-facilitated deals using standard templates: a quick parent read is usually sufficient. For custom or six-figure deals: yes, a 30-minute lawyer review is worth the fee. Your family CPA can often recommend an affordable entertainment attorney.',
      },
      {
        q: 'What if the brand refuses to remove a clause we don\'t like?',
        a: 'You walk. A brand that won\'t negotiate reasonable terms on a first deal is telling you something about how they\'ll behave during the deal. Plenty of other brands exist.',
      },
      {
        q: 'Can I modify a contract after signing?',
        a: 'Only through a written amendment both parties sign. Verbal agreements to change terms are not enforceable. If a brand asks for scope expansion, insist on a written amendment with adjusted compensation.',
      },
    ],
  },

  // 17
  {
    slug: 'state-athletic-association-disclosure',
    title: 'What it means when your state AA gets notified of your NIL deal',
    description:
      'Why state athletic associations require deal disclosures, what they do with the information, and why GradeUp handles the filing automatically.',
    heroEyebrow: 'Compliance',
    category: 'compliance',
    audience: 'general',
    keywords: [
      'state athletic association NIL disclosure',
      'NIL filing state AA',
      'high school NIL disclosure',
      'CIF NIL filing',
      'UIL NIL disclosure',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'nil-compliance-for-schools',
      'what-is-hs-nil',
      'parental-consent-explained',
    ],
    stateRulesSlug: 'texas',
    body: [
      {
        heading: 'Why disclosure exists',
        paragraphs: [
          'State athletic associations require NIL deal disclosure because they need oversight — not because they\'re trying to approve or block deals individually. The disclosure builds a record: who signed, what was paid, for what category, whether any school IP was involved. That record lets the association respond to complaints, audit specific programs, and identify systemic issues (like booster-routed payments) before they become eligibility scandals.',
          'Think of it like the IRS: they don\'t approve your taxes before you file them. They just want them filed accurately so they can audit if needed.',
        ],
      },
      {
        heading: 'What a typical disclosure looks like',
        bulletList: [
          'Athlete name, school, and grade level.',
          'Brand or entity paying.',
          'Deal category (social media, appearance, licensing, etc.).',
          'Total compensation amount.',
          'Deal term (start date, end date).',
          'Confirmation that parental consent is on file (for minors).',
          'Confirmation that no school IP was used without permission.',
          'Confirmation that the deal does not fall into banned categories.',
        ],
      },
      {
        heading: 'Timing matters — every state has a window',
        paragraphs: [
          'Most permitting states require disclosure within a specific window after deal signing: 72 hours in many states, 7 days in others, 48 hours in the strictest (California CIF, for example). Miss the window and the athlete can lose eligibility even if the deal itself was compliant. The failure mode is bureaucratic, not substantive — but it\'s real.',
          'GradeUp\'s compliance engine knows every state\'s disclosure window and files automatically within the required timeframe. If a filing fails for technical reasons, an operator follows up within the window. You never have to track it.',
        ],
      },
      {
        heading: 'Who receives the disclosure',
        paragraphs: [
          'Varies by state. Some states want disclosure to the school administration (which then forwards to the state association). Some want direct disclosure to the state association. Some want both. GradeUp\'s disclosure pipeline routes to the correct recipient based on the state\'s rules — see the state-rules page for your state for the specifics.',
        ],
      },
      {
        heading: 'What happens after filing',
        paragraphs: [
          'In most cases: nothing visible. The disclosure sits in a record, ready to be audited if needed. The vast majority of NIL disclosures are never individually reviewed — the state association uses the aggregate data to identify patterns, not to approve each deal.',
          'When a deal does get reviewed, it\'s usually because of a specific complaint or a red flag in the disclosure (banned category, school-IP involvement, suspicious payment structure). A cleanly filed, compliant deal passes review in minutes. A sloppy or late filing is where problems start.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does my athlete need to file the disclosure themselves?',
        a: 'On GradeUp, no. The platform files it on behalf of the athlete and parent. Off-platform, the filing obligation typically falls on the athlete or parent — check your state\'s specific rules via the state-rules blog.',
      },
      {
        q: 'What if we signed a deal before joining GradeUp — do we need to disclose retroactively?',
        a: 'If the disclosure window has passed, the state association may still accept a late filing with an explanation. GradeUp\'s compliance team can help with retroactive filings during onboarding.',
      },
      {
        q: 'Are disclosures public?',
        a: 'Most state associations treat NIL disclosures as confidential records — they\'re available to the association and to member schools as needed, but not published publicly. Press requests are handled on a case-by-case basis per state rules.',
      },
    ],
  },

  // 18
  {
    slug: 'nil-for-underrepresented-athletes',
    title: 'NIL in non-revenue sports — what\'s possible',
    description:
      'How scholar-athletes in track, swim, volleyball, softball, tennis, golf, and cross-country build real NIL opportunities — beyond football and basketball.',
    heroEyebrow: 'Athlete playbook',
    category: 'strategy',
    audience: 'athletes',
    keywords: [
      'non revenue sport NIL',
      'NIL track and field',
      'NIL swim volleyball',
      'olympic sport NIL high school',
      'small sport NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'nil-for-scholar-athletes',
      'what-brands-want-in-athletes',
      'how-athletes-get-first-nil-deal',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The narrative is wrong',
        paragraphs: [
          'The headlines focus on football and basketball because those are the biggest numbers. The quiet truth: non-revenue sport athletes have some of the highest per-follower conversion rates in HS NIL, and several brand verticals specifically prefer them. Track & field, swim, volleyball, softball, tennis, golf, cross-country — these audiences are often smaller but denser, more engaged, and more local than the football-audience default.',
          'If you\'re in one of these sports, the right frame is not "I wish I played a bigger sport." It\'s "which brand verticals specifically want me?"',
        ],
      },
      {
        heading: 'Sport-by-sport brand fit',
        bulletList: [
          'Track & field: Running and athletic apparel brands, nutrition brands, local physical therapy, sports medicine clinics, healthy-eating QSRs.',
          'Swim: Wellness brands, health-tech (heart-rate monitors, fitness trackers), athletic nutrition, sun-protection products, local aquatic facilities.',
          'Volleyball: Athleisure brands, academic services (strong scholar-athlete overlap), local restaurants, youth tournament sponsorships.',
          'Softball: Apparel, fitness, local family-focused businesses, regional sporting-goods stores.',
          'Tennis: Country-club adjacent, racquet manufacturers, private coaching services, high-end athletic brands.',
          'Golf: Golf-specific apparel and equipment, country clubs, local courses, golf-adjacent lifestyle brands.',
          'Cross-country: Running gear, nutrition, local wellness brands, academic services (the scholar-athlete overlap is exceptionally strong here).',
        ],
      },
      {
        heading: 'Why engagement trumps reach in non-revenue sports',
        paragraphs: [
          'Non-revenue-sport audiences are selected. Someone following a high-school volleyball player probably plays volleyball themselves, has a daughter who plays, or coaches volleyball. The audience pre-filters for intent. A follower on a football-star\'s account might just be a casual fan. The business value per follower is meaningfully higher in the selected audience.',
          'Brands that specialize in these categories know this. They pay for depth, not reach. A 2,000-follower high-school swim account with a 3.8 GPA is sometimes priced higher than a 10,000-follower casual-content account because the conversion math is better.',
        ],
      },
      {
        heading: 'The scholar-athlete multiplier in non-revenue sports',
        paragraphs: [
          'The scholar-athlete signal (verified high GPA) multiplies harder in non-revenue sports because the overlap with academic-adjacent brands is so strong. A 3.9-GPA cross-country runner is the literal target persona for test-prep companies, tutoring services, private-school scholarship programs, and financial-literacy brands. A GPA that would command a 15% premium in football often commands 30–50% in these categories.',
        ],
        pullQuote:
          'Your sport isn\'t small. Your sport is targeted. Brands pay for targeting.',
      },
      {
        heading: 'Strategy for non-revenue sport athletes',
        bulletList: [
          'Lead with the scholar-athlete positioning — your GPA is your headline, not a footnote.',
          'Target vertical-matched brands (wellness, nutrition, academic services) rather than mass-market.',
          'Emphasize engagement and conversion data in outreach, not follower count.',
          'Collaborate with teammates on content — team highlight reels outperform individual for many Olympic-track sports.',
          'Use your college-recruiting timeline strategically: early commits often see NIL interest accelerate post-commitment.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What\'s a realistic first-deal size in a non-revenue sport?',
        a: 'Similar to the general HS NIL range ($100–$1,000 for a first deal), but with tighter distribution — non-revenue athletes tend to cluster in the $150–$500 band with the scholar-athlete premium pushing up from there.',
      },
      {
        q: 'Do colleges with strong non-revenue programs care about HS NIL?',
        a: 'Increasingly yes. Olympic-sport college programs are building NIL infrastructure to compete with football/basketball programs for athlete retention. A strong HS NIL record helps.',
      },
      {
        q: 'Which non-revenue sport has the highest NIL ceiling at the HS level?',
        a: 'Volleyball has surged in 2025–2026 as brand spending has caught up with the sport\'s cultural rise. Track & field remains strong for runners specifically. Swim and softball have loyal, high-converting brand categories but smaller ceilings.',
      },
    ],
  },

  // 19
  {
    slug: 'how-to-value-a-local-nil-deal',
    title: 'How a local business should price their first HS athlete deal',
    description:
      'A practical pricing framework for local brands considering their first high-school NIL campaign — what to pay, what to expect, and how to measure success.',
    heroEyebrow: 'Brand playbook',
    category: 'brands',
    audience: 'brands',
    keywords: [
      'price HS NIL deal',
      'value NIL campaign',
      'first NIL deal price',
      'local NIL pricing',
      'how much to pay athlete NIL',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'how-brands-run-nil-campaigns',
      'brand-vertical-fit-hs-nil',
      'nil-deal-compensation-ranges',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'The three-input pricing formula',
        paragraphs: [
          'There\'s no magic number, but there is a repeatable formula that local businesses use to land their first HS NIL deal at a price that works for both sides. The three inputs: audience reach (how many people will see the content), audience quality (how closely the audience matches your target customer), and deliverable count (how many pieces of content and appearances).',
          'A practical starting point: the "$1 per engaged follower per deliverable" rule for local deals. A 500-follower scholar-athlete with a 10% engagement rate (50 engaged followers) running a one-post campaign prices around $50. That\'s the floor. Multipliers stack from there.',
        ],
      },
      {
        heading: 'Multipliers to apply',
        bulletList: [
          'GPA premium (3.5+ GPA): 1.15x–1.30x.',
          'Multi-post package (3+ pieces of content): 1.3x–1.6x per additional piece.',
          'In-person appearance included: add $100–$500 per appearance depending on duration.',
          'Exclusive category (brand\'s competitors excluded): 1.2x–1.5x.',
          'Strong engagement history (6%+ engagement rate): 1.2x.',
          'Strong past-deliverable history (3+ completed deals): 1.1x.',
        ],
      },
      {
        heading: 'What you actually get at each price tier',
        paragraphs: [
          '$50–$200: One post, small-scale scholar-athlete, local reach. Best used as a "test the waters" deal to verify the athlete\'s audience converts for your category.',
          '$200–$600: One-to-three posts with a specific call-to-action, mid-scale local athlete. Measurable conversion lift, especially with a UTM or coupon code.',
          '$600–$1,500: Multi-piece campaign, mid-scale athlete, occasionally includes an appearance. The standard "first serious campaign" price band.',
          '$1,500–$5,000: Multi-athlete, multi-piece, multi-week campaigns. This is where real brand-performance measurement becomes reliable.',
          '$5,000+: High-follower scholar-athletes or multi-athlete campaigns with substantial creative production. Typically reserved for campaigns with clear KPIs and measurement infrastructure.',
        ],
      },
      {
        heading: 'How to measure whether you overpaid',
        bulletList: [
          'Track UTM click-through from the athlete\'s posts. Benchmark: 1–3% click rate on Instagram Reels in engaged audiences.',
          'Track unique coupon redemptions per athlete (assign each athlete a unique code).',
          'Track brand-account follower growth during and 14 days after the campaign.',
          'Track foot traffic (if you have a physical location) using dated exit surveys.',
          'Calculate cost per new customer acquired. The floor of acceptable: 2x the customer lifetime value you\'d pay to a traditional ad platform.',
        ],
      },
      {
        heading: 'When to pay more than the formula says',
        paragraphs: [
          'Two scenarios. One: the athlete\'s specific audience is extraordinarily dense with your target demo (e.g., a swim athlete whose audience is overwhelmingly female 13–17 with parents, and you sell swim gear). Pay the premium; the ROI backs it up. Two: the athlete is a "connector" — other athletes follow them, and signing them opens referrals to other potential partnerships. That signal is worth paying for on its own.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What\'s the minimum deal size that makes sense?',
        a: 'For a GradeUp-facilitated deal, $100 is a reasonable floor. Below that, the administrative overhead (tax paperwork, compliance, coordination) often isn\'t worth either party\'s time. Many local businesses start with a $250 first deal as a structural commitment.',
      },
      {
        q: 'Should I pay more for athletes with college commitments?',
        a: 'A verbal or signed college commitment doesn\'t directly affect HS NIL value, but it often correlates with higher-quality audience. Evaluate the audience data, not the commitment itself.',
      },
      {
        q: 'Is there a penalty for changing the scope mid-campaign?',
        a: 'If you\'re expanding scope, expect to pay a proportional increase. If you\'re contracting, most platforms (GradeUp included) handle it as a partial-payment situation. Changing scope mid-campaign is legal; doing it without a written amendment is where disputes come from.',
      },
    ],
  },

  // 20
  {
    slug: 'house-settlement-effects-on-hs',
    title: 'What the House settlement means for HS NIL (or doesn\'t)',
    description:
      'The 2024 House settlement reshaped college NIL — but how much of it actually flows down to high-school NIL?',
    heroEyebrow: 'NIL basics',
    category: 'strategy',
    audience: 'general',
    keywords: [
      'House settlement high school NIL',
      'House v NCAA HS NIL',
      'NIL settlement impact',
      'college NIL settlement',
      'revenue sharing high school',
    ],
    published: true,
    publishedAt: PUBLISHED,
    updatedAt: UPDATED,
    related: [
      'what-is-hs-nil',
      'hs-to-college-nil-pipeline',
      'nil-vs-amateur-status',
    ],
    stateRulesSlug: 'california',
    body: [
      {
        heading: 'Quick recap of what the House settlement actually did',
        paragraphs: [
          'House v. NCAA, settled in 2024 and operationalized through 2025–2026, reshaped college NIL in three big ways: it established a revenue-sharing framework between universities and their student-athletes (the "rev share" cap), it awarded retroactive damages to athletes whose NIL rights were withheld before 2021, and it set up a clearinghouse (NIL Go) that reviews deals to determine if they are "legitimate" NIL or disguised pay-for-play.',
          'The settlement is fundamentally a college-level change. It reframed how big-revenue college athletic programs can compensate their athletes directly — something that was impossible in the pre-2021 amateur framework.',
        ],
      },
      {
        heading: 'What it changes for HS NIL',
        paragraphs: [
          'Directly: almost nothing. HS NIL is governed by state athletic associations, not the NCAA. The House settlement does not apply to high-school athletes. State AA rules still set the framework; state statutes still set the floor; parental consent, disclosure windows, and banned categories operate as they did before the settlement.',
          'Indirectly: a few things worth watching. First, the revenue-sharing framework at the college level changes the economics of NIL collectives, which has downstream effects on how collectives approach HS recruits. Second, the NIL Go clearinghouse is setting de facto standards for what counts as "legitimate NIL" that state AAs may adopt as they refine their HS rules.',
        ],
      },
      {
        heading: 'The indirect effects worth tracking',
        bulletList: [
          'NIL collective behavior: collectives may shift strategy toward earlier HS recruit relationships as college-level rev sharing is capped.',
          'State-AA guidance: several state associations have publicly referenced NIL Go\'s "legitimate NIL" framework as a model for HS oversight.',
          'Compliance vendor consolidation: the college-level clearinghouse model is prompting similar platforms at the HS level.',
          'Brand-spend flow: brands are increasingly willing to invest in HS NIL as the compliance infrastructure matures — partly catalyzed by the settlement\'s effect on college spending efficiency.',
        ],
      },
      {
        heading: 'What parents and athletes should actually do differently',
        paragraphs: [
          'Almost nothing, at the day-to-day level. The post-settlement HS landscape is not fundamentally different from the pre-settlement one: compliance matters, state rules govern, parental consent is the checkpoint, disclosures are mandatory.',
          'One real shift: the documentation bar is rising. Clearinghouse-style review at the college level is normalizing the expectation that every NIL deal has a paper trail. Athletes whose HS NIL history includes clean, well-documented deals are better positioned in college NIL conversations, not because the settlement requires it, but because college staff now expect that level of rigor.',
        ],
      },
      {
        heading: 'What it means for brands',
        paragraphs: [
          'More than it means for families. The settlement\'s rev-sharing framework puts pressure on college programs\' budgets, which often flows back to HS-level brand partnerships as programs look for commercial partners earlier in the athlete lifecycle. Brands who establish HS NIL relationships now are often the first call when an athlete commits to college. That wasn\'t the case three years ago.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does the House settlement mean HS athletes will get paid by their school?',
        a: 'No. The revenue-sharing framework in the settlement applies to college athletes at NCAA member institutions. High schools remain outside the settlement\'s scope, and high-school athletic scholarships work differently from college ones.',
      },
      {
        q: 'Does NIL Go review HS deals?',
        a: 'NIL Go is a college-level clearinghouse. It does not review HS deals as of April 2026. Some state AAs are exploring similar review frameworks; GradeUp\'s compliance engine already performs the equivalent review automatically.',
      },
      {
        q: 'Should my athlete wait for clearer rules before signing HS deals?',
        a: 'No. Waiting is the wrong instinct. The current HS rule framework is clear in the states that permit NIL, and waiting means missing the portfolio-building window that pays off in college. Sign compliantly, document everything, keep the track record clean.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Listing & lookup helpers
// ---------------------------------------------------------------------------

/** All published blog posts, sorted newest first. */
export function listPublishedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.published).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

/** Lookup by slug. */
export function getPostBySlug(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug && p.published) ?? null;
}

/** Return the 3 related posts listed on the post, falling back to same-audience if missing. */
export function getRelatedPosts(post: BlogPost): BlogPost[] {
  const out: BlogPost[] = [];
  for (const relatedSlug of post.related) {
    const related = getPostBySlug(relatedSlug);
    if (related && related.slug !== post.slug) {
      out.push(related);
    }
    if (out.length >= 3) break;
  }
  if (out.length < 3) {
    // Fallback: same-audience posts we haven't already included.
    const fallbackPool = listPublishedPosts().filter(
      (p) =>
        p.slug !== post.slug &&
        !out.find((o) => o.slug === p.slug) &&
        (p.audience === post.audience || p.category === post.category),
    );
    for (const p of fallbackPool) {
      out.push(p);
      if (out.length >= 3) break;
    }
  }
  return out.slice(0, 3);
}

/** Group published posts by audience for the index page. */
export function groupPostsByAudience(): Record<BlogAudience, BlogPost[]> {
  const groups: Record<BlogAudience, BlogPost[]> = {
    parents: [],
    athletes: [],
    brands: [],
    state_ads: [],
    coaches: [],
    general: [],
  };
  for (const p of listPublishedPosts()) {
    groups[p.audience].push(p);
  }
  return groups;
}

/** Audience render order for the index page. */
export const AUDIENCE_ORDER: BlogAudience[] = [
  'parents',
  'athletes',
  'brands',
  'coaches',
  'state_ads',
  'general',
];
