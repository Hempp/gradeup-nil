'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { useToastActions } from '@/components/ui/toast';

// Session type from API
interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

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
            <Icon className="h-5 w-5 text-[var(--color-secondary)]" aria-hidden="true" />
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

function SettingsRow({
  label,
  description,
  action,
  labelId,
}: {
  label: string;
  description?: string;
  action: React.ReactNode;
  labelId?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--border-color)] last:border-0">
      <div>
        <p id={labelId} className="font-medium text-[var(--text-primary)]">{label}</p>
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

export default function BrandSettingsPage() {
  const toast = useToastActions();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    athleteResponses: true,
    campaignUpdates: true,
    weeklyReport: true,
  });

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

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

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch('/api/auth/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Error', 'Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  // Fetch sessions when modal opens
  useEffect(() => {
    if (showSessionsModal) {
      fetchSessions();
    }
  }, [showSessionsModal, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke session');
      }

      // Remove the session from the list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session Revoked', 'The session has been terminated.');
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Error', error instanceof Error ? error.message : 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
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
        <div role="group" aria-label="Notification preferences">
          <SettingsRow
            label="Email Notifications"
            description="Receive notifications via email"
            labelId="brand-email-notifications-label"
            action={
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
                aria-labelledby="brand-email-notifications-label"
              />
            }
          />
          <SettingsRow
            label="Push Notifications"
            description="Browser push notifications"
            labelId="brand-push-notifications-label"
            action={
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
                aria-labelledby="brand-push-notifications-label"
              />
            }
          />
          <SettingsRow
            label="Athlete Responses"
            description="When athletes respond to your offers"
            labelId="brand-athlete-responses-label"
            action={
              <Switch
                checked={notifications.athleteResponses}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    athleteResponses: checked,
                  })
                }
                aria-labelledby="brand-athlete-responses-label"
              />
            }
          />
          <SettingsRow
            label="Campaign Updates"
            description="Updates on your active campaigns"
            labelId="brand-campaign-updates-label"
            action={
              <Switch
                checked={notifications.campaignUpdates}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    campaignUpdates: checked,
                  })
                }
                aria-labelledby="brand-campaign-updates-label"
              />
            }
          />
          <SettingsRow
            label="Weekly Report"
            description="Receive weekly performance summary"
            labelId="brand-weekly-report-label"
            action={
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    weeklyReport: checked,
                  })
                }
                aria-labelledby="brand-weekly-report-label"
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
              <LogOut className="h-5 w-5 text-[var(--color-error)]" aria-hidden="true" />
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
            <CreditCard className="h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">Current Card</p>
              <p className="text-sm text-[var(--text-muted)]">Visa ending in 4242</p>
            </div>
          </div>
          <div>
            <label htmlFor="card-number" className="block text-sm text-[var(--text-muted)] mb-1.5">
              Card Number
            </label>
            <Input id="card-number" placeholder="1234 5678 9012 3456" autoComplete="cc-number" aria-required="true" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card-expiry" className="block text-sm text-[var(--text-muted)] mb-1.5">
                Expiry Date
              </label>
              <Input id="card-expiry" placeholder="MM/YY" autoComplete="cc-exp" aria-required="true" />
            </div>
            <div>
              <label htmlFor="card-cvc" className="block text-sm text-[var(--text-muted)] mb-1.5">
                CVC
              </label>
              <Input id="card-cvc" placeholder="123" autoComplete="cc-csc" aria-required="true" />
            </div>
          </div>
          <div>
            <label htmlFor="cardholder-name" className="block text-sm text-[var(--text-muted)] mb-1.5">
              Cardholder Name
            </label>
            <Input id="cardholder-name" placeholder="John Doe" autoComplete="cc-name" aria-required="true" />
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
        <div className="space-y-2" role="list" aria-label="Invoice history">
          {mockBillingHistory.map((item) => (
            <div
              key={item.id}
              role="listitem"
              className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
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
                <Button variant="ghost" size="sm" aria-label={`Download invoice for ${item.description} on ${item.date}`}>
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
            <Key className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--text-secondary)]">
              Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
            </p>
          </div>
          <div>
            <label htmlFor="brand-current-password" className="block text-sm text-[var(--text-muted)] mb-1.5">
              Current Password
            </label>
            <Input
              id="brand-current-password"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="brand-new-password" className="block text-sm text-[var(--text-muted)] mb-1.5">
              New Password
            </label>
            <Input
              id="brand-new-password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="brand-confirm-password" className="block text-sm text-[var(--text-muted)] mb-1.5">
              Confirm New Password
            </label>
            <Input
              id="brand-confirm-password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              aria-required="true"
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
        <div className="space-y-3" role="list" aria-label="Active sessions">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" aria-hidden="true" />
              <span className="ml-2 text-[var(--text-muted)]">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>No active sessions found</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                role="listitem"
                className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
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
                    disabled={revokingSessionId === session.id}
                    aria-label={`Revoke session on ${session.device}`}
                  >
                    {revokingSessionId === session.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                        Revoking...
                      </>
                    ) : (
                      'Revoke'
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
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
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3" role="alert">
            <AlertTriangle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-[var(--color-error)]">Warning: This action cannot be undone</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Closing your account will permanently delete all your data, including:
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] ml-4" aria-label="Data that will be deleted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
              All campaign history and analytics
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
              Athlete connections and shortlists
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
              Billing history and invoices
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
              Brand profile and settings
            </li>
          </ul>
          <div>
            <label htmlFor="brand-delete-confirmation" className="block text-sm text-[var(--text-muted)] mb-1.5">
              Type &quot;DELETE&quot; to confirm
            </label>
            <Input id="brand-delete-confirmation" placeholder="DELETE" aria-describedby="brand-delete-hint" />
            <p id="brand-delete-hint" className="sr-only">Type the word DELETE in all capital letters to confirm account closure</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
