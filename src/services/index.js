/**
 * GradeUp NIL Platform - Services Index
 *
 * Central export point for all client services.
 * Import services from this file for cleaner imports.
 *
 * @module services
 * @version 1.0.0
 *
 * @example
 * // Import all services
 * import * as services from './services/index.js';
 *
 * @example
 * // Import specific services
 * import { brand, search, opportunities } from './services/index.js';
 *
 * @example
 * // Import specific functions
 * import { searchAthletes } from './services/search.js';
 */

// Core services
export * as supabase from './supabase.js';
export * as auth from './auth.js';

// Brand-specific services
export * as brand from './brand.js';
export * as search from './search.js';
export * as campaigns from './campaigns.js';
export * as messaging from './messaging.js';
export * as opportunities from './opportunities.js';

// Athlete-specific services
export * as athlete from './athlete.js';
export * as deals from './deals.js';
export * as analytics from './analytics.js';

// Gamification and Scholar services
export * as gamification from './gamification.js';
export * as scholar from './scholar.js';

// Matching and Calendar services
export * as matching from './matching.js';
export * as calendar from './calendar.js';

// AI services
export * as ai from './ai.js';

// Re-export commonly used functions for convenience
export {
  getSupabaseClient,
  getCurrentUser,
  getSession,
  isAuthenticated,
  invokeFunction,
  setConfig,
  resetClient,
  STORAGE_BUCKETS,
  ERROR_CODES,
} from './supabase.js';

export {
  signIn,
  signOut,
  signUpBrand,
  signUpAthlete,
  resetPassword,
  updatePassword,
  getFullProfile,
  hasRole,
  isBrand,
  isAthlete,
  isAthleticDirector,
  isAdmin,
  onAuthStateChange,
  USER_ROLES,
  ACADEMIC_YEARS,
} from './auth.js';

export {
  getCurrentBrand,
  getBrandById,
  updateBrandProfile,
  updateBrandPreferences,
  uploadBrandLogo,
  getBrandStats,
  getBrandActivity,
  getViewedAthletes,
  recordProfileView,
  getSports,
  getSchools,
} from './brand.js';

export {
  searchAthletes,
  searchAthletesLocal,
  getFeaturedAthletes,
  getTopAthletes,
  getSimilarAthletes,
  getAthleteById,
  getTrendingAthletes,
  getSavedAthletes,
  quickSearchByName,
} from './search.js';

export {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  addOpportunityToCampaign,
  removeOpportunityFromCampaign,
  getCampaignMetrics,
  getCampaignTimeline,
  getCampaignsSummary,
  deleteCampaign,
  duplicateCampaign,
} from './campaigns.js';

export {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getConversations,
  getUnreadCount,
  deleteMessage,
  uploadAttachment,
  subscribeToMessages,
  subscribeToConversations,
  startConversation,
} from './messaging.js';

export {
  DEAL_TYPES,
  COMPENSATION_TYPES,
  OPPORTUNITY_STATUSES,
  createOpportunity,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  updateOpportunityStatus,
  publishOpportunity,
  pauseOpportunity,
  closeOpportunity,
  completeOpportunity,
  deleteOpportunity,
  getOpportunityDeals,
  createDealFromOpportunity,
  getOpportunityStats,
  duplicateOpportunity,
  getMatchedAthletes,
} from './opportunities.js';

// Athlete-side exports
export {
  createAthleteProfile,
  getMyAthleteProfile,
  updateAthleteProfile,
  updateSocialHandles,
  updateAvailabilitySettings,
  uploadAvatar,
  getGradeUpScore,
  getVerificationStatus,
  submitVerificationRequest,
  getVerificationRequests,
  uploadVerificationDocument,
  connectStatTaq,
  syncStatTaqData,
  getStatTaqConnection,
  disconnectStatTaq,
  getNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  // Video highlights
  uploadHighlightVideo,
  getMyVideos,
  getAthleteVideos,
  updateVideo,
  deleteVideo,
  recordVideoView,
  // Monetization settings
  getMonetizationSettings,
  updateMonetizationSettings,
  DIVISIONS,
  VERIFICATION_TYPES,
  VERIFICATION_STATUS,
} from './athlete.js';

export {
  getOpportunities,
  applyToOpportunity,
  getMyDeals,
  getDealsByCategory,
  getDealById,
  acceptDeal,
  rejectDeal,
  counterOfferDeal,
  signContract,
  completeDeal,
  submitDealReview,
  getDealMessages,
  sendDealMessage,
  subscribeToDealMessages,
  subscribeToMyDeals,
  getDealStats,
  // Athlete-initiated proposals
  createProposal,
  updateProposal,
  sendProposal,
  getMyProposals,
  getProposalById,
  deleteProposal,
  withdrawProposal,
  DEAL_STATUS,
  PROPOSAL_STATUS,
} from './deals.js';

export {
  getProfileViews,
  getRecentViewers,
  getEarningsStats,
  getEarningsTrend,
  getDashboardMetrics,
  getAthleteStats,
  getGradeUpScoreHistory,
  getAthleteComparison,
  exportAnalyticsData,
  getActivityFeed,
  TIME_PERIODS,
  VIEW_SOURCES,
} from './analytics.js';

// Gamification exports
export {
  RARITY,
  ACHIEVEMENT_CATEGORIES,
  XP_CONSTANTS,
  calculateLevel,
  xpForNextLevel,
  getXpProgress,
  getAchievements,
  getMyAchievements,
  getAthleteAchievements,
  checkAchievements,
  getAchievementStats,
  getRecentAchievements,
  getLeaderboard,
  getMyLeaderboardPosition,
  getMyXpInfo,
  getScholarTier,
  getScholarSponsors,
} from './gamification.js';

// Scholar exports
export {
  SCHOLAR_TIERS,
  TIER_BENEFITS,
  getScholarTiers,
  getScholarTierByName,
  checkTierQualification,
  getQualifyingTier,
  getMyScholarStatus,
  getAthleteScholarStatus,
  getMyTierProgression,
  getScholarOpportunities,
  getScholarBrands,
  getScholarStats,
  getScholarsByTier,
  calculateScholarBoost,
} from './scholar.js';

// Matching exports
export {
  calculateMatchScore,
  getTopMatches,
  getTopMatchesForAthlete,
  getMatchingAthletes,
  getMajorIndustryMap,
  getMajorCategories,
  getBrandIndustries,
  setBrandIndustries,
  addBrandIndustry,
  removeBrandIndustry,
  recalculateAthleteMatches,
  recalculateBrandMatches,
  getMatchStats,
  findAthletesByIndustry,
  MAJOR_INDUSTRY_MAP,
  INDUSTRIES,
} from './matching.js';

// Calendar exports
export {
  getAcademicCalendar,
  getMySchoolCalendar,
  getMyAvailability,
  getAthleteAvailability,
  updateAvailability,
  addBlockedPeriod,
  removeBlockedPeriod,
  checkAvailability,
  checkMyAvailability,
  getBlockedPeriods,
  getMyBlockedPeriods,
  suggestDealTiming,
  suggestMyDealTiming,
  getUpcomingBlockingEvents,
  saveCalendarEvent,
  deleteCalendarEvent,
  getAvailabilitySummary,
  EVENT_TYPES,
  SEMESTERS,
  DAYS_OF_WEEK,
} from './calendar.js';

// AI exports
export {
  chat,
  analyzeDeal,
  recommendBrands,
  getScheduleAdvice,
  getScoreTips,
  getQuickInsights,
  getCareerGuidance,
  getNegotiationHelp,
  addToConversation,
  saveConversation,
  loadConversation,
  clearConversation,
  getConversationSummary,
  AI_ACTIONS,
  CONFIDENCE_LEVELS,
} from './ai.js';

/**
 * Initialize all services with Supabase configuration
 * Call this at app startup before using any services.
 *
 * @param {object} config - Configuration object
 * @param {string} config.supabaseUrl - Supabase project URL
 * @param {string} config.supabaseAnonKey - Supabase anon/public key
 *
 * @example
 * import { initServices } from './services/index.js';
 *
 * initServices({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseAnonKey: 'your-anon-key'
 * });
 */
export async function initServices(config) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  const { setConfig } = await import('./supabase.js');
  setConfig({
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  });
}

export default {
  initServices,
};
