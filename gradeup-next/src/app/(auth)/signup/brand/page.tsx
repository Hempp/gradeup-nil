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

const INDUSTRIES = [
  'Sports & Fitness',
  'Fashion & Apparel',
  'Food & Beverage',
  'Technology',
  'Health & Wellness',
  'Finance',
  'Entertainment',
  'Automotive',
  'Education',
  'Retail',
  'Travel & Hospitality',
  'Other',
];

interface BrandSignupFormValues {
  companyName: string;
  industry: string;
  website: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function BrandSignupPage() {
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

  const [formValues] = useState<BrandSignupFormValues>({
    companyName: '',
    industry: '',
    website: '',
    fullName: '',
    email: '',
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
  } = useFormValidation<BrandSignupFormValues>(
    formValues,
    {
      companyName: [validators.required, validators.minLength(2)],
      industry: [validators.required],
      fullName: [validators.required, validators.minLength(2)],
      email: [validators.required, validators.email],
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
      handleChange(name as keyof BrandSignupFormValues, value);
    }
    if (error) setError(null);
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    handleBlur(e.target.name as keyof BrandSignupFormValues);
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
            company_name: values.companyName,
            role: 'brand',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        toast.error('Signup Failed', authError.message);
        return;
      }

      if (authData.user) {
        // Create brand profile
        const { error: profileError } = await supabase.from('brands').insert({
          id: authData.user.id,
          company_name: values.companyName,
          industry: values.industry,
          website: values.website || null,
          contact_name: values.fullName,
          contact_email: values.email,
        });

        if (profileError) {
          setError('Failed to create profile. Please contact support.');
          toast.error('Profile Creation Failed', 'Failed to create profile. Please contact support.');
          return;
        }
      }

      toast.success('Account Created', 'Welcome to GradeUp! Your brand account has been created.');
      // Redirect to dashboard
      router.push('/brand/dashboard');
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
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
              <path d="M12 3v6" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--primary-900)]">
            Create Brand Account
          </CardTitle>
          <CardDescription className="text-[var(--neutral-600)]">
            Connect with scholar-athletes and build partnerships
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

            {/* Section: Company Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Company Information
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Company Name
                </label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Acme Inc."
                  value={values.companyName}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  error={!!(touched.companyName && fieldErrors.companyName)}
                  aria-invalid={!!(touched.companyName && fieldErrors.companyName)}
                  aria-describedby={touched.companyName && fieldErrors.companyName ? 'companyName-error' : undefined}
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
                      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                      <path d="M10 6h4" />
                      <path d="M10 10h4" />
                      <path d="M10 14h4" />
                      <path d="M10 18h4" />
                    </svg>
                  }
                />
                {touched.companyName && fieldErrors.companyName && (
                  <p id="companyName-error" className="text-xs text-[var(--error-600)]">{fieldErrors.companyName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={values.industry}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  aria-invalid={!!(touched.industry && fieldErrors.industry)}
                  aria-describedby={touched.industry && fieldErrors.industry ? 'industry-error' : undefined}
                  className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                    touched.industry && fieldErrors.industry ? 'border-[var(--error-600)]' : 'border-[var(--border-color)]'
                  }`}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                {touched.industry && fieldErrors.industry && (
                  <p id="industry-error" className="text-xs text-[var(--error-600)]">{fieldErrors.industry}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Company Website{' '}
                  <span className="font-normal text-[var(--neutral-400)]">(Optional)</span>
                </label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  autoComplete="url"
                  placeholder="https://www.example.com"
                  value={values.website}
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
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Section: Contact Info */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-900)] uppercase tracking-wide">
                Contact Information
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Your Full Name
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
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--neutral-900)]"
                >
                  Work Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={values.email}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  disabled={isLoading}
                  error={!!(touched.email && fieldErrors.email)}
                  aria-invalid={!!(touched.email && fieldErrors.email)}
                  aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
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
                  />
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p id="confirmPassword-error" className="text-xs text-[var(--error-600)]">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
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
