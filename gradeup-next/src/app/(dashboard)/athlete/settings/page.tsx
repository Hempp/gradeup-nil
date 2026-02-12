'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
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
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center">
            <Icon className="h-5 w-5 text-[var(--color-primary)]" />
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
        enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-color)]'
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

export default function AthleteSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    deals: true,
    messages: true,
    marketing: false,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-muted)]">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Account Settings */}
      <SettingsSection
        icon={User}
        title="Account"
        description="Manage your account information"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Email Address
            </label>
            <Input defaultValue="marcus.johnson@duke.edu" disabled />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <div className="flex gap-3">
              <Input type="password" defaultValue="••••••••" disabled className="flex-1" />
              <Button variant="outline">Change</Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Control how you receive notifications"
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
            description="Receive push notifications on your device"
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
            label="Deal Alerts"
            description="Get notified about new deal opportunities"
            action={
              <ToggleSwitch
                enabled={notifications.deals}
                onToggle={() =>
                  setNotifications({ ...notifications, deals: !notifications.deals })
                }
              />
            }
          />
          <SettingsRow
            label="Message Notifications"
            description="Get notified when you receive a message"
            action={
              <ToggleSwitch
                enabled={notifications.messages}
                onToggle={() =>
                  setNotifications({
                    ...notifications,
                    messages: !notifications.messages,
                  })
                }
              />
            }
          />
          <SettingsRow
            label="Marketing Emails"
            description="Receive updates about new features and promotions"
            action={
              <ToggleSwitch
                enabled={notifications.marketing}
                onToggle={() =>
                  setNotifications({
                    ...notifications,
                    marketing: !notifications.marketing,
                  })
                }
              />
            }
          />
        </div>
      </SettingsSection>

      {/* Payment Settings */}
      <SettingsSection
        icon={CreditCard}
        title="Payment"
        description="Manage your payment methods and payout settings"
      >
        <div>
          <SettingsRow
            label="Payout Method"
            description="Bank Account ending in 4532"
            action={
              <Button variant="outline" size="sm">
                Update
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <SettingsRow
            label="Tax Information"
            description="W-9 form submitted"
            action={
              <Badge variant="success">Verified</Badge>
            }
          />
        </div>
      </SettingsSection>

      {/* Privacy & Security */}
      <SettingsSection
        icon={Shield}
        title="Privacy & Security"
        description="Control your privacy and security settings"
      >
        <div>
          <SettingsRow
            label="Two-Factor Authentication"
            description="Add an extra layer of security"
            action={
              <Button variant="outline" size="sm">
                Enable
              </Button>
            }
          />
          <SettingsRow
            label="Profile Visibility"
            description="Control who can see your profile"
            action={
              <Badge variant="primary">Public</Badge>
            }
          />
          <SettingsRow
            label="Download Your Data"
            description="Get a copy of your data"
            action={
              <Button variant="ghost" size="sm">
                Request
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
        </div>
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection
        icon={Globe}
        title="Preferences"
        description="Customize your experience"
      >
        <div>
          <SettingsRow
            label="Dark Mode"
            description="Use dark theme"
            action={
              <ToggleSwitch enabled={true} onToggle={() => {}} />
            }
          />
          <SettingsRow
            label="Language"
            description="Choose your preferred language"
            action={
              <Badge variant="outline">English (US)</Badge>
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
                Irreversible and destructive actions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Delete Account</p>
              <p className="text-sm text-[var(--text-muted)]">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
