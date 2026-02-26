// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FlaggedDeal extends Record<string, unknown> {
  id: string;
  dealId: string;
  athleteName: string;
  athleteId: string;
  brandName: string;
  brandId: string;
  dealAmount: number;
  dealType: string;
  flagReason: string;
  severity: 'high' | 'medium' | 'low';
  assignedReviewer: string | null;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'investigating';
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  threshold?: number;
  unit?: string;
}

export interface AuditLogEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  adminUser: string;
  actionType: 'deal_approved' | 'deal_rejected' | 'rule_changed' | 'athlete_verified' | 'flag_raised' | 'flag_resolved';
  target: string;
  details: string;
}

export interface ComplianceScoreData {
  overall: number;
  previousMonth: number;
  breakdown: {
    documentation: number;
    dealCompliance: number;
    disclosureAdherence: number;
    academicStanding: number;
  };
  trends: {
    documentation: { current: number; previous: number; trend: 'up' | 'down' | 'stable' };
    dealCompliance: { current: number; previous: number; trend: 'up' | 'down' | 'stable' };
    disclosureAdherence: { current: number; previous: number; trend: 'up' | 'down' | 'stable' };
    academicStanding: { current: number; previous: number; trend: 'up' | 'down' | 'stable' };
  };
}

export interface ComplianceMetrics {
  totalDealsReviewed: number;
  dealsThisMonth: number;
  avgResolutionHours: number;
  complianceRate: number;
}
