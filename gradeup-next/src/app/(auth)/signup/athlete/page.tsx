'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastActions } from '@/components/ui/toast';
import { useFormValidation, validators } from '@/lib/utils/validation';
import { getSupabaseClient } from '@/lib/supabase/client';

const SPORTS = [
  'Football',
  'Basketball',
  'Baseball',
  'Soccer',
  'Track & Field',
  'Swimming',
  'Volleyball',
  'Tennis',
  'Golf',
  'Wrestling',
  'Gymnastics',
  'Softball',
  'Lacrosse',
  'Hockey',
  'Other',
];

const YEARS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate',
];

interface AthleteSignupFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  school: string;
  sport: string;
  position: string;
  year: string;
  instagram: string;
}

export default function AthleteSignupPage() {
  const router = useRouter();
  const toast = useToastActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [formValues, setFormValues] = useState<AthleteSignupFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    school: '',
    sport: '',
    position: '',
    year: '',
    instagram: '',
  });

  const {
    values,
    errors: fieldErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    setFieldError,
  } = useFormValidation<AthleteSignupFormValues>(
    formValues,
    {
      firstName: [validators.required, validators.minLength(2)],
      lastName: [validators.required, validators.minLength(2)],
      email: [validators.required, validators.email],
      password: [validators.required, validators.password],
      confirmPassword: [validators.required],
      school: [validators.required],
      sport: [validators.required],
      position: [validators.required],
      year: [validators.required],
    }
  );

  // Custom password match validation
  const validatePasswordMatch = () => {
    if (values.confirmPassword && values.password !== values.confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (type === 'checkbox') {
      setAgreeToTerms(checked);
    } else {
      handleChange(name as keyof AthleteSignupFormValues, value);
    }
    if (error) setError(null);
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    handleBlur(e.target.name as keyof AthleteSignupFormValues);
  };

  const validateForm = (): boolean => {
    if (!validate()) {
      toast.error('Validation Error', 'Please fill in all required fields correctly.');
      return false;
    }
    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      toast.error('Terms Required', 'You must agree to the Terms of Service and Privacy Policy.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            role: 'athlete',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        toast.error('Signup Failed', authError.message);
        return;
      }

      if (authData.user) {
        // Create athlete profile
        const { error: profileError } = await supabase.from('athletes').insert({
          id: authData.user.id,
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          school: values.school,
          sport: values.sport,
          position: values.position,
          year: values.year,
          instagram: values.instagram || null,
        });

        if (profileError) {
          setError('Failed to create profile. Please contact support.');
          toast.error('Profile Creation Failed', 'Failed to create profile. Please contact support.');
          return;
        }
      }

      toast.success('Account Created', 'Welcome to GradeUp! Your athlete account has been created.');
      // Redirect to dashboard or verification page
      router.push('/athlete/dashboard');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      toast.error('Signup Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-[var(--primary-100)] flex items-center justify-center mx-auto mb-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--primary-700)]"
            >
              <circle cx="12" cy="5" r="3" />
              <path d="M12 22V8" />
              <path d="m5 12 7-4 7 4" />
              <path d="m5 12 7 4 7-4" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--primary-900)]">
            Create Athlete Account
          </CardTitle>
          <CardDescription className="text-[var(--neutral-600)]">
            Showcase your achievements and connect with sponsors
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-[var(--radius-md)] bg-[var(--error-100)] text-[var(--error-600)] text-sm"
              >
                {error}
              </div>
            )}

            {/* Section: Personal Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Personal Information
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="John"
                    value={values.firstName}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.firstName && fieldErrors.firstName)}
                  />
                  {touched.firstName && fieldErrors.firstName && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={values.lastName}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.lastName && fieldErrors.lastName)}
                  />
                  {touched.lastName && fieldErrors.lastName && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={values.email}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  error={!!(touched.email && fieldErrors.email)}
                />
                {touched.email && fieldErrors.email && (
                  <p className="text-xs text-[var(--error-600)]">{fieldErrors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={values.password}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.password && fieldErrors.password)}
                  />
                  {touched.password && fieldErrors.password && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    value={values.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.confirmPassword && fieldErrors.confirmPassword)}
                  />
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Athletic Info */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Athletic Information
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="school"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  School / University
                </label>
                <Input
                  id="school"
                  name="school"
                  type="text"
                  placeholder="Search your school..."
                  value={values.school}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  error={!!(touched.school && fieldErrors.school)}
                />
                {touched.school && fieldErrors.school && (
                  <p className="text-xs text-[var(--error-600)]">{fieldErrors.school}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="sport"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Sport
                  </label>
                  <select
                    id="sport"
                    name="sport"
                    value={values.sport}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                      touched.sport && fieldErrors.sport ? 'border-[var(--error-600)]' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <option value="">Select sport</option>
                    {SPORTS.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                  {touched.sport && fieldErrors.sport && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.sport}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="position"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Position
                  </label>
                  <Input
                    id="position"
                    name="position"
                    type="text"
                    placeholder="e.g., Point Guard"
                    value={values.position}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.position && fieldErrors.position)}
                  />
                  {touched.position && fieldErrors.position && (
                    <p className="text-xs text-[var(--error-600)]">{fieldErrors.position}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="year"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Year
                </label>
                <select
                  id="year"
                  name="year"
                  value={values.year}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                    touched.year && fieldErrors.year ? 'border-[var(--error-600)]' : 'border-[var(--border-color)]'
                  }`}
                >
                  <option value="">Select year</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {touched.year && fieldErrors.year && (
                  <p className="text-xs text-[var(--error-600)]">{fieldErrors.year}</p>
                )}
              </div>
            </div>

            {/* Section: Social Links (Optional) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Social Links{' '}
                <span className="font-normal text-[var(--neutral-400)]">(Optional)</span>
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="instagram"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Instagram Handle
                </label>
                <Input
                  id="instagram"
                  name="instagram"
                  type="text"
                  placeholder="@yourhandle"
                  value={values.instagram}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={agreeToTerms}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--surface-200)] text-[var(--primary-500)] focus:ring-[var(--primary-500)] focus:ring-offset-0"
                />
                <span className="text-sm text-[var(--neutral-600)]">
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="text-[var(--primary-500)] hover:text-[var(--primary-700)] underline"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="text-[var(--primary-500)] hover:text-[var(--primary-700)] underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full mt-4"
            >
              Create Account
            </Button>

            {/* Sign In Link */}
            <p className="text-center text-sm text-[var(--neutral-600)] mt-4">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-[var(--primary-500)] hover:text-[var(--primary-700)] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
