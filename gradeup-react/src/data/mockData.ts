import type { Athlete, Brand, SmartContract } from '../types';

export const athletes: Athlete[] = [
  {
    id: '1',
    name: 'Jordan Williams',
    sport: 'Basketball',
    position: 'Point Guard',
    university: 'Duke University',
    gpa: 3.87,
    major: 'Business Administration',
    year: 'Junior',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 245000, twitter: 89000, tiktok: 512000 },
    nilValue: 125000,
    verified: true,
    statsTaq: {
      pointsPerGame: 18.5,
      assistsPerGame: 7.2,
      reboundsPerGame: 4.1,
      fieldGoalPercentage: 47.8,
      gamesPlayed: 28,
      minutesPerGame: 32.5,
      seasonHighPoints: 34,
      doubleDoubles: 8,
      tripleDoubles: 2,
      playerEfficiencyRating: 24.3
    },
    bio: 'Two-time All-ACC selection committed to excellence on and off the court.',
    achievements: ['All-ACC First Team', 'ACC Scholar-Athlete', 'Team Captain']
  },
  {
    id: '2',
    name: 'Maya Chen',
    sport: 'Soccer',
    position: 'Forward',
    university: 'Stanford University',
    gpa: 3.92,
    major: 'Computer Science',
    year: 'Senior',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 189000, twitter: 67000, tiktok: 423000 },
    nilValue: 98000,
    verified: true,
    statsTaq: {
      pointsPerGame: 0.8, // Goals per game
      assistsPerGame: 0.5,
      reboundsPerGame: 0,
      fieldGoalPercentage: 62.5, // Shot accuracy
      gamesPlayed: 22,
      minutesPerGame: 78,
      seasonHighPoints: 3,
      doubleDoubles: 0,
      tripleDoubles: 0,
      playerEfficiencyRating: 18.7
    },
    bio: 'National team prospect balancing D1 athletics with a CS degree.',
    achievements: ['Pac-12 All-Academic', 'U-20 National Team', 'Golden Boot 2024']
  },
  {
    id: '3',
    name: 'Marcus Thompson',
    sport: 'Football',
    position: 'Wide Receiver',
    university: 'Ohio State',
    gpa: 3.54,
    major: 'Sports Management',
    year: 'Sophomore',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 567000, twitter: 234000, tiktok: 890000 },
    nilValue: 275000,
    verified: true,
    statsTaq: {
      pointsPerGame: 0, // TDs
      assistsPerGame: 0,
      reboundsPerGame: 0,
      fieldGoalPercentage: 68.5, // Catch rate
      gamesPlayed: 13,
      minutesPerGame: 45,
      seasonHighPoints: 3,
      doubleDoubles: 0,
      tripleDoubles: 0,
      playerEfficiencyRating: 22.1
    },
    bio: 'Biletnikoff Award watchlist with 1,200+ receiving yards.',
    achievements: ['Big Ten Freshman of the Year', 'All-American Honorable Mention']
  },
  {
    id: '4',
    name: 'Aaliyah Brooks',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    university: 'Texas',
    gpa: 3.95,
    major: 'Pre-Med Biology',
    year: 'Junior',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 156000, twitter: 45000, tiktok: 289000 },
    nilValue: 85000,
    verified: true,
    statsTaq: {
      pointsPerGame: 4.2, // Kills per set
      assistsPerGame: 0.8,
      reboundsPerGame: 0,
      fieldGoalPercentage: 34.5, // Kill percentage
      gamesPlayed: 32,
      minutesPerGame: 0,
      seasonHighPoints: 28,
      doubleDoubles: 12,
      tripleDoubles: 0,
      playerEfficiencyRating: 19.8
    },
    bio: 'Future physician dominating at the net while acing organic chemistry.',
    achievements: ['Big 12 Player of the Week (5x)', 'Academic All-American']
  },
  {
    id: '5',
    name: 'Derek Kim',
    sport: 'Swimming',
    position: 'Freestyle/IM',
    university: 'Cal Berkeley',
    gpa: 3.78,
    major: 'Mechanical Engineering',
    year: 'Senior',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 98000, twitter: 34000, tiktok: 167000 },
    nilValue: 62000,
    verified: true,
    statsTaq: {
      pointsPerGame: 0,
      assistsPerGame: 0,
      reboundsPerGame: 0,
      fieldGoalPercentage: 0,
      gamesPlayed: 18,
      minutesPerGame: 0,
      seasonHighPoints: 0,
      doubleDoubles: 0,
      tripleDoubles: 0,
      playerEfficiencyRating: 21.5
    },
    bio: 'Olympic Trials qualifier breaking school records in the pool.',
    achievements: ['NCAA All-American', 'Pac-12 Champion', 'School Record Holder']
  },
  {
    id: '6',
    name: 'Jasmine Wright',
    sport: 'Track & Field',
    position: 'Sprinter',
    university: 'USC',
    gpa: 3.89,
    major: 'Communications',
    year: 'Sophomore',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    socialMedia: { instagram: 312000, twitter: 123000, tiktok: 678000 },
    nilValue: 145000,
    verified: true,
    statsTaq: {
      pointsPerGame: 0,
      assistsPerGame: 0,
      reboundsPerGame: 0,
      fieldGoalPercentage: 0,
      gamesPlayed: 24,
      minutesPerGame: 0,
      seasonHighPoints: 0,
      doubleDoubles: 0,
      tripleDoubles: 0,
      playerEfficiencyRating: 26.2
    },
    bio: 'Fastest woman in the Pac-12 with eyes on Paris 2028.',
    achievements: ['NCAA 100m Champion', 'World Junior Medalist', 'All-American']
  }
];

export const brands: Brand[] = [
  { id: '1', name: 'Nike', logo: '🏃', industry: 'Athletic Apparel', budget: 500000, activeDeals: 12 },
  { id: '2', name: 'Gatorade', logo: '🥤', industry: 'Sports Nutrition', budget: 300000, activeDeals: 8 },
  { id: '3', name: 'State Farm', logo: '🏠', industry: 'Insurance', budget: 250000, activeDeals: 5 },
  { id: '4', name: 'Beats by Dre', logo: '🎧', industry: 'Electronics', budget: 400000, activeDeals: 7 },
  { id: '5', name: 'Chipotle', logo: '🌯', industry: 'Food & Beverage', budget: 200000, activeDeals: 15 },
];

export const sampleContracts: SmartContract[] = [
  {
    id: 'sc-001',
    athleteId: '1',
    brandId: '1',
    athleteName: 'Jordan Williams',
    brandName: 'Nike',
    title: 'Campus Ambassador Program',
    description: 'Represent Nike on Duke campus through social media and events',
    totalValue: 25000,
    status: 'active',
    createdAt: '2025-01-15',
    startDate: '2025-02-01',
    endDate: '2025-08-01',
    signatures: { athlete: true, brand: true },
    tasks: [
      { id: 't1', description: 'Post 3 Instagram stories featuring Nike gear', deadline: '2025-02-15', payment: 3000, status: 'completed' },
      { id: 't2', description: 'Attend campus fitness event wearing Nike', deadline: '2025-03-01', payment: 5000, status: 'completed' },
      { id: 't3', description: 'Create TikTok training video', deadline: '2025-03-15', payment: 4000, status: 'in_progress' },
      { id: 't4', description: 'Host meet & greet at campus store', deadline: '2025-04-01', payment: 8000, status: 'pending' },
      { id: 't5', description: 'Post game-day content (5 games)', deadline: '2025-05-01', payment: 5000, status: 'pending' },
    ]
  },
  {
    id: 'sc-002',
    athleteId: '1',
    brandId: '2',
    athleteName: 'Jordan Williams',
    brandName: 'Gatorade',
    title: 'Hydration Partner',
    description: 'Promote Gatorade products during basketball season',
    totalValue: 15000,
    status: 'pending_signature',
    createdAt: '2025-01-20',
    startDate: '2025-02-15',
    endDate: '2025-05-15',
    signatures: { athlete: false, brand: true },
    tasks: [
      { id: 't1', description: 'Feature Gatorade in 4 workout posts', deadline: '2025-03-01', payment: 4000, status: 'pending' },
      { id: 't2', description: 'Attend product launch event', deadline: '2025-03-20', payment: 6000, status: 'pending' },
      { id: 't3', description: 'Create "Game Day Fuel" content series', deadline: '2025-04-15', payment: 5000, status: 'pending' },
    ]
  }
];
