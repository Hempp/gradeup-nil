// ═══════════════════════════════════════════════════════════════════════════
// Athlete Detail Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AthleteData {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  sport: string;
  position: string;
  year: string;
  major: string;
  gpa: number;
  followers: number;
  totalEarnings: number;
  activeDeals: number;
  completedDeals: number;
  verified: boolean;
  enrollmentVerified: boolean;
  sportVerified: boolean;
  gradesVerified: boolean;
  status: 'active' | 'flagged' | 'suspended';
  joinedAt: string;
  lastActive: string;
  profileImage: string | null;
  socialMedia: {
    instagram: string | null;
    twitter: string | null;
  };
}

export interface Deal extends Record<string, unknown> {
  id: string;
  brand: string;
  type: string;
  amount: number;
  status: 'active' | 'completed' | 'pending' | 'cancelled';
  startDate: string;
  endDate: string | null;
}

export interface AuditEntry extends Record<string, unknown> {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  createdAt: string;
  type: 'verification' | 'compliance' | 'admin' | 'deal' | 'warning';
}

export type VerificationType = 'enrollment' | 'grades' | 'stats';

export interface VerificationModalState {
  enrollment: boolean;
  grades: boolean;
  stats: boolean;
  revokeEnrollment: boolean;
  revokeGrades: boolean;
  revokeStats: boolean;
}

export interface AdminModalState {
  verify: boolean;
  suspend: boolean;
  reinstate: boolean;
  delete: boolean;
}
