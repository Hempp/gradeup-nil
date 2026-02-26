'use client';

import { useState } from 'react';
import {
  Settings,
  DollarSign,
  XCircle,
  FileText,
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import type { ComplianceRule } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY ICONS
// ═══════════════════════════════════════════════════════════════════════════

const categoryIcons: Record<string, React.ReactNode> = {
  'Compensation Limits': <DollarSign className="h-4 w-4" />,
  'Restricted Categories': <XCircle className="h-4 w-4" />,
  'Disclosure Requirements': <FileText className="h-4 w-4" />,
  'Documentation': <FileText className="h-4 w-4" />,
  'Academic Requirements': <Activity className="h-4 w-4" />,
  'Practice & Competition': <Calendar className="h-4 w-4" />,
};

// Critical rules that require confirmation when disabling
const CRITICAL_RULE_IDS = ['1', '2', '3', '5', '6', '7', '8', '14', '18'];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ComplianceRulesPanelProps {
  initialRules: ComplianceRule[];
}

export function ComplianceRulesPanel({ initialRules }: ComplianceRulesPanelProps) {
  const [rules, setRules] = useState(initialRules);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Compensation Limits', 'Restricted Categories']);
  const [pendingToggle, setPendingToggle] = useState<{ rule: ComplianceRule; newState: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const toast = useToastActions();

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleToggleRequest = (rule: ComplianceRule) => {
    const newState = !rule.enabled;
    // Critical rules require confirmation when disabling
    if (CRITICAL_RULE_IDS.includes(rule.id) && rule.enabled) {
      setPendingToggle({ rule, newState });
    } else {
      executeToggle(rule.id, newState);
    }
  };

  const executeToggle = async (ruleId: string, newState: boolean) => {
    setIsToggling(ruleId);
    // Simulate API call with optimistic update
    await new Promise((resolve) => setTimeout(resolve, 300));

    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled: newState } : r
      )
    );

    const rule = rules.find(r => r.id === ruleId);
    toast.success(
      newState ? 'Rule Enabled' : 'Rule Disabled',
      `"${rule?.name}" has been ${newState ? 'enabled' : 'disabled'}.`
    );

    setIsToggling(null);
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return;
    await executeToggle(pendingToggle.rule.id, pendingToggle.newState);
    setPendingToggle(null);
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, ComplianceRule[]>);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Compliance Rules</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                {rules.filter((r) => r.enabled).length} Active
              </Badge>
              <Badge variant="outline" size="sm">
                {rules.filter((r) => !r.enabled).length} Inactive
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(groupedRules).map(([category, categoryRules]) => {
              const enabledCount = categoryRules.filter((r) => r.enabled).length;
              const allEnabled = enabledCount === categoryRules.length;
              const noneEnabled = enabledCount === 0;

              return (
                <div key={category} className="border border-[var(--border-color)] rounded-[var(--radius-md)] overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">
                        {categoryIcons[category] || <Settings className="h-4 w-4" />}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={allEnabled ? 'success' : noneEnabled ? 'error' : 'warning'}
                        size="sm"
                      >
                        {enabledCount}/{categoryRules.length}
                      </Badge>
                      {expandedCategories.includes(category) ? (
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </button>
                  {expandedCategories.includes(category) && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      {categoryRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center justify-between p-3 border-b border-[var(--border-color)] last:border-b-0 transition-colors ${
                            isToggling === rule.id ? 'bg-[var(--bg-tertiary)]' : ''
                          }`}
                        >
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {rule.name}
                              </p>
                              {!rule.enabled && (
                                <Badge variant="outline" size="sm" className="text-[var(--text-muted)]">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{rule.description}</p>
                            {rule.threshold !== undefined && (
                              <p className="text-xs text-[var(--color-primary)] mt-1 font-medium">
                                Threshold: {rule.unit === 'USD' ? formatCurrency(rule.threshold) : `${rule.threshold} ${rule.unit}`}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleRequest(rule)}
                            disabled={isToggling === rule.id}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                              rule.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--bg-tertiary)]'
                            } ${isToggling === rule.id ? 'opacity-70' : ''}`}
                            role="switch"
                            aria-checked={rule.enabled}
                            aria-label={`Toggle ${rule.name}`}
                          >
                            {isToggling === rule.id ? (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                              </span>
                            ) : (
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  rule.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Critical Rules */}
      <ConfirmDialog
        isOpen={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={handleConfirmToggle}
        variant="warning"
        title="Disable Compliance Rule?"
        description={pendingToggle ? `You are about to disable "${pendingToggle.rule.name}". This is a critical compliance rule and disabling it may affect NCAA compliance monitoring. Are you sure you want to proceed?` : ''}
        confirmLabel="Disable Rule"
        cancelLabel="Keep Enabled"
      />
    </>
  );
}
