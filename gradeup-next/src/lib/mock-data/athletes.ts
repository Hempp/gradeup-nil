import type { HighlightUrl } from '@/types';

/**
 * Mock athlete data for development and demo mode
 * Used by the discover page, athlete profile page, and other brand-facing features
 */

export interface MockAthlete {
  id: string;
  name: string;
  school: string;
  sport: string;
  position: string;
  gpa: number;
  instagramFollowers: number;
  tiktokFollowers: number;
  twitterFollowers?: number;
  engagementRate: number;
  nilValue: number;
  verified: boolean;
  avatarUrl?: string | null;
  coverImage?: string | null;
  highlightUrls?: HighlightUrl[];
  bio?: string;
  major?: string;
  academicYear?: string;
  hometown?: string;
}

export interface MockAthleteProfile extends MockAthlete {
  firstName: string;
  lastName: string;
  school: string;
  schoolDetails?: {
    name: string;
    city: string;
    state: string;
    division: string;
    conference: string;
    logoUrl?: string;
  };
  enrollmentVerified: boolean;
  sportVerified: boolean;
  gradesVerified: boolean;
  identityVerified: boolean;
  nilValuation: number;
  completedDeals: number;
  totalEarnings: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK ATHLETES - Diverse profiles for brand discovery
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ATHLETES: MockAthlete[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // HIGH-VALUE ATHLETES - Top NIL Prospects
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '1',
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    position: 'Point Guard',
    gpa: 3.87,
    instagramFollowers: 125000,
    tiktokFollowers: 89000,
    twitterFollowers: 45000,
    engagementRate: 4.2,
    nilValue: 125000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=face',
    bio: 'Point guard for Duke Blue Devils. 2x ACC All-Conference. Passionate about education and community outreach.',
    major: 'Business Administration',
    academicYear: 'Junior',
    hometown: 'Chicago, IL',
    highlightUrls: [
      {
        id: 'h1-1',
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Game-Winning Buzzer Beater vs UNC',
        added_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'h1-2',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@marcusjohnson/video/123456789',
        title: 'Behind the scenes at practice',
        added_at: '2024-01-20T15:30:00Z',
      },
    ],
  },
  {
    id: '2',
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    position: 'Forward',
    gpa: 3.92,
    instagramFollowers: 89000,
    tiktokFollowers: 120000,
    twitterFollowers: 32000,
    engagementRate: 5.1,
    nilValue: 95000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face',
    bio: 'Stanford Soccer forward. US Youth National Team. Dean\'s List student athlete.',
    major: 'Computer Science',
    academicYear: 'Senior',
    hometown: 'Seattle, WA',
  },
  {
    id: '3',
    name: 'Jordan Davis',
    school: 'Ohio State University',
    sport: 'Football',
    position: 'Quarterback',
    gpa: 3.65,
    instagramFollowers: 210000,
    tiktokFollowers: 180000,
    twitterFollowers: 95000,
    engagementRate: 3.8,
    nilValue: 250000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
    bio: 'Starting QB for the Buckeyes. Big Ten Freshman of the Year. Focused on excellence on and off the field.',
    major: 'Sports Management',
    academicYear: 'Sophomore',
    hometown: 'Columbus, OH',
    highlightUrls: [
      {
        id: 'h3-1',
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=abc123xyz',
        title: 'Season Highlights 2024',
        added_at: '2024-02-01T12:00:00Z',
      },
    ],
  },
  {
    id: '4',
    name: 'Emma Chen',
    school: 'UCLA',
    sport: 'Gymnastics',
    position: 'All-Around',
    gpa: 3.95,
    instagramFollowers: 150000,
    tiktokFollowers: 250000,
    twitterFollowers: 28000,
    engagementRate: 6.3,
    nilValue: 180000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face',
    bio: 'UCLA Gymnastics. 2x NCAA All-American. Passionate about mental health awareness in sports.',
    major: 'Psychology',
    academicYear: 'Junior',
    hometown: 'San Jose, CA',
  },
  {
    id: '5',
    name: 'DeShawn Williams',
    school: 'University of Alabama',
    sport: 'Football',
    position: 'Running Back',
    gpa: 3.52,
    instagramFollowers: 320000,
    tiktokFollowers: 280000,
    twitterFollowers: 150000,
    engagementRate: 4.5,
    nilValue: 420000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face',
    bio: 'Roll Tide! SEC Leading rusher. First-generation college student. Community advocate.',
    major: 'Communications',
    academicYear: 'Senior',
    hometown: 'Atlanta, GA',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // MID-TIER ATHLETES - Solid Engagement & Growing Audience
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '6',
    name: 'Tyler Brooks',
    school: 'University of Michigan',
    sport: 'Basketball',
    position: 'Shooting Guard',
    gpa: 3.72,
    instagramFollowers: 95000,
    tiktokFollowers: 75000,
    engagementRate: 4.8,
    nilValue: 110000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '7',
    name: 'Mia Rodriguez',
    school: 'University of Texas',
    sport: 'Volleyball',
    position: 'Setter',
    gpa: 3.88,
    instagramFollowers: 78000,
    tiktokFollowers: 95000,
    engagementRate: 5.5,
    nilValue: 85000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '8',
    name: 'Jaylen Thomas',
    school: 'USC',
    sport: 'Football',
    position: 'Wide Receiver',
    gpa: 3.45,
    instagramFollowers: 175000,
    tiktokFollowers: 140000,
    engagementRate: 3.2,
    nilValue: 195000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '9',
    name: 'Olivia Martinez',
    school: 'Florida State University',
    sport: 'Swimming',
    position: 'Freestyle',
    gpa: 3.91,
    instagramFollowers: 65000,
    tiktokFollowers: 110000,
    engagementRate: 7.2,
    nilValue: 72000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '10',
    name: 'Aisha Patel',
    school: 'University of Texas',
    sport: 'Tennis',
    position: 'Singles/Doubles',
    gpa: 3.98,
    instagramFollowers: 85000,
    tiktokFollowers: 62000,
    engagementRate: 6.8,
    nilValue: 92000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=256&h=256&fit=crop&crop=face',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // EMERGING ATHLETES - High Engagement, Growing Platforms
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '11',
    name: 'Kenji Nakamura',
    school: 'UCLA',
    sport: 'Baseball',
    position: 'Pitcher',
    gpa: 3.58,
    instagramFollowers: 42000,
    tiktokFollowers: 78000,
    engagementRate: 8.1,
    nilValue: 48000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '12',
    name: 'Brittany Foster',
    school: 'University of Oregon',
    sport: 'Track & Field',
    position: 'Sprinter',
    gpa: 3.41,
    instagramFollowers: 55000,
    tiktokFollowers: 125000,
    engagementRate: 9.2,
    nilValue: 68000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '13',
    name: 'Carlos Mendez',
    school: 'University of Miami',
    sport: 'Soccer',
    position: 'Midfielder',
    gpa: 3.29,
    instagramFollowers: 38000,
    tiktokFollowers: 52000,
    engagementRate: 5.8,
    nilValue: 42000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '14',
    name: 'Zoe Thompson',
    school: 'University of Connecticut',
    sport: 'Basketball',
    position: 'Center',
    gpa: 3.75,
    instagramFollowers: 28000,
    tiktokFollowers: 45000,
    engagementRate: 7.5,
    nilValue: 35000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '15',
    name: 'Andre Washington',
    school: 'Georgia Tech',
    sport: 'Football',
    position: 'Linebacker',
    gpa: 3.62,
    instagramFollowers: 48000,
    tiktokFollowers: 35000,
    engagementRate: 4.1,
    nilValue: 52000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=256&h=256&fit=crop&crop=face',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // NICHE SPORTS - Specialized Audiences
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '16',
    name: 'Sophia Kim',
    school: 'Penn State',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    gpa: 3.89,
    instagramFollowers: 92000,
    tiktokFollowers: 145000,
    engagementRate: 8.4,
    nilValue: 115000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '17',
    name: 'Michael Chen',
    school: 'University of California',
    sport: 'Swimming',
    position: 'Butterfly',
    gpa: 3.94,
    instagramFollowers: 72000,
    tiktokFollowers: 98000,
    engagementRate: 6.1,
    nilValue: 82000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '18',
    name: 'Jessica Brown',
    school: 'University of North Carolina',
    sport: 'Soccer',
    position: 'Goalkeeper',
    gpa: 3.78,
    instagramFollowers: 68000,
    tiktokFollowers: 85000,
    engagementRate: 5.4,
    nilValue: 78000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '19',
    name: 'David Park',
    school: 'USC',
    sport: 'Tennis',
    position: 'Singles',
    gpa: 3.82,
    instagramFollowers: 35000,
    tiktokFollowers: 28000,
    engagementRate: 7.8,
    nilValue: 45000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '20',
    name: 'Rachel Adams',
    school: 'University of Florida',
    sport: 'Softball',
    position: 'Pitcher',
    gpa: 3.67,
    instagramFollowers: 58000,
    tiktokFollowers: 72000,
    engagementRate: 6.9,
    nilValue: 62000,
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=256&h=256&fit=crop&crop=face',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EXTENDED ATHLETE PROFILES - For detailed profile pages
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ATHLETE_PROFILES: Record<string, MockAthleteProfile> = {
  '1': {
    ...MOCK_ATHLETES[0],
    firstName: 'Marcus',
    lastName: 'Johnson',
    schoolDetails: {
      name: 'Duke University',
      city: 'Durham',
      state: 'NC',
      division: 'NCAA Division I',
      conference: 'ACC',
      logoUrl: '/logos/duke.png',
    },
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    identityVerified: true,
    nilValuation: 125000,
    completedDeals: 8,
    totalEarnings: 45000,
  },
  '2': {
    ...MOCK_ATHLETES[1],
    firstName: 'Sarah',
    lastName: 'Williams',
    schoolDetails: {
      name: 'Stanford University',
      city: 'Stanford',
      state: 'CA',
      division: 'NCAA Division I',
      conference: 'Pac-12',
      logoUrl: '/logos/stanford.png',
    },
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    identityVerified: true,
    nilValuation: 95000,
    completedDeals: 12,
    totalEarnings: 62000,
  },
  '3': {
    ...MOCK_ATHLETES[2],
    firstName: 'Jordan',
    lastName: 'Davis',
    schoolDetails: {
      name: 'Ohio State University',
      city: 'Columbus',
      state: 'OH',
      division: 'NCAA Division I',
      conference: 'Big Ten',
      logoUrl: '/logos/osu.png',
    },
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: false,
    identityVerified: true,
    nilValuation: 250000,
    completedDeals: 15,
    totalEarnings: 125000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a mock athlete by ID
 */
export function getMockAthleteById(id: string): MockAthlete | undefined {
  return MOCK_ATHLETES.find(athlete => athlete.id === id);
}

/**
 * Get a detailed mock athlete profile by ID
 */
export function getMockAthleteProfile(id: string): MockAthleteProfile | undefined {
  return MOCK_ATHLETE_PROFILES[id];
}

/**
 * Get all unique sports from mock data
 */
export function getMockSports(): string[] {
  return [...new Set(MOCK_ATHLETES.map(a => a.sport))].sort();
}

/**
 * Get all unique schools from mock data
 */
export function getMockSchools(): string[] {
  return [...new Set(MOCK_ATHLETES.map(a => a.school))].sort();
}

// Static exports for dropdown options
export const SPORTS = getMockSports();
export const SCHOOLS = getMockSchools();
