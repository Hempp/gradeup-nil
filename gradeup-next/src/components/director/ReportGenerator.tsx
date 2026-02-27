'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils/format';
import type {
  ReportType,
  ReportFormat,
  NILActivityReport,
  AthleteEarningsReport,
  BrandActivityReport,
  ComplianceViolationsReport,
} from '@/lib/services/reports';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type AnyReport =
  | NILActivityReport
  | AthleteEarningsReport
  | BrandActivityReport
  | ComplianceViolationsReport;

interface ReportGeneratorProps {
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

const reportConfigs: Array<{
  type: ReportType;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    type: 'nil-activity',
    label: 'NIL Activity Report',
    description: 'All NIL deals for a specified date range',
    icon: FileText,
  },
  {
    type: 'athlete-earnings',
    label: 'Athlete Earnings Report',
    description: 'Earnings breakdown by athlete',
    icon: FileSpreadsheet,
  },
  {
    type: 'brand-activity',
    label: 'Brand Activity Report',
    description: 'Deal activity by brand/sponsor',
    icon: FileSpreadsheet,
  },
  {
    type: 'compliance-violations',
    label: 'Compliance Violations Report',
    description: 'Flagged and at-risk deals requiring attention',
    icon: AlertCircle,
  },
];

const formatOptions = [
  { value: 'csv', label: 'CSV (Spreadsheet)' },
  { value: 'pdf', label: 'PDF (Official Report)' },
  { value: 'json', label: 'JSON (Data Export)' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getDatePresets() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split('T')[0];

  // This quarter
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    .toISOString()
    .split('T')[0];

  // This year
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  // Last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return [
    { label: 'This Month', start: thisMonthStart, end: today },
    { label: 'Last Month', start: lastMonthStart, end: lastMonthEnd },
    { label: 'This Quarter', start: quarterStart, end: today },
    { label: 'Year to Date', start: yearStart, end: today },
    { label: 'Last 30 Days', start: thirtyDaysAgo, end: today },
    { label: 'Last 90 Days', start: ninetyDaysAgo, end: today },
  ];
}

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PDF generation using DOM manipulation and print
function generatePDF(report: AnyReport) {
  const reportType = report.reportType;
  const titles: Record<string, string> = {
    'nil-activity': 'NIL Activity Report',
    'athlete-earnings': 'Athlete Earnings Report',
    'brand-activity': 'Brand Activity Report',
    'compliance-violations': 'Compliance Violations Report',
  };

  const title = titles[reportType] || 'Compliance Report';
  const generatedAt = new Date(report.generatedAt).toLocaleString();

  // Create print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  // Build document using DOM manipulation
  const doc = printWindow.document;

  // Create head
  const style = doc.createElement('style');
  style.textContent = `
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { color: #1a1a1a; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { padding: 8px; border: 1px solid #ddd; background: #f5f5f5; text-align: left; }
    td { padding: 8px; border: 1px solid #ddd; }
    .summary { background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .summary-label { font-size: 12px; color: #666; }
    @media print { body { padding: 0; } button { display: none !important; } }
  `;
  doc.head.appendChild(style);

  // Set title
  doc.title = title;

  // Create body content
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  doc.body.appendChild(h1);

  const subtitle = doc.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = `Generated: ${generatedAt}`;
  doc.body.appendChild(subtitle);

  // Summary section
  const summaryDiv = doc.createElement('div');
  summaryDiv.className = 'summary';
  const summaryGrid = doc.createElement('div');
  summaryGrid.className = 'summary-grid';

  const summaryItems = getSummaryItems(report);
  summaryItems.forEach(item => {
    const itemDiv = doc.createElement('div');
    itemDiv.className = 'summary-item';

    const valueDiv = doc.createElement('div');
    valueDiv.className = 'summary-value';
    valueDiv.textContent = item.value;

    const labelDiv = doc.createElement('div');
    labelDiv.className = 'summary-label';
    labelDiv.textContent = item.label;

    itemDiv.appendChild(valueDiv);
    itemDiv.appendChild(labelDiv);
    summaryGrid.appendChild(itemDiv);
  });

  summaryDiv.appendChild(summaryGrid);
  doc.body.appendChild(summaryDiv);

  // Table
  if (report.rows && report.rows.length > 0) {
    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const tbody = doc.createElement('tbody');

    const firstRow = report.rows[0] as unknown as Record<string, unknown>;
    const columns = Object.keys(firstRow);

    // Header row
    const headerRow = doc.createElement('tr');
    columns.forEach(col => {
      const th = doc.createElement('th');
      th.textContent = formatColumnHeader(col);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Data rows
    report.rows.forEach(row => {
      const r = row as unknown as Record<string, unknown>;
      const tr = doc.createElement('tr');
      columns.forEach(col => {
        const td = doc.createElement('td');
        td.textContent = formatCellValue(col, r[col]);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    doc.body.appendChild(table);
  }

  // Auto-print
  printWindow.onload = () => {
    printWindow.print();
  };

  // Fallback for browsers that don't fire onload properly
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

function getSummaryItems(report: AnyReport): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];

  if ('totalDeals' in report) {
    items.push({ label: 'Total Deals', value: report.totalDeals.toString() });
  }
  if ('totalValue' in report) {
    items.push({ label: 'Total Value', value: formatCurrency(report.totalValue) });
  }
  if ('totalAthletes' in report) {
    items.push({ label: 'Total Athletes', value: report.totalAthletes.toString() });
  }
  if ('totalEarnings' in report) {
    items.push({ label: 'Total Earnings', value: formatCurrency(report.totalEarnings) });
  }
  if ('totalBrands' in report) {
    items.push({ label: 'Total Brands', value: report.totalBrands.toString() });
  }
  if ('totalSpent' in report) {
    items.push({ label: 'Total Spent', value: formatCurrency(report.totalSpent) });
  }
  if ('totalViolations' in report) {
    items.push({ label: 'Total Violations', value: report.totalViolations.toString() });
  }
  if ('totalAtRisk' in report) {
    items.push({ label: 'At Risk', value: report.totalAtRisk.toString() });
  }

  return items;
}

function formatColumnHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, 'ID');
}

function formatCellValue(column: string, value: unknown): string {
  if (value === null || value === undefined) return '-';

  if (column.toLowerCase().includes('amount') || column.toLowerCase().includes('earnings') || column.toLowerCase().includes('spent') || column.toLowerCase().includes('value')) {
    return typeof value === 'number' ? formatCurrency(value) : String(value);
  }

  if (column.toLowerCase().includes('date') || column.toLowerCase().includes('at')) {
    if (typeof value === 'string' && value.includes('T')) {
      return new Date(value).toLocaleDateString();
    }
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  return String(value);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ReportGenerator({ className }: ReportGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>('nil-activity');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{
    type: ReportType;
    timestamp: Date;
  } | null>(null);

  const toast = useToastActions();
  const datePresets = getDatePresets();

  const applyDatePreset = useCallback((preset: { start: string; end: string }) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
  }, []);

  const generateReport = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error('Date Range Required', 'Please select a start and end date for the report.');
      return;
    }

    setIsGenerating(true);

    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        start: startDate,
        end: endDate,
      });

      const response = await fetch(`/api/reports/${selectedReport}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      if (selectedFormat === 'csv') {
        const csvContent = await response.text();
        const filename = `${selectedReport}-report-${startDate}-to-${endDate}.csv`;
        downloadFile(csvContent, filename, 'text/csv');
        toast.success('Report Downloaded', `${filename} has been downloaded.`);
      } else if (selectedFormat === 'pdf') {
        const jsonData = await response.json();
        generatePDF(jsonData.report || jsonData);
        toast.success('Report Generated', 'PDF report opened in new window for printing.');
      } else {
        const jsonData = await response.json();
        const filename = `${selectedReport}-report-${startDate}-to-${endDate}.json`;
        downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
        toast.success('Report Downloaded', `${filename} has been downloaded.`);
      }

      setLastGenerated({ type: selectedReport, timestamp: new Date() });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(
        'Report Generation Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedReport, selectedFormat, startDate, endDate, toast]);

  const selectedConfig = reportConfigs.find(c => c.type === selectedReport);

  return (
    <>
      {/* Quick Export Panel */}
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Compliance Reports</CardTitle>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportConfigs.map(config => {
              const Icon = config.icon;
              return (
                <button
                  key={config.type}
                  onClick={() => {
                    setSelectedReport(config.type);
                    setIsModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10">
                    <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{config.label}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {lastGenerated && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                <span>
                  Last generated:{' '}
                  {reportConfigs.find(c => c.type === lastGenerated.type)?.label} at{' '}
                  {lastGenerated.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Generation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Compliance Report"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={generateReport}
              isLoading={isGenerating}
              disabled={!startDate || !endDate}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Report Type
            </label>
            <Select
              options={reportConfigs.map(c => ({
                value: c.type,
                label: c.label,
                description: c.description,
              }))}
              value={selectedReport}
              onChange={value => setSelectedReport(value as ReportType)}
            />
            {selectedConfig && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {selectedConfig.description}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date Range
            </label>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {datePresets.map(preset => (
                <Badge
                  key={preset.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  onClick={() => applyDatePreset(preset)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map(format => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value as ReportFormat)}
                  className={`p-3 rounded-[var(--radius-md)] border text-center transition-colors ${
                    selectedFormat === format.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <p className="text-sm font-medium">{format.value.toUpperCase()}</p>
                  <p className="text-xs mt-0.5 opacity-75">
                    {format.value === 'csv' && 'Spreadsheet'}
                    {format.value === 'pdf' && 'Print/Share'}
                    {format.value === 'json' && 'Data Export'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Generation Status */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-2 p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                Generating report...
              </span>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

export default ReportGenerator;
