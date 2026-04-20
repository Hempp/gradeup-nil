/**
 * state-blog-content.ts — Data layer for the /blog/state-nil-rules/* SEO pages.
 *
 * Pulls the hard rules from STATE_RULES (lib/hs-nil/state-rules.ts) and
 * augments with per-state static metadata that the rules engine doesn't
 * need at runtime but the blog pages do: governing body, approximate
 * HS-athlete population, top sports, neighboring states for cross-linking,
 * and an (optional) external announcement-archive URL.
 *
 * Population / athlete counts / top-sport lists are PUBLIC-DATA ESTIMATES
 * (NFHS, NCES, state AA annual reports, 2023–2024 data). They are intentionally
 * rough — we use them for flavor copy ("~800,000 HS athletes in California"),
 * not for legal claims. If a reader needs exact numbers, they should go to
 * the state athletic association directly (linked on each page).
 *
 * Maintenance model: updating a state's rule means editing state-rules.ts;
 * updating a state's copy-context (governing body name, top sports, etc.)
 * means editing STATE_METADATA below. Both are TS files, both tree-shake,
 * both revalidate automatically via ISR (revalidate = 86400 on the page).
 *
 * Slug rules (50 states + DC = 51 URLs):
 *   CA -> "california"
 *   NJ -> "new-jersey"
 *   DC -> "district-of-columbia"
 *   NH -> "new-hampshire"
 *   etc.
 */

import {
  STATE_RULES,
  type StateNILRules,
  type USPSStateCode,
  type PermissionStatus,
} from './state-rules';

// ---------------------------------------------------------------------------
// STATE_NAMES — canonical display names for the 50 states + DC.
// ---------------------------------------------------------------------------

export const STATE_NAMES: Record<USPSStateCode, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

export const ALL_STATE_CODES: USPSStateCode[] = Object.keys(
  STATE_NAMES,
) as USPSStateCode[];

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "CA" -> "california", "NJ" -> "new-jersey", "DC" -> "district-of-columbia". */
export function slugifyStateCode(stateCode: USPSStateCode): string {
  return toKebab(STATE_NAMES[stateCode]);
}

// Pre-compute reverse map once per module load — 51 entries.
const SLUG_TO_CODE: Record<string, USPSStateCode> = ALL_STATE_CODES.reduce(
  (acc, code) => {
    acc[slugifyStateCode(code)] = code;
    return acc;
  },
  {} as Record<string, USPSStateCode>,
);

/** "california" -> "CA". Returns null for unknown slugs. */
export function unslugifyToCode(slug: string): USPSStateCode | null {
  return SLUG_TO_CODE[slug.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// STATE_METADATA — per-state copy context.
// ---------------------------------------------------------------------------

export interface StateMetadata {
  /** Common name of the state athletic association (e.g. "CIF", "FHSAA"). */
  governingBody: string;
  /** Fuller title for the association (e.g. "California Interscholastic Federation"). */
  governingBodyFull: string;
  /**
   * Approximate HS athlete count. Source: NFHS annual participation survey
   * (2023–2024), public-data estimate — NOT authoritative.
   */
  approxAthleteCount: number;
  /** Most-participated HS sports in that state (public data, rough ordering). */
  topSports: string[];
  /** Neighboring states for cross-link sidebar (geography, not rule-similarity). */
  neighbors: USPSStateCode[];
  /**
   * Optional external URL for the state AA's public rules archive / announcements.
   * Leave null if we don't have a confident URL — the page renders a TODO.
   */
  announcementUrl: string | null;
}

/**
 * Per-state metadata. Values are PUBLIC-DATA ESTIMATES circa 2023–2024
 * (NFHS + state AA annual reports). Exact counts intentionally avoided
 * — pages display them as "~X" and cite the state AA as source of truth.
 *
 * TODO(blog-seo): announcementUrl values marked `null` still need the
 * real state-AA rules-archive URLs populated. We prefer null over a
 * guessed URL to avoid publishing broken outbound links.
 */
export const STATE_METADATA: Record<USPSStateCode, StateMetadata> = {
  AL: { governingBody: 'AHSAA', governingBodyFull: 'Alabama High School Athletic Association', approxAthleteCount: 110_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['MS', 'TN', 'GA', 'FL'], announcementUrl: 'https://www.ahsaa.com/' },
  AK: { governingBody: 'ASAA', governingBodyFull: 'Alaska School Activities Association', approxAthleteCount: 20_000, topSports: ['Basketball', 'Wrestling', 'Cross Country'], neighbors: [], announcementUrl: 'https://asaa.org/' },
  AZ: { governingBody: 'AIA', governingBodyFull: 'Arizona Interscholastic Association', approxAthleteCount: 120_000, topSports: ['Football', 'Basketball', 'Soccer'], neighbors: ['CA', 'NV', 'UT', 'NM'], announcementUrl: 'https://www.aiaonline.org/' },
  AR: { governingBody: 'AAA', governingBodyFull: 'Arkansas Activities Association', approxAthleteCount: 75_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['MO', 'TN', 'MS', 'LA', 'TX', 'OK'], announcementUrl: 'https://ahsaa.org/' },
  CA: { governingBody: 'CIF', governingBodyFull: 'California Interscholastic Federation', approxAthleteCount: 800_000, topSports: ['Football', 'Soccer', 'Basketball', 'Track & Field'], neighbors: ['OR', 'NV', 'AZ'], announcementUrl: 'https://www.cifstate.org/' },
  CO: { governingBody: 'CHSAA', governingBodyFull: 'Colorado High School Activities Association', approxAthleteCount: 125_000, topSports: ['Football', 'Basketball', 'Soccer'], neighbors: ['WY', 'NE', 'KS', 'OK', 'NM', 'UT'], announcementUrl: 'https://chsaanow.com/' },
  CT: { governingBody: 'CIAC', governingBodyFull: 'Connecticut Interscholastic Athletic Conference', approxAthleteCount: 90_000, topSports: ['Soccer', 'Basketball', 'Football'], neighbors: ['NY', 'MA', 'RI'], announcementUrl: 'https://www.casciac.org/ciac/' },
  DE: { governingBody: 'DIAA', governingBodyFull: 'Delaware Interscholastic Athletic Association', approxAthleteCount: 25_000, topSports: ['Football', 'Lacrosse', 'Basketball'], neighbors: ['MD', 'PA', 'NJ'], announcementUrl: 'https://education.delaware.gov/educators/health-wellness/diaa/' },
  DC: { governingBody: 'DCSAA', governingBodyFull: 'District of Columbia State Athletic Association', approxAthleteCount: 8_000, topSports: ['Basketball', 'Football', 'Track & Field'], neighbors: ['MD', 'VA'], announcementUrl: 'https://dcsaasports.org/' },
  FL: { governingBody: 'FHSAA', governingBodyFull: 'Florida High School Athletic Association', approxAthleteCount: 300_000, topSports: ['Football', 'Basketball', 'Soccer', 'Baseball'], neighbors: ['GA', 'AL'], announcementUrl: 'https://www.fhsaa.org/' },
  GA: { governingBody: 'GHSA', governingBodyFull: 'Georgia High School Association', approxAthleteCount: 200_000, topSports: ['Football', 'Basketball', 'Baseball', 'Soccer'], neighbors: ['FL', 'AL', 'TN', 'NC', 'SC'], announcementUrl: 'https://www.ghsa.net/' },
  HI: { governingBody: 'HHSAA', governingBodyFull: 'Hawaii High School Athletic Association', approxAthleteCount: 25_000, topSports: ['Football', 'Volleyball', 'Basketball'], neighbors: [], announcementUrl: 'https://sportshigh.com/' },
  ID: { governingBody: 'IHSAA', governingBodyFull: 'Idaho High School Activities Association', approxAthleteCount: 45_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['WA', 'OR', 'NV', 'UT', 'WY', 'MT'], announcementUrl: 'https://idhsaa.org/' },
  IL: { governingBody: 'IHSA', governingBodyFull: 'Illinois High School Association', approxAthleteCount: 330_000, topSports: ['Football', 'Basketball', 'Track & Field', 'Soccer'], neighbors: ['WI', 'IA', 'MO', 'KY', 'IN'], announcementUrl: 'https://www.ihsa.org/' },
  IN: { governingBody: 'IHSAA', governingBodyFull: 'Indiana High School Athletic Association', approxAthleteCount: 160_000, topSports: ['Basketball', 'Football', 'Baseball'], neighbors: ['IL', 'MI', 'OH', 'KY'], announcementUrl: 'https://www.ihsaa.org/' },
  IA: { governingBody: 'IHSAA/IGHSAU', governingBodyFull: 'Iowa High School Athletic Association (and Iowa Girls High School Athletic Union)', approxAthleteCount: 110_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['MN', 'WI', 'IL', 'MO', 'NE', 'SD'], announcementUrl: 'https://www.iahsaa.org/' },
  KS: { governingBody: 'KSHSAA', governingBodyFull: 'Kansas State High School Activities Association', approxAthleteCount: 90_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['NE', 'MO', 'OK', 'CO'], announcementUrl: 'https://www.kshsaa.org/' },
  KY: { governingBody: 'KHSAA', governingBodyFull: 'Kentucky High School Athletic Association', approxAthleteCount: 100_000, topSports: ['Basketball', 'Football', 'Baseball'], neighbors: ['IN', 'OH', 'WV', 'VA', 'TN', 'MO', 'IL'], announcementUrl: 'https://khsaa.org/' },
  LA: { governingBody: 'LHSAA', governingBodyFull: 'Louisiana High School Athletic Association', approxAthleteCount: 85_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['TX', 'AR', 'MS'], announcementUrl: 'https://www.lhsaa.org/' },
  ME: { governingBody: 'MPA', governingBodyFull: 'Maine Principals\' Association', approxAthleteCount: 35_000, topSports: ['Basketball', 'Soccer', 'Cross Country'], neighbors: ['NH'], announcementUrl: 'https://www.mpa.cc/' },
  MD: { governingBody: 'MPSSAA', governingBodyFull: 'Maryland Public Secondary Schools Athletic Association', approxAthleteCount: 110_000, topSports: ['Lacrosse', 'Football', 'Basketball'], neighbors: ['PA', 'DE', 'VA', 'WV', 'DC'], announcementUrl: 'https://www.mpssaa.org/' },
  MA: { governingBody: 'MIAA', governingBodyFull: 'Massachusetts Interscholastic Athletic Association', approxAthleteCount: 180_000, topSports: ['Soccer', 'Basketball', 'Hockey'], neighbors: ['NY', 'VT', 'NH', 'RI', 'CT'], announcementUrl: 'https://miaa.net/' },
  MI: { governingBody: 'MHSAA', governingBodyFull: 'Michigan High School Athletic Association', approxAthleteCount: 270_000, topSports: ['Football', 'Basketball', 'Hockey'], neighbors: ['WI', 'IN', 'OH'], announcementUrl: 'https://www.mhsaa.com/' },
  MN: { governingBody: 'MSHSL', governingBodyFull: 'Minnesota State High School League', approxAthleteCount: 230_000, topSports: ['Hockey', 'Basketball', 'Football'], neighbors: ['WI', 'IA', 'SD', 'ND'], announcementUrl: 'https://www.mshsl.org/' },
  MS: { governingBody: 'MHSAA', governingBodyFull: 'Mississippi High School Activities Association', approxAthleteCount: 55_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['LA', 'AR', 'TN', 'AL'], announcementUrl: 'https://www.misshsaa.com/' },
  MO: { governingBody: 'MSHSAA', governingBodyFull: 'Missouri State High School Activities Association', approxAthleteCount: 175_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['IA', 'IL', 'KY', 'TN', 'AR', 'OK', 'KS', 'NE'], announcementUrl: 'https://www.mshsaa.org/' },
  MT: { governingBody: 'MHSA', governingBodyFull: 'Montana High School Association', approxAthleteCount: 35_000, topSports: ['Football', 'Basketball', 'Wrestling'], neighbors: ['ID', 'WY', 'SD', 'ND'], announcementUrl: 'https://www.mhsa.org/' },
  NE: { governingBody: 'NSAA', governingBodyFull: 'Nebraska School Activities Association', approxAthleteCount: 65_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['SD', 'IA', 'MO', 'KS', 'CO', 'WY'], announcementUrl: 'https://nsaahome.org/' },
  NV: { governingBody: 'NIAA', governingBodyFull: 'Nevada Interscholastic Activities Association', approxAthleteCount: 45_000, topSports: ['Football', 'Basketball', 'Soccer'], neighbors: ['CA', 'OR', 'ID', 'UT', 'AZ'], announcementUrl: 'https://niaa.com/' },
  NH: { governingBody: 'NHIAA', governingBodyFull: 'New Hampshire Interscholastic Athletic Association', approxAthleteCount: 40_000, topSports: ['Soccer', 'Basketball', 'Lacrosse'], neighbors: ['VT', 'ME', 'MA'], announcementUrl: 'https://www.nhiaa.org/' },
  NJ: { governingBody: 'NJSIAA', governingBodyFull: 'New Jersey State Interscholastic Athletic Association', approxAthleteCount: 275_000, topSports: ['Soccer', 'Basketball', 'Football', 'Lacrosse'], neighbors: ['NY', 'PA', 'DE'], announcementUrl: 'https://www.njsiaa.org/' },
  NM: { governingBody: 'NMAA', governingBodyFull: 'New Mexico Activities Association', approxAthleteCount: 50_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['CO', 'OK', 'TX', 'AZ'], announcementUrl: 'https://www.nmact.org/' },
  NY: { governingBody: 'NYSPHSAA', governingBodyFull: 'New York State Public High School Athletic Association', approxAthleteCount: 375_000, topSports: ['Soccer', 'Basketball', 'Lacrosse', 'Football'], neighbors: ['PA', 'NJ', 'CT', 'MA', 'VT'], announcementUrl: 'https://www.nysphsaa.org/' },
  NC: { governingBody: 'NCHSAA', governingBodyFull: 'North Carolina High School Athletic Association', approxAthleteCount: 200_000, topSports: ['Basketball', 'Football', 'Soccer'], neighbors: ['VA', 'TN', 'GA', 'SC'], announcementUrl: 'https://www.nchsaa.org/' },
  ND: { governingBody: 'NDHSAA', governingBodyFull: 'North Dakota High School Activities Association', approxAthleteCount: 30_000, topSports: ['Basketball', 'Football', 'Wrestling'], neighbors: ['MN', 'SD', 'MT'], announcementUrl: 'https://www.ndhsaa.com/' },
  OH: { governingBody: 'OHSAA', governingBodyFull: 'Ohio High School Athletic Association', approxAthleteCount: 340_000, topSports: ['Football', 'Basketball', 'Track & Field'], neighbors: ['MI', 'IN', 'KY', 'WV', 'PA'], announcementUrl: 'https://www.ohsaa.org/' },
  OK: { governingBody: 'OSSAA', governingBodyFull: 'Oklahoma Secondary School Activities Association', approxAthleteCount: 110_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['KS', 'MO', 'AR', 'TX', 'NM', 'CO'], announcementUrl: 'https://www.ossaa.com/' },
  OR: { governingBody: 'OSAA', governingBodyFull: 'Oregon School Activities Association', approxAthleteCount: 100_000, topSports: ['Football', 'Soccer', 'Basketball'], neighbors: ['WA', 'ID', 'NV', 'CA'], announcementUrl: 'https://www.osaa.org/' },
  PA: { governingBody: 'PIAA', governingBodyFull: 'Pennsylvania Interscholastic Athletic Association', approxAthleteCount: 310_000, topSports: ['Football', 'Basketball', 'Wrestling', 'Soccer'], neighbors: ['NY', 'NJ', 'DE', 'MD', 'WV', 'OH'], announcementUrl: 'https://www.piaa.org/' },
  RI: { governingBody: 'RIIL', governingBodyFull: 'Rhode Island Interscholastic League', approxAthleteCount: 25_000, topSports: ['Soccer', 'Basketball', 'Hockey'], neighbors: ['CT', 'MA'], announcementUrl: 'https://www.riil.org/' },
  SC: { governingBody: 'SCHSL', governingBodyFull: 'South Carolina High School League', approxAthleteCount: 95_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['NC', 'GA'], announcementUrl: 'https://schsl.org/' },
  SD: { governingBody: 'SDHSAA', governingBodyFull: 'South Dakota High School Activities Association', approxAthleteCount: 30_000, topSports: ['Basketball', 'Football', 'Track & Field'], neighbors: ['ND', 'MN', 'IA', 'NE', 'WY', 'MT'], announcementUrl: 'https://www.sdhsaa.com/' },
  TN: { governingBody: 'TSSAA', governingBodyFull: 'Tennessee Secondary School Athletic Association', approxAthleteCount: 135_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['KY', 'VA', 'NC', 'GA', 'AL', 'MS', 'AR', 'MO'], announcementUrl: 'https://tssaa.org/' },
  TX: { governingBody: 'UIL', governingBodyFull: 'University Interscholastic League', approxAthleteCount: 825_000, topSports: ['Football', 'Basketball', 'Track & Field', 'Soccer'], neighbors: ['NM', 'OK', 'AR', 'LA'], announcementUrl: 'https://www.uiltexas.org/' },
  UT: { governingBody: 'UHSAA', governingBodyFull: 'Utah High School Activities Association', approxAthleteCount: 90_000, topSports: ['Football', 'Basketball', 'Soccer'], neighbors: ['ID', 'WY', 'CO', 'NM', 'AZ', 'NV'], announcementUrl: 'https://www.uhsaa.org/' },
  VT: { governingBody: 'VPA', governingBodyFull: 'Vermont Principals\' Association', approxAthleteCount: 20_000, topSports: ['Soccer', 'Basketball', 'Hockey'], neighbors: ['NY', 'MA', 'NH'], announcementUrl: 'https://www.vpaonline.org/' },
  VA: { governingBody: 'VHSL', governingBodyFull: 'Virginia High School League', approxAthleteCount: 175_000, topSports: ['Football', 'Basketball', 'Soccer'], neighbors: ['MD', 'DC', 'WV', 'KY', 'TN', 'NC'], announcementUrl: 'https://www.vhsl.org/' },
  WA: { governingBody: 'WIAA', governingBodyFull: 'Washington Interscholastic Activities Association', approxAthleteCount: 170_000, topSports: ['Football', 'Soccer', 'Basketball'], neighbors: ['OR', 'ID'], announcementUrl: 'https://www.wiaa.com/' },
  WV: { governingBody: 'WVSSAC', governingBodyFull: 'West Virginia Secondary School Activities Commission', approxAthleteCount: 45_000, topSports: ['Football', 'Basketball', 'Baseball'], neighbors: ['OH', 'PA', 'MD', 'VA', 'KY'], announcementUrl: 'https://www.wvssac.org/' },
  WI: { governingBody: 'WIAA', governingBodyFull: 'Wisconsin Interscholastic Athletic Association', approxAthleteCount: 170_000, topSports: ['Football', 'Basketball', 'Hockey'], neighbors: ['MN', 'IA', 'IL', 'MI'], announcementUrl: 'https://www.wiaawi.org/' },
  WY: { governingBody: 'WHSAA', governingBodyFull: 'Wyoming High School Activities Association', approxAthleteCount: 18_000, topSports: ['Football', 'Basketball', 'Wrestling'], neighbors: ['MT', 'SD', 'NE', 'CO', 'UT', 'ID'], announcementUrl: 'https://whsaa.org/' },
};

// ---------------------------------------------------------------------------
// Rule derivation — fill in a sane default for states not yet in STATE_RULES.
// ---------------------------------------------------------------------------

/**
 * Derive an effective PermissionStatus for a state the rules engine
 * doesn't explicitly encode yet. Defaults to 'transitioning' so the blog
 * page is honest: "we don't have confirmed rules — here's the state AA
 * link, and we'll update when they publish."
 */
function deriveRules(code: USPSStateCode): StateNILRules {
  const explicit = STATE_RULES[code];
  if (explicit) return explicit;

  return {
    state: code,
    status: 'transitioning',
    minimumAge: null,
    requiresParentalConsent: false,
    disclosureWindowHours: null,
    disclosureRecipient: null,
    bannedCategories: [],
    agentRegistrationRequired: false,
    paymentDeferredUntilAge18: false,
    notes: `${STATE_METADATA[code].governingBody} has not published a final HS-NIL policy in our rules engine yet — content may change.`,
    lastReviewed: '2026-04-18',
  };
}

// ---------------------------------------------------------------------------
// Page-shaped data
// ---------------------------------------------------------------------------

export interface StateBlogData {
  code: USPSStateCode;
  name: string;
  slug: string;
  status: PermissionStatus;
  rules: StateNILRules;
  meta: StateMetadata;
  /** Precomputed neighbor list with display names & statuses for the sidebar. */
  neighbors: Array<{
    code: USPSStateCode;
    name: string;
    slug: string;
    status: PermissionStatus;
  }>;
  /** Canonical URL path (no origin). */
  canonicalPath: string;
}

export function getStateBlogData(stateCode: USPSStateCode): StateBlogData {
  const rules = deriveRules(stateCode);
  const meta = STATE_METADATA[stateCode];
  const neighbors = meta.neighbors.map((n) => ({
    code: n,
    name: STATE_NAMES[n],
    slug: slugifyStateCode(n),
    status: deriveRules(n).status,
  }));
  const slug = slugifyStateCode(stateCode);

  return {
    code: stateCode,
    name: STATE_NAMES[stateCode],
    slug,
    status: rules.status,
    rules,
    meta,
    neighbors,
    canonicalPath: `/blog/state-nil-rules/${slug}`,
  };
}

// ---------------------------------------------------------------------------
// Index / listing
// ---------------------------------------------------------------------------

export interface StateBlogIndexEntry {
  code: USPSStateCode;
  name: string;
  slug: string;
  status: PermissionStatus;
  governingBody: string;
  lastReviewed: string;
  canonicalPath: string;
}

/**
 * All 51 state blog posts (50 + DC), suitable for the index page and
 * the sitemap generator. Sorted alphabetically by state name.
 */
export function listAllStateBlogPosts(): StateBlogIndexEntry[] {
  return ALL_STATE_CODES.map((code) => {
    const r = deriveRules(code);
    return {
      code,
      name: STATE_NAMES[code],
      slug: slugifyStateCode(code),
      status: r.status,
      governingBody: STATE_METADATA[code].governingBody,
      lastReviewed: r.lastReviewed,
      canonicalPath: `/blog/state-nil-rules/${slugifyStateCode(code)}`,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Group the index by permission status — used on the listing page. */
export function groupStateBlogPostsByStatus(): Record<
  PermissionStatus,
  StateBlogIndexEntry[]
> {
  const groups: Record<PermissionStatus, StateBlogIndexEntry[]> = {
    permitted: [],
    limited: [],
    transitioning: [],
    prohibited: [],
  };
  for (const entry of listAllStateBlogPosts()) {
    groups[entry.status].push(entry);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Display helpers used by the page components
// ---------------------------------------------------------------------------

export function permissionStatusLabel(status: PermissionStatus): string {
  switch (status) {
    case 'permitted':
      return 'NIL permitted';
    case 'limited':
      return 'Limited';
    case 'transitioning':
      return 'Transitioning';
    case 'prohibited':
      return 'Not yet permitted';
  }
}

export function permissionStatusDescription(status: PermissionStatus): string {
  switch (status) {
    case 'permitted':
      return 'High-school NIL is legal with consent + disclosure requirements.';
    case 'limited':
      return 'High-school NIL is permitted but with meaningful restrictions.';
    case 'transitioning':
      return 'Rules are in flux. Check the state athletic association for the latest.';
    case 'prohibited':
      return 'High-school NIL is not currently permitted in this state.';
  }
}

export function formatDisclosureWindow(hours: number | null): string {
  if (hours === null) return 'Not applicable';
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'} (${hours} hours)`;
  }
  return `${hours} hours`;
}

export function formatRecipient(
  recipient: StateNILRules['disclosureRecipient'],
): string {
  switch (recipient) {
    case 'state_athletic_association':
      return 'State athletic association';
    case 'school':
      return 'School administration';
    case 'both':
      return 'State athletic association AND school';
    case null:
    default:
      return 'Not applicable';
  }
}

/** Display-formatted list of banned categories. Empty list -> "Standard universal bans". */
export function formatBannedCategories(
  categories: StateNILRules['bannedCategories'],
): string[] {
  if (categories.length === 0) {
    return ['Standard universal bans (gambling, alcohol, tobacco, cannabis, adult, weapons)'];
  }
  return categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1));
}

/**
 * How many of a state's neighbors currently permit HS NIL.
 * Used on prohibited-state pages: "3 neighboring states allow HS NIL."
 */
export function countPermittedNeighbors(stateCode: USPSStateCode): number {
  const meta = STATE_METADATA[stateCode];
  return meta.neighbors.filter((n) => deriveRules(n).status === 'permitted')
    .length;
}
