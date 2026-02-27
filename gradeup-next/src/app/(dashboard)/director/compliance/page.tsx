'use client';

import {
  ComplianceScoreCard,
  ComplianceStatsRow,
  FlaggedDealsQueue,
  ComplianceRulesPanel,
  AuditLogPanel,
  mockFlaggedDeals,
  mockComplianceRules,
  mockAuditLog,
  mockComplianceScore,
  mockMetrics,
} from './components';
import { ReportGenerator } from '@/components/director/ReportGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DirectorCompliancePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Compliance Center
        </h1>
        <p className="text-[var(--text-muted)]">
          NCAA compliance monitoring, rules management, and audit trail
        </p>
      </div>

      {/* Stats Row */}
      <ComplianceStatsRow flaggedDeals={mockFlaggedDeals} metrics={mockMetrics} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Flagged Deals Queue - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <FlaggedDealsQueue deals={mockFlaggedDeals} />
        </div>

        {/* Compliance Score - 1 column */}
        <div>
          <ComplianceScoreCard scoreData={mockComplianceScore} metrics={mockMetrics} />
        </div>
      </div>

      {/* Reports Section */}
      <ReportGenerator />

      {/* Rules Panel and Audit Log */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compliance Rules */}
        <ComplianceRulesPanel initialRules={mockComplianceRules} />

        {/* Audit Log */}
        <AuditLogPanel auditLog={mockAuditLog} />
      </div>
    </div>
  );
}
