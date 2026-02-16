'use client';

import { useState } from 'react';
import {
  Building,
  Bell,
  Shield,
  Users,
  DollarSign,
  ChevronRight,
  Mail,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
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
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[var(--color-accent)]" aria-hidden="true" />
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

// Mock staff data
const mockStaffMembers = [
  { id: '1', name: 'John Smith', email: 'john.smith@duke.edu', role: 'Athletic Director' },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@duke.edu', role: 'Compliance Officer' },
  { id: '3', name: 'Mike Johnson', email: 'mike.j@duke.edu', role: 'Assistant AD' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah.w@duke.edu', role: 'Compliance Assistant' },
  { id: '5', name: 'David Brown', email: 'david.b@duke.edu', role: 'Sports Administrator' },
];

export default function DirectorSettingsPage() {
  const toast = useToastActions();

  // Form state for program information
  const [programInfo, setProgramInfo] = useState({
    institutionName: 'Duke University',
    athleticDepartment: 'Duke Athletics',
  });

  // Approval settings state
  const [approvalThreshold, setApprovalThreshold] = useState('1000');

  const [settings, setSettings] = useState({
    autoApprove: false,
    complianceAlerts: true,
    weeklyReports: true,
    dealNotifications: true,
  });

  // Modal states
  const [showManageStaffModal, setShowManageStaffModal] = useState(false);
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Compliance Officer',
  });

  // Handlers
  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Settings Saved', 'Program information has been updated successfully.');
    } catch {
      toast.error('Save Failed', 'Unable to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteForm.email) {
      toast.error('Email Required', 'Please enter an email address.');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Invitation Sent', `An invitation has been sent to ${inviteForm.email}.`);
      setShowInviteStaffModal(false);
      setInviteForm({ email: '', role: 'Compliance Officer' });
    } catch {
      toast.error('Invitation Failed', 'Unable to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId: string, staffName: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Staff Removed', `${staffName} has been removed from your team.`);
    } catch {
      toast.error('Removal Failed', 'Unable to remove staff member. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              <Input
                value={programInfo.institutionName}
                onChange={(e) => setProgramInfo({ ...programInfo, institutionName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Athletic Department
              </label>
              <Input
                value={programInfo.athleticDepartment}
                onChange={(e) => setProgramInfo({ ...programInfo, athleticDepartment: e.target.value })}
              />
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
          <Button variant="primary" onClick={handleSaveChanges} isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </SettingsSection>

      {/* Approval Settings */}
      <SettingsSection
        icon={Shield}
        title="Deal Approval"
        description="Configure deal approval workflow"
      >
        <div role="group" aria-label="Deal approval settings">
          <SettingsRow
            label="Auto-Approve Deals Under Threshold"
            description="Automatically approve deals under $1,000"
            labelId="director-auto-approve-label"
            action={
              <Switch
                checked={settings.autoApprove}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoApprove: checked })
                }
                aria-labelledby="director-auto-approve-label"
              />
            }
          />
          <SettingsRow
            label="Approval Threshold"
            description="Deals above this amount require manual approval"
            action={
              <Input
                type="number"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
                className="w-32"
                aria-label="Approval threshold amount in dollars"
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
        <div role="group" aria-label="Notification preferences">
          <SettingsRow
            label="Compliance Alerts"
            description="Get notified about compliance issues"
            labelId="director-compliance-alerts-label"
            action={
              <Switch
                checked={settings.complianceAlerts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    complianceAlerts: checked,
                  })
                }
                aria-labelledby="director-compliance-alerts-label"
              />
            }
          />
          <SettingsRow
            label="Deal Notifications"
            description="Get notified about new deals"
            labelId="director-deal-notifications-label"
            action={
              <Switch
                checked={settings.dealNotifications}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    dealNotifications: checked,
                  })
                }
                aria-labelledby="director-deal-notifications-label"
              />
            }
          />
          <SettingsRow
            label="Weekly Reports"
            description="Receive weekly program summary"
            labelId="director-weekly-reports-label"
            action={
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    weeklyReports: checked,
                  })
                }
                aria-labelledby="director-weekly-reports-label"
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
              <Button variant="outline" size="sm" onClick={() => setShowManageStaffModal(true)}>
                Manage
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <SettingsRow
            label="Invite New Staff"
            description="Add compliance officers, assistants"
            action={
              <Button variant="primary" size="sm" onClick={() => setShowInviteStaffModal(true)}>
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

      {/* Manage Staff Modal */}
      <Modal
        isOpen={showManageStaffModal}
        onClose={() => setShowManageStaffModal(false)}
        title="Manage Staff Members"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowManageStaffModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-muted)] text-sm">
            Manage access and permissions for your team members.
          </p>
          <div className="space-y-3" role="list" aria-label="Staff members">
            {mockStaffMembers.map((staff) => (
              <div
                key={staff.id}
                role="listitem"
                className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-semibold" aria-hidden="true">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{staff.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{staff.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" size="sm">{staff.role}</Badge>
                  {staff.role !== 'Athletic Director' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStaff(staff.id, staff.name)}
                      aria-label={`Remove ${staff.name} from staff`}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--color-error)]" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Invite Staff Modal */}
      <Modal
        isOpen={showInviteStaffModal}
        onClose={() => { setShowInviteStaffModal(false); setInviteForm({ email: '', role: 'Compliance Officer' }); }}
        title="Invite New Staff Member"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowInviteStaffModal(false); setInviteForm({ email: '', role: 'Compliance Officer' }); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInviteStaff} isLoading={isLoading}>
              <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Email Address
            </label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="staff.member@university.edu"
              icon={<Mail className="h-4 w-4" aria-hidden="true" />}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="staff-role" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Role
            </label>
            <select
              id="staff-role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              aria-required="true"
            >
              <option value="Compliance Officer">Compliance Officer</option>
              <option value="Assistant AD">Assistant AD</option>
              <option value="Compliance Assistant">Compliance Assistant</option>
              <option value="Sports Administrator">Sports Administrator</option>
            </select>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
            <p className="text-sm text-[var(--text-secondary)]">
              The invited staff member will receive an email with instructions to set up their account.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
