// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL — PRICING ENGINE
// GPA-weighted dynamic pricing and platform fee calculations.
// The core differentiator: Higher GPA = Higher NIL Value.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Platform Fee Configuration ────────────────────────────────────────────

/** Platform fee percentage (12% of deal value, paid by brand) */
export const PLATFORM_FEE_PERCENT = 0.12;

/** Minimum platform fee in cents */
export const PLATFORM_FEE_MIN_CENTS = 500; // $5.00

/** Stripe processing fee (2.9% + $0.30) */
export const STRIPE_FEE_PERCENT = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;

// ─── Fee Calculation ───────────────────────────────────────────────────────

export interface FeeBreakdown {
  /** Original deal amount in cents */
  dealAmount: number;
  /** Platform fee in cents (12%) */
  platformFee: number;
  /** Stripe processing fee in cents */
  stripeFee: number;
  /** Total brand pays (deal + platform fee) */
  brandTotal: number;
  /** Athlete receives (deal amount - stripe fee) */
  athletePayout: number;
  /** Platform revenue (platform fee - stripe fee on that portion) */
  platformRevenue: number;
  /** Fee percentage displayed to user */
  feePercent: number;
}

/**
 * Calculate fee breakdown for a deal
 * Brand pays: deal amount + 12% platform fee
 * Athlete receives: full deal amount (fee is on top, not subtracted)
 * GradeUp keeps: 12% platform fee
 */
export function calculateFees(dealAmountCents: number): FeeBreakdown {
  const platformFee = Math.max(
    Math.round(dealAmountCents * PLATFORM_FEE_PERCENT),
    PLATFORM_FEE_MIN_CENTS
  );

  const brandTotal = dealAmountCents + platformFee;
  const stripeFee = Math.round(brandTotal * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED_CENTS;
  const athletePayout = dealAmountCents;
  const platformRevenue = platformFee - Math.round(platformFee * STRIPE_FEE_PERCENT);

  return {
    dealAmount: dealAmountCents,
    platformFee,
    stripeFee,
    brandTotal,
    athletePayout,
    platformRevenue,
    feePercent: PLATFORM_FEE_PERCENT * 100,
  };
}

/**
 * Format cents to display dollars
 */
export function formatCentsToDisplay(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── GPA-Weighted NIL Valuation ────────────────────────────────────────────

export interface NILValuationInput {
  gpa: number;
  sport: string;
  totalFollowers: number;
  engagementRate?: number;
  division?: string;
  isVerified?: boolean;
  dealsCompleted?: number;
  avgDealRating?: number;
}

export interface NILValuation {
  /** Estimated NIL value in dollars */
  estimatedValue: number;
  /** GradeUp Score (0-100) */
  gradeUpScore: number;
  /** Component scores */
  components: {
    academic: number;    // 0-30 points (GPA weight)
    social: number;      // 0-25 points (followers + engagement)
    athletic: number;    // 0-25 points (sport + division)
    reputation: number;  // 0-20 points (deals completed + rating)
  };
  /** Suggested deal range */
  dealRange: {
    min: number;
    max: number;
  };
  /** Tier classification */
  tier: 'emerging' | 'rising' | 'established' | 'elite' | 'premium';
}

// Sport multipliers — higher-revenue sports command higher NIL values
const SPORT_MULTIPLIERS: Record<string, number> = {
  'football': 1.5,
  'basketball': 1.4,
  'baseball': 1.1,
  'soccer': 1.0,
  'volleyball': 0.95,
  'softball': 0.9,
  'gymnastics': 1.1,
  'swimming': 0.85,
  'track and field': 0.85,
  'tennis': 0.9,
  'golf': 1.0,
  'lacrosse': 0.9,
  'wrestling': 0.85,
  'hockey': 1.1,
};

// Division multipliers
const DIVISION_MULTIPLIERS: Record<string, number> = {
  'Division I': 1.5,
  'Division II': 1.0,
  'Division III': 0.7,
  'NAIA': 0.6,
  'JUCO': 0.5,
};

/**
 * Calculate GPA-weighted NIL valuation
 *
 * This is GradeUp's core differentiator: GPA directly affects valuation.
 * A 4.0 GPA athlete with 10K followers is worth more than a 2.5 GPA
 * athlete with 50K followers on our platform.
 */
export function calculateNILValuation(input: NILValuationInput): NILValuation {
  const {
    gpa,
    sport,
    totalFollowers,
    engagementRate = 3.0,
    division = 'Division I',
    isVerified = false,
    dealsCompleted = 0,
    avgDealRating = 0,
  } = input;

  // ── Academic Score (0-30 points) — THE DIFFERENTIATOR ──
  // GPA has the HIGHEST weight in our scoring model
  // 4.0 GPA = 30 points, 3.5 = 25, 3.0 = 18, 2.5 = 10, 2.0 = 5
  let academicScore: number;
  if (gpa >= 3.8) academicScore = 28 + (gpa - 3.8) * 10; // 28-30
  else if (gpa >= 3.5) academicScore = 22 + (gpa - 3.5) * 20; // 22-28
  else if (gpa >= 3.0) academicScore = 15 + (gpa - 3.0) * 14; // 15-22
  else if (gpa >= 2.5) academicScore = 8 + (gpa - 2.5) * 14; // 8-15
  else academicScore = Math.max(0, gpa * 3.2); // 0-8
  academicScore = Math.min(30, Math.round(academicScore));

  // Dean's List bonus
  if (gpa >= 3.5) academicScore = Math.min(30, academicScore + 2);

  // ── Social Score (0-25 points) ──
  // Followers matter, but engagement matters more
  const followerScore = Math.min(15, Math.log10(Math.max(1, totalFollowers)) * 3);
  const engagementScore = Math.min(10, engagementRate * 2);
  const socialScore = Math.round(followerScore + engagementScore);

  // ── Athletic Score (0-25 points) ──
  const sportMult = SPORT_MULTIPLIERS[sport.toLowerCase()] || 0.85;
  const divisionMult = DIVISION_MULTIPLIERS[division] || 1.0;
  const baseAthletic = 15 * sportMult * divisionMult;
  const verifiedBonus = isVerified ? 5 : 0;
  const athleticScore = Math.min(25, Math.round(baseAthletic + verifiedBonus));

  // ── Reputation Score (0-20 points) ──
  const dealScore = Math.min(10, dealsCompleted * 2);
  const ratingScore = Math.min(10, avgDealRating * 2);
  const reputationScore = Math.round(dealScore + ratingScore);

  // ── Total GradeUp Score (0-100) ──
  const gradeUpScore = Math.min(100, academicScore + socialScore + athleticScore + reputationScore);

  // ── Estimated Value Calculation ──
  // Base value derived from followers and score
  const baseValue = totalFollowers * 0.05; // $0.05 per follower base
  const gpaMultiplier = 1 + (gpa - 2.0) * 0.5; // 1.0x at 2.0 GPA, 2.0x at 4.0 GPA
  const scoreMultiplier = 1 + (gradeUpScore / 100) * 1.5; // 1.0x at score 0, 2.5x at score 100

  const estimatedValue = Math.round(baseValue * gpaMultiplier * scoreMultiplier * sportMult);

  // ── Deal Range ──
  const min = Math.round(estimatedValue * 0.6);
  const max = Math.round(estimatedValue * 1.4);

  // ── Tier Classification ──
  let tier: NILValuation['tier'];
  if (gradeUpScore >= 90) tier = 'premium';
  else if (gradeUpScore >= 75) tier = 'elite';
  else if (gradeUpScore >= 60) tier = 'established';
  else if (gradeUpScore >= 40) tier = 'rising';
  else tier = 'emerging';

  return {
    estimatedValue,
    gradeUpScore,
    components: {
      academic: academicScore,
      social: socialScore,
      athletic: athleticScore,
      reputation: reputationScore,
    },
    dealRange: { min, max },
    tier,
  };
}

/**
 * Get tier display info
 */
export function getTierDisplay(tier: NILValuation['tier']): {
  label: string;
  color: string;
  description: string;
} {
  const tiers = {
    emerging: {
      label: 'Emerging',
      color: 'text-[var(--text-muted)]',
      description: 'Building your profile — keep that GPA up!',
    },
    rising: {
      label: 'Rising Star',
      color: 'text-[var(--marketing-lime)]',
      description: 'Growing presence — brands are starting to notice.',
    },
    established: {
      label: 'Established',
      color: 'text-[var(--marketing-cyan)]',
      description: 'Strong profile — attracting quality partnerships.',
    },
    elite: {
      label: 'Elite',
      color: 'text-[var(--marketing-gold)]',
      description: 'Top-tier scholar-athlete — premium deals available.',
    },
    premium: {
      label: 'Premium',
      color: 'text-[var(--marketing-magenta)]',
      description: 'Highest caliber — commanding top market rates.',
    },
  };

  return tiers[tier];
}
