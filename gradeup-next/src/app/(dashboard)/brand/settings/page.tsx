'use client';

import { useState } from 'react';
import {
  Building,
  Bell,
  CreditCard,
  Shield,
  LogOut,
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
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-secondary)]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[var(--color-secondary)]" />
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
        enabled ? 'bg-[var(--color-secondary)]' : 'bg-[var(--border-color)]'
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

export default function BrandSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    athleteResponses: true,
    campaignUpdates: true,
    weeklyReport: true,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-muted)]">
          Manage your brand account and preferences
        </p>
      </div>

      {/* Company Info */}
      <SettingsSection
        icon={Building}
        title="Company Information"
        description="Update your brand details"
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Company Name
              </label>
              <Input defaultValue="Nike, Inc." />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Industry
              </label>
              <Input defaultValue="Sports & Athletics" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Website
            </label>
            <Input defaultValue="https://nike.com" />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Company Description
            </label>
            <textarea
              defaultValue="World's leading sports and fitness company, dedicated to inspiring and innovating for every athlete in the world."
              rows={3}
              className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-colors"
            />
          </div>
          <Button variant="primary">Save Changes</Button>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Control your notification preferences"
      >
        <div>
          <SettingsRow
            label="Email Notifications"
            description="Receive notifications via email"
            action={
              <ToggleSwitch
                enabled={notifications.email}
                onToggle={() =>
                  setNotifications({ ...notifications, email: !notifications.email })
                }
              />
            }
          />
          <SettingsRow
            label="Push Notifications"
            description="Browser push notifications"
            action={
              <ToggleSwitch
                enabled={notifications.push}
                onToggle={() =>
                  setNotifications({ ...notifications, push: !notifications.push })
                }
              />
            }
          />
          <SettingsRow
            label="Athlete Responses"
            description="When athletes respond to your offers"
            action={
              <ToggleSwitch
                enabled={notifications.athleteResponses}
                onToggle={() =>
                  setNotifications({
                    ...notifications,
                    athleteResponses: !notifications.athleteResponses,
                  })
                }
              />
            }
          />
          <SettingsRow
            label="Campaign Updates"
            description="Updates on your active campaigns"
            action={
              <ToggleSwitch
                enabled={notifications.campaignUpdates}
                onToggle={() =>
                  setNotifications({
                    ...notifications,
                    campaignUpdates: !notifications.campaignUpdates,
                  })
                }
              />
            }
          />
          <SettingsRow
            label="Weekly Report"
            description="Receive weekly performance summary"
            action={
              <ToggleSwitch
                enabled={notifications.weeklyReport}
                onToggle={() =>
                  setNotifications({
                    ...notifications,
                    weeklyReport: !notifications.weeklyReport,
                  })
                }
              />
            }
          />
        </div>
      </SettingsSection>

      {/* Billing */}
      <SettingsSection
        icon={CreditCard}
        title="Billing & Subscription"
        description="Manage your subscription and payment methods"
      >
        <div>
          <SettingsRow
            label="Current Plan"
            description="Enterprise - Unlimited campaigns"
            action={<Badge variant="success">Active</Badge>}
          />
          <SettingsRow
            label="Payment Method"
            description="Visa ending in 4242"
            action={
              <Button variant="outline" size="sm">
                Update
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <SettingsRow
            label="Billing History"
            description="View past invoices and receipts"
            action={
              <Button variant="ghost" size="sm">
                View
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={Shield}
        title="Security"
        description="Manage your account security"
      >
        <div>
          <SettingsRow
            label="Password"
            description="Last changed 30 days ago"
            action={
              <Button variant="outline" size="sm">
                Change
              </Button>
            }
          />
          <SettingsRow
            label="Two-Factor Authentication"
            description="Add an extra layer of security"
            action={<Badge variant="success">Enabled</Badge>}
          />
          <SettingsRow
            label="Active Sessions"
            description="Manage your active sessions"
            action={
              <Button variant="ghost" size="sm">
                View
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <Card className="border-[var(--color-error)]/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-error-muted)] flex items-center justify-center">
              <LogOut className="h-5 w-5 text-[var(--color-error)]" />
            </div>
            <div>
              <CardTitle className="text-base text-[var(--color-error)]">
                Danger Zone
              </CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                Irreversible actions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Close Account</p>
              <p className="text-sm text-[var(--text-muted)]">
                Permanently delete your brand account
              </p>
            </div>
            <Button variant="danger" size="sm">
              Close Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
