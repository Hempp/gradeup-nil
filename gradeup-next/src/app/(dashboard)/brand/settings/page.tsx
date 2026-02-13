'use client';

import { useState } from 'react';
import {
  Building,
  Bell,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Key,
  Monitor,
  Receipt,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';

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

// Mock billing history data
const mockBillingHistory = [
  { id: '1', date: '2024-02-01', description: 'Enterprise Plan - Monthly', amount: 499.00, status: 'Paid' },
  { id: '2', date: '2024-01-01', description: 'Enterprise Plan - Monthly', amount: 499.00, status: 'Paid' },
  { id: '3', date: '2023-12-01', description: 'Enterprise Plan - Monthly', amount: 499.00, status: 'Paid' },
  { id: '4', date: '2023-11-01', description: 'Enterprise Plan - Monthly', amount: 499.00, status: 'Paid' },
];

// Mock active sessions data
const mockSessions = [
  { id: '1', device: 'MacBook Pro', browser: 'Chrome', location: 'New York, USA', lastActive: '2024-02-10T10:30:00Z', current: true },
  { id: '2', device: 'iPhone 15', browser: 'Safari', location: 'New York, USA', lastActive: '2024-02-09T18:45:00Z', current: false },
  { id: '3', device: 'Windows PC', browser: 'Firefox', location: 'Los Angeles, USA', lastActive: '2024-02-05T14:20:00Z', current: false },
];

export default function BrandSettingsPage() {
  const toast = useToastActions();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    athleteResponses: true,
    campaignUpdates: true,
    weeklyReport: true,
  });

  // Company info form state
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Nike, Inc.',
    industry: 'Sports & Athletics',
    website: 'https://nike.com',
    description: 'World\'s leading sports and fitness company, dedicated to inspiring and innovating for every athlete in the world.',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Handlers
  const handleSaveCompanyInfo = async () => {
    setIsSavingCompany(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingCompany(false);
    toast.success('Settings Saved', 'Your company information has been updated successfully.');
  };

  const handleUpdatePayment = () => {
    setShowPaymentModal(false);
    toast.success('Payment Method Updated', 'Your payment method has been updated successfully.');
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Error', 'New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Error', 'Password must be at least 8 characters.');
      return;
    }
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    toast.success('Password Changed', 'Your password has been updated successfully.');
  };

  const handleRevokeSession = (sessionId: string) => {
    toast.success('Session Revoked', 'The session has been terminated.');
  };

  const handleCloseAccount = () => {
    setShowCloseAccountModal(false);
    toast.info('Account Closure Initiated', 'You will receive a confirmation email shortly.');
  };

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
              <Input
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Industry
              </label>
              <Input
                value={companyInfo.industry}
                onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Website
            </label>
            <Input
              value={companyInfo.website}
              onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Company Description
            </label>
            <textarea
              value={companyInfo.description}
              onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
              rows={3}
              className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-colors"
            />
          </div>
          <Button variant="primary" onClick={handleSaveCompanyInfo} disabled={isSavingCompany}>
            {isSavingCompany ? 'Saving...' : 'Save Changes'}
          </Button>
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
              <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)}>
                Update
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <SettingsRow
            label="Billing History"
            description="View past invoices and receipts"
            action={
              <Button variant="ghost" size="sm" onClick={() => setShowBillingModal(true)}>
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
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
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
              <Button variant="ghost" size="sm" onClick={() => setShowSessionsModal(true)}>
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
            <Button variant="danger" size="sm" onClick={() => setShowCloseAccountModal(true)}>
              Close Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Update Payment Method Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Update Payment Method"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdatePayment}>
              Update Payment Method
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-[var(--text-muted)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">Current Card</p>
              <p className="text-sm text-[var(--text-muted)]">Visa ending in 4242</p>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Card Number
            </label>
            <Input placeholder="1234 5678 9012 3456" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Expiry Date
              </label>
              <Input placeholder="MM/YY" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                CVC
              </label>
              <Input placeholder="123" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Cardholder Name
            </label>
            <Input placeholder="John Doe" />
          </div>
        </div>
      </Modal>

      {/* Billing History Modal */}
      <Modal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        title="Billing History"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowBillingModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-2">
          {mockBillingHistory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.description}</p>
                  <p className="text-sm text-[var(--text-muted)]">{item.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-[var(--text-primary)]">
                  ${item.amount.toFixed(2)}
                </span>
                <Badge variant="success">{item.status}</Badge>
                <Button variant="ghost" size="sm">
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleChangePassword}>
              Update Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center gap-3">
            <Key className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
            </p>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              New Password
            </label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </Modal>

      {/* Active Sessions Modal */}
      <Modal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        title="Active Sessions"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowSessionsModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          {mockSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">
                      {session.device} - {session.browser}
                    </p>
                    {session.current && (
                      <Badge variant="primary" size="sm">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {session.location} • Last active: {new Date(session.lastActive).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Close Account Confirmation Modal */}
      <Modal
        isOpen={showCloseAccountModal}
        onClose={() => setShowCloseAccountModal(false)}
        title="Close Account"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCloseAccountModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCloseAccount}>
              Yes, Close My Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[var(--color-error)]">Warning: This action cannot be undone</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Closing your account will permanently delete all your data, including:
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] ml-4">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
              All campaign history and analytics
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
              Athlete connections and shortlists
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
              Billing history and invoices
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
              Brand profile and settings
            </li>
          </ul>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Type "DELETE" to confirm
            </label>
            <Input placeholder="DELETE" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
