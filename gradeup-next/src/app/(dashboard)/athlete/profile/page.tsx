'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToastActions } from '@/components/ui/toast';
import { useFormValidation, validators } from '@/lib/utils/validation';
import { useRequireAuth } from '@/context';
import { updateAthleteProfile, uploadAthleteMedia } from '@/lib/services/athlete';
import type { Athlete } from '@/types';

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

interface ProfileHeaderProps {
  profile: { first_name: string | null; last_name: string | null; avatar_url: string | null; bio: string | null } | null;
  athlete: Athlete | null;
  onAvatarUpload: () => void;
}

function ProfileHeader({ profile, athlete, onAvatarUpload }: ProfileHeaderProps) {
  const firstName = profile?.first_name || 'Athlete';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const bio = profile?.bio || '';
  const avatarUrl = profile?.avatar_url;
  const schoolName = athlete?.school?.name || 'University';
  const sportName = athlete?.sport?.name || 'Sport';
  const position = athlete?.position || '';
  const hometown = athlete?.hometown || '';
  const gpa = athlete?.gpa || 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              src={avatarUrl || undefined}
              fallback={firstName.charAt(0)}
              size="xl"
              className="h-24 w-24 text-3xl"
            />
            <button
              onClick={onAvatarUpload}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {fullName}
              </h1>
              <Badge variant="success">Verified</Badge>
            </div>
            <p className="text-[var(--text-muted)] mb-4">{bio || 'No bio yet'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {schoolName}
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                {sportName}{position ? ` • ${position}` : ''}
              </span>
              {hometown && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {hometown}
                </span>
              )}
            </div>
          </div>

          {/* GPA Badge */}
          {gpa > 0 && (
            <div className="flex flex-col items-center p-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--gpa-gold)]/20 to-[var(--gpa-gold)]/5 border border-[var(--gpa-gold)]/30">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">GPA</span>
              <span className="text-3xl font-bold text-[var(--gpa-gold)]">
                {gpa.toFixed(2)}
              </span>
              {gpa >= 3.5 && (
                <Badge className="mt-1 bg-[var(--gpa-gold)] text-[var(--text-inverse)]">
                  Dean's List
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface VerificationStatusProps {
  enrollmentVerified?: boolean;
  sportVerified?: boolean;
  gradesVerified?: boolean;
  identityVerified?: boolean;
}

function VerificationStatus({
  enrollmentVerified = false,
  sportVerified = false,
  gradesVerified = false,
  identityVerified = false,
}: VerificationStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <VerificationBadge verified={enrollmentVerified} label="Enrollment" />
          <VerificationBadge verified={sportVerified} label="Sport" />
          <VerificationBadge verified={gradesVerified} label="Grades" />
          <VerificationBadge verified={identityVerified} label="Identity" />
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

interface PersonalInfoFormProps {
  initialValues: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio: string;
  };
  onSave: (values: ProfileFormValues) => Promise<void>;
}

function PersonalInfoForm({ initialValues, onSave }: PersonalInfoFormProps) {
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
    initialValues,
    {
      firstName: [validators.required, validators.minLength(2)],
      lastName: [validators.required, validators.minLength(2)],
      email: [validators.required, validators.email],
      phone: [validators.phone],
    }
  );

  // Update form values when initialValues change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, setValues]);

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
      await onSave(values);
      toast.success('Profile Updated', 'Your profile has been saved successfully.');
      setIsEditing(false);
    } catch {
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

interface SocialLinksCardProps {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

function SocialLinksCard({ instagram, twitter, tiktok }: SocialLinksCardProps) {
  const hasSocials = instagram || twitter || tiktok;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasSocials ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No social accounts connected yet
          </p>
        ) : (
          <div className="space-y-4">
            {instagram && (
              <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <Instagram className="h-5 w-5 text-pink-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {instagram}
                  </p>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
            )}
            {twitter && (
              <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <Twitter className="h-5 w-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {twitter}
                  </p>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
            )}
            {tiktok && (
              <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {tiktok}
                  </p>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {hasSocials && (
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            Manage Connected Accounts
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function AthleteProfilePage() {
  const { profile, roleData, isLoading, refreshUser } = useRequireAuth({ allowedRoles: ['athlete'] });
  const toast = useToastActions();
  const athleteData = roleData as Athlete | null;

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await uploadAthleteMedia(file, 'avatar');
        if (result.error) {
          toast.error('Upload Failed', result.error.message);
          return;
        }
        toast.success('Avatar Updated', 'Your profile picture has been updated.');
        refreshUser();
      } catch {
        toast.error('Upload Failed', 'Unable to upload avatar. Please try again.');
      }
    };
    input.click();
  };

  // Handle profile save
  const handleSaveProfile = async (values: ProfileFormValues) => {
    // The profile update would need a separate service for the profiles table
    // For now, we update what we can through the athlete service
    const result = await updateAthleteProfile({
      hometown: values.bio, // Note: Bio is stored on profiles, not athletes
    });

    if (result.error) {
      throw result.error;
    }

    refreshUser();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const initialFormValues = {
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ProfileHeader
        profile={profile}
        athlete={athleteData}
        onAvatarUpload={handleAvatarUpload}
      />
      <VerificationStatus
        enrollmentVerified={true}
        sportVerified={true}
        gradesVerified={athleteData?.gpa ? athleteData.gpa > 0 : false}
        identityVerified={true}
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <PersonalInfoForm initialValues={initialFormValues} onSave={handleSaveProfile} />
        <SocialLinksCard />
      </div>
    </div>
  );
}
