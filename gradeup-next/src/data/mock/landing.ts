/**
 * Mock data for landing page components.
 * Used as fallback when API calls fail or during development.
 *
 * NOTE: Data is designed to feel authentic for investor presentations.
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

export const mockFeaturedAthletes: FeaturedAthlete[] = [
  {
    id: 'ath-001',
    name: 'Jasmine Taylor',
    sport: 'Women\'s Basketball',
    school: 'Stanford University',
    gpa: 3.92,
    major: 'Computer Science',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop&crop=face',
    followers: '47.2K',
    deals: 6,
    verified: true,
    earnings: '$12,400',
  },
  {
    id: 'ath-002',
    name: 'Marcus Thompson',
    sport: 'Football',
    school: 'Ohio State',
    gpa: 3.71,
    major: 'Sports Management',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face',
    followers: '156K',
    deals: 11,
    verified: true,
    earnings: '$28,750',
  },
  {
    id: 'ath-003',
    name: 'Sofia Ramirez',
    sport: 'Soccer',
    school: 'UCLA',
    gpa: 3.88,
    major: 'Pre-Med',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face',
    followers: '38.5K',
    deals: 4,
    verified: true,
    earnings: '$8,200',
  },
  {
    id: 'ath-004',
    name: 'Derek Chen',
    sport: 'Baseball',
    school: 'Vanderbilt',
    gpa: 3.95,
    major: 'Economics',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face',
    followers: '22.1K',
    deals: 5,
    verified: true,
    earnings: '$9,800',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Testimonials Mock Data - Specific, Believable Quotes
// ═══════════════════════════════════════════════════════════════════════════

export const mockTestimonials: Testimonial[] = [
  {
    id: 'test-001',
    quote:
      "I was getting generic offers for $200 posts. After verifying my 3.9 GPA on GradeUp, a tutoring company reached out with a $3,500 semester deal. They specifically wanted someone who could represent academic excellence.",
    name: 'Jasmine Taylor',
    role: 'Women\'s Basketball, Stanford',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    verified: true,
    earnings: '$12,400 earned',
    date: 'Member since Sept 2025',
  },
  {
    id: 'test-002',
    quote:
      "My academic advisor actually recommended GradeUp. Within two weeks, I had three brand meetings. The verification process took 10 minutes and my first deal closed in 8 days.",
    name: 'Marcus Thompson',
    role: 'Football, Ohio State',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    verified: true,
    earnings: '$28,750 earned',
    date: 'Member since Aug 2025',
  },
  {
    id: 'test-003',
    quote:
      "We've tried three NIL platforms. GradeUp is the only one where athletes actually respond and show up prepared. The GPA filter saves us hours of vetting. Our campaign ROI increased 340%.",
    name: 'Rachel Kim',
    role: 'Brand Partnerships, Hydrow',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    verified: true,
    date: 'Partner since Oct 2025',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Landing Stats Mock Data - Specific, Credible Numbers
// ═══════════════════════════════════════════════════════════════════════════

export const mockLandingStats: LandingStats = {
  athletes: 847,
  brands: 63,
  avgGpa: 3.72,
  totalDeals: 412,
  totalPaidOut: 127450,
  avgDealValue: 1850,
  conversionRate: 68,
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
