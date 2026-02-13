'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastActions } from '@/components/ui/toast';
import { useFormValidation, validators } from '@/lib/utils/validation';
import { getSupabaseClient } from '@/lib/supabase/client';

const DIVISIONS = [
  'NCAA Division I',
  'NCAA Division II',
  'NCAA Division III',
  'NAIA',
  'JUCO',
  'Other',
];

interface DirectorSignupFormValues {
  schoolName: string;
  division: string;
  department: string;
  fullName: string;
  title: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function DirectorSignupPage() {
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

  const [formValues] = useState<DirectorSignupFormValues>({
    schoolName: '',
    division: '',
    department: '',
    fullName: '',
    title: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const {
    values,
    errors: fieldErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    setFieldError,
  } = useFormValidation<DirectorSignupFormValues>(
    formValues,
    {
      schoolName: [validators.required, validators.minLength(2)],
      division: [validators.required],
      department: [validators.required],
      fullName: [validators.required, validators.minLength(2)],
      title: [validators.required],
      email: [validators.required, validators.email],
      phone: [validators.phone],
      password: [validators.required, validators.password],
      confirmPassword: [validators.required],
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
      handleChange(name as keyof DirectorSignupFormValues, value);
    }
    if (error) setError(null);
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    handleBlur(e.target.name as keyof DirectorSignupFormValues);
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
            full_name: values.fullName,
            school_name: values.schoolName,
            role: 'director',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        toast.error('Signup Failed', authError.message);
        return;
      }

      if (authData.user) {
        // Create director profile
        const { error: profileError } = await supabase.from('directors').insert({
          id: authData.user.id,
          school_name: values.schoolName,
          division: values.division,
          department: values.department,
          full_name: values.fullName,
          title: values.title,
          email: values.email,
          phone: values.phone || null,
        });

        if (profileError) {
          setError('Failed to create profile. Please contact support.');
          toast.error('Profile Creation Failed', 'Failed to create profile. Please contact support.');
          return;
        }
      }

      toast.success('Account Created', 'Welcome to GradeUp! Your director account has been created.');
      // Redirect to dashboard
      router.push('/director/dashboard');
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--primary-900)]">
            Create Director Account
          </CardTitle>
          <CardDescription className="text-[var(--neutral-600)]">
            Manage your athletic program's NIL activities
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

            {/* Section: School Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                School Information
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="schoolName"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  School/University Name
                </label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  autoComplete="organization"
                  placeholder="State University"
                  value={values.schoolName}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  error={!!(touched.schoolName && fieldErrors.schoolName)}
                  aria-invalid={!!(touched.schoolName && fieldErrors.schoolName)}
                  aria-describedby={touched.schoolName && fieldErrors.schoolName ? 'schoolName-error' : undefined}
                  aria-required="true"
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
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  }
                />
                {touched.schoolName && fieldErrors.schoolName && (
                  <p id="schoolName-error" className="text-xs text-[var(--error-600)]">{fieldErrors.schoolName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="division"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Division
                  </label>
                  <select
                    id="division"
                    name="division"
                    value={values.division}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    aria-invalid={!!(touched.division && fieldErrors.division)}
                    aria-describedby={touched.division && fieldErrors.division ? 'division-error' : undefined}
                    aria-required="true"
                    className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                      touched.division && fieldErrors.division ? 'border-[var(--error-600)]' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <option value="">Select division</option>
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                  {touched.division && fieldErrors.division && (
                    <p id="division-error" className="text-xs text-[var(--error-600)]">{fieldErrors.division}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Department
                  </label>
                  <Input
                    id="department"
                    name="department"
                    type="text"
                    placeholder="Athletics"
                    value={values.department}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.department && fieldErrors.department)}
                    aria-invalid={!!(touched.department && fieldErrors.department)}
                    aria-describedby={touched.department && fieldErrors.department ? 'department-error' : undefined}
                    aria-required="true"
                  />
                  {touched.department && fieldErrors.department && (
                    <p id="department-error" className="text-xs text-[var(--error-600)]">{fieldErrors.department}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Contact Info */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Your Information
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="John Smith"
                    value={values.fullName}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.fullName && fieldErrors.fullName)}
                    aria-invalid={!!(touched.fullName && fieldErrors.fullName)}
                    aria-describedby={touched.fullName && fieldErrors.fullName ? 'fullName-error' : undefined}
                    aria-required="true"
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
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                  />
                  {touched.fullName && fieldErrors.fullName && (
                    <p id="fullName-error" className="text-xs text-[var(--error-600)]">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Job Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Athletic Director"
                    value={values.title}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.title && fieldErrors.title)}
                    aria-invalid={!!(touched.title && fieldErrors.title)}
                    aria-describedby={touched.title && fieldErrors.title ? 'title-error' : undefined}
                    aria-required="true"
                  />
                  {touched.title && fieldErrors.title && (
                    <p id="title-error" className="text-xs text-[var(--error-600)]">{fieldErrors.title}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Work Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@school.edu"
                    value={values.email}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.email && fieldErrors.email)}
                    aria-invalid={!!(touched.email && fieldErrors.email)}
                    aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
                    aria-required="true"
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
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    }
                  />
                  {touched.email && fieldErrors.email && (
                    <p id="email-error" className="text-xs text-[var(--error-600)]">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-[var(--neutral-900)]"
                  >
                    Phone{' '}
                    <span className="font-normal text-[var(--neutral-400)]">(Optional)</span>
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    value={values.phone}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    disabled={isLoading}
                    error={!!(touched.phone && fieldErrors.phone)}
                    aria-invalid={!!(touched.phone && fieldErrors.phone)}
                    aria-describedby={touched.phone && fieldErrors.phone ? 'phone-error' : undefined}
                  />
                  {touched.phone && fieldErrors.phone && (
                    <p id="phone-error" className="text-xs text-[var(--error-600)]">{fieldErrors.phone}</p>
                  )}
                </div>
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
                    aria-invalid={!!(touched.password && fieldErrors.password)}
                    aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
                    aria-required="true"
                  />
                  {touched.password && fieldErrors.password && (
                    <p id="password-error" className="text-xs text-[var(--error-600)]">{fieldErrors.password}</p>
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
                    aria-invalid={!!(touched.confirmPassword && fieldErrors.confirmPassword)}
                    aria-describedby={touched.confirmPassword && fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    aria-required="true"
                  />
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p id="confirmPassword-error" className="text-xs text-[var(--error-600)]">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label htmlFor="agreeToTerms" className="flex items-start gap-3 cursor-pointer">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  name="agreeToTerms"
                  checked={agreeToTerms}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  aria-required="true"
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
