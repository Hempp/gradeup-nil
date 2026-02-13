'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Globe,
  AlertTriangle,
  Key,
  Download,
  Smartphone,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import { PaymentMethodsSection } from '@/components/athlete/PaymentMethodsSection';

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
  const toast = useToastActions();

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    deals: true,
    messages: true,
    marketing: false,
  });

  // Modal states
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [enable2FAModalOpen, setEnable2FAModalOpen] = useState(false);
  const [downloadDataModalOpen, setDownloadDataModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Dark mode state
  const [darkMode, setDarkMode] = useState(true);

  // Handlers
  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password Mismatch', 'New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    // Simulate API call
    toast.success('Password Changed', 'Your password has been updated successfully.');
    setChangePasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleEnable2FA = () => {
    // Simulate enabling 2FA
    toast.success('2FA Enabled', 'Two-factor authentication has been enabled for your account.');
    setEnable2FAModalOpen(false);
  };

  const handleRequestDataDownload = () => {
    // Simulate data request
    toast.info('Data Request Submitted', 'You will receive an email with your data within 24-48 hours.');
    setDownloadDataModalOpen(false);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Confirmation Required', 'Please type DELETE to confirm account deletion.');
      return;
    }
    // Simulate account deletion
    toast.warning('Account Scheduled for Deletion', 'Your account will be deleted within 30 days.');
    setDeleteAccountModalOpen(false);
    setDeleteConfirmText('');
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Here you would integrate with your theme system
    toast.info('Theme Updated', `Switched to ${!darkMode ? 'dark' : 'light'} mode.`);
  };

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
              <Button variant="outline" onClick={() => setChangePasswordModalOpen(true)}>Change</Button>
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

      {/* Payment Methods */}
      <PaymentMethodsSection />

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
              <Button variant="outline" size="sm" onClick={() => setEnable2FAModalOpen(true)}>
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
              <Button variant="ghost" size="sm" onClick={() => setDownloadDataModalOpen(true)}>
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
              <ToggleSwitch enabled={darkMode} onToggle={handleToggleDarkMode} />
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
            <Button variant="danger" size="sm" onClick={() => setDeleteAccountModalOpen(true)}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        title="Change Password"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setChangePasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleChangePassword}>
              <Key className="h-4 w-4 mr-2" />
              Update Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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

      {/* Enable 2FA Modal */}
      <Modal
        isOpen={enable2FAModalOpen}
        onClose={() => setEnable2FAModalOpen(false)}
        title="Enable Two-Factor Authentication"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEnable2FAModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEnable2FA}>
              <Smartphone className="h-4 w-4 mr-2" />
              Enable 2FA
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)]">
            <Shield className="h-8 w-8 text-[var(--color-primary)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">Secure Your Account</p>
              <p className="text-sm text-[var(--text-muted)]">
                Two-factor authentication adds an extra layer of security to your account.
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            After enabling 2FA, you will need to enter a verification code from your authenticator
            app each time you log in.
          </p>
          <div className="p-4 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <p className="text-sm text-[var(--text-muted)] mb-2">Scan this QR code with your authenticator app:</p>
            <div className="h-32 w-32 mx-auto bg-white rounded-[var(--radius-sm)] flex items-center justify-center">
              <span className="text-xs text-gray-400">[QR Code Placeholder]</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Download Data Modal */}
      <Modal
        isOpen={downloadDataModalOpen}
        onClose={() => setDownloadDataModalOpen(false)}
        title="Download Your Data"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDownloadDataModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRequestDataDownload}>
              <Download className="h-4 w-4 mr-2" />
              Request Download
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            You can request a copy of all your personal data stored on GradeUp. This includes:
          </p>
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Profile information
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Deal history and earnings
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Messages and communications
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Activity logs
            </li>
          </ul>
          <p className="text-sm text-[var(--text-muted)]">
            You will receive an email with a download link within 24-48 hours.
          </p>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-error-muted)]">
            <AlertTriangle className="h-8 w-8 text-[var(--color-error)]" />
            <div>
              <p className="font-medium text-[var(--color-error)]">This action is irreversible</p>
              <p className="text-sm text-[var(--text-muted)]">
                All your data will be permanently deleted.
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Deleting your account will permanently remove:
          </p>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            <li>- Your profile and all personal information</li>
            <li>- All deal history and earnings records</li>
            <li>- All messages and communications</li>
            <li>- Any pending payouts (will be forfeited)</li>
          </ul>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Type DELETE to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
