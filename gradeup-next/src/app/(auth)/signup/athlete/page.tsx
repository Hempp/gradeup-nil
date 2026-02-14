'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormCheckbox } from '@/components/ui/form-input';
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
  const errorRef = useRef<HTMLDivElement>(null);

  // Focus and scroll to error message when it appears for accessibility
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const [formValues] = useState<AthleteSignupFormValues>({
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
    if (!validatePasswordMatch()) {
      toast.error('Password Mismatch', 'Passwords do not match.');
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
                ref={errorRef}
                role="alert"
                tabIndex={-1}
                className="p-3 rounded-[var(--radius-md)] bg-[var(--error-100)] text-[var(--error-600)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--error-600)] focus:ring-offset-2"
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
                <FormInput
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  autoComplete="given-name"
                  placeholder="John"
                  value={values.firstName}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.firstName}
                  error={fieldErrors.firstName}
                />
                <FormInput
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={values.lastName}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.lastName}
                  error={fieldErrors.lastName}
                />
              </div>

              <FormInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                value={values.email}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                disabled={isLoading}
                touched={touched.email}
                error={fieldErrors.email}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={values.password}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.password}
                  error={fieldErrors.password}
                />
                <FormInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  value={values.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.confirmPassword}
                  error={fieldErrors.confirmPassword}
                />
              </div>
            </div>

            {/* Section: Athletic Info */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Athletic Information
              </h3>

              <FormInput
                id="school"
                name="school"
                label="School / University"
                placeholder="Search your school..."
                value={values.school}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                disabled={isLoading}
                touched={touched.school}
                error={fieldErrors.school}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  id="sport"
                  name="sport"
                  label="Sport"
                  value={values.sport}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.sport}
                  error={fieldErrors.sport}
                  options={SPORTS}
                  placeholder="Select sport"
                />
                <FormInput
                  id="position"
                  name="position"
                  label="Position"
                  placeholder="e.g., Point Guard"
                  value={values.position}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  touched={touched.position}
                  error={fieldErrors.position}
                />
              </div>

              <FormSelect
                id="year"
                name="year"
                label="Year"
                value={values.year}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                disabled={isLoading}
                touched={touched.year}
                error={fieldErrors.year}
                options={YEARS}
                placeholder="Select year"
              />
            </div>

            {/* Section: Social Links (Optional) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Social Links{' '}
                <span className="font-normal text-[var(--neutral-400)]">(Optional)</span>
              </h3>

              <FormInput
                id="instagram"
                name="instagram"
                label="Instagram Handle"
                placeholder="@yourhandle"
                value={values.instagram}
                onChange={handleInputChange}
                disabled={isLoading}
                optional
                required={false}
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

            {/* Terms Checkbox */}
            <div className="pt-2">
              <FormCheckbox
                id="agreeToTerms"
                name="agreeToTerms"
                checked={agreeToTerms}
                onChange={handleInputChange}
                disabled={isLoading}
              >
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
              </FormCheckbox>
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
