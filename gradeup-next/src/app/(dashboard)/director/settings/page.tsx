'use client';

import { useState } from 'react';
import {
  Building,
  Bell,
  Shield,
  Users,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--border-color)]'
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

function SettingsRow({
  label,
  description,
  action,
}: {
  label: string;
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--border-color)] last:border-0">
      <div>
        <p className="font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export default function DirectorSettingsPage() {
  const [settings, setSettings] = useState({
    autoApprove: false,
    complianceAlerts: true,
    weeklyReports: true,
    dealNotifications: true,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-muted)]">
          Configure your program&apos;s NIL settings
        </p>
      </div>

      {/* Program Information */}
      <SettingsSection
        icon={Building}
        title="Program Information"
        description="Your athletic program details"
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Institution Name
              </label>
              <Input defaultValue="Duke University" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Athletic Department
              </label>
              <Input defaultValue="Duke Athletics" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Division
              </label>
              <Input defaultValue="NCAA Division I" disabled />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Conference
              </label>
              <Input defaultValue="ACC" disabled />
            </div>
          </div>
          <Button variant="primary">Save Changes</Button>
        </div>
      </SettingsSection>

      {/* Approval Settings */}
      <SettingsSection
        icon={Shield}
        title="Deal Approval"
        description="Configure deal approval workflow"
      >
        <div>
          <SettingsRow
            label="Auto-Approve Deals Under Threshold"
            description="Automatically approve deals under $1,000"
            action={
              <ToggleSwitch
                enabled={settings.autoApprove}
                onToggle={() =>
                  setSettings({ ...settings, autoApprove: !settings.autoApprove })
                }
              />
            }
          />
          <SettingsRow
            label="Approval Threshold"
            description="Deals above this amount require manual approval"
            action={
              <Input
                type="number"
                defaultValue="1000"
                className="w-32"
              />
            }
          />
          <SettingsRow
            label="Required Approvers"
            description="Number of approvers needed for high-value deals"
            action={<Badge variant="outline">2 approvers</Badge>}
          />
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Configure notification preferences"
      >
        <div>
          <SettingsRow
            label="Compliance Alerts"
            description="Get notified about compliance issues"
            action={
              <ToggleSwitch
                enabled={settings.complianceAlerts}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    complianceAlerts: !settings.complianceAlerts,
                  })
                }
              />
            }
          />
          <SettingsRow
            label="Deal Notifications"
            description="Get notified about new deals"
            action={
              <ToggleSwitch
                enabled={settings.dealNotifications}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    dealNotifications: !settings.dealNotifications,
                  })
                }
              />
            }
          />
          <SettingsRow
            label="Weekly Reports"
            description="Receive weekly program summary"
            action={
              <ToggleSwitch
                enabled={settings.weeklyReports}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    weeklyReports: !settings.weeklyReports,
                  })
                }
              />
            }
          />
        </div>
      </SettingsSection>

      {/* Team Management */}
      <SettingsSection
        icon={Users}
        title="Team Management"
        description="Manage staff access and permissions"
      >
        <div>
          <SettingsRow
            label="Staff Members"
            description="5 active staff members"
            action={
              <Button variant="outline" size="sm">
                Manage
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <SettingsRow
            label="Invite New Staff"
            description="Add compliance officers, assistants"
            action={
              <Button variant="primary" size="sm">
                Invite
              </Button>
            }
          />
        </div>
      </SettingsSection>

      {/* Fee Configuration */}
      <SettingsSection
        icon={DollarSign}
        title="Fee Configuration"
        description="Configure platform fees and commissions"
      >
        <div>
          <SettingsRow
            label="Platform Fee"
            description="Percentage taken from each deal"
            action={<Badge variant="outline">3.5%</Badge>}
          />
          <SettingsRow
            label="Minimum Deal Amount"
            description="Minimum allowed deal value"
            action={<Badge variant="outline">$100</Badge>}
          />
          <SettingsRow
            label="Payout Schedule"
            description="When athletes receive payments"
            action={<Badge variant="outline">Weekly</Badge>}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
