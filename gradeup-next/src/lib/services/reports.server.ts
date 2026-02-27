import { createClient } from '@/lib/supabase/server';
import type { DealStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// REPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ReportType =
  | 'nil-activity'
  | 'athlete-earnings'
  | 'brand-activity'
  | 'compliance-violations';

export type ReportFormat = 'csv' | 'pdf' | 'json';

export type ComplianceStatus = 'compliant' | 'flagged' | 'at_risk' | 'pending_review';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  athleteId?: string;
  brandId?: string;
  status?: DealStatus[];
  complianceStatus?: ComplianceStatus[];
  schoolId?: string;
}

export interface ServiceResult<T = null> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// NIL ACTIVITY REPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface NILActivityReportRow {
  dealId: string;
  athleteName: string;
  athleteSport: string;
  athleteSchool: string;
  brandName: string;
  dealType: string;
  compensationAmount: number;
  status: DealStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  complianceStatus: ComplianceStatus;
}

export interface NILActivityReport {
  reportType: 'nil-activity';
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalDeals: number;
  totalValue: number;
  rows: NILActivityReportRow[];
  summary: {
    byStatus: Record<string, { count: number; value: number }>;
    byComplianceStatus: Record<string, number>;
    avgDealValue: number;
  };
}

export async function generateNILActivityReport(
  filters: ReportFilters
): Promise<ServiceResult<NILActivityReport>> {
  const supabase = await createClient();

  try {
    // Build base query
    let query = supabase
      .from('deals')
      .select(`
        id,
        title,
        deal_type,
        compensation_amount,
        status,
        start_date,
        end_date,
        created_at,
        athlete_id,
        athlete:athletes!inner(
          id,
          school_id,
          profile:profiles(first_name, last_name),
          school:schools(name),
          sport:sports(name)
        ),
        brand:brands(company_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.athleteId) {
      query = query.eq('athlete_id', filters.athleteId);
    }
    if (filters.brandId) {
      query = query.eq('brand_id', filters.brandId);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.schoolId) {
      query = query.eq('athlete.school_id', filters.schoolId);
    }

    const { data: deals, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Transform to report rows
    const rows: NILActivityReportRow[] = (deals || []).map((deal) => {
      const athlete = Array.isArray(deal.athlete) ? deal.athlete[0] : deal.athlete;
      const profile = athlete?.profile ? (Array.isArray(athlete.profile) ? athlete.profile[0] : athlete.profile) : null;
      const school = athlete?.school ? (Array.isArray(athlete.school) ? athlete.school[0] : athlete.school) : null;
      const sport = athlete?.sport ? (Array.isArray(athlete.sport) ? athlete.sport[0] : athlete.sport) : null;
      const brand = Array.isArray(deal.brand) ? deal.brand[0] : deal.brand;

      return {
        dealId: deal.id,
        athleteName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
        athleteSport: sport?.name || 'Unknown',
        athleteSchool: school?.name || 'Unknown',
        brandName: brand?.company_name || 'Unknown',
        dealType: formatDealType(deal.deal_type),
        compensationAmount: deal.compensation_amount || 0,
        status: deal.status,
        startDate: deal.start_date,
        endDate: deal.end_date,
        createdAt: deal.created_at,
        complianceStatus: determineComplianceStatus(deal),
      };
    });

    // Calculate summary
    const byStatus: Record<string, { count: number; value: number }> = {};
    const byComplianceStatus: Record<string, number> = {};
    let totalValue = 0;

    for (const row of rows) {
      if (!byStatus[row.status]) {
        byStatus[row.status] = { count: 0, value: 0 };
      }
      byStatus[row.status].count++;
      byStatus[row.status].value += row.compensationAmount;

      if (!byComplianceStatus[row.complianceStatus]) {
        byComplianceStatus[row.complianceStatus] = 0;
      }
      byComplianceStatus[row.complianceStatus]++;

      totalValue += row.compensationAmount;
    }

    const report: NILActivityReport = {
      reportType: 'nil-activity',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: filters.startDate || 'N/A',
        end: filters.endDate || 'N/A',
      },
      totalDeals: rows.length,
      totalValue,
      rows,
      summary: {
        byStatus,
        byComplianceStatus,
        avgDealValue: rows.length > 0 ? totalValue / rows.length : 0,
      },
    };

    return { data: report, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error occurred' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ATHLETE EARNINGS REPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface AthleteEarningsReportRow {
  athleteId: string;
  athleteName: string;
  sport: string;
  school: string;
  gpa: number | null;
  totalDeals: number;
  completedDeals: number;
  activeDeals: number;
  totalEarnings: number;
  pendingEarnings: number;
  avgDealValue: number;
}

export interface AthleteEarningsReport {
  reportType: 'athlete-earnings';
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalAthletes: number;
  totalEarnings: number;
  rows: AthleteEarningsReportRow[];
  summary: {
    avgEarningsPerAthlete: number;
    topEarnerAmount: number;
    bySport: Record<string, { athletes: number; earnings: number }>;
  };
}

export async function generateAthleteEarningsReport(
  filters: ReportFilters
): Promise<ServiceResult<AthleteEarningsReport>> {
  const supabase = await createClient();

  try {
    // Get athletes
    let athleteQuery = supabase
      .from('athletes')
      .select(`
        id,
        gpa,
        profile:profiles(first_name, last_name),
        school:schools(name),
        sport:sports(name)
      `);

    if (filters.athleteId) {
      athleteQuery = athleteQuery.eq('id', filters.athleteId);
    }
    if (filters.schoolId) {
      athleteQuery = athleteQuery.eq('school_id', filters.schoolId);
    }

    const { data: athletes, error: athletesError } = await athleteQuery;

    if (athletesError) {
      return { data: null, error: { message: athletesError.message, code: athletesError.code } };
    }

    const athleteIds = (athletes || []).map(a => a.id);

    if (athleteIds.length === 0) {
      return {
        data: {
          reportType: 'athlete-earnings',
          generatedAt: new Date().toISOString(),
          dateRange: { start: filters.startDate || 'N/A', end: filters.endDate || 'N/A' },
          totalAthletes: 0,
          totalEarnings: 0,
          rows: [],
          summary: { avgEarningsPerAthlete: 0, topEarnerAmount: 0, bySport: {} },
        },
        error: null,
      };
    }

    // Get deals
    let dealsQuery = supabase
      .from('deals')
      .select('id, athlete_id, compensation_amount, status')
      .in('athlete_id', athleteIds);

    if (filters.startDate) {
      dealsQuery = dealsQuery.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      dealsQuery = dealsQuery.lte('created_at', filters.endDate);
    }

    const { data: deals, error: dealsError } = await dealsQuery;

    if (dealsError) {
      return { data: null, error: { message: dealsError.message, code: dealsError.code } };
    }

    // Group deals by athlete
    const dealsByAthlete: Record<string, typeof deals> = {};
    for (const deal of deals || []) {
      if (!dealsByAthlete[deal.athlete_id]) {
        dealsByAthlete[deal.athlete_id] = [];
      }
      dealsByAthlete[deal.athlete_id].push(deal);
    }

    // Build rows
    const rows: AthleteEarningsReportRow[] = [];
    const bySport: Record<string, { athletes: number; earnings: number }> = {};
    let totalEarnings = 0;
    let topEarnerAmount = 0;

    for (const athlete of athletes || []) {
      const profile = Array.isArray(athlete.profile) ? athlete.profile[0] : athlete.profile;
      const school = Array.isArray(athlete.school) ? athlete.school[0] : athlete.school;
      const sport = Array.isArray(athlete.sport) ? athlete.sport[0] : athlete.sport;
      const athleteDeals = dealsByAthlete[athlete.id] || [];

      const completedDeals = athleteDeals.filter(d => d.status === 'completed');
      const activeDeals = athleteDeals.filter(d => d.status === 'active' || d.status === 'accepted');
      const pendingDeals = athleteDeals.filter(d => d.status === 'pending' || d.status === 'negotiating');

      const athleteEarnings = completedDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0);
      const pendingEarnings = [...activeDeals, ...pendingDeals].reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

      const row: AthleteEarningsReportRow = {
        athleteId: athlete.id,
        athleteName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
        sport: sport?.name || 'Unknown',
        school: school?.name || 'Unknown',
        gpa: athlete.gpa,
        totalDeals: athleteDeals.length,
        completedDeals: completedDeals.length,
        activeDeals: activeDeals.length,
        totalEarnings: athleteEarnings,
        pendingEarnings,
        avgDealValue: athleteDeals.length > 0
          ? athleteDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0) / athleteDeals.length
          : 0,
      };

      rows.push(row);
      totalEarnings += athleteEarnings;

      if (athleteEarnings > topEarnerAmount) {
        topEarnerAmount = athleteEarnings;
      }

      const sportName = sport?.name || 'Unknown';
      if (!bySport[sportName]) {
        bySport[sportName] = { athletes: 0, earnings: 0 };
      }
      bySport[sportName].athletes++;
      bySport[sportName].earnings += athleteEarnings;
    }

    rows.sort((a, b) => b.totalEarnings - a.totalEarnings);

    const report: AthleteEarningsReport = {
      reportType: 'athlete-earnings',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: filters.startDate || 'N/A',
        end: filters.endDate || 'N/A',
      },
      totalAthletes: rows.length,
      totalEarnings,
      rows,
      summary: {
        avgEarningsPerAthlete: rows.length > 0 ? totalEarnings / rows.length : 0,
        topEarnerAmount,
        bySport,
      },
    };

    return { data: report, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error occurred' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND ACTIVITY REPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface BrandActivityReportRow {
  brandId: string;
  brandName: string;
  industry: string | null;
  totalDeals: number;
  completedDeals: number;
  activeDeals: number;
  totalSpent: number;
  pendingAmount: number;
  avgDealValue: number;
  athletePartnerships: number;
}

export interface BrandActivityReport {
  reportType: 'brand-activity';
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalBrands: number;
  totalSpent: number;
  rows: BrandActivityReportRow[];
  summary: {
    avgSpendPerBrand: number;
    topSpenderAmount: number;
    byIndustry: Record<string, { brands: number; spent: number }>;
  };
}

export async function generateBrandActivityReport(
  filters: ReportFilters
): Promise<ServiceResult<BrandActivityReport>> {
  const supabase = await createClient();

  try {
    // Get brands
    let brandQuery = supabase
      .from('brands')
      .select('id, company_name, industry');

    if (filters.brandId) {
      brandQuery = brandQuery.eq('id', filters.brandId);
    }

    const { data: brands, error: brandsError } = await brandQuery;

    if (brandsError) {
      return { data: null, error: { message: brandsError.message, code: brandsError.code } };
    }

    const brandIds = (brands || []).map(b => b.id);

    if (brandIds.length === 0) {
      return {
        data: {
          reportType: 'brand-activity',
          generatedAt: new Date().toISOString(),
          dateRange: { start: filters.startDate || 'N/A', end: filters.endDate || 'N/A' },
          totalBrands: 0,
          totalSpent: 0,
          rows: [],
          summary: { avgSpendPerBrand: 0, topSpenderAmount: 0, byIndustry: {} },
        },
        error: null,
      };
    }

    // Get deals - optionally filter by school through athlete
    let dealsQuery = supabase
      .from('deals')
      .select(`
        id, brand_id, athlete_id, compensation_amount, status,
        athlete:athletes(school_id)
      `)
      .in('brand_id', brandIds);

    if (filters.startDate) {
      dealsQuery = dealsQuery.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      dealsQuery = dealsQuery.lte('created_at', filters.endDate);
    }

    const { data: deals, error: dealsError } = await dealsQuery;

    if (dealsError) {
      return { data: null, error: { message: dealsError.message, code: dealsError.code } };
    }

    // Filter by school if needed
    let filteredDeals = deals || [];
    if (filters.schoolId) {
      filteredDeals = filteredDeals.filter(deal => {
        const athlete = Array.isArray(deal.athlete) ? deal.athlete[0] : deal.athlete;
        return athlete?.school_id === filters.schoolId;
      });
    }

    // Group deals by brand
    const dealsByBrand: Record<string, typeof filteredDeals> = {};
    for (const deal of filteredDeals) {
      if (!dealsByBrand[deal.brand_id]) {
        dealsByBrand[deal.brand_id] = [];
      }
      dealsByBrand[deal.brand_id].push(deal);
    }

    // Build rows
    const rows: BrandActivityReportRow[] = [];
    const byIndustry: Record<string, { brands: number; spent: number }> = {};
    let totalSpent = 0;
    let topSpenderAmount = 0;

    for (const brand of brands || []) {
      const brandDeals = dealsByBrand[brand.id] || [];

      // Skip brands with no deals matching filters
      if (brandDeals.length === 0) continue;

      const completedDeals = brandDeals.filter(d => d.status === 'completed');
      const activeDeals = brandDeals.filter(d => d.status === 'active' || d.status === 'accepted');
      const pendingDeals = brandDeals.filter(d => d.status === 'pending' || d.status === 'negotiating');

      const brandSpent = completedDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0);
      const pendingAmount = [...activeDeals, ...pendingDeals].reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

      const uniqueAthletes = new Set(brandDeals.map(d => d.athlete_id));

      const row: BrandActivityReportRow = {
        brandId: brand.id,
        brandName: brand.company_name,
        industry: brand.industry,
        totalDeals: brandDeals.length,
        completedDeals: completedDeals.length,
        activeDeals: activeDeals.length,
        totalSpent: brandSpent,
        pendingAmount,
        avgDealValue: brandDeals.length > 0
          ? brandDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0) / brandDeals.length
          : 0,
        athletePartnerships: uniqueAthletes.size,
      };

      rows.push(row);
      totalSpent += brandSpent;

      if (brandSpent > topSpenderAmount) {
        topSpenderAmount = brandSpent;
      }

      const industry = brand.industry || 'Other';
      if (!byIndustry[industry]) {
        byIndustry[industry] = { brands: 0, spent: 0 };
      }
      byIndustry[industry].brands++;
      byIndustry[industry].spent += brandSpent;
    }

    rows.sort((a, b) => b.totalSpent - a.totalSpent);

    const report: BrandActivityReport = {
      reportType: 'brand-activity',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: filters.startDate || 'N/A',
        end: filters.endDate || 'N/A',
      },
      totalBrands: rows.length,
      totalSpent,
      rows,
      summary: {
        avgSpendPerBrand: rows.length > 0 ? totalSpent / rows.length : 0,
        topSpenderAmount,
        byIndustry,
      },
    };

    return { data: report, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error occurred' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE VIOLATIONS REPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface ComplianceViolationRow {
  dealId: string;
  athleteName: string;
  athleteSchool: string;
  brandName: string;
  dealType: string;
  compensationAmount: number;
  status: DealStatus;
  complianceStatus: ComplianceStatus;
  violationReason: string;
  flaggedAt: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ComplianceViolationsReport {
  reportType: 'compliance-violations';
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalViolations: number;
  totalAtRisk: number;
  rows: ComplianceViolationRow[];
  summary: {
    bySeverity: Record<string, number>;
    byViolationType: Record<string, number>;
    totalValueAtRisk: number;
  };
}

export async function generateComplianceViolationsReport(
  filters: ReportFilters
): Promise<ServiceResult<ComplianceViolationsReport>> {
  const supabase = await createClient();

  try {
    // Build query
    let query = supabase
      .from('deals')
      .select(`
        id,
        title,
        deal_type,
        compensation_amount,
        status,
        created_at,
        athlete:athletes!inner(
          id,
          gpa,
          school_id,
          profile:profiles(first_name, last_name),
          school:schools(name)
        ),
        brand:brands(company_name, industry)
      `)
      .order('created_at', { ascending: false });

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.schoolId) {
      query = query.eq('athlete.school_id', filters.schoolId);
    }

    const { data: deals, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Identify violations
    const rows: ComplianceViolationRow[] = [];
    const bySeverity: Record<string, number> = {};
    const byViolationType: Record<string, number> = {};
    let totalValueAtRisk = 0;

    for (const deal of deals || []) {
      const violation = checkForViolations(deal);
      if (!violation) continue;

      if (filters.complianceStatus && filters.complianceStatus.length > 0) {
        if (!filters.complianceStatus.includes(violation.complianceStatus)) {
          continue;
        }
      }

      const athlete = Array.isArray(deal.athlete) ? deal.athlete[0] : deal.athlete;
      const profile = athlete?.profile ? (Array.isArray(athlete.profile) ? athlete.profile[0] : athlete.profile) : null;
      const school = athlete?.school ? (Array.isArray(athlete.school) ? athlete.school[0] : athlete.school) : null;
      const brand = Array.isArray(deal.brand) ? deal.brand[0] : deal.brand;

      const row: ComplianceViolationRow = {
        dealId: deal.id,
        athleteName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
        athleteSchool: school?.name || 'Unknown',
        brandName: brand?.company_name || 'Unknown',
        dealType: formatDealType(deal.deal_type),
        compensationAmount: deal.compensation_amount || 0,
        status: deal.status,
        complianceStatus: violation.complianceStatus,
        violationReason: violation.reason,
        flaggedAt: deal.created_at,
        severity: violation.severity,
      };

      rows.push(row);
      totalValueAtRisk += deal.compensation_amount || 0;

      if (!bySeverity[violation.severity]) {
        bySeverity[violation.severity] = 0;
      }
      bySeverity[violation.severity]++;

      if (!byViolationType[violation.type]) {
        byViolationType[violation.type] = 0;
      }
      byViolationType[violation.type]++;
    }

    const severityOrder = { high: 0, medium: 1, low: 2 };
    rows.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.compensationAmount - a.compensationAmount;
    });

    const report: ComplianceViolationsReport = {
      reportType: 'compliance-violations',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: filters.startDate || 'N/A',
        end: filters.endDate || 'N/A',
      },
      totalViolations: rows.filter(r => r.complianceStatus === 'flagged').length,
      totalAtRisk: rows.filter(r => r.complianceStatus === 'at_risk').length,
      rows,
      summary: {
        bySeverity,
        byViolationType,
        totalValueAtRisk,
      },
    };

    return { data: report, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error occurred' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

export function reportToCSV<T extends { rows: unknown[] }>(report: T): string {
  if (!report.rows || report.rows.length === 0) {
    return '';
  }

  const rows = report.rows as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCSVValue).join(','));

  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVValue(formatCSVValue(value));
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function reportToPDFData(report:
  | NILActivityReport
  | AthleteEarningsReport
  | BrandActivityReport
  | ComplianceViolationsReport
): {
  title: string;
  generatedAt: string;
  metadata: Record<string, unknown>;
  sections: Array<{ heading: string; content: unknown }>;
} {
  const reportType = report.reportType;

  const titles: Record<string, string> = {
    'nil-activity': 'NIL Activity Report',
    'athlete-earnings': 'Athlete Earnings Report',
    'brand-activity': 'Brand Activity Report',
    'compliance-violations': 'Compliance Violations Report',
  };

  return {
    title: titles[reportType] || 'NCAA Compliance Report',
    generatedAt: (report.generatedAt as string) || new Date().toISOString(),
    metadata: {
      dateRange: report.dateRange || {},
      totalRecords: Array.isArray(report.rows) ? report.rows.length : 0,
    },
    sections: [
      { heading: 'Summary', content: report.summary || {} },
      { heading: 'Details', content: report.rows || [] },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDealType(dealType: string): string {
  const types: Record<string, string> = {
    social_post: 'Social Media Post',
    appearance: 'Appearance',
    endorsement: 'Endorsement',
    autograph: 'Autograph Session',
    camp: 'Camp/Clinic',
    merchandise: 'Merchandise',
    other: 'Other',
  };
  return types[dealType] || dealType;
}

function determineComplianceStatus(deal: {
  status: string;
  compensation_amount: number;
}): ComplianceStatus {
  if (deal.compensation_amount > 100000) {
    return 'pending_review';
  }
  if (deal.status === 'cancelled' || deal.status === 'rejected') {
    return 'flagged';
  }
  if (deal.status === 'pending' || deal.status === 'negotiating') {
    return 'pending_review';
  }
  return 'compliant';
}

interface ViolationResult {
  complianceStatus: ComplianceStatus;
  reason: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
}

function checkForViolations(deal: {
  id: string;
  compensation_amount: number;
  status: string;
  deal_type: string;
  athlete?: unknown;
  brand?: unknown;
}): ViolationResult | null {
  // Handle Supabase's potential array wrapping
  const athleteData = Array.isArray(deal.athlete) ? deal.athlete[0] : deal.athlete;
  const brandData = Array.isArray(deal.brand) ? deal.brand[0] : deal.brand;

  // Type-safe extraction of nested fields
  const athlete = athleteData as { gpa?: number } | null | undefined;
  const brand = brandData as { industry?: string } | null | undefined;

  const restrictedIndustries = ['gambling', 'betting', 'alcohol', 'tobacco', 'cannabis'];
  if (brand?.industry && restrictedIndustries.some(r => brand.industry?.toLowerCase().includes(r))) {
    return {
      complianceStatus: 'flagged',
      reason: `Brand industry (${brand.industry}) is restricted under NCAA guidelines`,
      type: 'restricted_industry',
      severity: 'high',
    };
  }

  if (deal.compensation_amount > 100000) {
    return {
      complianceStatus: 'pending_review',
      reason: 'Deal value exceeds $100,000 threshold - requires additional review',
      type: 'high_value',
      severity: 'medium',
    };
  }

  if (athlete?.gpa && athlete.gpa < 2.0) {
    return {
      complianceStatus: 'at_risk',
      reason: `Athlete GPA (${athlete.gpa.toFixed(2)}) below minimum eligibility requirement`,
      type: 'academic_standing',
      severity: 'high',
    };
  }

  if (athlete?.gpa && athlete.gpa < 2.5) {
    return {
      complianceStatus: 'at_risk',
      reason: `Athlete GPA (${athlete.gpa.toFixed(2)}) approaching minimum eligibility threshold`,
      type: 'academic_standing',
      severity: 'low',
    };
  }

  return null;
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
