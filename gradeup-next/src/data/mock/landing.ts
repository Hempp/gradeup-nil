/**
 * Mock data for landing page components.
 * Used as fallback when API calls fail or during development.
 *
 * NOTE: Arrays intentionally EMPTY — no fabricated athletes/deals/testimonials.
 * Replace with real data as platform gains traction.
 */

export interface FeaturedAthlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  gpa: number;
  image: string;
  followers: string;
  deals: number;
  verified: boolean;
  earnings?: string;
  major?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  verified?: boolean;
  earnings?: string;
  date?: string;
}

export interface LandingStats {
  athletes: number;
  brands: number;
  avgGpa: number;
  totalDeals: number;
  totalPaidOut: number;
  avgDealValue: number;
  conversionRate: number;
}

export interface LandingOpportunity {
  id: string;
  brandName: string;
  brandLogo: string;
  title: string;
  compensation: string;
  compensationType: 'cash' | 'product' | 'hybrid';
  category: string;
  deadline: string;
  minGpa: number;
  sports: string[];
  description: string;
  featured: boolean;
}

export interface PartnerLogo {
  name: string;
  logo: string;
  type: 'school' | 'brand';
}

// ═══════════════════════════════════════════════════════════════════════════
// Featured Athletes Mock Data - More Authentic Details
// ═══════════════════════════════════════════════════════════════════════════

export const mockFeaturedAthletes: FeaturedAthlete[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// Testimonials Mock Data - Specific, Believable Quotes
// ═══════════════════════════════════════════════════════════════════════════

export const mockTestimonials: Testimonial[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// Landing Stats Mock Data - Specific, Credible Numbers
// ═══════════════════════════════════════════════════════════════════════════

export const mockLandingStats: LandingStats = {
  athletes: 0,
  brands: 0,
  totalDeals: 0,
  totalPaidOut: 0,
  avgDealValue: 0,
  avgGpa: 0,
  conversionRate: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// Partner Logos - Schools and Brands
// ═══════════════════════════════════════════════════════════════════════════

export const mockSchoolLogos: PartnerLogo[] = [
  { name: 'Stanford', logo: '/logos/stanford.svg', type: 'school' },
  { name: 'Ohio State', logo: '/logos/ohio-state.svg', type: 'school' },
  { name: 'UCLA', logo: '/logos/ucla.svg', type: 'school' },
  { name: 'Duke', logo: '/logos/duke.svg', type: 'school' },
  { name: 'Michigan', logo: '/logos/michigan.svg', type: 'school' },
  { name: 'USC', logo: '/logos/usc.svg', type: 'school' },
  { name: 'Alabama', logo: '/logos/alabama.svg', type: 'school' },
  { name: 'Georgia', logo: '/logos/georgia.svg', type: 'school' },
];

export const mockBrandLogos: PartnerLogo[] = [
  { name: 'Nike', logo: '/logos/nike.svg', type: 'brand' },
  { name: 'Gatorade', logo: '/logos/gatorade.svg', type: 'brand' },
  { name: 'Beats', logo: '/logos/beats.svg', type: 'brand' },
  { name: 'Chipotle', logo: '/logos/chipotle.svg', type: 'brand' },
  { name: 'Under Armour', logo: '/logos/under-armour.svg', type: 'brand' },
  { name: 'Red Bull', logo: '/logos/redbull.svg', type: 'brand' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Opportunities Mock Data
// ═══════════════════════════════════════════════════════════════════════════

export const mockOpportunities: LandingOpportunity[] = [];
