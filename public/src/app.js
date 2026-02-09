/**
 * GradeUp NIL Platform - Application Core
 * Handles initialization, authentication state, and demo mode.
 *
 * @module app
 */

// Demo mode flag - set to true when Supabase is not configured
let isDemoMode = true;
let currentUser = null;
let isInitialized = false;

// Demo user profiles
const DEMO_USERS = {
  athlete: {
    id: 'demo-athlete-1',
    email: 'marcus.johnson@duke.edu',
    role: 'athlete',
    profile: {
      first_name: 'Marcus',
      last_name: 'Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&crop=face',
      bio: 'Point guard for Duke Basketball. Dean\'s List student. Business Administration major.',
    },
    athlete: {
      id: 'athlete-1',
      school: { name: 'Duke University', short_name: 'Duke', division: 'D1' },
      sport: { name: 'Basketball', category: 'team' },
      position: 'Point Guard',
      year: 'Junior',
      gpa: 3.87,
      major: 'Business Administration',
      gradeup_score: 892,
      total_followers: 145000,
      instagram_handle: 'marcusj',
      twitter_handle: 'marcusjohnson',
      tiktok_handle: 'marcusj',
      scholar_tier: 'platinum',
      enrollment_verified: true,
      sport_verified: true,
      grades_verified: true,
    },
  },
  brand: {
    id: 'demo-brand-1',
    email: 'contact@apexsports.com',
    role: 'brand',
    profile: {
      first_name: 'Alex',
      last_name: 'Rivera',
    },
    brand: {
      id: 'brand-1',
      company_name: 'Apex Sports Co.',
      logo_url: null,
      industry: 'Athletic Apparel',
      city: 'Portland',
      state: 'Oregon',
      is_verified: true,
      is_scholar_sponsor: true,
      sponsor_tier: 'gold',
    },
  },
  director: {
    id: 'demo-director-1',
    email: 'kevin.white@duke.edu',
    role: 'athletic_director',
    profile: {
      first_name: 'Kevin',
      last_name: 'White',
    },
    school: {
      id: 'school-1',
      name: 'Duke University',
      short_name: 'Duke',
      division: 'D1',
      conference: 'ACC',
    },
  },
};

// Demo data store
const DEMO_DATA = {
  athletes: [],
  brands: [],
  opportunities: [],
  deals: [],
  messages: [],
  notifications: [],
  achievements: [],
  leaderboard: [],
};

/**
 * Initialize the GradeUp application
 * @param {object} options - Initialization options
 * @param {string} [options.userType] - 'athlete', 'brand', or 'director'
 * @param {boolean} [options.forceDemo] - Force demo mode even if Supabase is configured
 * @returns {Promise<object>} Initialization result
 */
export async function initApp(options = {}) {
  if (isInitialized) {
    return { success: true, isDemoMode, currentUser };
  }

  const { userType = 'athlete', forceDemo = false } = options;

  // Check if Supabase is configured
  const supabaseUrl = window.SUPABASE_URL || window.GRADEUP_CONFIG?.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_ANON_KEY || window.GRADEUP_CONFIG?.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !forceDemo) {
    // Real mode - try to initialize Supabase
    try {
      const { getSupabaseClient, getCurrentUser } = await import('./services/supabase.js');
      await getSupabaseClient();
      const { user, error } = await getCurrentUser();

      if (error) {
        console.warn('Auth error, falling back to demo mode:', error.message);
        isDemoMode = true;
      } else if (user) {
        isDemoMode = false;
        currentUser = user;
      } else {
        // No user logged in - could show login or use demo
        isDemoMode = true;
      }
    } catch (err) {
      console.warn('Supabase initialization failed, using demo mode:', err.message);
      isDemoMode = true;
    }
  } else {
    isDemoMode = true;
  }

  // Set up demo user if in demo mode
  if (isDemoMode) {
    currentUser = DEMO_USERS[userType] || DEMO_USERS.athlete;
    initDemoData();
    console.log('%c🎮 Demo Mode Active', 'color: #00f0ff; font-size: 14px; font-weight: bold;');
    console.log('%cUsing mock data. Connect Supabase for real functionality.', 'color: #888;');
  }

  isInitialized = true;

  // Dispatch initialization event
  window.dispatchEvent(new CustomEvent('gradeup:initialized', {
    detail: { isDemoMode, currentUser, userType },
  }));

  return { success: true, isDemoMode, currentUser };
}

/**
 * Initialize demo data
 */
function initDemoData() {
  // Athletes
  DEMO_DATA.athletes = [
    { id: 'athlete-1', name: 'Marcus Johnson', school: 'Duke University', sport: 'Basketball', position: 'Point Guard', gpa: 3.87, gradeupScore: 892, followers: 145000, scholarTier: 'platinum', verified: true, image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&crop=face' },
    { id: 'athlete-2', name: 'Sarah Chen', school: 'Stanford University', sport: 'Soccer', position: 'Midfielder', gpa: 3.92, gradeupScore: 945, followers: 89000, scholarTier: 'platinum', verified: true, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face' },
    { id: 'athlete-3', name: 'James Wilson', school: 'University of Alabama', sport: 'Football', position: 'Wide Receiver', gpa: 3.54, gradeupScore: 812, followers: 234000, scholarTier: 'gold', verified: true, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face' },
    { id: 'athlete-4', name: 'Emily Rodriguez', school: 'USC', sport: 'Volleyball', position: 'Outside Hitter', gpa: 3.78, gradeupScore: 867, followers: 67000, scholarTier: 'gold', verified: true, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face' },
    { id: 'athlete-5', name: 'David Kim', school: 'University of Michigan', sport: 'Swimming', position: 'Freestyle', gpa: 3.95, gradeupScore: 923, followers: 45000, scholarTier: 'platinum', verified: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face' },
  ];

  // Opportunities
  DEMO_DATA.opportunities = [
    { id: 'opp-1', brandId: 'brand-1', brandName: 'Nike', brandLogo: 'N', title: 'Spring Collection Ambassador', type: 'endorsement', amount: 5000, description: 'Represent Nike\'s new spring athletic collection.', requirements: { sport: 'Any', gpa: 3.5, followers: 50000 }, deadline: '2026-03-15', featured: true },
    { id: 'opp-2', brandId: 'brand-2', brandName: 'Gatorade', brandLogo: 'G', title: 'Game Day Fuel Campaign', type: 'social_post', amount: 2500, description: 'Share your game day prep routine featuring Gatorade.', requirements: { sport: 'Any', gpa: 3.0, followers: 25000 }, deadline: '2026-02-28', featured: true },
    { id: 'opp-3', brandId: 'brand-3', brandName: 'Red Bull', brandLogo: 'RB', title: 'Athlete Energy Series', type: 'appearance', amount: 8000, description: 'Appear at Red Bull campus events.', requirements: { sport: 'Any', gpa: 3.0, followers: 75000 }, deadline: '2026-04-01', featured: false },
    { id: 'opp-4', brandId: 'brand-4', brandName: 'Beats by Dre', brandLogo: 'B', title: 'Training Playlist Creator', type: 'social_post', amount: 3500, description: 'Create content featuring Beats headphones during training.', requirements: { sport: 'Any', gpa: 2.5, followers: 30000 }, deadline: '2026-03-10', featured: false },
    { id: 'opp-5', brandId: 'brand-5', brandName: 'Chipotle', brandLogo: 'C', title: 'Campus Fuel Partner', type: 'endorsement', amount: 4000, description: 'Be a campus representative for Chipotle.', requirements: { sport: 'Any', gpa: 3.0, followers: 20000 }, deadline: '2026-02-20', featured: false },
  ];

  // Deals
  DEMO_DATA.deals = [
    { id: 'deal-1', opportunityId: 'opp-1', brandId: 'brand-1', brandName: 'Nike', brandLogo: 'N', title: 'Spring Collection Ambassador', amount: 5000, status: 'active', type: 'endorsement', startDate: '2026-01-15', endDate: '2026-04-15' },
    { id: 'deal-2', opportunityId: null, brandId: 'brand-2', brandName: 'Gatorade', brandLogo: 'G', title: 'Social Media Campaign', amount: 2500, status: 'pending', type: 'social_post', startDate: '2026-02-01', endDate: '2026-02-28' },
    { id: 'deal-3', opportunityId: null, brandId: 'brand-6', brandName: 'Under Armour', brandLogo: 'UA', title: 'Training Partner', amount: 3500, status: 'completed', type: 'endorsement', startDate: '2025-09-01', endDate: '2025-12-31' },
  ];

  // Messages
  DEMO_DATA.messages = [
    { id: 'conv-1', recipientId: 'brand-1', recipientName: 'Nike Regional', recipientAvatar: null, lastMessage: 'We loved your content! Let\'s discuss next steps...', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), unread: true, dealId: 'deal-1' },
    { id: 'conv-2', recipientId: 'brand-2', recipientName: 'Gatorade Sports', recipientAvatar: null, lastMessage: 'The campaign is going great! Here are the metrics...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), unread: false, dealId: 'deal-2' },
    { id: 'conv-3', recipientId: 'user-coach', recipientName: 'Coach Wilson', recipientAvatar: null, lastMessage: 'Great practice today. See you tomorrow!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), unread: true, dealId: null },
  ];

  // Notifications
  DEMO_DATA.notifications = [
    { id: 'notif-1', type: 'deal', title: 'New Deal Offer', message: 'Nike has sent you a partnership offer.', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), read: false },
    { id: 'notif-2', type: 'achievement', title: 'Achievement Unlocked!', message: 'You earned "Rising Star" badge.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false },
    { id: 'notif-3', type: 'score', title: 'Score Update', message: 'Your GradeUp Score increased by 15 points!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true },
  ];

  // Achievements
  DEMO_DATA.achievements = [
    { id: 'ach-1', name: 'Rising Star', description: 'Complete your first deal', icon: '⭐', earned: true, earnedAt: '2025-10-15' },
    { id: 'ach-2', name: 'Dean\'s List', description: 'Maintain a 3.5+ GPA for 2 semesters', icon: '📚', earned: true, earnedAt: '2025-12-20' },
    { id: 'ach-3', name: 'Social Butterfly', description: 'Reach 100K followers', icon: '🦋', earned: true, earnedAt: '2025-11-01' },
    { id: 'ach-4', name: 'Deal Maker', description: 'Complete 5 deals', icon: '🤝', earned: false, progress: 3, target: 5 },
    { id: 'ach-5', name: 'Perfect 10', description: 'Get a 5-star rating on 10 deals', icon: '🏆', earned: false, progress: 6, target: 10 },
  ];

  // Leaderboard
  DEMO_DATA.leaderboard = DEMO_DATA.athletes.map((athlete, index) => ({
    ...athlete,
    rank: index + 1,
    previousRank: index + 2,
  }));
}

/**
 * Get current user
 * @returns {object|null} Current user object
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if running in demo mode
 * @returns {boolean} True if in demo mode
 */
export function isDemo() {
  return isDemoMode;
}

/**
 * Get demo data
 * @param {string} key - Data key (athletes, deals, etc.)
 * @returns {array} Data array
 */
export function getDemoData(key) {
  return DEMO_DATA[key] || [];
}

/**
 * Sign in (demo mode)
 * @param {string} userType - 'athlete', 'brand', or 'director'
 */
export function demoSignIn(userType) {
  if (!isDemoMode) return;
  currentUser = DEMO_USERS[userType] || DEMO_USERS.athlete;
  window.dispatchEvent(new CustomEvent('gradeup:userChanged', { detail: currentUser }));
}

/**
 * Sign out
 */
export async function signOut() {
  if (!isDemoMode) {
    try {
      const { getSupabaseClient } = await import('./services/supabase.js');
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
  currentUser = null;
  window.dispatchEvent(new CustomEvent('gradeup:userChanged', { detail: null }));
}

// ============================================================================
// DEMO API WRAPPERS
// These wrap the real services and provide demo data when in demo mode
// ============================================================================

/**
 * Get athlete profile
 */
export async function getMyProfile() {
  if (isDemoMode && currentUser?.role === 'athlete') {
    return { profile: currentUser.athlete, error: null };
  }
  const { getMyAthleteProfile } = await import('./services/athlete.js');
  return getMyAthleteProfile();
}

/**
 * Get deals
 */
export async function getDeals() {
  if (isDemoMode) {
    return { deals: DEMO_DATA.deals, error: null };
  }
  const { getMyDeals } = await import('./services/deals.js');
  return getMyDeals();
}

/**
 * Get opportunities
 */
export async function getOpportunities(filters = {}) {
  if (isDemoMode) {
    let filtered = [...DEMO_DATA.opportunities];
    if (filters.featured_only) {
      filtered = filtered.filter(o => o.featured);
    }
    return { opportunities: filtered, pagination: { total: filtered.length }, error: null };
  }
  const { getOpportunities: realGetOpportunities } = await import('./services/deals.js');
  return realGetOpportunities(filters);
}

/**
 * Get notifications
 */
export async function getNotifications() {
  if (isDemoMode) {
    return { notifications: DEMO_DATA.notifications, error: null };
  }
  const { getNotifications: realGetNotifications } = await import('./services/athlete.js');
  return realGetNotifications();
}

/**
 * Get achievements
 */
export async function getAchievements() {
  if (isDemoMode) {
    return { achievements: DEMO_DATA.achievements, error: null };
  }
  const { getMyAchievements } = await import('./services/gamification.js');
  return getMyAchievements();
}

/**
 * Get conversations
 */
export async function getConversations() {
  if (isDemoMode) {
    return { conversations: DEMO_DATA.messages, error: null };
  }
  const { getConversations: realGetConversations } = await import('./services/messaging.js');
  return realGetConversations();
}

/**
 * Calculate GradeUp Score
 */
export async function calculateScore() {
  if (isDemoMode && currentUser?.athlete) {
    return {
      score: {
        total: currentUser.athlete.gradeup_score,
        athletic: Math.round(currentUser.athlete.gradeup_score * 0.4),
        social: Math.round(currentUser.athlete.gradeup_score * 0.3),
        academic: Math.round(currentUser.athlete.gradeup_score * 0.3),
      },
      error: null,
    };
  }
  const { calculateGradeUpScore } = await import('./services/athlete.js');
  return calculateGradeUpScore();
}

// Export for global access
if (typeof window !== 'undefined') {
  window.GradeUpApp = {
    init: initApp,
    getCurrentUser,
    isDemo,
    getDemoData,
    demoSignIn,
    signOut,
    getMyProfile,
    getDeals,
    getOpportunities,
    getNotifications,
    getAchievements,
    getConversations,
    calculateScore,
  };
}

export default {
  init: initApp,
  getCurrentUser,
  isDemo,
  getDemoData,
  demoSignIn,
  signOut,
  getMyProfile,
  getDeals,
  getOpportunities,
  getNotifications,
  getAchievements,
  getConversations,
  calculateScore,
};
