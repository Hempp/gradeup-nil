/**
 * ScholarMatch AI Service
 * Client-side service for interacting with the ScholarMatch AI agent.
 * Provides intelligent NIL deal recommendations, brand matching, and career guidance.
 *
 * @module services/ai
 */

import { getSupabaseClient, invokeFunction, getCurrentUser } from './supabase.js';
import { getMyAthleteId } from './helpers.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} AIResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} message - The AI's response message
 * @property {Object} [data] - Additional structured data from the AI
 * @property {string} [action] - Suggested next action
 * @property {string[]} [suggestions] - Follow-up question suggestions
 */

/**
 * @typedef {Object} DealAnalysis
 * @property {number} matchScore - Overall match score (0-100)
 * @property {string[]} strengths - Deal strengths for this athlete
 * @property {string[]} concerns - Potential concerns or red flags
 * @property {number} estimatedValue - AI-estimated fair market value
 * @property {string} recommendation - AI recommendation (accept/negotiate/decline)
 * @property {string} reasoning - Detailed reasoning for the recommendation
 */

/**
 * @typedef {Object} BrandRecommendation
 * @property {string} brandId - Brand ID
 * @property {string} brandName - Brand company name
 * @property {number} matchScore - Match score (0-100)
 * @property {string[]} matchReasons - Why this brand is a good match
 * @property {string} suggestedApproach - How to approach this brand
 */

/**
 * @typedef {Object} ScheduleAdvice
 * @property {Object[]} prioritizedDeals - Deals sorted by priority
 * @property {Object[]} upcomingDeadlines - Important upcoming deadlines
 * @property {string[]} recommendations - Scheduling recommendations
 */

/**
 * @typedef {Object} ScoreTip
 * @property {string} category - 'athletic' | 'social' | 'academic'
 * @property {string} tip - The improvement tip
 * @property {number} potentialGain - Estimated score points to gain
 * @property {string} difficulty - 'easy' | 'medium' | 'hard'
 * @property {string} timeframe - Expected time to see results
 */

/**
 * @typedef {Object} QuickInsight
 * @property {string} type - 'opportunity' | 'warning' | 'tip' | 'achievement'
 * @property {string} title - Short title
 * @property {string} description - Full insight description
 * @property {string} [actionUrl] - Optional action URL
 * @property {string} [actionLabel] - Optional action button label
 */

/**
 * @typedef {Object} ConversationMessage
 * @property {string} id - Unique message ID
 * @property {'user' | 'assistant'} role - Message sender role
 * @property {string} content - Message content
 * @property {number} timestamp - Unix timestamp
 * @property {Object} [metadata] - Additional message metadata
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** AI action types for structured requests */
export const AI_ACTIONS = {
  CHAT: 'chat',
  ANALYZE_DEAL: 'analyze_deal',
  RECOMMEND_BRANDS: 'recommend_brands',
  SCHEDULE_ADVICE: 'schedule_advice',
  SCORE_TIPS: 'score_tips',
  QUICK_INSIGHTS: 'quick_insights',
  CAREER_GUIDANCE: 'career_guidance',
  NEGOTIATION_HELP: 'negotiation_help',
};

/** AI response confidence levels */
export const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/** Local storage key for conversation history */
const STORAGE_KEY = 'scholarmatch_history';
const MAX_HISTORY_LENGTH = 50;

/** Demo mode flag - set to false when backend is ready */
const DEMO_MODE = true;

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

/**
 * Send a chat message to ScholarMatch AI
 * @param {string} message - User's message
 * @param {Object} [context={}] - Additional context for the AI
 * @param {string} [context.currentPage] - Current page the user is on
 * @param {Object} [context.selectedDeal] - Currently viewed deal
 * @param {Object} [context.athleteProfile] - Athlete profile summary
 * @returns {Promise<{response: AIResponse | null, error: Error | null}>}
 */
export async function chat(message, context = {}) {
  if (DEMO_MODE) {
    return mockAI.chat(message, context);
  }

  const athleteId = await getMyAthleteId();

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.CHAT,
    message,
    context: {
      ...context,
      athleteId,
      conversationHistory: loadConversation().slice(-10), // Include recent history
    },
  });

  if (result.error) {
    return { response: null, error: result.error };
  }

  return { response: result.data, error: null };
}

/**
 * Get AI analysis of a specific deal
 * @param {string} dealId - Deal ID to analyze
 * @param {Object} [options={}] - Analysis options
 * @param {boolean} [options.includeNegotiationTips] - Include negotiation suggestions
 * @param {boolean} [options.compareToMarket] - Include market comparison
 * @returns {Promise<{analysis: DealAnalysis | null, error: Error | null}>}
 */
export async function analyzeDeal(dealId, options = {}) {
  if (!dealId) {
    return { analysis: null, error: new Error('Deal ID is required') };
  }

  if (DEMO_MODE) {
    return mockAI.analyzeDeal(dealId, options);
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { analysis: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.ANALYZE_DEAL,
    dealId,
    athleteId,
    options,
  });

  if (result.error) {
    return { analysis: null, error: result.error };
  }

  return { analysis: result.data, error: null };
}

/**
 * Get AI-powered brand recommendations based on athlete profile
 * @param {Object} [filters={}] - Filter options
 * @param {string[]} [filters.industries] - Preferred industries
 * @param {number} [filters.minDealValue] - Minimum deal value
 * @param {string[]} [filters.dealTypes] - Preferred deal types
 * @param {number} [filters.limit=10] - Maximum number of recommendations
 * @returns {Promise<{brands: BrandRecommendation[] | null, error: Error | null}>}
 */
export async function recommendBrands(filters = {}) {
  if (DEMO_MODE) {
    return mockAI.recommendBrands(filters);
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { brands: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.RECOMMEND_BRANDS,
    athleteId,
    filters: {
      industries: filters.industries || [],
      minDealValue: filters.minDealValue || 0,
      dealTypes: filters.dealTypes || [],
      limit: filters.limit || 10,
    },
  });

  if (result.error) {
    return { brands: null, error: result.error };
  }

  return { brands: result.data?.recommendations || [], error: null };
}

/**
 * Get scheduling advice for managing deals and opportunities
 * @returns {Promise<{advice: ScheduleAdvice | null, error: Error | null}>}
 */
export async function getScheduleAdvice() {
  if (DEMO_MODE) {
    return mockAI.getScheduleAdvice();
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { advice: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.SCHEDULE_ADVICE,
    athleteId,
  });

  if (result.error) {
    return { advice: null, error: result.error };
  }

  return { advice: result.data, error: null };
}

/**
 * Get personalized tips to improve GradeUp Score
 * @param {Object} [options={}] - Options
 * @param {string} [options.focusArea] - 'athletic' | 'social' | 'academic' | null for all
 * @param {number} [options.limit=5] - Maximum number of tips
 * @returns {Promise<{tips: ScoreTip[] | null, error: Error | null}>}
 */
export async function getScoreTips(options = {}) {
  if (DEMO_MODE) {
    return mockAI.getScoreTips(options);
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { tips: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.SCORE_TIPS,
    athleteId,
    options: {
      focusArea: options.focusArea || null,
      limit: options.limit || 5,
    },
  });

  if (result.error) {
    return { tips: null, error: result.error };
  }

  return { tips: result.data?.tips || [], error: null };
}

/**
 * Get quick insights for dashboard display
 * Returns 3-5 actionable insights based on current athlete status
 * @returns {Promise<{insights: QuickInsight[] | null, error: Error | null}>}
 */
export async function getQuickInsights() {
  if (DEMO_MODE) {
    return mockAI.getQuickInsights();
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { insights: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.QUICK_INSIGHTS,
    athleteId,
  });

  if (result.error) {
    return { insights: null, error: result.error };
  }

  return { insights: result.data?.insights || [], error: null };
}

/**
 * Get career guidance and long-term NIL strategy advice
 * @param {Object} [context={}] - Context for guidance
 * @param {string} [context.question] - Specific question about career/NIL
 * @param {string} [context.goalType] - 'short_term' | 'long_term' | 'both'
 * @returns {Promise<{guidance: Object | null, error: Error | null}>}
 */
export async function getCareerGuidance(context = {}) {
  if (DEMO_MODE) {
    return mockAI.getCareerGuidance(context);
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { guidance: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.CAREER_GUIDANCE,
    athleteId,
    context,
  });

  if (result.error) {
    return { guidance: null, error: result.error };
  }

  return { guidance: result.data, error: null };
}

/**
 * Get negotiation help for a specific deal
 * @param {string} dealId - Deal ID
 * @param {Object} [context={}] - Negotiation context
 * @param {number} [context.targetAmount] - Desired deal amount
 * @param {string[]} [context.concerns] - Specific concerns to address
 * @returns {Promise<{advice: Object | null, error: Error | null}>}
 */
export async function getNegotiationHelp(dealId, context = {}) {
  if (!dealId) {
    return { advice: null, error: new Error('Deal ID is required') };
  }

  if (DEMO_MODE) {
    return mockAI.getNegotiationHelp(dealId, context);
  }

  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { advice: null, error: new Error('Athlete profile not found') };
  }

  const result = await invokeFunction('scholarmatch-ai', {
    action: AI_ACTIONS.NEGOTIATION_HELP,
    dealId,
    athleteId,
    context,
  });

  if (result.error) {
    return { advice: null, error: result.error };
  }

  return { advice: result.data, error: null };
}

// ============================================================================
// CONVERSATION HISTORY MANAGEMENT
// ============================================================================

/**
 * Save a message to conversation history
 * @param {ConversationMessage} message - Message to save
 */
export function addToConversation(message) {
  const history = loadConversation();
  history.push({
    ...message,
    id: message.id || generateMessageId(),
    timestamp: message.timestamp || Date.now(),
  });

  // Trim history if too long
  if (history.length > MAX_HISTORY_LENGTH) {
    history.splice(0, history.length - MAX_HISTORY_LENGTH);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Save complete conversation history
 * @param {ConversationMessage[]} messages - Array of messages to save
 */
export function saveConversation(messages) {
  const trimmed = messages.slice(-MAX_HISTORY_LENGTH);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Load conversation history from local storage
 * @returns {ConversationMessage[]}
 */
export function loadConversation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
}

/**
 * Clear all conversation history
 */
export function clearConversation() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get conversation summary for context
 * @returns {string}
 */
export function getConversationSummary() {
  const history = loadConversation();
  if (history.length === 0) return '';

  const recentMessages = history.slice(-5);
  return recentMessages
    .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
    .join('\n');
}

/**
 * Generate a unique message ID
 * @returns {string}
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// DEMO MODE - INTELLIGENT MOCK RESPONSES
// ============================================================================

const mockAI = {
  /**
   * Mock chat function with intelligent responses
   */
  chat: async (message, context = {}) => {
    await simulateDelay(800, 1500);

    const lowerMessage = message.toLowerCase();
    let response;

    // Keyword-based intelligent responses
    if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
      response = {
        success: true,
        message: "Based on your profile, I see some great opportunities! Your 3.7 GPA and strong social presence make you an excellent candidate for educational and lifestyle brands. I'd recommend focusing on deals that align with your Business major - companies in finance, tech, and professional services often value scholar-athletes like you.",
        data: {
          relevantDeals: 3,
          avgMatchScore: 85,
        },
        suggestions: [
          'Show me my best brand matches',
          'What deals should I prioritize?',
          'Help me negotiate a better rate',
        ],
      };
    } else if (lowerMessage.includes('score') || lowerMessage.includes('gradeup')) {
      response = {
        success: true,
        message: "Your GradeUp Score is looking strong at 742/1000! Here's the breakdown: Athletic (320/400), Social (245/300), Academic (177/300). The biggest opportunity for improvement is in your social presence - growing your Instagram following by 2,000 could add 15 points. Also, maintaining your Dean's List status next semester would boost your academic score significantly.",
        data: {
          currentScore: 742,
          athleticScore: 320,
          socialScore: 245,
          academicScore: 177,
        },
        suggestions: [
          'How can I improve my social score?',
          'Tips for maintaining my GPA',
          'What score do top athletes have?',
        ],
      };
    } else if (lowerMessage.includes('brand') || lowerMessage.includes('sponsor')) {
      response = {
        success: true,
        message: "I've analyzed brands that match your profile. Top matches include: 1) Local fitness apparel companies (92% match) - they love scholar-athletes, 2) Regional banks and credit unions (88% match) - your business major is a big plus, 3) Sports nutrition brands (85% match) - high engagement potential. Want me to dive deeper into any of these?",
        data: {
          topMatches: 3,
          avgMatchScore: 88,
        },
        suggestions: [
          'Tell me more about fitness brands',
          'How do I approach a brand?',
          'What should I charge for posts?',
        ],
      };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
      response = {
        success: true,
        message: "I'm ScholarMatch AI, your personal NIL advisor! I can help you with:\n\n- **Deal Analysis**: Evaluate if a deal is right for you\n- **Brand Matching**: Find brands that align with your profile\n- **Score Optimization**: Tips to improve your GradeUp Score\n- **Scheduling**: Manage deadlines and prioritize opportunities\n- **Negotiation**: Get fair value for your NIL\n\nWhat would you like to explore?",
        suggestions: [
          'Analyze my current deals',
          'Find me brand matches',
          'How can I improve my score?',
        ],
      };
    } else if (lowerMessage.includes('negotiate') || lowerMessage.includes('price') || lowerMessage.includes('rate')) {
      response = {
        success: true,
        message: "Great question! Based on your GradeUp Score of 742 and market data, here are your recommended rates:\n\n- **Instagram Post**: $150-250\n- **Instagram Story**: $75-125\n- **TikTok Video**: $200-350\n- **Appearance (2hrs)**: $300-500\n\nYour academic achievements (3.7 GPA) can justify premium pricing with education-focused brands. Always remember: you bring unique value as a scholar-athlete!",
        data: {
          recommendedRates: {
            instagramPost: { min: 150, max: 250 },
            instagramStory: { min: 75, max: 125 },
            tiktokVideo: { min: 200, max: 350 },
            appearance: { min: 300, max: 500 },
          },
        },
        suggestions: [
          'Help me counter-offer on a deal',
          'What makes me more valuable?',
          'Should I accept this offer?',
        ],
      };
    } else {
      response = {
        success: true,
        message: "I'm here to help you maximize your NIL potential! As a scholar-athlete, you have unique value that combines athletic performance, academic achievement, and personal brand. What specific aspect of your NIL journey can I assist with today?",
        suggestions: [
          'Show me opportunities',
          'Analyze my profile',
          'Tips for success',
        ],
      };
    }

    return { response, error: null };
  },

  /**
   * Mock deal analysis
   */
  analyzeDeal: async (dealId, options = {}) => {
    await simulateDelay(1000, 2000);

    const analysis = {
      matchScore: 78,
      strengths: [
        'Brand aligns with your major (Business/Finance)',
        'Compensation is within market rate for your score',
        'Flexible timeline fits your academic schedule',
        'Brand has positive reputation with athletes',
      ],
      concerns: [
        'Exclusivity clause may limit future opportunities',
        'Deliverables timeline is tight during finals week',
        'No performance bonus structure included',
      ],
      estimatedValue: 1250,
      recommendation: 'negotiate',
      reasoning: "This is a solid opportunity, but there's room for improvement. I recommend negotiating on two points: 1) Request a modified exclusivity clause that only covers direct competitors, and 2) Propose shifting one deliverable deadline away from finals week. Your GradeUp Score of 742 supports asking for these adjustments.",
      negotiationTips: options.includeNegotiationTips ? [
        'Lead with your academic achievements - this brand values scholar-athletes',
        'Mention your engagement rate (4.2%) is above average for your follower count',
        'Propose a 15% increase citing your verified GPA status',
      ] : undefined,
      marketComparison: options.compareToMarket ? {
        avgDealValue: 1100,
        yourPosition: 'above_average',
        percentile: 68,
      } : undefined,
    };

    return { analysis, error: null };
  },

  /**
   * Mock brand recommendations
   */
  recommendBrands: async (filters = {}) => {
    await simulateDelay(1200, 2000);

    const brands = [
      {
        brandId: 'brand_001',
        brandName: 'Peak Performance Apparel',
        matchScore: 92,
        matchReasons: [
          'Strong focus on student-athlete authenticity',
          'Previous successful partnerships with D1 athletes',
          'Brand values align with academic excellence',
          'Local presence in your market',
        ],
        suggestedApproach: 'Reach out via their athlete portal. Mention your 3.7 GPA and consistent social engagement. They typically respond within 48 hours.',
      },
      {
        brandId: 'brand_002',
        brandName: 'First Regional Credit Union',
        matchScore: 88,
        matchReasons: [
          'Actively seeking business/finance majors',
          'Financial literacy campaign launching Q2',
          'Offers long-term ambassador programs',
          'Strong compensation for academic achievers',
        ],
        suggestedApproach: 'Contact their marketing team directly. Your business major makes you an ideal fit for their "Future Leaders" campaign.',
      },
      {
        brandId: 'brand_003',
        brandName: 'NutriBoost Sports',
        matchScore: 85,
        matchReasons: [
          'High-volume deal opportunities',
          'Flexible content requirements',
          'Growing presence in college athletics',
          'Performance-based bonuses available',
        ],
        suggestedApproach: 'Apply through their website. Emphasize your training regimen and how nutrition supports your academic and athletic performance.',
      },
      {
        brandId: 'brand_004',
        brandName: 'StudySync Tech',
        matchScore: 82,
        matchReasons: [
          'EdTech company targeting student-athletes',
          'Premium rates for high-GPA athletes',
          'Product aligns with your daily routine',
          'Long-term partnership potential',
        ],
        suggestedApproach: "They're launching a scholar-athlete ambassador program. Your verified academic status gives you priority access.",
      },
    ];

    // Apply filters
    let filtered = brands;
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return { brands: filtered, error: null };
  },

  /**
   * Mock schedule advice
   */
  getScheduleAdvice: async () => {
    await simulateDelay(800, 1500);

    const advice = {
      prioritizedDeals: [
        {
          dealId: 'deal_001',
          title: 'Instagram Campaign - Peak Performance',
          priority: 'high',
          reason: 'Deadline in 5 days, high-value opportunity',
          suggestedAction: 'Complete content creation this weekend',
        },
        {
          dealId: 'deal_002',
          title: 'Appearance - Local Charity Event',
          priority: 'medium',
          reason: 'Great for brand building, flexible scheduling',
          suggestedAction: 'Confirm attendance by Wednesday',
        },
        {
          dealId: 'deal_003',
          title: 'TikTok Series - NutriBoost',
          priority: 'medium',
          reason: 'Multi-part content, plan ahead',
          suggestedAction: 'Draft content calendar for approval',
        },
      ],
      upcomingDeadlines: [
        { date: '2024-02-10', item: 'Peak Performance content due', type: 'deal' },
        { date: '2024-02-15', item: 'Spring semester grades verification', type: 'academic' },
        { date: '2024-02-18', item: 'Charity event appearance', type: 'deal' },
        { date: '2024-02-28', item: 'NutriBoost series launch', type: 'deal' },
      ],
      recommendations: [
        'Block off study time during midterms week (Feb 20-24) - avoid scheduling deliverables',
        'Your engagement is highest on Tuesdays and Thursdays - schedule posts accordingly',
        'Consider batching content creation on Sundays to free up weekdays',
        "You have 2 pending opportunities expiring soon - review and respond by Friday",
      ],
    };

    return { advice, error: null };
  },

  /**
   * Mock score improvement tips
   */
  getScoreTips: async (options = {}) => {
    await simulateDelay(600, 1200);

    const allTips = [
      {
        category: 'social',
        tip: 'Increase posting frequency to 4-5 times per week. Your current rate of 2 posts/week is limiting engagement growth.',
        potentialGain: 15,
        difficulty: 'easy',
        timeframe: '2-4 weeks',
      },
      {
        category: 'social',
        tip: 'Cross-promote content on TikTok. Athletes who are active on both platforms average 23% higher social scores.',
        potentialGain: 20,
        difficulty: 'medium',
        timeframe: '1-2 months',
      },
      {
        category: 'academic',
        tip: "Push for Dean's List this semester. A 3.8+ GPA adds a 25-point multiplier to your academic score.",
        potentialGain: 25,
        difficulty: 'hard',
        timeframe: 'End of semester',
      },
      {
        category: 'academic',
        tip: 'Add your transcript verification. Verified GPAs receive a 10% bonus to academic score.',
        potentialGain: 12,
        difficulty: 'easy',
        timeframe: '1-2 weeks',
      },
      {
        category: 'athletic',
        tip: 'Complete your StatTaq profile sync. Real-time stats boost athletic score calculation accuracy.',
        potentialGain: 10,
        difficulty: 'easy',
        timeframe: '1 day',
      },
      {
        category: 'athletic',
        tip: 'Document your training regimen. Athletes with training content show higher brand engagement.',
        potentialGain: 8,
        difficulty: 'medium',
        timeframe: '2-3 weeks',
      },
    ];

    let tips = allTips;
    if (options.focusArea) {
      tips = tips.filter(t => t.category === options.focusArea);
    }
    if (options.limit) {
      tips = tips.slice(0, options.limit);
    }

    return { tips, error: null };
  },

  /**
   * Mock quick insights
   */
  getQuickInsights: async () => {
    await simulateDelay(500, 1000);

    const insights = [
      {
        type: 'opportunity',
        title: 'New Brand Match',
        description: 'StudySync Tech just launched their scholar-athlete program. Your profile is a 92% match!',
        actionUrl: '/opportunities?brand=studysync',
        actionLabel: 'View Opportunity',
      },
      {
        type: 'warning',
        title: 'Deal Deadline Approaching',
        description: 'Peak Performance content is due in 5 days. Make sure to complete your deliverables.',
        actionUrl: '/deals/deal_001',
        actionLabel: 'View Deal',
      },
      {
        type: 'tip',
        title: 'Score Boost Available',
        description: 'Verifying your transcript could add 12 points to your GradeUp Score.',
        actionUrl: '/profile/verification',
        actionLabel: 'Verify Now',
      },
      {
        type: 'achievement',
        title: 'Engagement Up 18%',
        description: 'Your social engagement increased significantly this week. Great job staying active!',
      },
    ];

    return { insights, error: null };
  },

  /**
   * Mock career guidance
   */
  getCareerGuidance: async (context = {}) => {
    await simulateDelay(1000, 1800);

    const guidance = {
      summary: "Based on your Business major and athletic performance, you're well-positioned for a strong NIL career that can translate into post-collegiate opportunities.",
      shortTermGoals: [
        {
          goal: 'Build brand partnerships in finance/professional services',
          reasoning: 'Aligns with your major and creates networking opportunities',
          timeline: 'Next 6 months',
        },
        {
          goal: 'Grow Instagram following to 15K',
          reasoning: 'This threshold unlocks premium brand opportunities',
          timeline: '3-4 months',
        },
        {
          goal: 'Maintain 3.7+ GPA',
          reasoning: 'Scholar-athlete status is your key differentiator',
          timeline: 'Ongoing',
        },
      ],
      longTermGoals: [
        {
          goal: 'Establish yourself as a thought leader in student-athlete finance',
          reasoning: 'Creates post-collegiate career opportunities',
          timeline: '1-2 years',
        },
        {
          goal: 'Build ambassador relationships (not one-off deals)',
          reasoning: 'Long-term partnerships are more valuable and stable',
          timeline: '6-12 months',
        },
      ],
      industryInsights: [
        'Finance and fintech brands are increasing NIL spending by 40% this year',
        'EdTech companies are specifically targeting scholar-athletes',
        'Your combination of business major + athletics is relatively rare and valuable',
      ],
    };

    return { guidance, error: null };
  },

  /**
   * Mock negotiation help
   */
  getNegotiationHelp: async (dealId, context = {}) => {
    await simulateDelay(800, 1500);

    const advice = {
      currentOffer: {
        amount: 1000,
        deliverables: ['3 Instagram posts', '5 Stories', '1 appearance'],
      },
      analysis: {
        marketValue: { min: 1100, max: 1400, average: 1250 },
        yourValue: 1275,
        offerRating: 'below_market',
      },
      counterOfferSuggestion: {
        amount: 1250,
        reasoning: 'Based on your GradeUp Score (742) and engagement rate (4.2%), you should be earning above-market rates. The 25% increase is justified.',
      },
      talkingPoints: [
        'Your verified 3.7 GPA demonstrates reliability and professionalism',
        'Your engagement rate of 4.2% is 40% above average for your follower count',
        'You have no pending exclusivity conflicts in this category',
        'Your audience demographics align perfectly with their target market',
      ],
      whatToAvoid: [
        'Accepting exclusivity without appropriate compensation bump',
        'Agreeing to tight deadlines during exam periods',
        'Unlimited revision requests - cap at 2 rounds',
      ],
      emailTemplate: `Hi [Brand Contact],

Thank you for the opportunity to partner with [Brand Name]. I'm excited about the potential collaboration.

After reviewing the proposal, I'd like to discuss the compensation. Given my verified academic standing (3.7 GPA), engagement rate (4.2% - 40% above platform average), and alignment with your brand values, I believe a rate of $1,250 would better reflect the value I can bring to this partnership.

I'm confident we can create content that resonates with your audience while maintaining the authentic, scholar-athlete perspective that makes these partnerships valuable.

Would you be open to discussing this adjustment?

Best regards,
[Your Name]`,
    };

    return { advice, error: null };
  },
};

/**
 * Simulate network delay for realistic demo experience
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @returns {Promise<void>}
 */
function simulateDelay(minMs, maxMs) {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core API functions
  chat,
  analyzeDeal,
  recommendBrands,
  getScheduleAdvice,
  getScoreTips,
  getQuickInsights,
  getCareerGuidance,
  getNegotiationHelp,

  // Conversation management
  addToConversation,
  saveConversation,
  loadConversation,
  clearConversation,
  getConversationSummary,

  // Constants
  AI_ACTIONS,
  CONFIDENCE_LEVELS,
};
