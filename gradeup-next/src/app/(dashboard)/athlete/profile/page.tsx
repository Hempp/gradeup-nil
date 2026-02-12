'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Trophy,
  Instagram,
  Twitter,
  CheckCircle,
  Camera,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToastActions } from '@/components/ui/toast';
import { useFormValidation, validators } from '@/lib/utils/validation';

// Mock athlete data
const mockAthlete = {
  id: '1',
  name: 'Marcus Johnson',
  firstName: 'Marcus',
  lastName: 'Johnson',
  email: 'marcus.johnson@duke.edu',
  phone: '(919) 555-0123',
  bio: 'Point guard at Duke University. Economics major with a passion for community outreach. 2x ACC All-Academic Team.',
  school: 'Duke University',
  sport: 'Basketball',
  position: 'Point Guard',
  year: 'Junior',
  major: 'Economics',
  minor: 'Data Science',
  gpa: 3.87,
  hometown: 'Chicago, IL',
  instagram: '@marcus_hoops',
  twitter: '@marcusjohnson',
  tiktok: '@marcusj_duke',
  totalFollowers: 125000,
  avatarUrl: null,
  enrollmentVerified: true,
  sportVerified: true,
  gradesVerified: true,
  identityVerified: true,
};

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] ${
        verified
          ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
      }`}
    >
      <CheckCircle className={`h-4 w-4 ${verified ? '' : 'opacity-50'}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ProfileHeader() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              src={mockAthlete.avatarUrl || undefined}
              fallback={mockAthlete.firstName.charAt(0)}
              size="xl"
              className="h-24 w-24 text-3xl"
            />
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors">
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {mockAthlete.name}
              </h1>
              <Badge variant="success">Verified</Badge>
            </div>
            <p className="text-[var(--text-muted)] mb-4">{mockAthlete.bio}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {mockAthlete.school}
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                {mockAthlete.sport} • {mockAthlete.position}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {mockAthlete.hometown}
              </span>
            </div>
          </div>

          {/* GPA Badge */}
          <div className="flex flex-col items-center p-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--gpa-gold)]/20 to-[var(--gpa-gold)]/5 border border-[var(--gpa-gold)]/30">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">GPA</span>
            <span className="text-3xl font-bold text-[var(--gpa-gold)]">
              {mockAthlete.gpa.toFixed(2)}
            </span>
            <Badge className="mt-1 bg-[var(--gpa-gold)] text-[var(--text-inverse)]">
              Dean's List
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <VerificationBadge verified={mockAthlete.enrollmentVerified} label="Enrollment" />
          <VerificationBadge verified={mockAthlete.sportVerified} label="Sport" />
          <VerificationBadge verified={mockAthlete.gradesVerified} label="Grades" />
          <VerificationBadge verified={mockAthlete.identityVerified} label="Identity" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
}

function PersonalInfoForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToastActions();

  const {
    values,
    errors: fieldErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    setValues,
  } = useFormValidation<ProfileFormValues>(
    {
      firstName: mockAthlete.firstName,
      lastName: mockAthlete.lastName,
      email: mockAthlete.email,
      phone: mockAthlete.phone,
      bio: mockAthlete.bio,
    },
    {
      firstName: [validators.required, validators.minLength(2)],
      lastName: [validators.required, validators.minLength(2)],
      email: [validators.required, validators.email],
      phone: [validators.phone],
    }
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e.target.name as keyof ProfileFormValues, e.target.value);
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleBlur(e.target.name as keyof ProfileFormValues);
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Validation Error', 'Please correct the errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Profile Updated', 'Your profile has been saved successfully.');
      setIsEditing(false);
    } catch (error) {
      toast.error('Save Failed', 'Unable to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          <Button
            variant={isEditing ? 'primary' : 'outline'}
            size="sm"
            onClick={handleEditToggle}
            disabled={isSaving}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </>
            ) : (
              'Edit'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              First Name
            </label>
            <Input
              name="firstName"
              value={values.firstName}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!isEditing}
              error={!!(touched.firstName && fieldErrors.firstName)}
              icon={<User className="h-4 w-4" />}
            />
            {touched.firstName && fieldErrors.firstName && (
              <p className="text-xs text-[var(--color-error)] mt-1">{fieldErrors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Last Name
            </label>
            <Input
              name="lastName"
              value={values.lastName}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!isEditing}
              error={!!(touched.lastName && fieldErrors.lastName)}
            />
            {touched.lastName && fieldErrors.lastName && (
              <p className="text-xs text-[var(--color-error)] mt-1">{fieldErrors.lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Email
            </label>
            <Input
              type="email"
              name="email"
              value={values.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!isEditing}
              error={!!(touched.email && fieldErrors.email)}
              icon={<Mail className="h-4 w-4" />}
            />
            {touched.email && fieldErrors.email && (
              <p className="text-xs text-[var(--color-error)] mt-1">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Phone
            </label>
            <Input
              type="tel"
              name="phone"
              value={values.phone}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!isEditing}
              error={!!(touched.phone && fieldErrors.phone)}
              icon={<Phone className="h-4 w-4" />}
            />
            {touched.phone && fieldErrors.phone && (
              <p className="text-xs text-[var(--color-error)] mt-1">{fieldErrors.phone}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Bio
            </label>
            <textarea
              name="bio"
              value={values.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows={3}
              className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialLinksCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <Instagram className="h-5 w-5 text-pink-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {mockAthlete.instagram}
              </p>
              <p className="text-xs text-[var(--text-muted)]">85K followers</p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <Twitter className="h-5 w-5 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {mockAthlete.twitter}
              </p>
              <p className="text-xs text-[var(--text-muted)]">32K followers</p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {mockAthlete.tiktok}
              </p>
              <p className="text-xs text-[var(--text-muted)]">8K followers</p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-[var(--text-muted)]">
          Total Followers: <span className="font-semibold text-[var(--text-primary)]">125K</span>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function AthleteProfilePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <ProfileHeader />
      <VerificationStatus />
      <div className="grid lg:grid-cols-2 gap-6">
        <PersonalInfoForm />
        <SocialLinksCard />
      </div>
    </div>
  );
}
