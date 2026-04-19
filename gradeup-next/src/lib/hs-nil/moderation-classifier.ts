/**
 * HS-NIL Deliverable Moderation — Classifier
 * ----------------------------------------------------------------------------
 * Interface-first so a real ML backend can swap in. The default implementation
 * covers three modalities:
 *
 *   1. Text  — regex banned-term matching against state_nil_rules.banned_categories
 *              + a GradeUp-curated school-IP keyword list. Real.
 *   2. Image — STUB. Returns confidence = 0.5 and category "needs_human_review"
 *              so images default to the ops queue rather than auto-approve.
 *              TODO: plug in OpenAI Vision / Google Vision / AWS Rekognition.
 *   3. URL   — best-effort fetch of Open Graph metadata (NOT a page scrape);
 *              classify the OG title/description through the text pass. If
 *              the fetch fails we fall through to needs_human_review.
 *
 * NOTE: Keyword lists here are deliberately a starter set. TODO markers flag
 * each list so non-engineers can extend without code archaeology. The lists
 * will migrate into the state_nil_rules admin surface once legal/ops sign off.
 */

import type { BannedCategory, USPSStateCode } from './state-rules';
import { STATE_RULES } from './state-rules';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ClassifierInput {
  text: string | null;
  contentUrl: string | null;
  storagePath: string | null;
  submissionType:
    | 'social_post_url'
    | 'image_proof'
    | 'text_note'
    | 'external_link'
    | 'receipt';
  /**
   * Optional state — lets the classifier consult per-state banned categories.
   * If absent we fall through to the universal banned list.
   */
  stateCode?: USPSStateCode | null;
}

export interface ClassifierResult {
  /** Confidence in range [0, 1] that the content is CLEAN. */
  confidence: number;
  /** Free-form category labels (banned categories + extras like 'school_ip'). */
  categories: string[];
  /** Human-readable reasons so ops can scan without replaying the classifier. */
  reasons: string[];
  /**
   * When true the content defaults to human review regardless of confidence.
   * Used by the image stub so images never auto-approve from the stub path.
   */
  requiresHumanReview: boolean;
}

export interface Classifier {
  classify(input: ClassifierInput): Promise<ClassifierResult>;
}

// ---------------------------------------------------------------------------
// Keyword lists (starter set — TODO move to state_nil_rules)
// ---------------------------------------------------------------------------

// TODO(ops): extend this list from real submissions once the pilot collects
// enough data. 50-mascot starter pulled from the most common US-HS mascots.
const SCHOOL_MASCOTS: string[] = [
  'bears',
  'eagles',
  'wildcats',
  'tigers',
  'panthers',
  'lions',
  'warriors',
  'vikings',
  'hawks',
  'bulldogs',
  'cougars',
  'knights',
  'mustangs',
  'patriots',
  'raiders',
  'rams',
  'saints',
  'spartans',
  'titans',
  'trojans',
  'cardinals',
  'broncos',
  'chargers',
  'crusaders',
  'dragons',
  'falcons',
  'gators',
  'huskies',
  'jaguars',
  'pirates',
  'rebels',
  'seahawks',
  'sharks',
  'stallions',
  'stars',
  'thunder',
  'vipers',
  'wolves',
  'yellowjackets',
  'royals',
  'bobcats',
  'cavaliers',
  'chiefs',
  'colts',
  'devils',
  'giants',
  'hornets',
  'indians',
  'rangers',
  'ravens',
];

// University stems / common NCAA associations — forbidden on HS deliverables.
const UNIVERSITY_STEMS: string[] = [
  'alabama football',
  'duke basketball',
  'clemson football',
  'kentucky basketball',
  'michigan football',
  'ohio state football',
  'north carolina basketball',
  'lsu football',
  'usc football',
  'ucla basketball',
  'notre dame football',
];

// Generic uniform / game-IP terms.
const UNIFORM_TERMS: string[] = [
  'varsity jacket',
  'game jersey',
  'team jersey',
  'school uniform',
  'official uniform',
  'letterman jacket',
  'school logo',
  'team logo',
  'roster',
  'varsity squad',
];

// Per-category term lists. Case-insensitive whole-word match.
const CATEGORY_TERMS: Record<BannedCategory, string[]> = {
  gambling: ['bet', 'bets', 'betting', 'casino', 'odds', 'parlay', 'sportsbook', 'wager', 'blackjack', 'poker'],
  alcohol: ['wine', 'beer', 'vodka', 'whiskey', 'tequila', 'rum', 'gin', 'champagne', 'cocktail', 'liquor'],
  tobacco: ['cigarette', 'cigar', 'tobacco', 'nicotine'],
  cannabis: ['weed', 'marijuana', 'thc', 'cbd', 'cannabis', 'edibles'],
  vaping: ['vape', 'vaping', 'ecig', 'e-cig', 'juul'],
  adult: ['porn', 'onlyfans', 'escort', 'adult content', 'xxx'],
  weapons: ['gun', 'guns', 'rifle', 'pistol', 'handgun', 'weapon'],
  firearms: ['ar-15', 'ar15', 'glock', 'ammo', 'ammunition'],
};

// Sentinel category strings the classifier emits outside the BannedCategory
// enum (the DB column is text[] so these pass through unchanged).
export const CATEGORY_SCHOOL_IP = 'school_ip';
export const CATEGORY_SCHOOL_MASCOT = 'school_mascot';
export const CATEGORY_UNIVERSITY_IP = 'university_ip';
export const CATEGORY_UNIFORM_IP = 'uniform_ip';
export const CATEGORY_NEEDS_HUMAN_REVIEW = 'needs_human_review';

// ---------------------------------------------------------------------------
// Core text pass
// ---------------------------------------------------------------------------

interface TextMatch {
  term: string;
  category: string;
  reason: string;
}

function tokenize(text: string): string[] {
  // Cheap word split; we don't need a real tokenizer for keyword matching.
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function matchMultiword(text: string, phrase: string): boolean {
  // Multi-word phrases are matched case-insensitively as substrings on
  // word-boundary-aware text. Cheap enough at starter-list size.
  const needle = phrase.toLowerCase();
  const haystack = ' ' + text.toLowerCase().replace(/[^\w\s-]/g, ' ') + ' ';
  return haystack.includes(' ' + needle + ' ') || haystack.includes(needle);
}

function matchSingleword(tokens: Set<string>, term: string): boolean {
  return tokens.has(term.toLowerCase());
}

function runTextPass(text: string, stateCode?: USPSStateCode | null): TextMatch[] {
  const matches: TextMatch[] = [];
  if (!text || !text.trim()) return matches;

  const tokenSet = new Set(tokenize(text));

  // School mascot terms (whole-word, single token).
  for (const mascot of SCHOOL_MASCOTS) {
    if (matchSingleword(tokenSet, mascot)) {
      matches.push({
        term: mascot,
        category: CATEGORY_SCHOOL_MASCOT,
        reason: `Matched term "${mascot}" (possible school mascot)`,
      });
    }
  }

  // University stems (multi-word).
  for (const stem of UNIVERSITY_STEMS) {
    if (matchMultiword(text, stem)) {
      matches.push({
        term: stem,
        category: CATEGORY_UNIVERSITY_IP,
        reason: `Matched phrase "${stem}" (university IP)`,
      });
    }
  }

  // Uniform terms (multi-word).
  for (const term of UNIFORM_TERMS) {
    if (matchMultiword(text, term)) {
      matches.push({
        term,
        category: CATEGORY_UNIFORM_IP,
        reason: `Matched phrase "${term}" (uniform / team IP)`,
      });
    }
  }

  // Banned-category terms. Respect per-state list when provided.
  const rules = stateCode ? STATE_RULES[stateCode] : undefined;
  const activeCategories: BannedCategory[] = rules
    ? rules.bannedCategories
    : (Object.keys(CATEGORY_TERMS) as BannedCategory[]);

  for (const category of activeCategories) {
    const terms = CATEGORY_TERMS[category];
    if (!terms) continue;
    for (const term of terms) {
      const hit = term.includes(' ')
        ? matchMultiword(text, term)
        : matchSingleword(tokenSet, term);
      if (hit) {
        matches.push({
          term,
          category,
          reason: `Matched term "${term}" (${category})`,
        });
      }
    }
  }

  return matches;
}

function computeConfidence(text: string, matches: TextMatch[]): number {
  const words = tokenize(text).length;
  if (words === 0) return matches.length === 0 ? 0.95 : 0.5;

  // Base: 1 - (matches / words), then scale so a single hit drops us
  // well below the 0.85 auto-approve threshold. Any banned-category
  // hit floors at 0.5 so we never auto-approve a flagged submission.
  const raw = Math.max(0, 1 - (matches.length * 3) / Math.max(words, 10));
  const hasBanned = matches.some(
    (m) =>
      m.category !== CATEGORY_SCHOOL_MASCOT &&
      m.category !== CATEGORY_UNIVERSITY_IP &&
      m.category !== CATEGORY_UNIFORM_IP
  );
  const hasSchoolIp = matches.some(
    (m) =>
      m.category === CATEGORY_SCHOOL_MASCOT ||
      m.category === CATEGORY_UNIVERSITY_IP ||
      m.category === CATEGORY_UNIFORM_IP
  );
  if (hasBanned) return Math.min(raw, 0.5);
  if (hasSchoolIp) return Math.min(raw, 0.6);
  return Math.max(Math.min(raw, 1), 0);
}

// ---------------------------------------------------------------------------
// OG fetch (best-effort)
// ---------------------------------------------------------------------------

interface OgSummary {
  title: string | null;
  description: string | null;
}

async function fetchOgMetadata(url: string, timeoutMs = 3000): Promise<OgSummary | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'user-agent': 'GradeUp-HS-Moderation/1.0' },
      signal: controller.signal,
      // We only want OG tags. Cap the response we parse to keep this cheap.
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 64 * 1024);
    return {
      title: extractMeta(html, 'og:title') ?? extractTitle(html),
      description: extractMeta(html, 'og:description'),
    };
  } catch {
    return null;
  }
}

function extractMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Default classifier
// ---------------------------------------------------------------------------

export class DefaultClassifier implements Classifier {
  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    // 1. Image submissions — STUB. Returns 0.5 and defaults to human review.
    // TODO(ML): swap in OpenAI Vision / Google Vision / AWS Rekognition.
    if (input.submissionType === 'image_proof' && input.storagePath) {
      const textMatches = input.text ? runTextPass(input.text, input.stateCode) : [];
      const categories = [
        CATEGORY_NEEDS_HUMAN_REVIEW,
        ...new Set(textMatches.map((m) => m.category)),
      ];
      const reasons = [
        'Image content requires human review (automated vision not yet wired).',
        ...textMatches.map((m) => m.reason + ' in accompanying note'),
      ];
      return {
        confidence: 0.5,
        categories,
        reasons,
        requiresHumanReview: true,
      };
    }

    // 2. URL submissions — pull OG metadata best-effort and run text pass.
    const bits: string[] = [];
    if (input.text) bits.push(input.text);

    if (
      (input.submissionType === 'social_post_url' ||
        input.submissionType === 'external_link' ||
        input.submissionType === 'receipt') &&
      input.contentUrl
    ) {
      bits.push(input.contentUrl);
      const og = await fetchOgMetadata(input.contentUrl);
      if (og) {
        if (og.title) bits.push(og.title);
        if (og.description) bits.push(og.description);
      } else {
        // Fetch failed — default to human review so we don't green-light a
        // link we couldn't preview.
        const matches = runTextPass(bits.join('\n'), input.stateCode);
        const categories = [
          CATEGORY_NEEDS_HUMAN_REVIEW,
          ...new Set(matches.map((m) => m.category)),
        ];
        return {
          confidence: 0.5,
          categories,
          reasons: [
            'Could not preview link (OG metadata unavailable).',
            ...matches.map((m) => m.reason),
          ],
          requiresHumanReview: true,
        };
      }
    }

    // 3. Pure text pass (text_note, or URL whose OG we grabbed).
    const joined = bits.join('\n').trim();
    const matches = runTextPass(joined, input.stateCode);
    const confidence = computeConfidence(joined, matches);

    const categories = Array.from(new Set(matches.map((m) => m.category)));
    const reasons = matches.map((m) => m.reason);

    return {
      confidence,
      categories,
      reasons,
      requiresHumanReview: false,
    };
  }
}

// Singleton — can be swapped in tests / future ML wiring.
let _classifier: Classifier = new DefaultClassifier();

export function getClassifier(): Classifier {
  return _classifier;
}

export function setClassifier(c: Classifier): void {
  _classifier = c;
}
