// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// Re-export email types
export * from './email';

export type UserRole = 'athlete' | 'brand' | 'athletic_director' | 'admin';

export type DealStatus = 'draft' | 'pending' | 'negotiating' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'expired' | 'rejected' | 'paused';

export type DealType = 'social_post' | 'appearance' | 'endorsement' | 'autograph' | 'camp' | 'merchandise' | 'other';

export type CompensationType = 'fixed' | 'hourly' | 'per_post' | 'revenue_share' | 'product' | 'other';

// ─── User & Profile ───
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  last_login_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Highlight Videos ───
export type VideoPlatform = 'youtube' | 'tiktok';

export interface HighlightUrl {
  id: string;
  platform: VideoPlatform;
  url: string;
  title?: string;
  thumbnail_url?: string;
  added_at: string;
}

// ─── Athlete ───
export interface Athlete {
  id: string;
  profile_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gpa: number;
  school_id?: string;
  sport_id?: string;
  major?: string;
  minor?: string;
  position?: string;
  gender?: string;
  jersey_number?: string;
  height?: string;
  weight?: string;
  hometown?: string;
  expected_graduation?: string;
  academic_year?: string;
  avatar_url?: string;
  bio?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  tiktok_handle?: string;
  total_followers?: number;
  enrollment_verified: boolean;
  sport_verified: boolean;
  grades_verified: boolean;
  identity_verified: boolean;
  highlight_urls?: HighlightUrl[];
  created_at: string;
  updated_at: string;
  // Joined relations
  school?: School;
  sport?: Sport;
}

export interface School {
  id: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
  division?: string;
  conference?: string;
  logo_url?: string;
}

export interface Sport {
  id: string;
  name: string;
  category: string;
  gender: string;
  icon_name?: string;
}

// ─── Brand ───
export interface Brand {
  id: string;
  profile_id: string;
  company_name: string;
  company_type?: string;
  industry?: string;
  website_url?: string;
  logo_url?: string;
  contact_name: string;
  contact_title?: string;
  contact_email: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  total_spent: number;
  deals_completed: number;
  avg_deal_rating?: number;
  active_campaigns: number;
  preferred_sports?: string[];
  preferred_schools?: string[];
  preferred_divisions?: string[];
  min_gpa?: number;
  min_followers?: number;
  budget_range_min?: number;
  budget_range_max?: number;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Deal ───
export interface Deal {
  id: string;
  brand_id: string;
  athlete_id: string;
  opportunity_id?: string;
  title: string;
  description?: string;
  deal_type: DealType;
  compensation_type: CompensationType;
  compensation_amount: number;
  compensation_details?: string;
  deliverables?: string;
  status: DealStatus;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  completed_at?: string;
  expires_at?: string;
  // Joined relations
  brand?: Brand;
  athlete?: Athlete;
}

// ─── Opportunity ───
export interface Opportunity {
  id: string;
  brand_id: string;
  title: string;
  description?: string;
  deal_type: DealType;
  compensation_type: CompensationType;
  compensation_amount: number;
  compensation_details?: string;
  deliverables?: string;
  status: 'active' | 'closed' | 'paused' | 'draft';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  brand?: Brand;
}

// ─── Message ───
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
  // Legacy fields for backward compatibility
  deal_id?: string;
  sender_id?: string;
  message?: string;
  attachments?: string[];
  read_at?: string;
  created_at?: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar?: string;
  subtitle?: string; // e.g., school name, deal title
}

/**
 * Represents a conversation thread between participants (e.g., athlete and brand).
 * Contains the list of participants, the most recent message, and unread count.
 */
export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt?: string;
}

// ─── Campaign ───
export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  description?: string;
  budget: number;
  spent: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  target_sports?: string[];
  target_schools?: string[];
  target_min_gpa?: number;
  target_min_followers?: number;
  created_at: string;
  updated_at: string;
}

// ─── Analytics ───
export interface DashboardStats {
  totalEarnings: number;
  pendingEarnings: number;
  activeDeals: number;
  completedDeals: number;
  profileViews: number;
  nilValuation?: number;
  gradeUpScore?: number;
}

export interface BrandStats {
  totalSpent: number;
  activePartnerships: number;
  totalDeals: number;
  avgROI: number;
  activeCampaigns: number;
}

export interface DirectorStats {
  totalAthletes: number;
  verifiedAthletes: number;
  activeBrands: number;
  totalDeals: number;
  totalRevenue: number;
  complianceIssues: number;
}

// ─── Earnings ───
export interface Earning {
  id: string;
  athlete_id: string;
  deal_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paid_at?: string;
  created_at: string;
}

// ─── Navigation ───
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// ─── Verification Workflow ───
export type VerificationType = 'enrollment' | 'sport' | 'grades' | 'stats';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  athlete_id: string;
  director_id?: string;
  type: VerificationType;
  status: VerificationStatus;
  notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at?: string;
  // Joined relations
  athlete?: Athlete;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'verification_request' | 'verification_approved' | 'verification_rejected' | 'deal' | 'message' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}
