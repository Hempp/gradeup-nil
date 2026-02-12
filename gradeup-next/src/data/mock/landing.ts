/**
 * Mock data for landing page components.
 * Used as fallback when API calls fail or during development.
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
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
}

export interface LandingStats {
  athletes: number;
  brands: number;
  avgGpa: number;
  totalDeals: number;
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

// ═══════════════════════════════════════════════════════════════════════════
// Featured Athletes Mock Data
// ═══════════════════════════════════════════════════════════════════════════

export const mockFeaturedAthletes: FeaturedAthlete[] = [
  {
    id: 'ath-001',
    name: 'Sarah Chen',
    sport: 'Volleyball',
    school: 'Stanford University',
    gpa: 3.9,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    followers: '125K',
    deals: 8,
    verified: true,
  },
  {
    id: 'ath-002',
    name: 'Jordan Williams',
    sport: 'Basketball',
    school: 'Duke University',
    gpa: 3.7,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    followers: '89K',
    deals: 12,
    verified: true,
  },
  {
    id: 'ath-003',
    name: 'Maya Rodriguez',
    sport: 'Soccer',
    school: 'UCLA',
    gpa: 3.85,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    followers: '67K',
    deals: 6,
    verified: true,
  },
  {
    id: 'ath-004',
    name: 'Tyler Brooks',
    sport: 'Football',
    school: 'Ohio State University',
    gpa: 3.6,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    followers: '210K',
    deals: 15,
    verified: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Testimonials Mock Data
// ═══════════════════════════════════════════════════════════════════════════

export const mockTestimonials: Testimonial[] = [
  {
    id: 'test-001',
    quote:
      "GradeUp changed the game for me. Brands actually care about my academics now, and I've earned more in 6 months than I thought possible.",
    name: 'Marcus Johnson',
    role: 'Football, University of Michigan',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    rating: 5,
  },
  {
    id: 'test-002',
    quote:
      "Finally, a platform that values the 'student' in student-athlete. My 3.8 GPA helped me land partnerships I never expected.",
    name: 'Emily Martinez',
    role: 'Track & Field, USC',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    rating: 5,
  },
  {
    id: 'test-003',
    quote:
      "As a brand, we specifically sought out scholar-athletes. GradeUp's verification system gives us confidence in who we're partnering with.",
    name: 'David Kim',
    role: 'Marketing Director, SportsTech Co',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100',
    rating: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Landing Stats Mock Data
// ═══════════════════════════════════════════════════════════════════════════

export const mockLandingStats: LandingStats = {
  athletes: 500,
  brands: 50,
  avgGpa: 3.7,
  totalDeals: 1200,
};

// ═══════════════════════════════════════════════════════════════════════════
// Opportunities Mock Data
// ═══════════════════════════════════════════════════════════════════════════

export const mockOpportunities: LandingOpportunity[] = [
  {
    id: 'opp-001',
    brandName: 'Nike',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
    title: 'Campus Ambassador Program',
    compensation: '$2,500/month',
    compensationType: 'cash',
    category: 'Ambassador',
    deadline: '2026-03-15',
    minGpa: 3.5,
    sports: ['All Sports'],
    description:
      'Represent Nike on your campus. Create content, host events, and build the Nike community among student-athletes.',
    featured: true,
  },
  {
    id: 'opp-002',
    brandName: 'Gatorade',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Gatorade_logo.svg',
    title: 'Social Media Partnership',
    compensation: '$1,000 + Products',
    compensationType: 'hybrid',
    category: 'Social Media',
    deadline: '2026-02-28',
    minGpa: 3.0,
    sports: ['Football', 'Basketball', 'Soccer'],
    description:
      'Create authentic content featuring Gatorade products during training and game days.',
    featured: true,
  },
  {
    id: 'opp-003',
    brandName: 'Beats by Dre',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Beats_Electronics_logo.svg',
    title: 'Product Collaboration',
    compensation: 'Products + Commission',
    compensationType: 'product',
    category: 'Product',
    deadline: '2026-04-01',
    minGpa: 3.2,
    sports: ['All Sports'],
    description:
      'Receive latest Beats products and earn commission on sales through your personalized link.',
    featured: false,
  },
  {
    id: 'opp-004',
    brandName: 'Chipotle',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Chipotle_Mexican_Grill_logo.svg',
    title: 'Local Store Partnership',
    compensation: '$500 + Free Meals',
    compensationType: 'hybrid',
    category: 'Local',
    deadline: '2026-03-01',
    minGpa: 3.0,
    sports: ['All Sports'],
    description:
      'Partner with your local Chipotle for in-store appearances and social media promotion.',
    featured: false,
  },
  {
    id: 'opp-005',
    brandName: 'Under Armour',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Under_armour_logo.svg',
    title: 'Scholar-Athlete Spotlight',
    compensation: '$5,000',
    compensationType: 'cash',
    category: 'Feature',
    deadline: '2026-03-30',
    minGpa: 3.8,
    sports: ['All Sports'],
    description:
      'Be featured in Under Armour\'s Scholar-Athlete campaign highlighting academic excellence.',
    featured: true,
  },
  {
    id: 'opp-006',
    brandName: 'Red Bull',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Red_Bull_logo.svg',
    title: 'Student Marketeer',
    compensation: '$1,500/month',
    compensationType: 'cash',
    category: 'Ambassador',
    deadline: '2026-02-20',
    minGpa: 3.0,
    sports: ['All Sports'],
    description:
      'Join the Red Bull Student Marketeer program. Distribute products, host events, create content.',
    featured: false,
  },
];
