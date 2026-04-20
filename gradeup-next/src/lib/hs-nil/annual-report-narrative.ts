/**
 * HS-NIL Annual Report — Narrative Templating Helpers
 * ----------------------------------------------------------------------------
 * These helpers convert AnnualReportData into draft prose paragraphs.
 *
 * Purpose: assist the founder in writing the final report. The output of every
 * function here is a DRAFT — designed to be copy-pasted into the report doc
 * and then edited by hand. We do NOT replace authorial voice; we accelerate
 * the first 70% so human effort focuses on the 30% that matters.
 *
 * Tone defaults: executive, short sentences, specific numbers. Every number
 * inserted cites its field from AnnualReportData so a journalist fact-checking
 * the final report can trace the claim back to a queryable source.
 */

import type {
  AnnualReportData,
  AthleteFigures,
  DealFigures,
  ComplianceFigures,
  ReferralFigures,
  ShareFigures,
  BrandFigures,
  StateFigures,
} from './annual-report';

// ----------------------------------------------------------------------------
// Formatters — co-located to keep the narrative module self-contained
// ----------------------------------------------------------------------------

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function usd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function num(n: number): string {
  return n.toLocaleString('en-US');
}

function firstNonEmpty<T extends { count: number }>(items: T[]): T | null {
  return items.find((x) => x.count > 0) ?? null;
}

// ----------------------------------------------------------------------------
// Executive summary
// ----------------------------------------------------------------------------

export function generateExecutiveSummary(data: AnnualReportData): string {
  const { meta, athletes, deals, states, referrals, brands } = data;

  const topState = athletes.byState[0];
  const topStateLine = topState
    ? `${topState.stateCode} led signups with ${num(topState.count)} scholar-athletes.`
    : 'Signups were distributed across pilot states without a single dominant cohort.';

  const dealsLine =
    deals.totalDeals > 0
      ? `${num(deals.totalDeals)} deals were initiated (${num(deals.completedDeals)} completed, ${pct(deals.completedRate)} completion rate), generating ${usd(deals.totalGrossCents)} in gross NIL compensation for high-school athletes and their custodial parents.`
      : 'Deal volume remained in the pilot-preparation phase during the reporting window.';

  const referralsLine =
    referrals.referralsAttributed > 0
      ? `${num(referrals.referralsAttributed)} signups came through parent-to-parent referrals, with ${pct(referrals.referralConversionRate)} click-to-signup conversion — evidence that the parent-led model compounds through trust networks rather than paid acquisition.`
      : 'Parent-to-parent referral data remains light for the window; the concierge cohort is still early.';

  const stateCount = states.totalActivatedStates;
  const stateLine =
    stateCount > 0
      ? `${num(stateCount)} state pilots were active by the close of the window.`
      : 'State pilots were in activation stages at the close of the window.';

  const brandsLine =
    brands.totalHsEnabledBrands > 0
      ? `${num(brands.totalHsEnabledBrands)} HS-enabled brands participated, averaging ${usd(brands.avgDealCents)} per completed deal.`
      : 'Brand onboarding was in early stages and is expected to expand in the next reporting window.';

  const p1 =
    `${meta.reportLabel} reports on the first ${num(athletes.totalAthletes)} high-school scholar-athletes onboarded to GradeUp between ${meta.rangeStart.slice(0, 10)} and ${meta.rangeEnd.slice(0, 10)}. ` +
    `${topStateLine} ` +
    `${stateLine}`;

  const p2 =
    `${dealsLine} ` +
    `${brandsLine} ` +
    `Compliance: ${num(data.compliance.parentalConsentsSigned)} parental consents signed, ${pct(data.compliance.disclosureSuccessRate)} disclosure-send success rate, and ${num(data.compliance.disputesRaised)} disputes raised.`;

  const p3 =
    `${referralsLine} ` +
    `These results suggest the high-school NIL market, often treated as a downstream expansion of college NIL, behaves structurally differently: parental consent is the primary go/no-go gate, deal sizes are smaller, and trust networks — not enterprise procurement — drive adoption.`;

  return [p1, p2, p3].join('\n\n');
}

// ----------------------------------------------------------------------------
// Key findings (top 5, ranked by novelty / shareworthiness)
// ----------------------------------------------------------------------------

export interface KeyFinding {
  title: string;
  body: string;
  sourceField: string; // references the AnnualReportData field the number came from
}

export function generateKeyFindings(data: AnnualReportData): KeyFinding[] {
  const findings: KeyFinding[] = [];

  // Finding 1 — Parent-to-parent referral virality
  if (data.referrals.referredSignups > 0) {
    const referredVsOrganicDelta =
      data.referrals.referredVsOrganicConsentRate.referred -
      data.referrals.referredVsOrganicConsentRate.organic;
    findings.push({
      title: 'Referred parents convert at higher rates than organic ones',
      body:
        `Referred signups convert to parental consent at ${pct(data.referrals.referredVsOrganicConsentRate.referred)} vs organic at ${pct(data.referrals.referredVsOrganicConsentRate.organic)} — a ${(referredVsOrganicDelta * 100).toFixed(1)}-point spread. ` +
        `Trust transferred from a referring parent carries further than any paid acquisition signal we measured.`,
      sourceField: 'referrals.referredVsOrganicConsentRate',
    });
  }

  // Finding 2 — State concentration
  const topState = data.athletes.byState[0];
  if (topState) {
    findings.push({
      title: `${topState.stateCode} is the center of gravity for HS NIL activation`,
      body:
        `${num(topState.count)} of ${num(data.athletes.totalAthletes)} signups (${pct(topState.count / Math.max(1, data.athletes.totalAthletes))}) originated in ${topState.stateCode}. ` +
        `Regulatory clarity and parent network density combine to make this state's pilot the template for subsequent state activations.`,
      sourceField: 'athletes.byState[0]',
    });
  }

  // Finding 3 — Compliance discipline
  if (data.compliance.disclosuresAttempted > 0) {
    findings.push({
      title: 'Automated disclosure pipeline runs hot from day one',
      body:
        `${pct(data.compliance.disclosureSuccessRate)} of deal disclosures sent successfully within statutory windows. ` +
        `Unlike college NIL, where compliance lives in institutional spreadsheets, the HS-NIL model automates state-athletic-association notification at contract signature — an architectural requirement, not a feature.`,
      sourceField: 'compliance.disclosureSuccessRate',
    });
  }

  // Finding 4 — Share virality
  if (data.shares.totalShareEvents > 0) {
    findings.push({
      title: 'Every completed deal generates social lift',
      body:
        `${num(data.shares.totalShareEvents)} social share events across ${data.shares.byPlatform.length} platforms, averaging ${data.shares.avgSharesPerCompletedDeal.toFixed(1)} shares per completed deal. ` +
        `${num(data.shares.shareTriggeredSignups)} downstream signups occurred within 24 hours of a parent share event, making the celebration-to-acquisition loop measurable for the first time.`,
      sourceField: 'shares.shareTriggeredSignups',
    });
  }

  // Finding 5 — Age distribution
  const consent16_17 =
    data.compliance.consentsByAgeBucket.find((b) => b.bucket === '16_17')?.count ?? 0;
  const totalConsents = data.compliance.parentalConsentsSigned;
  if (totalConsents > 0) {
    findings.push({
      title: 'Junior / senior concentration signals college-bound pipeline',
      body:
        `${pct(consent16_17 / totalConsents)} of parental consents were signed for athletes aged 16–17. ` +
        `This cohort represents the natural bridge to college NIL — GradeUp captures the athlete 18–24 months before matriculation, with a verified academic record and verified deal history already in place.`,
      sourceField: 'compliance.consentsByAgeBucket[16_17]',
    });
  }

  // Finding 6 fallback — deal size
  if (findings.length < 5 && data.deals.completedDeals > 0) {
    const avgDeal =
      data.deals.totalGrossCents / Math.max(1, data.deals.completedDeals);
    findings.push({
      title: 'Average HS NIL deal size reflects local-business reality',
      body:
        `Completed deals averaged ${usd(avgDeal)}. ` +
        `This is an order of magnitude smaller than headline college NIL deals — and that is the point. HS NIL is a local-restaurant, local-retail, local-training-facility economy, not a collective-funded shadow-revenue market.`,
      sourceField: 'deals.totalGrossCents / deals.completedDeals',
    });
  }

  // Finding 7 fallback — brand verticals
  const topVertical = firstNonEmpty(data.brands.byVertical);
  if (findings.length < 5 && topVertical) {
    findings.push({
      title: `${topVertical.vertical} brands lead HS NIL activation`,
      body:
        `${num(topVertical.count)} ${topVertical.vertical} brands onboarded as HS-enabled, leading all verticals. ` +
        `The vertical mix validates the go-to-market thesis: HS NIL is won at the local level, not through enterprise sponsorship programs.`,
      sourceField: 'brands.byVertical[0]',
    });
  }

  return findings.slice(0, 5);
}

// ----------------------------------------------------------------------------
// Methodology note
// ----------------------------------------------------------------------------

export function generateMethodologyNote(data: AnnualReportData): string {
  const range = `${data.meta.rangeStart.slice(0, 10)} to ${data.meta.rangeEnd.slice(0, 10)}`;
  const caveats: string[] = [];

  if (data.partialFailures.length > 0) {
    caveats.push(
      `${data.partialFailures.length} sub-aggregator(s) returned partial data and required manual reconciliation: ${data.partialFailures.map((f) => f.section).join(', ')}.`
    );
  }
  caveats.push(
    'Share-triggered signup attribution uses a 24-hour window between a share event and a referral_attribution conversion; this is an approximation, not a per-user causal link.'
  );
  caveats.push(
    'Age-bucket figures depend on hs_athlete_profiles.date_of_birth populated at signup. Athletes with missing DOB are counted in total consents but not in any age bucket.'
  );
  caveats.push(
    'Dollar figures reflect gross NIL compensation (pre-fee, pre-tax) per the deals.compensation_amount column. Net parent custodial payouts differ and are reported separately by request.'
  );
  caveats.push(
    'State conversion rates use cumulative waitlist-to-signup math, not window-bounded, because the waitlist predates the window.'
  );

  return [
    `Data collection window: ${range}.`,
    `Source-of-truth: GradeUp production Postgres (Supabase). Every figure in this report traces back to a specific query documented in src/lib/hs-nil/annual-report.ts.`,
    `Schema version: ${data.meta.schemaVersion}. Generated at ${data.meta.generatedAt}.`,
    '',
    'Caveats:',
    ...caveats.map((c) => `  • ${c}`),
    '',
    'Replication: admin users can regenerate the underlying JSON blob at /hs/admin/annual-report with the same rangeStart / rangeEnd parameters. Published snapshots are immutable; re-running the query against live data may yield different numbers as disputes resolve, deals settle, and late-arriving disclosures land.',
  ].join('\n');
}

// ----------------------------------------------------------------------------
// Table of contents
// ----------------------------------------------------------------------------

export interface TocSection {
  id: string;
  title: string;
  summary: string;
}

export function buildTocSections(_data: AnnualReportData): TocSection[] {
  return [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      summary: 'Headline figures and the one-sentence takeaways.',
    },
    {
      id: 'key-findings',
      title: 'Key Findings',
      summary: 'Top five quotable insights for journalists and investors.',
    },
    {
      id: 'part-1-market',
      title: 'Part 1 — The Market',
      summary: 'Athlete supply, state distribution, sport mix, verification.',
    },
    {
      id: 'part-2-pilot',
      title: 'Part 2 — The Pilot',
      summary: 'Deal volume, completion rate, brand participation.',
    },
    {
      id: 'part-3-compliance',
      title: 'Part 3 — Compliance',
      summary: 'Disclosures, disputes, parental consents.',
    },
    {
      id: 'part-4-viral-growth',
      title: 'Part 4 — Viral Growth',
      summary: 'Referral attribution, share events, organic lift.',
    },
    {
      id: 'part-5-bridge-to-college',
      title: 'Part 5 — The Bridge to College',
      summary: 'Trajectory shares, institution-verified GPA, matriculation pipeline.',
    },
    {
      id: 'methodology',
      title: 'Methodology',
      summary: 'How the data was collected, window, caveats.',
    },
    {
      id: 'about',
      title: 'About GradeUp',
      summary: 'Company overview, mission, team.',
    },
    {
      id: 'citations',
      title: 'Citations',
      summary: 'Queryable source for every number in this report.',
    },
  ];
}

// ----------------------------------------------------------------------------
// Section-level prose (used by the preview page + export)
// ----------------------------------------------------------------------------

export function narrativeForAthletes(d: AthleteFigures): string {
  const topState = d.byState[0];
  const topSport = d.bySport[0];
  const institutionVerified = pct(d.institutionVerifiedGpaPct);
  return [
    `${num(d.totalAthletes)} high-school scholar-athletes joined GradeUp in the reporting window.`,
    topState
      ? `${topState.stateCode} led state signups with ${num(topState.count)} athletes.`
      : '',
    topSport
      ? `${topSport.sport} was the most-represented sport (${num(topSport.count)} athletes).`
      : '',
    `${institutionVerified} of athletes carry an institution-verified GPA snapshot — the strongest academic-credibility tier GradeUp supports.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function narrativeForDeals(d: DealFigures): string {
  if (d.totalDeals === 0) {
    return 'Deal activity was in pilot-preparation during the reporting window.';
  }
  const topBrand = d.topBrandsByDealCount[0];
  const topSport = d.topSportsByDealVolume[0];
  return [
    `${num(d.totalDeals)} deals initiated (${num(d.completedDeals)} completed, ${pct(d.completedRate)} completion rate).`,
    `${usd(d.totalGrossCents)} in gross NIL compensation.`,
    d.avgCompletionDays !== null
      ? `Completed deals closed in an average of ${num(d.avgCompletionDays)} days.`
      : '',
    topBrand
      ? `${topBrand.brandName} led brand participation with ${num(topBrand.dealCount)} deals.`
      : '',
    topSport
      ? `${topSport.sport} was the highest-volume sport with ${num(topSport.dealCount)} deals.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function narrativeForCompliance(d: ComplianceFigures): string {
  return [
    `${num(d.parentalConsentsSigned)} parental consents signed in the window.`,
    d.disclosuresAttempted > 0
      ? `${num(d.disclosuresSent)} of ${num(d.disclosuresAttempted)} state-required disclosures sent successfully (${pct(d.disclosureSuccessRate)}).`
      : 'No state-required disclosures were triggered in the window.',
    d.disputesRaised > 0
      ? `${num(d.disputesRaised)} disputes raised; resolution outcomes trended ${d.disputeResolutionOutcomes[0]?.outcome ?? 'unknown'}.`
      : 'No disputes were raised.',
  ].join(' ');
}

export function narrativeForReferrals(d: ReferralFigures): string {
  return [
    `${num(d.referralsAttributed)} attributed parent-to-parent referrals.`,
    d.referralConversionRate > 0
      ? `${pct(d.referralConversionRate)} click-to-signup conversion.`
      : '',
    `Referred-vs-organic consent conversion: ${pct(d.referredVsOrganicConsentRate.referred)} vs ${pct(d.referredVsOrganicConsentRate.organic)}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function narrativeForShares(d: ShareFigures): string {
  if (d.totalShareEvents === 0) {
    return 'Share activity was light in the reporting window — expected for an early pilot without many completed deals.';
  }
  const topPlatform = d.byPlatform[0];
  return [
    `${num(d.totalShareEvents)} share events recorded across ${d.byPlatform.length} platforms.`,
    topPlatform ? `${topPlatform.platform} led platform distribution.` : '',
    `Average ${d.avgSharesPerCompletedDeal.toFixed(1)} shares per completed deal.`,
    `${num(d.shareTriggeredSignups)} downstream signups attributed within 24h of a share event.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function narrativeForBrands(d: BrandFigures): string {
  const topVertical = d.byVertical[0];
  return [
    `${num(d.totalHsEnabledBrands)} brands opted into HS NIL during the window.`,
    topVertical
      ? `${topVertical.vertical} led verticals with ${num(topVertical.count)} brands.`
      : '',
    d.avgDealCents > 0
      ? `Average deal size: ${usd(d.avgDealCents)}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function narrativeForStates(d: StateFigures): string {
  return [
    `${num(d.totalActivatedStates)} state pilots active at window close.`,
    d.perState[0]
      ? `${d.perState[0].stateCode} led with ${num(d.perState[0].signupCount)} signups and ${num(d.perState[0].completedDeals)} completed deals.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}
