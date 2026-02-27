import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateNILActivityReport,
  generateAthleteEarningsReport,
  generateBrandActivityReport,
  generateComplianceViolationsReport,
  reportToCSV,
  reportToPDFData,
  type ReportType,
  type ReportFilters,
  type ReportFormat,
  type ComplianceStatus,
} from '@/lib/services/reports.server';
import type { DealStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/reports/[type]
 *
 * Generate compliance reports for athletic directors.
 *
 * Path Parameters:
 *   type: 'nil-activity' | 'athlete-earnings' | 'brand-activity' | 'compliance-violations'
 *
 * Query Parameters:
 *   - format: 'csv' | 'pdf' | 'json' (default: 'json')
 *   - start: ISO date string for start of date range
 *   - end: ISO date string for end of date range
 *   - athleteId: Filter by specific athlete
 *   - brandId: Filter by specific brand
 *   - status: Comma-separated deal statuses to filter
 *   - complianceStatus: Comma-separated compliance statuses to filter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access reports.' },
        { status: 401 }
      );
    }

    // Check if user has athletic director role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unable to verify user permissions.' },
        { status: 403 }
      );
    }

    // Allow athletic directors and admins to access reports
    if (profile.role !== 'athletic_director' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only athletic directors and administrators can generate reports.' },
        { status: 403 }
      );
    }

    // Parse route parameter
    const { type } = await params;
    const reportType = type as ReportType;

    // Validate report type
    const validTypes: ReportType[] = [
      'nil-activity',
      'athlete-earnings',
      'brand-activity',
      'compliance-violations',
    ];

    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        {
          error: `Invalid report type: ${type}. Valid types are: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as ReportFormat;
    const startDate = searchParams.get('start') || undefined;
    const endDate = searchParams.get('end') || undefined;
    const athleteId = searchParams.get('athleteId') || undefined;
    const brandId = searchParams.get('brandId') || undefined;
    const statusParam = searchParams.get('status');
    const complianceStatusParam = searchParams.get('complianceStatus');

    // Validate format
    const validFormats: ReportFormat[] = ['csv', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format: ${format}. Valid formats are: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Build filters
    const filters: ReportFilters = {
      startDate,
      endDate,
      athleteId,
      brandId,
    };

    if (statusParam) {
      filters.status = statusParam.split(',') as DealStatus[];
    }

    if (complianceStatusParam) {
      filters.complianceStatus = complianceStatusParam.split(',') as ComplianceStatus[];
    }

    // If athletic director, scope to their school
    if (profile.role === 'athletic_director') {
      const { data: director, error: directorError } = await supabase
        .from('athletic_directors')
        .select('school_id')
        .eq('profile_id', user.id)
        .single();

      if (directorError || !director?.school_id) {
        return NextResponse.json(
          { error: 'Unable to determine school association for this athletic director.' },
          { status: 403 }
        );
      }

      filters.schoolId = director.school_id;
    }

    // Generate the appropriate report
    let reportResult;

    switch (reportType) {
      case 'nil-activity':
        reportResult = await generateNILActivityReport(filters);
        break;
      case 'athlete-earnings':
        reportResult = await generateAthleteEarningsReport(filters);
        break;
      case 'brand-activity':
        reportResult = await generateBrandActivityReport(filters);
        break;
      case 'compliance-violations':
        reportResult = await generateComplianceViolationsReport(filters);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 });
    }

    if (reportResult.error) {
      return NextResponse.json(
        { error: reportResult.error.message },
        { status: 500 }
      );
    }

    const report = reportResult.data;

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    // Format and return response based on requested format
    switch (format) {
      case 'csv': {
        const csv = reportToCSV(report);
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }

      case 'pdf': {
        // Return PDF-ready data structure
        // Note: Actual PDF rendering should be done client-side using a library like jsPDF or react-pdf
        const pdfData = reportToPDFData(report);
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;

        return NextResponse.json(
          {
            format: 'pdf',
            filename,
            data: pdfData,
            // Include raw report for client-side PDF generation
            report,
          },
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Suggested-Filename': filename,
            },
          }
        );
      }

      case 'json':
      default:
        return NextResponse.json(report, { status: 200 });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST handler for complex report generation with body parameters
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/reports/[type]
 *
 * Generate reports with more complex filtering options.
 * Use POST when you need to send complex filter criteria.
 *
 * Body Parameters:
 *   - format: 'csv' | 'pdf' | 'json'
 *   - filters: ReportFilters object
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access reports.' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unable to verify user permissions.' },
        { status: 403 }
      );
    }

    if (profile.role !== 'athletic_director' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only athletic directors and administrators can generate reports.' },
        { status: 403 }
      );
    }

    const { type } = await params;
    const reportType = type as ReportType;

    const validTypes: ReportType[] = [
      'nil-activity',
      'athlete-earnings',
      'brand-activity',
      'compliance-violations',
    ];

    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid report type: ${type}` },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const format = (body.format || 'json') as ReportFormat;
    const filters: ReportFilters = body.filters || {};

    // Scope to school for athletic directors
    if (profile.role === 'athletic_director') {
      const { data: director, error: directorError } = await supabase
        .from('athletic_directors')
        .select('school_id')
        .eq('profile_id', user.id)
        .single();

      if (directorError || !director?.school_id) {
        return NextResponse.json(
          { error: 'Unable to determine school association.' },
          { status: 403 }
        );
      }

      filters.schoolId = director.school_id;
    }

    // Generate report
    let reportResult;

    switch (reportType) {
      case 'nil-activity':
        reportResult = await generateNILActivityReport(filters);
        break;
      case 'athlete-earnings':
        reportResult = await generateAthleteEarningsReport(filters);
        break;
      case 'brand-activity':
        reportResult = await generateBrandActivityReport(filters);
        break;
      case 'compliance-violations':
        reportResult = await generateComplianceViolationsReport(filters);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 });
    }

    if (reportResult.error) {
      return NextResponse.json(
        { error: reportResult.error.message },
        { status: 500 }
      );
    }

    const report = reportResult.data;

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    // Format response
    switch (format) {
      case 'csv': {
        const csv = reportToCSV(report);
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      case 'pdf': {
        const pdfData = reportToPDFData(report);
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;

        return NextResponse.json(
          { format: 'pdf', filename, data: pdfData, report },
          {
            status: 200,
            headers: { 'X-Suggested-Filename': filename },
          }
        );
      }

      case 'json':
      default:
        return NextResponse.json(report, { status: 200 });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
